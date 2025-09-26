import type { Exercise } from '../../types';
import { ExerciseCategory, ExerciseType } from '../../types';

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
 * Zumba Catalog
 * Dance-based cardio moves inspired by Latin and international music
 */
export const ZUMBA_EXERCISES: Exercise[] = [
  createExercise({
    id: 'basic-merengue',
    name: 'Basic Merengue Step',
    description: 'March in place with hip movement and arm swings to music.',
    category: ExerciseCategory.CARDIO,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'zumba',
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    tags: ['zumba', 'cardio', 'latin']
  }),
  createExercise({
    id: 'salsa-step',
    name: 'Salsa Step',
    description: 'Step forward and back or side-to-side with rhythmic hip motion.',
    category: ExerciseCategory.CARDIO,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'zumba',
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    tags: ['zumba', 'cardio', 'salsa']
  }),
  createExercise({
    id: 'cumbia-step',
    name: 'Cumbia Step',
    description: 'Step behind with one foot, alternating sides with hip sway.',
    category: ExerciseCategory.CARDIO,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'zumba',
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    tags: ['zumba', 'latin', 'coordination']
  }),
  createExercise({
    id: 'reggaeton-stomp',
    name: 'Reggaeton Stomp',
    description: 'Strong stomping and upper-body movements to urban beats.',
    category: ExerciseCategory.CARDIO,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'zumba',
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    tags: ['zumba', 'reggaeton', 'hip-hop']
  }),
  createExercise({
    id: 'bachata-step',
    name: 'Bachata Step',
    description: 'Side steps with hip sway and a tap on every fourth beat.',
    category: ExerciseCategory.CARDIO,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'zumba',
    default_duration: 30,
    is_favorite: false,
    has_video: false,
    tags: ['zumba', 'bachata', 'latin']
  }),
  createExercise({
    id: 'cooldown-latin',
    name: 'Latin Dance Cooldown',
    description: 'Gentle side-to-side steps with arm stretches and breathing.',
    category: ExerciseCategory.FLEXIBILITY,
    exercise_type: ExerciseType.TIME_BASED,
    catalogId: 'zumba',
    default_duration: 45,
    is_favorite: false,
    has_video: false,
    tags: ['zumba', 'stretch', 'cooldown']
  }),
];
