import type { Exercise } from '../types';
import { ExerciseCategory, ExerciseType } from '../types';

/**
 * Helper function to create an exercise with default sync metadata
 */
function createExercise(exerciseData: Omit<Exercise, 'id' | 'updated_at' | 'created_at' | 'deleted' | 'version' | 'dirty' | 'op' | 'synced_at' | 'owner_id'> & { id: string }): Exercise {
  return {
    ...exerciseData,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0
  };
}

export const INITIAL_EXERCISES: Exercise[] = [
  // Core exercises - Research-based defaults for beginners to intermediate
  createExercise({
    id: 'plank',
    name: 'Plank',
    description: 'Hold your body in a straight line, supported by forearms and toes',
    category: ExerciseCategory.CORE,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Beginner-friendly: 30 seconds (research shows 20-60s range)
    is_favorite: false,
    has_video: true,
    tags: ['isometric', 'core', 'stability']
  }),
  createExercise({
    id: 'side-plank',
    name: 'Side Plank',
    description: 'Hold your body sideways, supported by one forearm',
    category: ExerciseCategory.CORE,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 20, // Harder than regular plank, shorter duration
    is_favorite: false,
    has_video: true,
    tags: ['isometric', 'core', 'obliques']
  }),
  createExercise({
    id: 'mountain-climbers',
    name: 'Mountain Climbers',
    description: 'Alternate bringing knees to chest in plank position',
    category: ExerciseCategory.CORE,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // High intensity cardio movement
    is_favorite: false,
   has_video: false,
    tags: ['dynamic', 'core', 'cardio']
  }),
  createExercise({
    id: 'bicycle-crunches',
    name: 'Bicycle Crunches',
    description: 'Alternate elbow to opposite knee in cycling motion',
    category: ExerciseCategory.CORE,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 15, // Standard rep range for ab exercises
    is_favorite: false,
    has_video: true,
    rep_duration_seconds: 1.1, // Slightly slower controlled reps
    tags: ['dynamic', 'core', 'obliques']
  }),

  // Strength exercises - Based on fitness industry standards
  createExercise({
    id: 'push-ups',
    name: 'Push-ups',
    description: 'Lower and raise body using arms in prone position',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 8, // Beginner to intermediate range (research shows 8-15 for strength)
    is_favorite: false,
    has_video: true,
    rep_duration_seconds: 2.86,
    tags: ['upper-body', 'chest', 'arms']
  }),
  createExercise({
    id: 'squats',
    name: 'Squats',
    description: 'Lower body by bending knees, then return to standing',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 12, // Classic strength training rep range
    is_favorite: false,
    has_video: false,
    rep_duration_seconds: 2,
    tags: ['lower-body', 'glutes', 'legs']
  }),
  createExercise({
    id: 'lunges',
    name: 'Lunges',
    description: 'Step forward and lower body, alternating legs',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 10, // Per leg, so 20 total alternating
    is_favorite: false,
    has_video: false,
    rep_duration_seconds: 2,
    tags: ['lower-body', 'glutes', 'legs', 'balance']
  }),
  createExercise({
    id: 'wall-sit',
    name: 'Wall Sit',
    description: 'Slide down wall until thighs parallel, hold position',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Beginner-friendly isometric hold
    is_favorite: false,
    has_video: false,
    tags: ['isometric', 'lower-body', 'quads']
  }),
  createExercise({
    id: 'burpees',
    name: 'Burpees',
    description: 'Squat, jump back to plank, push-up, jump feet back, jump up',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 5, // Very demanding exercise, lower rep count
    is_favorite: false,
    has_video: true,
    rep_duration_seconds: 4.2, // Slightly longer due to complexity
    tags: ['full-body', 'cardio', 'explosive']
  }),

  // Cardio exercises - Time-based with research-backed durations
  createExercise({
    id: 'jumping-jacks',
    name: 'Jumping Jacks',
    description: 'Jump feet apart while raising arms, then jump back together',
    category: ExerciseCategory.CARDIO,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Standard cardio interval
    is_favorite: false,
    has_video: true,
    rep_duration_seconds: 1.5,
    tags: ['cardio', 'full-body', 'coordination']
  }),
  createExercise({
    id: 'high-knees',
    name: 'High Knees',
    description: 'Run in place bringing knees up to chest level',
    category: ExerciseCategory.CARDIO,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // High intensity, shorter duration
    is_favorite: false,
  has_video: false,
    tags: ['cardio', 'lower-body', 'explosive']
  }),
  createExercise({
    id: 'butt-kicks',
    name: 'Butt Kicks',
    description: 'Run in place kicking heels up toward glutes',
    category: ExerciseCategory.CARDIO,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Consistent with other high-intensity cardio
    is_favorite: false,
  has_video: false,
    tags: ['cardio', 'lower-body', 'hamstrings']
  }),

  // Flexibility exercises - Time-based holds as per yoga/stretching standards
  createExercise({
    id: 'downward-dog',
    name: 'Downward Dog',
    description: 'Form inverted V-shape with hands and feet on ground',
    category: ExerciseCategory.FLEXIBILITY,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Standard yoga pose hold
    is_favorite: false,
  has_video: false,
    tags: ['yoga', 'stretch', 'shoulders', 'hamstrings']
  }),
  createExercise({
    id: 'child-pose',
    name: "Child's Pose",
    description: 'Kneel and sit back on heels, extend arms forward on ground',
    category: ExerciseCategory.FLEXIBILITY,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 45, // Relaxation pose, longer hold
    is_favorite: false,
  has_video: false,
    tags: ['yoga', 'stretch', 'relaxation', 'back']
  }),
  createExercise({
    id: 'cat-cow',
    name: 'Cat-Cow Stretch',
    description: 'Alternate arching and rounding spine on hands and knees',
    category: ExerciseCategory.FLEXIBILITY,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 2,
    default_reps: 8, // Gentle mobility movement
    is_favorite: false,
  has_video: false,
  rep_duration_seconds: 2,
    tags: ['yoga', 'stretch', 'spine', 'mobility']
  }),

  // Balance exercises - Time-based holds for stability training
  createExercise({
    id: 'single-leg-stand',
    name: 'Single Leg Stand',
    description: 'Stand on one leg, hold for time, then switch',
    category: ExerciseCategory.BALANCE,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Per leg
    is_favorite: false,
  has_video: false,
    tags: ['balance', 'stability', 'proprioception']
  }),
  createExercise({
    id: 'tree-pose',
    name: 'Tree Pose',
    description: 'Stand on one leg with other foot on inner thigh',
    category: ExerciseCategory.BALANCE,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Standard yoga balance pose
    is_favorite: false,
  has_video: false,
    tags: ['yoga', 'balance', 'stability', 'focus']
  }),
  createExercise({
    id: 'warrior-3',
    name: 'Warrior III',
    description: 'Balance on one leg with other leg extended behind',
    category: ExerciseCategory.BALANCE,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 20, // More challenging, shorter hold
    is_favorite: false,
  has_video: false,
    tags: ['yoga', 'balance', 'strength', 'core']
  }),

  // Additional popular exercises with proper classification
  createExercise({
    id: 'dead-bug',
    name: 'Dead Bug',
    description: 'Lie on back, alternate extending opposite arm and leg',
    category: ExerciseCategory.CORE,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 6, // Per side, 12 total alternating
    is_favorite: false,
  has_video: false,
  rep_duration_seconds: 2,
    tags: ['core', 'stability', 'coordination']
  }),
  createExercise({
    id: 'glute-bridges',
    name: 'Glute Bridges',
    description: 'Lie on back, lift hips by squeezing glutes',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 12, // Standard strength training range
    is_favorite: false,
  has_video: false,
  rep_duration_seconds: 2,
    tags: ['glutes', 'lower-body', 'posterior-chain']
  }),

  // Hand warmup exercises - Time-based for mobility
  createExercise({
    id: 'finger-roll',
    name: 'Finger Roll',
    description: 'Roll fingers from fist to full extension, working each finger individually',
    category: ExerciseCategory.HAND_WARMUP, // Restored to proper category
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Standard mobility/warmup duration
    is_favorite: false,
  has_video: false,
    tags: ['hands', 'fingers', 'warmup', 'mobility', 'dexterity']
  }),

  // Additional strength exercises
  createExercise({
    id: 'tricep-dips',
    name: 'Tricep Dips',
    description: 'Lower and raise body using arm strength while seated on edge',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 8, // Challenging upper body exercise
    is_favorite: false,
  has_video: false,
  rep_duration_seconds: 2,
    tags: ['upper-body', 'triceps', 'arms', 'bodyweight']
  }),
  createExercise({
    id: 'calf-raises',
    name: 'Calf Raises',
    description: 'Rise up onto toes, hold briefly, then lower back down',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 15, // Higher reps for smaller muscle group
    is_favorite: false,
  has_video: false,
  rep_duration_seconds: 2,
    tags: ['lower-body', 'calves', 'balance']
  }),

  // Additional core exercises
  createExercise({
    id: 'russian-twists',
    name: 'Russian Twists',
    description: 'Sit with feet elevated, rotate torso side to side',
    category: ExerciseCategory.CORE,
    exercise_type: ExerciseType.REPETITION_BASED,
    default_sets: 3,
    default_reps: 16, // 8 per side
    is_favorite: false,
  has_video: false,
  rep_duration_seconds: 2,
    tags: ['core', 'obliques', 'rotation']
  }),
  createExercise({
    id: 'bear-crawl',
    name: 'Bear Crawl',
    description: 'Crawl forward on hands and feet, keeping knees off ground',
    category: ExerciseCategory.CORE,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Full-body stability exercise
    is_favorite: false,
  has_video: false,
    tags: ['core', 'full-body', 'stability', 'cardio']
  }),

  // Additional flexibility exercises
  createExercise({
    id: 'forward-fold',
    name: 'Forward Fold',
    description: 'Stand and bend forward, reaching toward toes',
    category: ExerciseCategory.FLEXIBILITY,
    exercise_type: ExerciseType.TIME_BASED,
    default_duration: 30, // Standard stretch hold
    is_favorite: false,
  has_video: false,
    tags: ['yoga', 'hamstrings', 'back', 'stretch']
  })
];

// Helper functions for exercise management
export const getExercisesByCategory = (category: ExerciseCategory): Exercise[] => {
  return INITIAL_EXERCISES.filter(exercise => exercise.category === category);
};

export const getFavoriteExercises = (exercises: Exercise[]): Exercise[] => {
  return exercises.filter(exercise => exercise.isFavorite);
};

export const searchExercises = (exercises: Exercise[], query: string): Exercise[] => {
  const lowercaseQuery = query.toLowerCase();
  return exercises.filter(exercise => 
    exercise.name.toLowerCase().includes(lowercaseQuery) ||
    exercise.description.toLowerCase().includes(lowercaseQuery) ||
    exercise.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

export const getExerciseById = (exerciseId: string): Exercise | undefined => {
  return INITIAL_EXERCISES.find(exercise => exercise.id === exerciseId);
}; 