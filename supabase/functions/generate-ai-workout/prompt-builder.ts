/**
 * Prompt Builder Module
 *
 * Constructs AI prompts from user profile and exercise catalog.
 * Includes:
 * - System prompt with professional coach persona
 * - User profile data
 * - Exercise catalog with ALL attributes
 * - Injury filtering instructions
 * - Output format specification (JSON schema)
 */

import type { Exercise } from './exercise-catalog.ts';
import { logDebug } from './logger.ts';

/**
 * User profile data from request
 */
export interface UserProfile {
  gender: 'male' | 'female' | 'other';
  age: number;
  height: {
    unit: 'cm' | 'ft';
    cm?: number;
    feet?: number;
    inches?: number;
  };
  weight: {
    unit: 'kg' | 'lbs';
    kg?: number;
    lbs?: number;
  };
  goal: 'weight_loss' | 'muscle_building' | 'health_maintenance' | 'flexibility';
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  trainingTime: '3-4' | '4-5' | '5-6' | '6+'; // days per week
  injuries?: string;
  trainingStyle: 'strength' | 'cardio' | 'balanced';
  timeAvailability: '15-30' | '30-45' | '45-60' | '60+'; // minutes per session
}

/**
 * Builds the system prompt with coach persona and instructions
 */
function buildSystemPrompt(): string {
  return `You are an experienced fitness coach creating personalized workout plans for RepCue, a fitness tracking app.

Your role is to:
1. Analyze the user's profile, goals, and constraints
2. Select appropriate exercises from the provided catalog
3. Create 1-3 personalized workout plans
4. Ensure workouts are safe, effective, and achievable

CRITICAL SAFETY RULES:
- **ALWAYS check exercise limitations** against user's reported injuries
- **EXCLUDE any exercise** whose limitations mention the user's injury keywords
- Example: If user reports "shoulder pain", exclude exercises with "shoulder" in limitations field
- Example: If user reports "knee injury", exclude exercises with "knee" in limitations field
- When in doubt, err on the side of caution and exclude the exercise

WORKOUT DESIGN PRINCIPLES:
1. **Fitness Level Matching**:
   - Beginners: Simple exercises, lower intensity, more rest
   - Intermediate: Moderate complexity, balanced intensity
   - Advanced: Complex movements, higher intensity, less rest

2. **Goal Alignment**:
   - Weight Loss: Higher cardio, moderate strength, circuit-style
   - Muscle Building: Heavy strength focus, progressive overload
   - Health Maintenance: Balanced mix, sustainability focus
   - Flexibility: Stretching, mobility, balance exercises

3. **Training Style**:
   - Strength: 70% strength/core, 30% flexibility/balance
   - Cardio: 70% cardio, 30% flexibility
   - Balanced: Even mix of all categories

4. **Time Constraints**:
   - Respect user's available time per session
   - Include warm-up and cool-down
   - Account for rest periods between sets

5. **Exercise Selection**:
   - Use exercise.benefits field to match user's goal
   - Check exercise.best_timing for optimal placement in workout
   - Use exercise.suggested_combinations for complementary exercises
   - Respect exercise.category for balanced workouts

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no explanations) with this exact structure:

{
  "workouts": [
    {
      "name": "Descriptive workout name",
      "description": "Brief description of workout focus and benefits",
      "exercises": [
        {
          "exerciseId": "exercise-id-from-catalog",
          "order": 1,
          "customSets": 3,
          "customReps": 12,
          "customDuration": 60,
          "customRestTime": 30
        }
      ],
      "scheduledDays": ["monday", "wednesday", "friday"],
      "estimatedDuration": 1800
    }
  ]
}

VALIDATION RULES:
- exerciseId MUST exist in provided catalog
- order starts at 1 and increments
- customSets/customReps for repetition_based exercises
- customDuration (seconds) for time_based exercises
- customRestTime in seconds (15-120s typical)
- scheduledDays match user's trainingTime
- estimatedDuration in seconds (include exercises + rest)
- Create 1-3 workouts depending on user's training frequency

Remember: User safety is paramount. When in doubt, exclude exercises that might conflict with injuries.`;
}

/**
 * Builds user profile section of prompt
 */
