import type { Exercise } from '../../types';
import { ExerciseType } from '../../types';

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

/**
 * Tai Chi Catalog
 * Gentle flowing movements for balance, flexibility, and relaxation
 */
export const TAI_CHI_EXERCISES: Exercise[] = [
  createExercise({
    id: 'commencing-form',
    name: 'Commencing Form',
    description: 'Start position with feet shoulder-width apart, arms slowly raising and lowering.',
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'tai-chi',
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    tags: ['category:balance', 'tai-chi', 'breathing']
  }),
  createExercise({
    id: 'parting-wild-horses-mane',
    name: "Parting the Wild Horse’s Mane",
    description: 'Step forward with arms moving in flowing diagonal motions.',
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'tai-chi',
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    tags: ['category:balance', 'tai-chi', 'mobility', 'grace']
  }),
  createExercise({
    id: 'white-crane-spreads-wings',
    name: 'White Crane Spreads Its Wings',
    description: 'Shift weight and raise arms in a wing-like motion.',
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'tai-chi',
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    tags: ['category:balance', 'tai-chi', 'posture', 'upper-body']
  }),
  createExercise({
    id: 'brush-knee',
    name: 'Brush Knee and Push',
    description: 'Step forward, one hand pushes forward while the other brushes past the knee.',
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'tai-chi',
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    tags: ['category:balance', 'tai-chi', 'coordination', 'lower-body']
  }),
  createExercise({
    id: 'wave-hands-clouds',
    name: 'Wave Hands Like Clouds',
    description: 'Side step while arms make circular cloud-like motions.',
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'tai-chi',
    default_duration: 45,
    is_favorite: false,
    has_video: false,
    tags: ['category:balance', 'tai-chi', 'flow', 'mobility']
  }),
  createExercise({
    id: 'golden-rooster-stand',
    name: 'Golden Rooster Stands on One Leg',
    description: 'Stand on one leg while lifting the opposite knee and arm.',
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'tai-chi',
    default_duration: 20,
    is_favorite: false,
    has_video: false,
    tags: ['category:balance', 'tai-chi', 'focus']
  }),
];
