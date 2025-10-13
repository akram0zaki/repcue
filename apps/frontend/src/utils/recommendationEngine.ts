/**
 * Recommendation Engine - Rule-based logic for coaching recommendations
 * 
 * Provides pure functions for analyzing workout data and generating
 * actionable recommendations for users.
 * 
 * Features:
 * - Muscle group balance analysis and suggestions
 * - Progressive overload detection
 * - Recovery time recommendations
 * - Streak motivation messages
 * - Contextual workout suggestions
 */

import type {
  MuscleGroupBalance,
  StreakData,
  ProgressionRecommendation,
  DurationProgressionRecommendation,
  RecoveryRecommendation
} from '../types/coaching';
import type { ActivityLog } from '../types';

// ============= Constants =============

// Muscle group thresholds are defined in analyzeMuscleGroupBalance function
// to avoid unused const warnings while keeping them as part of the algorithm

/**
 * Progressive overload thresholds
 */
const PROGRESSION_THRESHOLDS = {
  COMPLETION_RATE: 0.8, // 80% completion rate needed for progression
  MIN_WORKOUTS: 3, // Minimum workouts to consider progression
  INCREMENT_PERCENTAGE: 0.1 // 10% increase recommendation
} as const;

/**
 * Recovery time thresholds
 */
const RECOVERY_THRESHOLDS = {
  CONSECUTIVE_DAYS_WARNING: 5, // Warn after 5 consecutive days
  CONSECUTIVE_DAYS_URGENT: 7, // Urgent warning after 7 days
  HOURS_BETWEEN_WORKOUTS: 24 // Minimum recommended hours between workouts
} as const;

/**
 * Streak milestone values
 */
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 100, 365];

// ============= Muscle Group Balance Recommendations =============

/**
 * Analyze muscle group balance and generate recommendations
 * 
 * @param balance - Array of muscle group balance data
 * @returns Array of recommended muscle groups to train
 */
export function analyzeMuscleGroupBalance(
  balance: MuscleGroupBalance[]
): {
  underTrainedGroups: MuscleGroupBalance[];
  overTrainedGroups: MuscleGroupBalance[];
  balancedGroups: MuscleGroupBalance[];
  recommendations: string[];
} {
  if (balance.length === 0) {
    return {
      underTrainedGroups: [],
      overTrainedGroups: [],
      balancedGroups: [],
      recommendations: []
    };
  }

  const underTrainedGroups = balance.filter(b => b.isUnderTrained);
  const overTrainedGroups = balance.filter(b => b.isOverTrained);
  const balancedGroups = balance.filter(b => !b.isUnderTrained && !b.isOverTrained);

  const recommendations: string[] = [];

  // Recommend under-trained groups
  if (underTrainedGroups.length > 0) {
    const groups = underTrainedGroups.map(g => g.muscleGroup).slice(0, 3);
    recommendations.push(`coaching.recommendations.trainMuscleGroups:${groups.join(',')}`);
  }

  // Warn about over-trained groups
  if (overTrainedGroups.length > 0) {
    const groups = overTrainedGroups.map(g => g.muscleGroup).slice(0, 2);
    recommendations.push(`coaching.recommendations.reduceTraining:${groups.join(',')}`);
  }

  // Suggest balance if needed
  if (underTrainedGroups.length > 0 && overTrainedGroups.length > 0) {
    recommendations.push('coaching.recommendations.improveBalance');
  }

  return {
    underTrainedGroups,
    overTrainedGroups,
    balancedGroups,
    recommendations
  };
}

/**
 * Get days since last trained for a muscle group
 */
