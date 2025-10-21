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
  INCREMENT_PERCENTAGE: 0.1, // 10% increase recommendation
  CONSISTENCY_THRESHOLD: 0.7, // 70% consistency needed
  MIN_REST_DAYS: 2 // Minimum rest days between same exercise
} as const;

/**
 * Advanced progression detection thresholds
 */
const ADVANCED_PROGRESSION_THRESHOLDS = {
  MIN_SESSIONS: 3, // Minimum sessions to analyze
  HIGH_COMPLETION_RATE: 0.85, // 85%+ completion rate
  MODERATE_COMPLETION_RATE: 0.75, // 75%+ completion rate
  PLATEAU_SESSIONS: 4, // Number of sessions at same level to detect plateau
  VOLUME_INCREASE_PERCENTAGE: 0.10, // 10% volume increase
  INTENSITY_INCREASE_PERCENTAGE: 0.05, // 5% intensity increase
  REST_QUALITY_FACTOR: 0.8, // Factor for rest quality assessment
  CONFIDENCE_HIGH: 0.9, // High confidence threshold
  CONFIDENCE_MEDIUM: 0.7 // Medium confidence threshold
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
 * Advanced recovery analysis thresholds
 */
const ADVANCED_RECOVERY_THRESHOLDS = {
  MIN_SESSIONS_FOR_ANALYSIS: 3, // Minimum sessions to analyze
  CONSECUTIVE_DAYS_LOW: 3, // 3+ consecutive days = low concern
  CONSECUTIVE_DAYS_MEDIUM: 5, // 5+ consecutive days = medium concern
  CONSECUTIVE_DAYS_HIGH: 7, // 7+ consecutive days = high concern
  HIGH_INTENSITY_THRESHOLD: 0.85, // 85%+ completion rate = high intensity
  OPTIMAL_REST_DAYS_MIN: 1, // Minimum optimal rest between training
  OPTIMAL_REST_DAYS_MAX: 3, // Maximum optimal rest before detraining
  VOLUME_SPIKE_THRESHOLD: 0.30, // 30% volume increase = spike
  MUSCLE_GROUP_FREQUENCY_HIGH: 3, // 3+ times per week = high frequency
  FATIGUE_SCORE_MEDIUM: 0.6, // 0.6+ fatigue = medium concern
  FATIGUE_SCORE_HIGH: 0.8 // 0.8+ fatigue = high concern
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

// ============= Advanced Progressive Overload Detection =============

/**
 * Advanced progression opportunity detection with multi-factor analysis
 * 
 * This function provides more sophisticated progression detection than the basic
 * analyzeProgressiveOverload function by considering:
 * - Completion rate trends (improving vs declining)
 * - Plateau detection (stuck at same volume)
 * - Rest quality between sessions
 * - Volume progression patterns
 * - Confidence scoring based on data quality
 * 
 * @param allLogs - All activity logs to analyze
 * @param daysBack - Number of days to look back (default 21 for 3 weeks)
 * @returns Map of exercise IDs to progression recommendations with confidence scores
 */
export function detectProgressionOpportunities(
  allLogs: ActivityLog[],
  daysBack: number = 21
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

  const recommendations = new Map<string, ProgressionRecommendation>();

  exerciseMap.forEach((logs, exerciseId) => {
    // Sort logs by timestamp (oldest first)
    const sortedLogs = logs.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Skip if not enough sessions
    if (sortedLogs.length < ADVANCED_PROGRESSION_THRESHOLDS.MIN_SESSIONS) {
      return;
    }

    // Analyze rep-based exercises only (time-based handled separately)
    const avgReps = calculateAverage(sortedLogs.map(l => l.reps_count || 0));
    if (avgReps === 0) {
      return; // Time-based exercise, skip
    }

    // Multi-factor analysis
    const completionAnalysis = analyzeCompletionTrend(sortedLogs);
    const plateauDetection = detectPerformancePlateau(sortedLogs);
    const restQuality = assessRestQuality(sortedLogs);
    const volumeProgression = analyzeVolumeProgression(sortedLogs);

    // Calculate overall confidence score
    const confidence = calculateProgressionConfidence({
      completionRate: completionAnalysis.overallRate,
      isImproving: completionAnalysis.isImproving,
      isPlateaued: plateauDetection.isPlateaued,
      restQuality,
      hasConsistentVolume: volumeProgression.isConsistent,
      sessionCount: sortedLogs.length
    });

    // Only recommend if confidence is reasonable
    if (confidence < ADVANCED_PROGRESSION_THRESHOLDS.CONFIDENCE_MEDIUM) {
      return;
    }

    // Determine if ready for progression
    const isReady = (
      completionAnalysis.overallRate >= ADVANCED_PROGRESSION_THRESHOLDS.MODERATE_COMPLETION_RATE &&
      (plateauDetection.isPlateaued || completionAnalysis.recentRate >= ADVANCED_PROGRESSION_THRESHOLDS.HIGH_COMPLETION_RATE) &&
      restQuality >= ADVANCED_PROGRESSION_THRESHOLDS.REST_QUALITY_FACTOR
    );

    if (!isReady) {
      return;
    }

    // Calculate current typical performance
    const recentLogs = sortedLogs.slice(-ADVANCED_PROGRESSION_THRESHOLDS.MIN_SESSIONS);
    const currentSets = Math.round(calculateAverage(recentLogs.map(l => l.sets_count || 1)));
    const currentReps = Math.round(calculateAverage(recentLogs.map(l => l.reps_count || 0)));

    // Determine progression type based on analysis
    let recommendedSets = currentSets;
    let recommendedReps = currentReps;
    let reasoning = 'progression.highCompletionRate';

    if (plateauDetection.isPlateaued && plateauDetection.sessionCount >= ADVANCED_PROGRESSION_THRESHOLDS.PLATEAU_SESSIONS) {
      // Plateau detected - suggest volume increase
      recommendedSets = Math.ceil(currentSets * (1 + ADVANCED_PROGRESSION_THRESHOLDS.VOLUME_INCREASE_PERCENTAGE));
      recommendedReps = Math.ceil(currentReps * (1 + ADVANCED_PROGRESSION_THRESHOLDS.VOLUME_INCREASE_PERCENTAGE));
      reasoning = 'progression.plateauDetected';
    } else if (completionAnalysis.recentRate >= ADVANCED_PROGRESSION_THRESHOLDS.HIGH_COMPLETION_RATE) {
      // High completion rate - suggest intensity increase (more reps)
      recommendedReps = Math.ceil(currentReps * (1 + ADVANCED_PROGRESSION_THRESHOLDS.INTENSITY_INCREASE_PERCENTAGE));
      reasoning = 'progression.highCompletionRate';
    } else {
      // Moderate completion - suggest gradual volume increase
      recommendedSets = Math.ceil(currentSets * (1 + ADVANCED_PROGRESSION_THRESHOLDS.INTENSITY_INCREASE_PERCENTAGE));
      reasoning = 'progression.consistentPerformance';
    }

    recommendations.set(exerciseId, {
      exerciseId,
      exerciseName: sortedLogs[0].exercise_name,
      currentSets,
      currentReps,
      recommendedSets,
      recommendedReps,
      confidence,
      reasoning,
      completionRate: completionAnalysis.overallRate
    });
  });

  return recommendations;
}

/**
 * Analyze completion rate trend over time
 */
function analyzeCompletionTrend(logs: ActivityLog[]): {
  overallRate: number;
  recentRate: number;
  isImproving: boolean;
} {
  const completedLogs = logs.filter(log => log.duration > 0);
  const overallRate = completedLogs.length / logs.length;

  // Analyze recent half vs older half
  const midpoint = Math.floor(logs.length / 2);
  const olderLogs = logs.slice(0, midpoint);
  const recentLogs = logs.slice(midpoint);

  const olderCompleted = olderLogs.filter(log => log.duration > 0).length;
  const recentCompleted = recentLogs.filter(log => log.duration > 0).length;

  const olderRate = olderLogs.length > 0 ? olderCompleted / olderLogs.length : 0;
  const recentRate = recentLogs.length > 0 ? recentCompleted / recentLogs.length : 0;

  const isImproving = recentRate > olderRate * 1.05; // 5% improvement

  return {
    overallRate,
    recentRate,
    isImproving
  };
}

/**
 * Detect if performance has plateaued (stuck at same volume)
 */
function detectPerformancePlateau(logs: ActivityLog[]): {
  isPlateaued: boolean;
  sessionCount: number;
} {
  if (logs.length < ADVANCED_PROGRESSION_THRESHOLDS.PLATEAU_SESSIONS) {
    return { isPlateaued: false, sessionCount: 0 };
  }

  // Check if last N sessions have same/similar volume
  const recentSessions = logs.slice(-ADVANCED_PROGRESSION_THRESHOLDS.PLATEAU_SESSIONS);
  const volumes = recentSessions.map(log => 
    (log.sets_count || 1) * (log.reps_count || 0)
  );

  // Calculate coefficient of variation (std dev / mean)
  const mean = calculateAverage(volumes);
  if (mean === 0) return { isPlateaued: false, sessionCount: 0 };

  const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volumes.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  // Low variation = plateau (< 10% variation)
  const isPlateaued = coefficientOfVariation < 0.10;

  return {
    isPlateaued,
    sessionCount: recentSessions.length
  };
}

/**
 * Assess quality of rest between sessions
 * Returns score 0-1 where 1 = optimal rest
 */
function assessRestQuality(logs: ActivityLog[]): number {
  if (logs.length < 2) return 1; // Not enough data

  // Calculate rest days between sessions
  const restDays: number[] = [];
  for (let i = 1; i < logs.length; i++) {
    const prevDate = new Date(logs[i - 1].timestamp);
    const currDate = new Date(logs[i].timestamp);
    const diffMs = currDate.getTime() - prevDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    restDays.push(diffDays);
  }

  // Optimal rest is 2-3 days for same exercise
  // Score = 1 if rest is 2-3 days, decreasing as it gets too short or too long
  const avgRest = calculateAverage(restDays);
  
  if (avgRest >= 2 && avgRest <= 3) {
    return 1; // Optimal
  } else if (avgRest < 2) {
    // Too short - may not be fully recovered
    return Math.max(0.3, avgRest / 2);
  } else {
    // Too long - losing momentum
    return Math.max(0.5, 1 - (avgRest - 3) * 0.1);
  }
}

/**
 * Analyze volume progression patterns
 */
function analyzeVolumeProgression(logs: ActivityLog[]): {
  isConsistent: boolean;
  isIncreasing: boolean;
  averageVolume: number;
} {
  if (logs.length < 2) {
    return { isConsistent: false, isIncreasing: false, averageVolume: 0 };
  }

  const volumes = logs.map(log => (log.sets_count || 1) * (log.reps_count || 0));
  const averageVolume = calculateAverage(volumes);

  // Check consistency (coefficient of variation < 20%)
  const mean = averageVolume;
  if (mean === 0) {
    return { isConsistent: false, isIncreasing: false, averageVolume: 0 };
  }

  const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volumes.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;
  const isConsistent = coefficientOfVariation < 0.20;

  // Check if trending upward
  const midpoint = Math.floor(volumes.length / 2);
  const firstHalf = volumes.slice(0, midpoint);
  const secondHalf = volumes.slice(midpoint);
  
  const firstAvg = calculateAverage(firstHalf);
  const secondAvg = calculateAverage(secondHalf);
  const isIncreasing = secondAvg > firstAvg * 1.05; // 5% increase

  return {
    isConsistent,
    isIncreasing,
    averageVolume
  };
}

/**
 * Calculate overall confidence score for progression recommendation
 */
function calculateProgressionConfidence(factors: {
  completionRate: number;
  isImproving: boolean;
  isPlateaued: boolean;
  restQuality: number;
  hasConsistentVolume: boolean;
  sessionCount: number;
}): number {
  let confidence = 0;

  // Base confidence from completion rate (0-0.4)
  confidence += factors.completionRate * 0.4;

  // Bonus for improving trend (0-0.2)
  if (factors.isImproving) {
    confidence += 0.2;
  }

  // Bonus for plateau detection (0-0.15)
  if (factors.isPlateaued) {
    confidence += 0.15;
  }

  // Rest quality factor (0-0.15)
  confidence += factors.restQuality * 0.15;

  // Consistency bonus (0-0.1)
  if (factors.hasConsistentVolume) {
    confidence += 0.1;
  }

  // Session count factor (more sessions = higher confidence, max 0.1)
  const sessionFactor = Math.min(factors.sessionCount / 10, 1);
  confidence += sessionFactor * 0.1;

  return Math.min(confidence, 1);
}

// ============= Advanced Recovery Recommendations =============

/**
 * Calculate enhanced recovery recommendations using multi-factor analysis
 * 
 * Analyzes training patterns to identify when rest is needed, considering:
 * - Consecutive training days (overtraining risk)
 * - Workout intensity and completion rates
 * - Volume spikes (sudden increases in training load)
 * - Muscle group frequency and fatigue
 * - Rest quality between sessions
 * 
 * @param allLogs - All activity logs for analysis
 * @param daysBack - Number of days to look back (default: 14)
 * @returns Recovery recommendation or null if adequate rest is happening
 */
export function calculateRecoveryRecommendations(
  allLogs: ActivityLog[],
  daysBack: number = 14
): RecoveryRecommendation | null {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const recentLogs = allLogs.filter(log => new Date(log.timestamp) >= cutoffDate);
  
  if (recentLogs.length < ADVANCED_RECOVERY_THRESHOLDS.MIN_SESSIONS_FOR_ANALYSIS) {
    return null; // Not enough data
  }

  // 1. Analyze consecutive training days
  const consecutiveDaysData = analyzeConsecutiveTrainingDays(recentLogs);
  
  // 2. Assess workout intensity and completion patterns
  const intensityData = assessWorkoutIntensity(recentLogs);
  
  // 3. Detect volume spikes
  const volumeData = detectVolumeSpikes(recentLogs);
  
  // 4. Analyze muscle group fatigue
  const muscleGroupData = analyzeMuscleGroupFatigue(recentLogs);
  
  // 5. Calculate overall fatigue score
  const fatigueScore = calculateFatigueScore({
    consecutiveDays: consecutiveDaysData.consecutiveDays,
    hasVolumespike: volumeData.hasSpike,
    highIntensity: intensityData.isHighIntensity,
    inadequateRest: consecutiveDaysData.inadequateRest,
    muscleGroupOveruse: muscleGroupData.hasOverusedGroups
  });
  
  // 6. Determine severity and recommendations
  const severity = determineSeverity(
    consecutiveDaysData.consecutiveDays,
    fatigueScore,
    volumeData.hasSpike
  );
  
  // If severity is low and no concerning patterns, no recommendation needed
  if (severity === null) {
    return null;
  }
  
  // Calculate recommended rest days
  const recommendedRestDays = calculateRecommendedRestDays(
    severity,
    consecutiveDaysData.consecutiveDays,
    fatigueScore
  );
  
  // Generate reasoning
  const reasoning = generateRecoveryReasoning(
    severity,
    consecutiveDaysData.consecutiveDays,
    volumeData.hasSpike,
    intensityData.isHighIntensity,
    muscleGroupData.hasOverusedGroups
  );
  
  return {
    daysTraining: consecutiveDaysData.consecutiveDays,
    recommendedRestDays,
    severity,
    reasoning,
    affectedMuscleGroups: muscleGroupData.overusedGroups
  };
}

/**
 * Analyze consecutive training days and rest patterns
 */
function analyzeConsecutiveTrainingDays(logs: ActivityLog[]): {
  consecutiveDays: number;
  inadequateRest: boolean;
} {
  if (logs.length === 0) {
    return { consecutiveDays: 0, inadequateRest: false };
  }

  // Sort logs by timestamp (newest first)
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Get unique workout dates
  const workoutDates = Array.from(
    new Set(
      sortedLogs.map(log => {
        const date = new Date(log.timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
    )
  ).sort((a, b) => b - a); // Sort descending (newest first)

  // Count consecutive days from most recent
  let consecutiveDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  for (let i = 0; i < workoutDates.length; i++) {
    const expectedDate = new Date(todayTime);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (workoutDates[i] === expectedDate.getTime()) {
      consecutiveDays++;
    } else {
      break; // Break on first gap
    }
  }

  // Check if rest between sessions is adequate (average)
  const restDays: number[] = [];
  for (let i = 0; i < workoutDates.length - 1; i++) {
    const daysDiff = Math.floor(
      (workoutDates[i] - workoutDates[i + 1]) / (1000 * 60 * 60 * 24)
    );
    restDays.push(daysDiff);
  }

  const averageRest = restDays.length > 0 
    ? calculateAverage(restDays) 
    : ADVANCED_RECOVERY_THRESHOLDS.OPTIMAL_REST_DAYS_MIN;

  const inadequateRest = averageRest < ADVANCED_RECOVERY_THRESHOLDS.OPTIMAL_REST_DAYS_MIN;

  return { consecutiveDays, inadequateRest };
}

/**
 * Assess overall workout intensity based on completion rates
 */
function assessWorkoutIntensity(logs: ActivityLog[]): {
  isHighIntensity: boolean;
  averageCompletion: number;
} {
  if (logs.length === 0) {
    return { isHighIntensity: false, averageCompletion: 0 };
  }

  // Calculate intensity based on sets and reps completed
  // Higher sets/reps indicate higher intensity
  const intensityScores = logs
    .filter(log => log.sets_count && log.sets_count > 0)
    .map(log => {
      const sets = log.sets_count || 1;
      const reps = log.reps_count || 1;
      // Normalize: 3 sets x 10 reps = baseline (1.0)
      return (sets * reps) / 30;
    });

  const averageIntensity = intensityScores.length > 0 
    ? calculateAverage(intensityScores)
    : 0;

  const isHighIntensity = averageIntensity >= ADVANCED_RECOVERY_THRESHOLDS.HIGH_INTENSITY_THRESHOLD;

  return { isHighIntensity, averageCompletion: averageIntensity };
}

/**
 * Detect sudden volume spikes that may require extra recovery
 */
function detectVolumeSpikes(logs: ActivityLog[]): {
  hasSpike: boolean;
  volumeIncrease: number;
} {
  if (logs.length < 6) {
    return { hasSpike: false, volumeIncrease: 0 };
  }

  // Split into two halves: recent vs older
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const midpoint = Math.floor(sortedLogs.length / 2);
  const olderHalf = sortedLogs.slice(0, midpoint);
  const recentHalf = sortedLogs.slice(midpoint);

  // Calculate total volume (sets * reps) for each half
  const olderVolume = olderHalf.reduce(
    (sum, log) => sum + ((log.sets_count || 1) * (log.reps_count || 1)),
    0
  );
  
  const recentVolume = recentHalf.reduce(
    (sum, log) => sum + ((log.sets_count || 1) * (log.reps_count || 1)),
    0
  );

  // Calculate percentage increase
  const volumeIncrease = olderVolume > 0 
    ? (recentVolume - olderVolume) / olderVolume 
    : 0;

  const hasSpike = volumeIncrease >= ADVANCED_RECOVERY_THRESHOLDS.VOLUME_SPIKE_THRESHOLD;

  return { hasSpike, volumeIncrease };
}

/**
 * Analyze muscle group training frequency and identify overused groups
 * 
 * Note: This is simplified - real implementation would need exercise-to-muscle-group
 * mapping from the database. For now, we use exercise_id as a proxy.
 */
function analyzeMuscleGroupFatigue(logs: ActivityLog[]): {
  hasOverusedGroups: boolean;
  overusedGroups: string[];
} {
  if (logs.length === 0) {
    return { hasOverusedGroups: false, overusedGroups: [] };
  }

  // Count frequency by exercise (proxy for muscle groups)
  const exerciseFrequency = new Map<string, number>();
  
  // Get unique workout dates
  const workoutDates = new Set(
    logs.map(log => {
      const date = new Date(log.timestamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  const totalDays = workoutDates.size;

  // Count exercise frequency
  logs.forEach(log => {
    const count = exerciseFrequency.get(log.exercise_id) || 0;
    exerciseFrequency.set(log.exercise_id, count + 1);
  });

  // Identify exercises trained more than 3 times per week on average
  const overusedGroups: string[] = [];
  const daysInPeriod = 7; // Weekly basis
  
  exerciseFrequency.forEach((count, exerciseId) => {
    const frequency = (count / totalDays) * daysInPeriod;
    if (frequency >= ADVANCED_RECOVERY_THRESHOLDS.MUSCLE_GROUP_FREQUENCY_HIGH) {
      overusedGroups.push(exerciseId);
    }
  });

  return {
    hasOverusedGroups: overusedGroups.length > 0,
    overusedGroups
  };
}

/**
 * Calculate overall fatigue score (0-1) based on multiple factors
 */
function calculateFatigueScore(factors: {
  consecutiveDays: number;
  hasVolumespike: boolean;
  highIntensity: boolean;
  inadequateRest: boolean;
  muscleGroupOveruse: boolean;
}): number {
  let fatigueScore = 0;

  // Consecutive days contribution (40% weight)
  if (factors.consecutiveDays >= ADVANCED_RECOVERY_THRESHOLDS.CONSECUTIVE_DAYS_HIGH) {
    fatigueScore += 0.4;
  } else if (factors.consecutiveDays >= ADVANCED_RECOVERY_THRESHOLDS.CONSECUTIVE_DAYS_MEDIUM) {
    fatigueScore += 0.25;
  } else if (factors.consecutiveDays >= ADVANCED_RECOVERY_THRESHOLDS.CONSECUTIVE_DAYS_LOW) {
    fatigueScore += 0.15;
  }

  // Volume spike contribution (20% weight)
  if (factors.hasVolumespike) {
    fatigueScore += 0.2;
  }

  // High intensity contribution (15% weight)
  if (factors.highIntensity) {
    fatigueScore += 0.15;
  }

  // Inadequate rest contribution (15% weight)
  if (factors.inadequateRest) {
    fatigueScore += 0.15;
  }

  // Muscle group overuse contribution (10% weight)
  if (factors.muscleGroupOveruse) {
    fatigueScore += 0.1;
  }

  return Math.min(fatigueScore, 1);
}

/**
 * Determine severity level based on fatigue indicators
 */
function determineSeverity(
  consecutiveDays: number,
  fatigueScore: number,
  hasVolumeSpike: boolean
): 'low' | 'medium' | 'high' | null {
  // High severity: 7+ consecutive days OR high fatigue score
  if (
    consecutiveDays >= ADVANCED_RECOVERY_THRESHOLDS.CONSECUTIVE_DAYS_HIGH ||
    fatigueScore >= ADVANCED_RECOVERY_THRESHOLDS.FATIGUE_SCORE_HIGH
  ) {
    return 'high';
  }

  // Medium severity: 5+ consecutive days OR medium fatigue OR volume spike
  if (
    consecutiveDays >= ADVANCED_RECOVERY_THRESHOLDS.CONSECUTIVE_DAYS_MEDIUM ||
    fatigueScore >= ADVANCED_RECOVERY_THRESHOLDS.FATIGUE_SCORE_MEDIUM ||
    hasVolumeSpike
  ) {
    return 'medium';
  }

  // Low severity: 3+ consecutive days OR low-medium fatigue
  if (
    consecutiveDays >= ADVANCED_RECOVERY_THRESHOLDS.CONSECUTIVE_DAYS_LOW ||
    fatigueScore >= 0.3
  ) {
    return 'low';
  }

  // No recovery recommendation needed
  return null;
}

/**
 * Calculate recommended rest days based on severity and fatigue
 */
function calculateRecommendedRestDays(
  severity: 'low' | 'medium' | 'high',
  consecutiveDays: number,
  fatigueScore: number
): number {
  if (severity === 'high') {
    // High severity: 2-3 days rest
    return consecutiveDays >= 10 || fatigueScore >= 0.9 ? 3 : 2;
  }

  if (severity === 'medium') {
    // Medium severity: 1-2 days rest
    return consecutiveDays >= 6 || fatigueScore >= 0.7 ? 2 : 1;
  }

  // Low severity: 1 day rest
  return 1;
}

/**
 * Generate i18n key for recovery reasoning
 */
function generateRecoveryReasoning(
  severity: 'low' | 'medium' | 'high',
  consecutiveDays: number,
  hasVolumeSpike: boolean,
  highIntensity: boolean,
  muscleGroupOveruse: boolean
): string {
  // Primary reason based on severity
  if (severity === 'high') {
    if (consecutiveDays >= 7) {
      return `recovery.consecutive_high:${consecutiveDays}`;
    }
    return 'recovery.fatigue_high';
  }

  if (severity === 'medium') {
    if (hasVolumeSpike) {
      return 'recovery.volume_spike';
    }
    if (consecutiveDays >= 5) {
      return `recovery.consecutive_medium:${consecutiveDays}`;
    }
    if (muscleGroupOveruse) {
      return 'recovery.muscle_overuse';
    }
    return 'recovery.fatigue_medium';
  }

  // Low severity
  if (highIntensity && consecutiveDays >= 3) {
    return 'recovery.high_intensity';
  }
  
  return `recovery.consecutive_low:${consecutiveDays}`;
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