function buildUserProfileSection(profile: UserProfile): string {
  const heightStr = profile.height.unit === 'cm'
    ? `${profile.height.cm} cm`
    : `${profile.height.feet}'${profile.height.inches}"`;

  const weightStr = profile.weight.unit === 'kg'
    ? `${profile.weight.kg} kg`
    : `${profile.weight.lbs} lbs`;

  const goalLabels = {
    'weight_loss': 'Weight Loss',
    'muscle_building': 'Muscle Building',
    'health_maintenance': 'Health Maintenance',
    'flexibility': 'Flexibility & Mobility'
  };

  const levelLabels = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced'
  };

  const styleLabels = {
    'strength': 'Strength Training',
    'cardio': 'Cardio Focused',
    'balanced': 'Balanced Mix'
  };

  return `USER PROFILE:
- Gender: ${profile.gender}
- Age: ${profile.age} years
- Height: ${heightStr}
- Weight: ${weightStr}
- Primary Goal: ${goalLabels[profile.goal]}
- Fitness Level: ${levelLabels[profile.fitnessLevel]}
- Training Frequency: ${profile.trainingTime} days per week
- Time per Session: ${profile.timeAvailability} minutes
- Training Style: ${styleLabels[profile.trainingStyle]}
${profile.injuries ? `- Injuries/Limitations: ${profile.injuries}` : '- Injuries/Limitations: None reported'}`;
}

/**
 * Builds exercise catalog section with ALL attributes
 */
function buildExerciseCatalogSection(exercises: Exercise[]): string {
  let catalogText = '\nAVAILABLE EXERCISES:\n\n';

  for (const ex of exercises) {
    catalogText += `Exercise ID: ${ex.id}
Name: ${ex.name}
Description: ${ex.description || 'N/A'}
Category: ${ex.category}
Type: ${ex.exercise_type}
Catalog: ${ex.catalogId}
Difficulty: ${ex.difficulty_level || 'Not specified'}
${ex.exercise_type === 'repetition_based' ? `Default Sets: ${ex.default_sets || 3}\nDefault Reps: ${ex.default_reps || 10}` : ''}
${ex.exercise_type === 'time_based' ? `Default Duration: ${ex.default_duration || 60}s` : ''}
${ex.rep_duration_seconds ? `Rep Duration: ${ex.rep_duration_seconds}s` : ''}
Tags: ${ex.tags.join(', ') || 'None'}
Equipment: ${ex.equipment_needed?.join(', ') || 'None'}
Muscle Groups: ${ex.muscle_groups?.join(', ') || 'Not specified'}
Benefits: ${ex.benefits || 'Not specified'}
Limitations: ${ex.limitations || 'None'}
Best Timing: ${ex.best_timing || 'Anytime'}
Suggested Combinations: ${ex.suggested_combinations?.join(', ') || 'None'}
Notes: ${ex.notes || 'None'}

---

`;
  }

  return catalogText;
}

/**
 * Builds complete AI prompt
 *
 * @param profile - User profile data
 * @param exercises - Available exercises
 * @param correlationId - Correlation ID for logging
 * @returns Complete prompt string
 */
export function buildAIPrompt(
  profile: UserProfile,
  exercises: Exercise[],
  correlationId: string
): string {
  logDebug(correlationId, 'Building AI prompt', {
    exerciseCount: exercises.length,
    fitnessLevel: profile.fitnessLevel,
    goal: profile.goal,
    hasInjuries: !!profile.injuries
  });

  const systemPrompt = buildSystemPrompt();
  const userProfileSection = buildUserProfileSection(profile);
  const exerciseCatalogSection = buildExerciseCatalogSection(exercises);

  const fullPrompt = `${systemPrompt}

${userProfileSection}

${exerciseCatalogSection}

Based on the user profile and available exercises, create personalized workout plans.
Remember to:
1. Check exercise limitations against user's injuries: ${profile.injuries || 'No injuries reported'}
2. Match exercise benefits to user's goal: ${profile.goal}
3. Respect user's fitness level: ${profile.fitnessLevel}
4. Stay within time constraints: ${profile.timeAvailability} minutes per session
5. Follow training style preference: ${profile.trainingStyle}

Return ONLY the JSON response as specified in the output format above.`;

  logDebug(correlationId, 'AI prompt built', {
    promptLength: fullPrompt.length,
    hasInjurySection: !!profile.injuries
  });

  return fullPrompt;
}