export function getDaysSinceLastTrained(lastTrainedAt: string): number {
  const lastDate = new Date(lastTrainedAt);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Suggest muscle groups that haven't been trained recently
 */
export function suggestNeglectedMuscleGroups(
  balance: MuscleGroupBalance[],
  daysThreshold: number = 7
): MuscleGroupBalance[] {
  return balance.filter(b => {
    if (!b.lastTrainedAt) return false;
    const daysSince = getDaysSinceLastTrained(b.lastTrainedAt);
    return daysSince >= daysThreshold;
  }).sort((a, b) => {
    // Sort by days since last trained (descending)
    const daysA = getDaysSinceLastTrained(a.lastTrainedAt!);
    const daysB = getDaysSinceLastTrained(b.lastTrainedAt!);
    return daysB - daysA;
  });
}

// ============= Progressive Overload Recommendations =============

/**
 * Analyze workout history to detect if user is ready for progressive overload
 * 
 * @param exerciseId - Exercise to analyze
 * @param recentLogs - Recent activity logs for this exercise
 * @returns Progression recommendation or null
 */
export function analyzeProgressiveOverload(
  exerciseId: string,
  exerciseName: string,
  recentLogs: ActivityLog[]
): ProgressionRecommendation | null {
  // Filter logs for this specific exercise
  const exerciseLogs = recentLogs.filter(log => log.exercise_id === exerciseId);

  if (exerciseLogs.length < PROGRESSION_THRESHOLDS.MIN_WORKOUTS) {
    return null; // Not enough data
  }

  // Calculate completion rate (assuming completed if duration > 0)
  const completedLogs = exerciseLogs.filter(log => log.duration > 0);
  const completionRate = completedLogs.length / exerciseLogs.length;

  if (completionRate < PROGRESSION_THRESHOLDS.COMPLETION_RATE) {
    return null; // Completion rate too low
  }

  // Get current typical performance
  const avgSets = calculateAverage(exerciseLogs.map(l => l.sets_count || 1));
  const avgReps = calculateAverage(exerciseLogs.map(l => l.reps_count || 0));

  // Skip time-based exercises (reps would be 0)
  // Progressive overload for time-based exercises should recommend duration increases instead
  if (avgReps === 0) {
    return null; // Time-based exercise, use analyzeDurationProgression instead
  }

  // Calculate recommended progression (10% increase)
  const recommendedSets = Math.ceil(avgSets * (1 + PROGRESSION_THRESHOLDS.INCREMENT_PERCENTAGE));
  const recommendedReps = Math.ceil(avgReps * (1 + PROGRESSION_THRESHOLDS.INCREMENT_PERCENTAGE));

  return {
    exerciseId,
    exerciseName,
    currentSets: Math.round(avgSets),
    currentReps: Math.round(avgReps),
    recommendedSets,
    recommendedReps,
    confidence: completionRate,
    reasoning: 'progression.highCompletionRate',
    completionRate
  };
}

/**
 * Analyze duration-based progressive overload for time-based exercises
 * 
 * @param exerciseId - Exercise to analyze
 * @param exerciseName - Exercise name for display
 * @param recentLogs - Recent activity logs for this exercise
 * @returns Duration progression recommendation or null
 */
export function analyzeDurationProgression(
  exerciseId: string,
  exerciseName: string,
  recentLogs: ActivityLog[]
): DurationProgressionRecommendation | null {
  // Filter logs for this specific exercise
  const exerciseLogs = recentLogs.filter(log => log.exercise_id === exerciseId);

  if (exerciseLogs.length < PROGRESSION_THRESHOLDS.MIN_WORKOUTS) {
    return null; // Not enough data
  }

  // Calculate completion rate (assuming completed if duration > 0)
  const completedLogs = exerciseLogs.filter(log => log.duration > 0);
  const completionRate = completedLogs.length / exerciseLogs.length;

  if (completionRate < PROGRESSION_THRESHOLDS.COMPLETION_RATE) {
    return null; // Completion rate too low
  }

  // Get current typical performance
  const avgSets = calculateAverage(exerciseLogs.map(l => l.sets_count || 1));
  const avgReps = calculateAverage(exerciseLogs.map(l => l.reps_count || 0));

  // Only process time-based exercises (reps = 0)
  if (avgReps > 0) {
    return null; // Not a time-based exercise, use analyzeProgressiveOverload instead
  }

  // Calculate average duration per set (total duration / total sets)
  const avgDurationPerSet = calculateAverage(
    completedLogs.map(log => {
      const sets = log.sets_count || 1;
      return log.duration / sets;
    })
  );

  // Calculate recommended progression (10% increase in duration)
  const recommendedDuration = Math.ceil(avgDurationPerSet * (1 + PROGRESSION_THRESHOLDS.INCREMENT_PERCENTAGE));
  const recommendedSets = Math.ceil(avgSets * (1 + PROGRESSION_THRESHOLDS.INCREMENT_PERCENTAGE));

  // Ensure minimum reasonable increases (at least 5 seconds)
  const minIncrease = 5;
  const finalRecommendedDuration = Math.max(
    recommendedDuration,
    Math.ceil(avgDurationPerSet) + minIncrease
  );

  return {
    exerciseId,
    exerciseName,
    currentSets: Math.round(avgSets),
    currentDuration: Math.round(avgDurationPerSet),
    recommendedSets,
    recommendedDuration: finalRecommendedDuration,
    confidence: completionRate,
    reasoning: 'progression.highCompletionRate',
    completionRate
  };
}

/**
 * Find all exercises ready for progressive overload (rep-based)
 */
export function findReadyForProgression(
  allLogs: ActivityLog[],
  daysBack: number = 14
): Map<string, ProgressionRecommendation> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const recentLogs = allLogs.filter(log => new Date(log.timestamp) >= cutoffDate);

  // Group by exercise
  const exerciseMap = new Map<string, ActivityLog[]>();
  recentLogs.forEach(log => {
    if (!exerciseMap.has(log.exercise_id)) {
      exerciseMap.set(log.exercise_id, []);
    }
    exerciseMap.get(log.exercise_id)!.push(log);
  });

  // Analyze each exercise (rep-based only)
  const recommendations = new Map<string, ProgressionRecommendation>();
  exerciseMap.forEach((logs, exerciseId) => {
    if (logs.length === 0) return;
    
    const recommendation = analyzeProgressiveOverload(
      exerciseId,
      logs[0].exercise_name,
      logs
    );
    
    if (recommendation) {
      recommendations.set(exerciseId, recommendation);
    }
  });

  return recommendations;
}

