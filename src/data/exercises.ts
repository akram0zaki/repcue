import type { Exercise } from '../types';
import { ExerciseCategory } from '../types';

export const INITIAL_EXERCISES: Exercise[] = [
  // Core exercises
  {
    id: 'plank',
    name: 'Plank',
    description: 'Hold your body in a straight line, supported by forearms and toes',
    category: ExerciseCategory.CORE,
    defaultDuration: 60,
    isFavorite: false,
    tags: ['isometric', 'core', 'stability']
  },
  {
    id: 'side-plank',
    name: 'Side Plank',
    description: 'Hold your body sideways, supported by one forearm',
    category: ExerciseCategory.CORE,
    defaultDuration: 30,
    isFavorite: false,
    tags: ['isometric', 'core', 'obliques']
  },
  {
    id: 'mountain-climbers',
    name: 'Mountain Climbers',
    description: 'Alternate bringing knees to chest in plank position',
    category: ExerciseCategory.CORE,
    defaultDuration: 45,
    isFavorite: false,
    tags: ['dynamic', 'core', 'cardio']
  },
  {
    id: 'bicycle-crunches',
    name: 'Bicycle Crunches',
    description: 'Alternate elbow to opposite knee in cycling motion',
    category: ExerciseCategory.CORE,
    defaultDuration: 45,
    isFavorite: false,
    tags: ['dynamic', 'core', 'obliques']
  },

  // Strength exercises
  {
    id: 'push-ups',
    name: 'Push-ups',
    description: 'Lower and raise body using arms in prone position',
    category: ExerciseCategory.STRENGTH,
    defaultDuration: 60,
    isFavorite: false,
    tags: ['upper-body', 'chest', 'arms']
  },
  {
    id: 'squats',
    name: 'Squats',
    description: 'Lower body by bending knees, then return to standing',
    category: ExerciseCategory.STRENGTH,
    defaultDuration: 60,
    isFavorite: false,
    tags: ['lower-body', 'glutes', 'legs']
  },
  {
    id: 'lunges',
    name: 'Lunges',
    description: 'Step forward and lower body, alternating legs',
    category: ExerciseCategory.STRENGTH,
    defaultDuration: 60,
    isFavorite: false,
    tags: ['lower-body', 'glutes', 'legs', 'balance']
  },
  {
    id: 'wall-sit',
    name: 'Wall Sit',
    description: 'Slide down wall until thighs parallel, hold position',
    category: ExerciseCategory.STRENGTH,
    defaultDuration: 45,
    isFavorite: false,
    tags: ['isometric', 'lower-body', 'quads']
  },
  {
    id: 'burpees',
    name: 'Burpees',
    description: 'Squat, jump back to plank, push-up, jump feet back, jump up',
    category: ExerciseCategory.STRENGTH,
    defaultDuration: 45,
    isFavorite: false,
    tags: ['full-body', 'cardio', 'explosive']
  },

  // Cardio exercises
  {
    id: 'jumping-jacks',
    name: 'Jumping Jacks',
    description: 'Jump feet apart while raising arms, then jump back together',
    category: ExerciseCategory.CARDIO,
    defaultDuration: 60,
    isFavorite: false,
    tags: ['cardio', 'full-body', 'coordination']
  },
  {
    id: 'high-knees',
    name: 'High Knees',
    description: 'Run in place bringing knees up to chest level',
    category: ExerciseCategory.CARDIO,
    defaultDuration: 45,
    isFavorite: false,
    tags: ['cardio', 'lower-body', 'explosive']
  },
  {
    id: 'butt-kicks',
    name: 'Butt Kicks',
    description: 'Run in place kicking heels up toward glutes',
    category: ExerciseCategory.CARDIO,
    defaultDuration: 45,
    isFavorite: false,
    tags: ['cardio', 'lower-body', 'hamstrings']
  },

  // Flexibility exercises
  {
    id: 'downward-dog',
    name: 'Downward Dog',
    description: 'Form inverted V-shape with hands and feet on ground',
    category: ExerciseCategory.FLEXIBILITY,
    defaultDuration: 30,
    isFavorite: false,
    tags: ['yoga', 'stretch', 'shoulders', 'hamstrings']
  },
  {
    id: 'child-pose',
    name: "Child's Pose",
    description: 'Kneel and sit back on heels, extend arms forward on ground',
    category: ExerciseCategory.FLEXIBILITY,
    defaultDuration: 30,
    isFavorite: false,
    tags: ['yoga', 'stretch', 'relaxation', 'back']
  },
  {
    id: 'cat-cow',
    name: 'Cat-Cow Stretch',
    description: 'Alternate arching and rounding spine on hands and knees',
    category: ExerciseCategory.FLEXIBILITY,
    defaultDuration: 45,
    isFavorite: false,
    tags: ['yoga', 'stretch', 'spine', 'mobility']
  },

  // Balance exercises
  {
    id: 'single-leg-stand',
    name: 'Single Leg Stand',
    description: 'Stand on one leg, hold for time, then switch',
    category: ExerciseCategory.BALANCE,
    defaultDuration: 30,
    isFavorite: false,
    tags: ['balance', 'stability', 'proprioception']
  },
  {
    id: 'tree-pose',
    name: 'Tree Pose',
    description: 'Stand on one leg with other foot on inner thigh',
    category: ExerciseCategory.BALANCE,
    defaultDuration: 30,
    isFavorite: false,
    tags: ['yoga', 'balance', 'stability', 'focus']
  },
  {
    id: 'warrior-3',
    name: 'Warrior III',
    description: 'Balance on one leg with other leg extended behind',
    category: ExerciseCategory.BALANCE,
    defaultDuration: 20,
    isFavorite: false,
    tags: ['yoga', 'balance', 'strength', 'core']
  },

  // Additional popular exercises
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    description: 'Lie on back, alternate extending opposite arm and leg',
    category: ExerciseCategory.CORE,
    defaultDuration: 45,
    isFavorite: false,
    tags: ['core', 'stability', 'coordination']
  },
  {
    id: 'glute-bridges',
    name: 'Glute Bridges',
    description: 'Lie on back, lift hips by squeezing glutes',
    category: ExerciseCategory.STRENGTH,
    defaultDuration: 45,
    isFavorite: false,
    tags: ['glutes', 'lower-body', 'posterior-chain']
  },

  // Hand warmup exercises
  {
    id: 'finger-roll',
    name: 'Finger Roll',
    description: 'Roll fingers from fist to full extension, working each finger individually',
    category: ExerciseCategory.HAND_WARMUP,
    defaultDuration: 30,
    isFavorite: false,
    tags: ['hands', 'fingers', 'warmup', 'mobility', 'dexterity']
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