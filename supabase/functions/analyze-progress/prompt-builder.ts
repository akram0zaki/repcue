/**
 * Prompt Builder Module for AI Progress Analysis
 *
 * Constructs AI prompts from user analytics data to generate personalized coaching insights.
 * Includes:
 * - System prompt with fitness coach persona
 * - User analytics summary
 * - Workout history and trends
 * - Output format specification (JSON schema)
 */

import { logDebug } from './logger.ts';

/**
 * User analytics data for progress analysis
 */
export interface UserAnalyticsData {
  // Workout statistics (last 30 days)
  totalWorkouts: number;
  totalDuration: number; // seconds
  totalExercises: number;
  totalReps: number;
  averageWorkoutDuration: number; // seconds
  workoutsPerWeek: number;
  mostActiveDay: string;
  mostActiveCategory: string | null;

  // Streak data
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;

  // Muscle group balance
  muscleGroupBalance: Array<{
    muscleGroup: string;
    workoutCount: number;
    percentage: number;
    isOverTrained: boolean;
    isUnderTrained: boolean;
    lastTrainedAt: string;
  }>;

  // Trends (comparing this week vs last week)
  weekOverWeekChange?: {
    workouts: number; // percentage change
    duration: number; // percentage change
    exercises: number; // percentage change
  };

  // User locale for localized responses
  locale: string;

  // User ID for personalization
  userId: string;
}

/**
 * Builds the system prompt with AI coach persona and instructions
 */
function buildSystemPrompt(): string {
  return `You are an experienced AI fitness coach analyzing a user's training progress in RepCue, a fitness tracking app.

Your role is to:
1. Analyze the user's workout statistics and trends
2. Identify strengths and areas for improvement
3. Provide 3-5 actionable insights and recommendations
4. Motivate and encourage the user
5. Suggest specific improvements to training balance, consistency, or progression

ANALYSIS PRINCIPLES:
1. **Progress Recognition**: Celebrate achievements (streaks, consistency, volume increases)
2. **Balance Assessment**: Check muscle group distribution for imbalances
3. **Consistency Evaluation**: Analyze workout frequency and identify gaps
4. **Progression Opportunities**: Suggest when user is ready for increased intensity
5. **Recovery Guidance**: Warn about overtraining or insufficient rest
6. **Motivation**: Provide context-aware encouragement

INSIGHT CATEGORIES:
- **streak**: About workout consistency and streaks
- **balance**: About muscle group distribution and training balance
- **progress**: About performance improvements and trends
- **suggestion**: Specific workout or exercise recommendations
- **celebration**: Milestone achievements and personal records
- **recovery**: Rest and recovery recommendations

TONE & STYLE:
- Supportive and encouraging
- Evidence-based and specific
- Action-oriented with clear next steps
- Respectful of user's effort and progress
- Culturally sensitive and inclusive

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no explanations) with this exact structure:

{
  "insights": [
    {
      "type": "streak" | "balance" | "progress" | "suggestion" | "celebration" | "recovery",
      "title": "Short, compelling title (max 60 characters)",
      "message": "Detailed insight message with specific data and recommendations (max 200 characters)",
      "priority": "high" | "medium" | "low",
      "actionable": true | false,
      "actionText": "Optional: Specific action user can take (e.g., 'Try 2 more reps', 'Add leg exercises')",
      "data": {
        // Optional: Supporting data for the insight
        // Examples: { "currentStreak": 5, "targetStreak": 7 }
        // or { "undertrainedGroups": ["legs", "core"] }
      }
    }
  ],
  "overallTrend": "improving" | "maintaining" | "declining",
  "keyStrength": "Brief description of user's main strength",
  "primaryRecommendation": "One clear action item the user should focus on"
}

VALIDATION RULES:
- Generate 3-5 insights (minimum 3, maximum 5)
- At least one insight must be actionable (actionable: true)
- Prioritize insights: high (1-2), medium (2-3), low (0-2)
- Keep titles concise and impactful
- Messages should be specific with data when relevant
- Include actionText for actionable insights
- overallTrend based on week-over-week changes
- keyStrength should highlight user's best attribute
- primaryRecommendation should be the single most important action

Remember: Be encouraging and specific. Use actual data from the user's analytics to personalize insights.`;
}

/**
 * Builds user analytics section of prompt
 */