/**
 * Find all exercises ready for duration-based progression (time-based)
 */
export function findReadyForDurationProgression(
  allLogs: ActivityLog[],
  daysBack: number = 14
): Map<string, DurationProgressionRecommendation> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const recentLogs = allLogs.filter(log => new Date(log.timestamp) >= cutoffDate);

  // Group by exercise
  const exerciseMap = new Map<string, ActivityLog[]>();
  recentLogs.forEach(log => {
    if (!exerciseMap.has(log.exercise_id)) {
      exerciseMap.set(log.exercise_id, []);
    }
    exerciseMap.get(log.exercise_id)!.push(log);
  });

  // Analyze each exercise (time-based only)
  const recommendations = new Map<string, DurationProgressionRecommendation>();
  exerciseMap.forEach((logs, exerciseId) => {
    if (logs.length === 0) return;
    
    const recommendation = analyzeDurationProgression(
      exerciseId,
      logs[0].exercise_name,
      logs
    );
    
    if (recommendation) {
      recommendations.set(exerciseId, recommendation);
    }
  });

  return recommendations;
}

// ============= Recovery Recommendations =============

/**
 * Analyze workout frequency to recommend recovery time
 * 
 * @param recentLogs - Activity logs from recent period
 * @returns Recovery recommendation or null
 */
