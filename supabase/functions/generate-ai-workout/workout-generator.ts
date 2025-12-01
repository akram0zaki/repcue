/**
 * Workout Generator Module
 *
 * Orchestrates the AI workout generation process:
 * 1. Fetch exercise catalog
 * 2. Filter exercises based on user profile
 * 3. Build AI prompt
 * 4. Call AI provider
 * 5. Parse and validate AI response
 * 6. Generate workout objects with metadata
 */

import { fetchExerciseCatalog, filterExercisesForUser, type Exercise } from './exercise-catalog.ts';
import { buildAIPrompt, type UserProfile } from './prompt-builder.ts';
import { generateAICompletion } from './ai-client.ts';
import { logError, logInfo, logDebug, logWarn } from './logger.ts';
import { logAIUsage, type TokenUsage } from '../_shared/usage-logger.ts';

/**
 * Generated workout structure (matches frontend Workout type)
 */
interface GeneratedWorkout {
  id: string;
  name: string;
  description: string;
  exercises: Array<{
    exerciseId: string;
    order: number;
    customSets?: number;
    customReps?: number;
    customDuration?: number;
    customRestTime?: number;
  }>;
  scheduledDays?: string[];
  estimatedDuration: number;
  metadata: {
    aiGenerated: boolean;
    generatedAt: string;
    generationParams: {
      goals: Array<'weight_loss' | 'muscle_building' | 'health_maintenance' | 'flexibility' | 'marathon_des_sables'>;
      goalDuration?: number;
      fitnessLevel: string;
      trainingStyle: string;
      timeAvailability: string;
    };
  };
}

/**
 * AI response structure
 */
interface AIWorkoutResponse {
  workouts: Array<{
    name: string;
    description: string;
    exercises: Array<{
      exerciseId: string;
      order: number;
      customSets?: number;
      customReps?: number;
      customDuration?: number;
      customRestTime?: number;
    }>;
    scheduledDays?: string[];
    estimatedDuration: number;
  }>;
  feedback?: string;
}

/**
 * Generates a UUID v4
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Validates AI response structure
 */
function validateAIResponse(response: any, availableExercises: Exercise[], correlationId: string): boolean {
  if (!response || typeof response !== 'object') {
    logError(correlationId, 'AI response is not an object', { response });
    return false;
  }

  if (!Array.isArray(response.workouts)) {
    logError(correlationId, 'AI response missing workouts array', { response });
    return false;
  }

  if (response.workouts.length === 0) {
    logError(correlationId, 'AI response contains zero workouts', { response });
    return false;
  }

  const exerciseIds = new Set(availableExercises.map(ex => ex.id));

  for (const workout of response.workouts) {
    // Validate workout structure
    if (!workout.name || typeof workout.name !== 'string') {
      logError(correlationId, 'Workout missing name', { workout });
      return false;
    }

    if (!Array.isArray(workout.exercises) || workout.exercises.length === 0) {
      logError(correlationId, 'Workout missing exercises array', { workout });
      return false;
    }

    if (typeof workout.estimatedDuration !== 'number' || workout.estimatedDuration <= 0) {
      logError(correlationId, 'Workout missing or invalid estimatedDuration', { workout });
      return false;
    }

    // Validate exercises
    for (const exercise of workout.exercises) {
      if (!exercise.exerciseId || !exerciseIds.has(exercise.exerciseId)) {
        logError(correlationId, 'Exercise has invalid exerciseId', {
          exerciseId: exercise.exerciseId,
          workout: workout.name
        });
        return false;
      }

      if (typeof exercise.order !== 'number' || exercise.order < 1) {
        logError(correlationId, 'Exercise has invalid order', { exercise });
        return false;
      }
    }

    // Validate scheduledDays (optional)
    if (workout.scheduledDays) {
      if (!Array.isArray(workout.scheduledDays)) {
        logError(correlationId, 'scheduledDays is not an array', { workout });
        return false;
      }

      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of workout.scheduledDays) {
        if (!validDays.includes(day.toLowerCase())) {
          logError(correlationId, 'Invalid day in scheduledDays', { day, workout });
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Parses AI response from text (handles JSON extraction)
 */
function parseAIResponse(aiResponseText: string, correlationId: string): AIWorkoutResponse | null {
  try {
    // Try direct JSON parse first
    const parsed = JSON.parse(aiResponseText);
    return parsed;
  } catch (firstError) {
    logWarn(correlationId, 'Direct JSON parse failed, attempting extraction', {
      error: firstError.message
    });

    // Try to extract JSON from markdown code blocks or text
    const jsonMatch = aiResponseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        logInfo(correlationId, 'Successfully extracted JSON from markdown block', {});
        return parsed;
      } catch (secondError) {
        logError(correlationId, 'Failed to parse extracted JSON', {
          error: secondError.message
        });
      }
    }

    // Try to find JSON object in text
    const objectMatch = aiResponseText.match(/\{[\s\S]*\}/);
    if (objectMatch && objectMatch[0]) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        logInfo(correlationId, 'Successfully extracted JSON from text', {});
        return parsed;
      } catch (thirdError) {
        logError(correlationId, 'Failed to parse extracted JSON object', {
          error: thirdError.message
        });
      }
    }

    logError(correlationId, 'Could not extract valid JSON from AI response', {
      responsePreview: aiResponseText.substring(0, 200)
    });
    return null;
  }
}

