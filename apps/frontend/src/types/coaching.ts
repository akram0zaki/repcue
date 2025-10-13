/**
 * TypeScript types for AI Coach feature
 * 
 * Defines interfaces for coaching insights, analytics data, personal records,
 * and muscle group balance tracking.
 */

/**
 * Type of coaching insight
 */
export type InsightType = 
  | 'streak'           // Workout streak tracking
  | 'muscle-balance'   // Muscle group balance analysis
  | 'progression'      // Progressive overload recommendations
  | 'recovery'         // Recovery time suggestions
  | 'milestone'        // Achievement milestones
  | 'personal-record'  // Personal record celebrations
  | 'motivation'       // Motivational messages
  | 'suggestion';      // Contextual workout suggestions

/**
 * Priority level for displaying insights
 */
export type InsightPriority = 'high' | 'medium' | 'low';

/**
 * Source of the insight (rule-based or AI-powered)
 */
export type InsightSource = 'rule' | 'ai';

/**
 * Action button configuration for insights
 */
export interface InsightAction {
  label: string;        // i18n key for button text
  action: string;       // Action identifier (e.g., 'start-workout', 'view-exercises')
  data?: unknown;       // Optional data payload for the action
}

/**
 * Core coaching insight structure
 */
export interface CoachingInsight {
  id: string;                    // Unique identifier
  type: InsightType;             // Type of insight
  priority: InsightPriority;     // Display priority
  source: InsightSource;         // How the insight was generated
  title: string;                 // i18n key for insight title
  message: string;               // i18n key for insight message
  icon?: string;                 // Icon identifier (e.g., 'fire', 'trophy', 'warning')
  iconColor?: string;            // Color class for icon (e.g., 'text-primary-500')
  createdAt: string;             // ISO timestamp
  expiresAt?: string;            // ISO timestamp (optional expiration)
  dismissible: boolean;          // Can user dismiss this insight?
  dismissed?: boolean;           // Has user dismissed this insight?
  actions?: InsightAction[];     // Optional action buttons
  metadata?: Record<string, unknown>; // Additional context-specific data
}

/**
 * Aggregated workout statistics for a time period
 */
export interface WorkoutStatistics {
  totalWorkouts: number;         // Total workouts completed
  totalDuration: number;         // Total time in seconds
  totalExercises: number;        // Total exercises performed
  totalReps: number;             // Total repetitions completed
  averageWorkoutDuration: number; // Average duration in seconds
  workoutsPerWeek: number;       // Average workouts per week
  mostActiveDay: string;         // Day of week (e.g., 'Monday')
  mostActiveCategory: string | null; // Most trained catalog ID
}

/**
 * Personal record for a specific exercise
 */
export interface PersonalRecord {
  id: string;                    // Unique identifier
  exerciseId: string;            // Exercise ID
  exerciseName: string;          // Exercise name (for display)
  recordType: 'max-reps' | 'max-sets' | 'max-duration' | 'max-weight';
  value: number;                 // Record value (reps/sets/seconds/kg)
  achievedAt: string;            // ISO timestamp
  workoutId?: string;            // Optional reference to workout
  previousRecord?: number;       // Previous record value (for comparison)
  improvementPercentage?: number; // Percentage improvement over previous
}

/**
 * Muscle group training balance
 */
export interface MuscleGroupBalance {
  muscleGroup: string;           // Muscle group name (e.g., 'chest', 'legs')
  workoutCount: number;          // Number of workouts targeting this group
  totalSets: number;             // Total sets performed
  totalReps: number;             // Total repetitions performed
  totalDuration: number;         // Total time in seconds
  percentage: number;            // Percentage of total training (0-100)
  lastTrainedAt?: string;        // ISO timestamp of last workout
  isOverTrained: boolean;        // Above 30% threshold
  isUnderTrained: boolean;       // Below 10% threshold
}

/**
 * Streak information
 */
export interface StreakData {
  currentStreak: number;         // Current consecutive days with workouts
  longestStreak: number;         // Longest streak ever achieved
  streakStartDate?: string;      // ISO timestamp of current streak start
  isActiveToday: boolean;        // Has user worked out today?
}

/**
 * Progressive overload recommendation (rep-based exercises)
 */
export interface ProgressionRecommendation {
  exerciseId: string;            // Exercise ID
  exerciseName: string;          // Exercise name (for display)
  currentSets: number;           // Current typical sets
  currentReps: number;           // Current typical reps
  recommendedSets: number;       // Recommended sets
  recommendedReps: number;       // Recommended reps
  confidence: number;            // Confidence score (0-1)
  reasoning: string;             // i18n key explaining the recommendation
  completionRate: number;        // Recent completion rate (0-1)
}

/**
 * Duration-based progression recommendation (time-based exercises)
 */
export interface DurationProgressionRecommendation {
  exerciseId: string;            // Exercise ID
  exerciseName: string;          // Exercise name (for display)
  currentSets: number;           // Current typical sets
  currentDuration: number;       // Current typical duration (seconds)
  recommendedSets: number;       // Recommended sets
  recommendedDuration: number;   // Recommended duration (seconds)
  confidence: number;            // Confidence score (0-1)
  reasoning: string;             // i18n key explaining the recommendation
  completionRate: number;        // Recent completion rate (0-1)
}

/**
 * Recovery recommendation
 */
export interface RecoveryRecommendation {
  daysTraining: number;          // Consecutive days of training
  recommendedRestDays: number;   // Suggested rest days
  severity: 'low' | 'medium' | 'high'; // Urgency level
  reasoning: string;             // i18n key explaining the recommendation
  affectedMuscleGroups?: string[]; // Muscle groups needing rest
}

/**
 * Cached AI insight (for Phase 2)
 */
export interface CachedAIInsight {
  id: string;                    // Unique identifier
  userId: string;                // User ID
  insightData: CoachingInsight[]; // Array of insights
  prompt: string;                // Prompt used to generate insights
  response: string;              // Raw AI response
  model: string;                 // AI model used (e.g., 'mistral-large-latest')
  tokensUsed: number;            // Token count for cost tracking
  createdAt: string;             // ISO timestamp
  expiresAt: string;             // ISO timestamp (24h cache)
}

/**
 * Settings for AI Coach features
 */
export interface CoachingSettings {
  enabled: boolean;              // Master toggle for AI Coach
  showOnHomePage: boolean;       // Display insights on home page
  notificationFrequency: 'daily' | 'weekly' | 'never'; // Notification cadence
  enableAI: boolean;             // Enable AI-powered insights (Phase 2)
  enableProgressionReminders: boolean; // Progressive overload suggestions
  enableRecoveryReminders: boolean;   // Recovery time warnings
  enableMilestones: boolean;     // Celebrate achievements and PRs
}

/**
 * Analytics summary for a time period
 */
export interface AnalyticsSummary {
  period: 'week' | 'month' | 'all-time'; // Time period
  startDate: string;             // ISO timestamp
  endDate: string;               // ISO timestamp
  statistics: WorkoutStatistics; // Aggregated stats
  streak: StreakData;            // Streak information
  muscleGroupBalance: MuscleGroupBalance[]; // Muscle group distribution
  personalRecords: PersonalRecord[]; // Records set in this period
  trends: {
    workoutFrequency: 'improving' | 'maintaining' | 'declining';
    consistency: number;         // 0-1 score
    variety: number;             // 0-1 score (exercise diversity)
  };
}