export function analyzeRecoveryNeeds(
  recentLogs: ActivityLog[]
): RecoveryRecommendation | null {
  if (recentLogs.length === 0) return null;

  // Get consecutive workout days
  const consecutiveDays = calculateConsecutiveWorkoutDays(recentLogs);

  if (consecutiveDays < RECOVERY_THRESHOLDS.CONSECUTIVE_DAYS_WARNING) {
    return null; // No warning needed
  }

  // Determine severity
  let severity: 'low' | 'medium' | 'high';
  let recommendedRestDays: number;

  if (consecutiveDays >= RECOVERY_THRESHOLDS.CONSECUTIVE_DAYS_URGENT) {
    severity = 'high';
    recommendedRestDays = 2;
  } else if (consecutiveDays >= RECOVERY_THRESHOLDS.CONSECUTIVE_DAYS_WARNING) {
    severity = 'medium';
    recommendedRestDays = 1;
  } else {
    severity = 'low';
    recommendedRestDays = 1;
  }

  // Analyze which muscle groups need rest (those trained most)
  // Note: Would need to look up exercise muscle groups from storage
  // For now, return general recommendation

  return {
    daysTraining: consecutiveDays,
    recommendedRestDays,
    severity,
    reasoning: `recovery.consecutiveDays:${consecutiveDays}`,
    affectedMuscleGroups: [] // Would be populated with actual muscle group data
  };
}

/**
 * Calculate consecutive workout days from activity logs
 */