function buildAnalyticsSection(data: UserAnalyticsData): string {
  // Format duration for readability
  const totalHours = Math.floor(data.totalDuration / 3600);
  const totalMinutes = Math.floor((data.totalDuration % 3600) / 60);
  const avgMinutes = Math.floor(data.averageWorkoutDuration / 60);

  // Muscle group summary
  const overtrainedGroups = data.muscleGroupBalance
    .filter(mg => mg.isOverTrained)
    .map(mg => mg.muscleGroup);
  const undertrainedGroups = data.muscleGroupBalance
    .filter(mg => mg.isUnderTrained)
    .map(mg => mg.muscleGroup);
  
  let trendSummary = 'No week-over-week data available';
  if (data.weekOverWeekChange) {
    const wowChange = data.weekOverWeekChange;
    const parts: string[] = [];
    if (wowChange.workouts !== 0) {
      parts.push(`Workouts: ${wowChange.workouts > 0 ? '+' : ''}${wowChange.workouts.toFixed(1)}%`);
    }
    if (wowChange.duration !== 0) {
      parts.push(`Duration: ${wowChange.duration > 0 ? '+' : ''}${wowChange.duration.toFixed(1)}%`);
    }
    if (wowChange.exercises !== 0) {
      parts.push(`Exercises: ${wowChange.exercises > 0 ? '+' : ''}${wowChange.exercises.toFixed(1)}%`);
    }
    trendSummary = parts.length > 0 ? parts.join(', ') : 'Maintaining previous week\'s level';
  }

  return `USER ANALYTICS (Last 30 Days):

WORKOUT STATISTICS:
- Total Workouts: ${data.totalWorkouts}
- Total Duration: ${totalHours}h ${totalMinutes}m
- Unique Exercises: ${data.totalExercises}
- Total Reps Completed: ${data.totalReps}
- Average Workout Length: ${avgMinutes} minutes
- Workouts per Week: ${data.workoutsPerWeek.toFixed(1)}
- Most Active Day: ${data.mostActiveDay}
${data.mostActiveCategory ? `- Most Active Category: ${data.mostActiveCategory}` : ''}

CONSISTENCY:
- Current Streak: ${data.currentStreak} day${data.currentStreak !== 1 ? 's' : ''}
- Longest Streak: ${data.longestStreak} day${data.longestStreak !== 1 ? 's' : ''}
- Active Today: ${data.isActiveToday ? 'Yes ✓' : 'No'}

MUSCLE GROUP BALANCE:
${data.muscleGroupBalance.length > 0 ? data.muscleGroupBalance
  .map(mg => `- ${mg.muscleGroup}: ${mg.workoutCount} workouts (${mg.percentage.toFixed(1)}%) ${mg.isOverTrained ? '[OVERTRAINED]' : mg.isUnderTrained ? '[UNDERTRAINED]' : ''}`)
  .join('\n') : '- No muscle group data available'}

${overtrainedGroups.length > 0 ? `\n⚠️ Overtrained Groups: ${overtrainedGroups.join(', ')}` : ''}
${undertrainedGroups.length > 0 ? `\n⚠️ Undertrained Groups: ${undertrainedGroups.join(', ')}` : ''}

TRENDS (This Week vs Last Week):
${trendSummary}
`;
}

/**
 * Builds complete AI prompt for progress analysis
 *
 * @param data - User analytics data
 * @param correlationId - Correlation ID for logging
 * @returns Complete prompt string
 */
export function buildProgressAnalysisPrompt(
  data: UserAnalyticsData,
  correlationId: string
): string {
  logDebug(correlationId, 'Building progress analysis prompt', {
    totalWorkouts: data.totalWorkouts,
    currentStreak: data.currentStreak,
    muscleGroupCount: data.muscleGroupBalance.length,
    locale: data.locale
  });

  const systemPrompt = buildSystemPrompt();
  const analyticsSection = buildAnalyticsSection(data);

  const fullPrompt = `${systemPrompt}

${analyticsSection}

Based on the user's analytics data, generate 3-5 personalized coaching insights.

IMPORTANT - LANGUAGE REQUIREMENT:
The user's preferred language is: ${data.locale}
You MUST generate ALL insight titles and messages in this language.
- For locale 'ar' or 'ar-EG': Use Arabic (العربية)
- For locale 'fr': Use French (Français)
- For locale 'de': Use German (Deutsch)
- For locale 'es': Use Spanish (Español)
- For locale 'nl': Use Dutch (Nederlands)
- For locale 'fy': Use Frisian (Frysk)
- For locale 'en' or any other: Use English

ANALYSIS FOCUS AREAS:
1. Is the user maintaining consistency? (streak: ${data.currentStreak} days)
2. Are workouts balanced across muscle groups? (${data.muscleGroupBalance.length} groups tracked)
3. Is the user progressing compared to last week? (trend: ${data.weekOverWeekChange ? 'available' : 'N/A'})
4. Should the user rest or increase intensity?
5. What specific actions can improve their training?

Return ONLY the JSON response as specified in the output format above.`;

  logDebug(correlationId, 'Progress analysis prompt built', {
    promptLength: fullPrompt.length,
    userId: data.userId
  });

  return fullPrompt;
}