/**
 * Converts AI response to GeneratedWorkout objects
 */
function convertToGeneratedWorkouts(
  aiResponse: AIWorkoutResponse,
  userProfile: UserProfile,
  correlationId: string
): GeneratedWorkout[] {
  const now = new Date().toISOString();

  return aiResponse.workouts.map(workout => ({
    id: generateUUID(),
    name: workout.name,
    description: workout.description || '',
    exercises: workout.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      order: ex.order,
      customSets: ex.customSets,
      customReps: ex.customReps,
      customDuration: ex.customDuration,
      customRestTime: ex.customRestTime
    })),
    scheduledDays: workout.scheduledDays,
    estimatedDuration: workout.estimatedDuration,
    metadata: {
      aiGenerated: true,
      generatedAt: now,
      generationParams: {
        goals: userProfile.goals,
        goalDuration: userProfile.goalDuration,
        fitnessLevel: userProfile.fitnessLevel,
        trainingStyle: userProfile.trainingStyle,
        timeAvailability: userProfile.timeAvailability
      }
    }
  }));
}

/**
 * Main workout generation function
 *
 * @param request - User request with profile data
 * @param userId - User ID for logging
 * @param correlationId - Correlation ID for request tracking
 * @returns Object with workouts array and optional feedback message
 */