function calculateConsecutiveWorkoutDays(logs: ActivityLog[]): number {
  if (logs.length === 0) return 0;

  // Get unique workout dates
  const workoutDates = Array.from(
    new Set(
      logs.map(log => {
        const date = new Date(log.timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    )
  ).sort((a, b) => b - a); // Sort descending (most recent first)

  // Count consecutive days from today
  let consecutive = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let checkDate = today.getTime();

  for (const workoutDate of workoutDates) {
    if (workoutDate === checkDate) {
      consecutive++;
      checkDate -= 24 * 60 * 60 * 1000; // Move back one day
    } else if (workoutDate < checkDate) {
      // Gap found, stop counting
      break;
    }
  }

  return consecutive;
}

// ============= Streak Motivation =============

/**
 * Generate streak-based motivational messages
 * 
 * @param streakData - Current streak information
 * @returns Motivational message key
 */
export function generateStreakMotivation(streakData: StreakData): {
  messageKey: string;
  type: 'milestone' | 'maintain' | 'encourage' | 'start';
} {
  const { currentStreak, longestStreak, isActiveToday } = streakData;

  // Check if at milestone
  if (STREAK_MILESTONES.includes(currentStreak)) {
    return {
      messageKey: `streak.milestone:${currentStreak}`,
      type: 'milestone'
    };
  }

  // About to reach milestone
  const nextMilestone = STREAK_MILESTONES.find(m => m > currentStreak);
  if (nextMilestone && currentStreak === nextMilestone - 1) {
    return {
      messageKey: `streak.almostMilestone:${nextMilestone}`,
      type: 'maintain'
    };
  }

  // Long streak (maintain it)
  if (currentStreak >= 7 && !isActiveToday) {
    return {
      messageKey: `streak.maintain:${currentStreak}`,
      type: 'maintain'
    };
  }

  // New personal record
  if (currentStreak > longestStreak && currentStreak >= 3) {
    return {
      messageKey: 'streak.newRecord',
      type: 'milestone'
    };
  }

  // Building momentum
  if (currentStreak >= 3) {
    return {
      messageKey: `streak.building:${currentStreak}`,
      type: 'encourage'
    };
  }

  // Just starting
  if (currentStreak > 0) {
    return {
      messageKey: 'streak.justStarted',
      type: 'start'
    };
  }

  // No current streak
  return {
    messageKey: 'streak.noStreak',
    type: 'start'
  };
}

/**
 * Check if streak is at risk (worked out yesterday but not today)
 */
export function isStreakAtRisk(streakData: StreakData, currentHour: number): boolean {
  return (
    streakData.currentStreak > 0 &&
    !streakData.isActiveToday &&
    currentHour >= 18 // After 6 PM
  );
}

// ============= Contextual Suggestions =============

/**
 * Suggest workout based on recent activity patterns
 * 
 * @param recentLogs - Recent activity logs
 * @param muscleBalance - Muscle group balance data
 * @returns Suggestion message key
 */
export function suggestWorkout(
  recentLogs: ActivityLog[],
  muscleBalance: MuscleGroupBalance[]
): {
  suggestionKey: string;
  targetMuscleGroups?: string[];
} {
  // Check days since last workout
  if (recentLogs.length === 0) {
    return {
      suggestionKey: 'suggestions.startJourney'
    };
  }

  const lastWorkout = recentLogs[0]; // Assuming sorted by timestamp desc
  const daysSinceLast = getDaysSinceLastTrained(lastWorkout.timestamp);

  // Been too long
  if (daysSinceLast >= 7) {
    return {
      suggestionKey: 'suggestions.longGap'
    };
  }

  // Suggest neglected muscle groups
  const neglected = suggestNeglectedMuscleGroups(muscleBalance, 7);
  if (neglected.length > 0) {
    return {
      suggestionKey: 'suggestions.neglectedMuscles',
      targetMuscleGroups: neglected.slice(0, 2).map(n => n.muscleGroup)
    };
  }

  // Suggest balance if imbalanced
  const { underTrainedGroups } = analyzeMuscleGroupBalance(muscleBalance);
  if (underTrainedGroups.length > 0) {
    return {
      suggestionKey: 'suggestions.improveBalance',
      targetMuscleGroups: underTrainedGroups.slice(0, 2).map(u => u.muscleGroup)
    };
  }

  // General encouragement
  return {
    suggestionKey: 'suggestions.keepGoing'
  };
}

// ============= Utility Functions =============

/**
 * Calculate average of number array
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  return sum / numbers.length;
}

/**
 * Check if workout frequency is improving
 */
export function isWorkoutFrequencyImproving(
  recentLogs: ActivityLog[],
  compareWeeks: number = 4
): boolean {
  if (recentLogs.length < 2) return false;

  const now = new Date();
  const halfwayPoint = new Date(now);
  halfwayPoint.setDate(halfwayPoint.getDate() - (compareWeeks * 7) / 2);

  const recentHalf = recentLogs.filter(log => new Date(log.timestamp) >= halfwayPoint);
  const olderHalf = recentLogs.filter(log => new Date(log.timestamp) < halfwayPoint);

  if (olderHalf.length === 0) return false;

  const recentRate = recentHalf.length / (compareWeeks / 2);
  const olderRate = olderHalf.length / (compareWeeks / 2);

  return recentRate > olderRate * 1.1; // 10% improvement
}

/**
 * Calculate workout variety score (0-1)
 * Higher score means more diverse exercise selection
 */
export function calculateWorkoutVariety(logs: ActivityLog[]): number {
  if (logs.length === 0) return 0;

  const uniqueExercises = new Set(logs.map(log => log.exercise_id));
  const varietyRatio = uniqueExercises.size / logs.length;

  // Normalize to 0-1 range (variety ratio typically 0.1-0.8)
  return Math.min(varietyRatio * 2, 1);
}

/**
 * Get consistency score (0-1) based on workout frequency
 * Higher score means more consistent workout schedule
 */
export function calculateConsistencyScore(logs: ActivityLog[], daysBack: number = 30): number {
  if (logs.length === 0) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate);
  
  // Get unique workout dates
  const workoutDates = new Set(
    recentLogs.map(log => {
      const date = new Date(log.timestamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  const workoutDays = workoutDates.size;
  const totalDays = daysBack;

  // Calculate frequency (0-1, where 0.5 = workout every other day)
  const frequency = workoutDays / totalDays;

  // Ideal frequency is 3-4 times per week (0.43-0.57)
  // Score peaks at ideal frequency
  const idealMin = 3 / 7;
  const idealMax = 4 / 7;

  if (frequency >= idealMin && frequency <= idealMax) {
    return 1; // Perfect consistency
  } else if (frequency < idealMin) {
    return frequency / idealMin; // Scale from 0 to 1
  } else {
    // Above ideal - penalize slightly for overtraining risk
    return Math.max(0.7, 1 - (frequency - idealMax) * 0.5);
  }
}
