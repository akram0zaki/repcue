import type { Exercise } from '../types';
import { ExerciseCategory, ExerciseType } from '../types';

export const INITIAL_EXERCISES: Exercise[] = [
  // Core exercises - Research-based defaults for beginners to intermediate
  {
    id: 'plank',
    name: 'Plank',
    description: 'Hold your body in a straight line, supported by forearms and toes',
    category: ExerciseCategory.CORE,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // Beginner-friendly: 30 seconds (research shows 20-60s range)
    isFavorite: false,
  hasVideo: false,
    tags: ['isometric', 'core', 'stability']
  },
  {
    id: 'side-plank',
    name: 'Side Plank',
    description: 'Hold your body sideways, supported by one forearm',
    category: ExerciseCategory.CORE,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 20, // Harder than regular plank, shorter duration
    isFavorite: false,
  hasVideo: false,
    tags: ['isometric', 'core', 'obliques']
  },
  {
    id: 'mountain-climbers',
    name: 'Mountain Climbers',
    description: 'Alternate bringing knees to chest in plank position',
    category: ExerciseCategory.CORE,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // High intensity cardio movement
    isFavorite: false,
  hasVideo: false,
    tags: ['dynamic', 'core', 'cardio']
  },
  {
    id: 'bicycle-crunches',
    name: 'Bicycle Crunches',
    description: 'Alternate elbow to opposite knee in cycling motion',
    category: ExerciseCategory.CORE,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 3,
    defaultReps: 15, // Standard rep range for ab exercises
    isFavorite: false,
  hasVideo: true,
  repDurationSeconds: 1.1, // Slightly slower controlled reps
    tags: ['dynamic', 'core', 'obliques']
  },

  // Strength exercises - Based on fitness industry standards
  {
    id: 'push-ups',
    name: 'Push-ups',
    description: 'Lower and raise body using arms in prone position',
    category: ExerciseCategory.STRENGTH,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 3,
    defaultReps: 8, // Beginner to intermediate range (research shows 8-15 for strength)
    isFavorite: false,
  hasVideo: false,
  repDurationSeconds: 2,
    tags: ['upper-body', 'chest', 'arms']
  },
  {
    id: 'squats',
    name: 'Squats',
    description: 'Lower body by bending knees, then return to standing',
    category: ExerciseCategory.STRENGTH,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 3,
    defaultReps: 12, // Classic strength training rep range
    isFavorite: false,
  hasVideo: false,
  repDurationSeconds: 2,
    tags: ['lower-body', 'glutes', 'legs']
  },
  {
    id: 'lunges',
    name: 'Lunges',
    description: 'Step forward and lower body, alternating legs',
    category: ExerciseCategory.STRENGTH,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 3,
    defaultReps: 10, // Per leg, so 20 total alternating
    isFavorite: false,
  hasVideo: false,
  repDurationSeconds: 2,
    tags: ['lower-body', 'glutes', 'legs', 'balance']
  },
  {
    id: 'wall-sit',
    name: 'Wall Sit',
    description: 'Slide down wall until thighs parallel, hold position',
    category: ExerciseCategory.STRENGTH,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // Beginner-friendly isometric hold
    isFavorite: false,
  hasVideo: false,
    tags: ['isometric', 'lower-body', 'quads']
  },
  {
    id: 'burpees',
    name: 'Burpees',
    description: 'Squat, jump back to plank, push-up, jump feet back, jump up',
    category: ExerciseCategory.STRENGTH,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 3,
    defaultReps: 5, // Very demanding exercise, lower rep count
    isFavorite: false,
  hasVideo: false,
  repDurationSeconds: 3, // Slightly longer due to complexity
    tags: ['full-body', 'cardio', 'explosive']
  },

  // Cardio exercises - Time-based with research-backed durations
  {
    id: 'jumping-jacks',
    name: 'Jumping Jacks',
    description: 'Jump feet apart while raising arms, then jump back together',
    category: ExerciseCategory.CARDIO,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // Standard cardio interval
    isFavorite: false,
  hasVideo: false,
    tags: ['cardio', 'full-body', 'coordination']
  },
  {
    id: 'high-knees',
    name: 'High Knees',
    description: 'Run in place bringing knees up to chest level',
    category: ExerciseCategory.CARDIO,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // High intensity, shorter duration
    isFavorite: false,
  hasVideo: false,
    tags: ['cardio', 'lower-body', 'explosive']
  },
  {
    id: 'butt-kicks',
    name: 'Butt Kicks',
    description: 'Run in place kicking heels up toward glutes',
    category: ExerciseCategory.CARDIO,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // Consistent with other high-intensity cardio
    isFavorite: false,
  hasVideo: false,
    tags: ['cardio', 'lower-body', 'hamstrings']
  },

  // Flexibility exercises - Time-based holds as per yoga/stretching standards
  {
    id: 'downward-dog',
    name: 'Downward Dog',
    description: 'Form inverted V-shape with hands and feet on ground',
    category: ExerciseCategory.FLEXIBILITY,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // Standard yoga pose hold
    isFavorite: false,
  hasVideo: false,
    tags: ['yoga', 'stretch', 'shoulders', 'hamstrings']
  },
  {
    id: 'child-pose',
    name: "Child's Pose",
    description: 'Kneel and sit back on heels, extend arms forward on ground',
    category: ExerciseCategory.FLEXIBILITY,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 45, // Relaxation pose, longer hold
    isFavorite: false,
  hasVideo: false,
    tags: ['yoga', 'stretch', 'relaxation', 'back']
  },
  {
    id: 'cat-cow',
    name: 'Cat-Cow Stretch',
    description: 'Alternate arching and rounding spine on hands and knees',
    category: ExerciseCategory.FLEXIBILITY,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 2,
    defaultReps: 8, // Gentle mobility movement
    isFavorite: false,
  hasVideo: false,
  repDurationSeconds: 2,
    tags: ['yoga', 'stretch', 'spine', 'mobility']
  },

  // Balance exercises - Time-based holds for stability training
  {
    id: 'single-leg-stand',
    name: 'Single Leg Stand',
    description: 'Stand on one leg, hold for time, then switch',
    category: ExerciseCategory.BALANCE,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // Per leg
    isFavorite: false,
  hasVideo: false,
    tags: ['balance', 'stability', 'proprioception']
  },
  {
    id: 'tree-pose',
    name: 'Tree Pose',
    description: 'Stand on one leg with other foot on inner thigh',
    category: ExerciseCategory.BALANCE,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // Standard yoga balance pose
    isFavorite: false,
  hasVideo: false,
    tags: ['yoga', 'balance', 'stability', 'focus']
  },
  {
    id: 'warrior-3',
    name: 'Warrior III',
    description: 'Balance on one leg with other leg extended behind',
    category: ExerciseCategory.BALANCE,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 20, // More challenging, shorter hold
    isFavorite: false,
  hasVideo: false,
    tags: ['yoga', 'balance', 'strength', 'core']
  },

  // Additional popular exercises with proper classification
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    description: 'Lie on back, alternate extending opposite arm and leg',
    category: ExerciseCategory.CORE,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 3,
    defaultReps: 6, // Per side, 12 total alternating
    isFavorite: false,
  hasVideo: false,
  repDurationSeconds: 2,
    tags: ['core', 'stability', 'coordination']
  },
  {
    id: 'glute-bridges',
    name: 'Glute Bridges',
    description: 'Lie on back, lift hips by squeezing glutes',
    category: ExerciseCategory.STRENGTH,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 3,
    defaultReps: 12, // Standard strength training range
    isFavorite: false,
  hasVideo: false,
  repDurationSeconds: 2,
    tags: ['glutes', 'lower-body', 'posterior-chain']
  },

  // Hand warmup exercises - Time-based for mobility
  {
    id: 'finger-roll',
    name: 'Finger Roll',
    description: 'Roll fingers from fist to full extension, working each finger individually',
    category: ExerciseCategory.HAND_WARMUP, // Restored to proper category
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // Standard mobility/warmup duration
    isFavorite: false,
  hasVideo: false,
    tags: ['hands', 'fingers', 'warmup', 'mobility', 'dexterity']
  },

  // Additional strength exercises
  {
    id: 'tricep-dips',
    name: 'Tricep Dips',
    description: 'Lower and raise body using arm strength while seated on edge',
    category: ExerciseCategory.STRENGTH,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 3,
    defaultReps: 8, // Challenging upper body exercise
    isFavorite: false,
  hasVideo: false,
  repDurationSeconds: 2,
    tags: ['upper-body', 'triceps', 'arms', 'bodyweight']
  },
  {
    id: 'calf-raises',
    name: 'Calf Raises',
    description: 'Rise up onto toes, hold briefly, then lower back down',
    category: ExerciseCategory.STRENGTH,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 3,
    defaultReps: 15, // Higher reps for smaller muscle group
    isFavorite: false,
  hasVideo: false,
  repDurationSeconds: 2,
    tags: ['lower-body', 'calves', 'balance']
  },

  // Additional core exercises
  {
    id: 'russian-twists',
    name: 'Russian Twists',
    description: 'Sit with feet elevated, rotate torso side to side',
    category: ExerciseCategory.CORE,
    exerciseType: ExerciseType.REPETITION_BASED,
    defaultSets: 3,
    defaultReps: 16, // 8 per side
    isFavorite: false,
  hasVideo: false,
  repDurationSeconds: 2,
    tags: ['core', 'obliques', 'rotation']
  },
  {
    id: 'bear-crawl',
    name: 'Bear Crawl',
    description: 'Crawl forward on hands and feet, keeping knees off ground',
    category: ExerciseCategory.CORE,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // Full-body stability exercise
    isFavorite: false,
  hasVideo: false,
    tags: ['core', 'full-body', 'stability', 'cardio']
  },

  // Additional flexibility exercises
  {
    id: 'forward-fold',
    name: 'Forward Fold',
    description: 'Stand and bend forward, reaching toward toes',
    category: ExerciseCategory.FLEXIBILITY,
    exerciseType: ExerciseType.TIME_BASED,
    defaultDuration: 30, // Standard stretch hold
    isFavorite: false,
  hasVideo: false,
    tags: ['yoga', 'hamstrings', 'back', 'stretch']
  }
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