export async function generateWorkouts(
  request: { responses: any; locale: string },
  userId: string,
  correlationId: string
): Promise<{ workouts: GeneratedWorkout[]; feedback?: string }> {
  logInfo(correlationId, 'Starting workout generation', { userId });

  // Step 1: Fetch exercise catalog (filtered by user's catalog access)
  logDebug(correlationId, 'Fetching exercise catalog', {});
  const allExercises = await fetchExerciseCatalog(userId, correlationId);

  if (!allExercises || allExercises.length === 0) {
    throw new Error('Exercise catalog is empty');
  }

  logInfo(correlationId, 'Exercise catalog fetched', { count: allExercises.length });

  // Step 2: Filter exercises based on user profile
  const userProfile: UserProfile = {
    gender: request.responses.gender,
    age: request.responses.age,
    height: request.responses.height,
    weight: request.responses.weight,
    goals: request.responses.goals,
    goalDuration: request.responses.goalDuration,
    fitnessLevel: request.responses.fitnessLevel,
    trainingTime: request.responses.trainingTime,
    injuries: request.responses.injuries,
    trainingStyle: request.responses.trainingStyle,
    timeAvailability: request.responses.timeAvailability,
    locale: request.locale
  };

  const filteredExercises = filterExercisesForUser(allExercises, userProfile, correlationId);

  if (filteredExercises.length < 10) {
    logWarn(correlationId, 'Very few exercises available after filtering', {
      count: filteredExercises.length
    });
    // Use all exercises if filtering resulted in too few
    filteredExercises.push(...allExercises.slice(0, Math.max(0, 20 - filteredExercises.length)));
  }

  logInfo(correlationId, 'Exercises filtered for user', {
    availableCount: filteredExercises.length
  });

  // Step 3: Build AI prompt
  const prompt = buildAIPrompt(userProfile, filteredExercises, correlationId);

  // Step 4: Call AI provider
  const aiStartTime = Date.now();
  logInfo(correlationId, 'Calling AI provider', {});

  let aiResult;
  let aiProcessingTime = 0;

  try {
    aiResult = await generateAICompletion(
      prompt,
      {
        maxTokens: 4096,
        temperature: 0.7,
        timeout: 60000
      },
      correlationId
    );

    aiProcessingTime = Date.now() - aiStartTime;

    // Step 4a: Log AI usage (non-blocking)
    const provider = Deno.env.get('AI_PROVIDER') || 'anthropic';
    const usage: TokenUsage = {
      input_tokens: aiResult.usage.prompt_tokens,
      output_tokens: aiResult.usage.completion_tokens,
      total_tokens: aiResult.usage.total_tokens,
    };

    await logAIUsage({
      correlationId,
      userId,
      provider,
      model: aiResult.model,
      usage,
      processingTimeMs: aiProcessingTime,
      success: true,
      requestType: 'workout_generation',
      logInfo,
      logWarn,
      logError
    });

  } catch (error) {
    aiProcessingTime = Date.now() - aiStartTime;

    // Log failed AI usage if we have partial data
    const provider = Deno.env.get('AI_PROVIDER') || 'anthropic';
    if (error.usage) {
      const usage: TokenUsage = {
        input_tokens: error.usage.prompt_tokens || 0,
        output_tokens: error.usage.completion_tokens || 0,
        total_tokens: error.usage.total_tokens || 0,
      };

      await logAIUsage({
        correlationId,
        userId,
        provider,
        model: error.model || 'unknown',
        usage,
        processingTimeMs: aiProcessingTime,
        success: false,
        errorCode: error.code || 'AI_GENERATION_ERROR',
        requestType: 'workout_generation',
        logInfo,
        logWarn,
        logError
      });
    }

    throw error;
  }

  const aiResponseText = aiResult.completion;

  // Step 5: Parse AI response
  logDebug(correlationId, 'Parsing AI response', { responseLength: aiResponseText.length });
  const parsedResponse = parseAIResponse(aiResponseText, correlationId);

  if (!parsedResponse) {
    throw new Error('Failed to parse AI response into valid JSON');
  }

  // Step 6: Validate AI response
  const isValid = validateAIResponse(parsedResponse, filteredExercises, correlationId);

  if (!isValid) {
    throw new Error('AI response failed validation');
  }

  logInfo(correlationId, 'AI response validated successfully', {
    workoutCount: parsedResponse.workouts.length
  });

  // Step 7: Convert to GeneratedWorkout objects
  const workouts = convertToGeneratedWorkouts(parsedResponse, userProfile, correlationId);

  logInfo(correlationId, 'Workout generation completed', {
    userId,
    workoutCount: workouts.length,
    totalExercises: workouts.reduce((sum, w) => sum + w.exercises.length, 0)
  });

  // Future: optionally return AI feedback/coaching tips when provider supports it
  // Return workouts with optional feedback
  return {
    workouts,
    feedback: parsedResponse.feedback
  };
}
