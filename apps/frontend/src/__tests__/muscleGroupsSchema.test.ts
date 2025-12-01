/**
 * Muscle Groups Schema Validation Test
 *
 * Verifies that all exercises in the general-fitness catalog have the muscle_groups field populated.
 * This is a critical test to ensure the muscle balance analytics feature works correctly.
 *
 * Run with: pnpm test muscleGroupsSchema
 */

import { describe, it, expect } from 'vitest';
import { INITIAL_EXERCISES } from '../data/exercises';

// Filter to get only general-fitness exercises
const GENERAL_FITNESS_EXERCISES = INITIAL_EXERCISES.filter(ex => ex.catalogId === 'general-fitness');

describe('Exercise Schema - Muscle Groups Field', () => {
  describe('General Fitness Catalog', () => {
    it('should have exercises in the catalog', () => {
      expect(GENERAL_FITNESS_EXERCISES.length).toBeGreaterThan(0);
    });

    it('should have muscle_groups field on all exercises', () => {
      const exercisesWithoutMuscleGroups = GENERAL_FITNESS_EXERCISES.filter(
        ex => !ex.muscle_groups || ex.muscle_groups.length === 0
      );

      if (exercisesWithoutMuscleGroups.length > 0) {
        console.error('Exercises missing muscle_groups:',
          exercisesWithoutMuscleGroups.map(ex => ({ id: ex.id, name: ex.name }))
        );
      }

      expect(exercisesWithoutMuscleGroups).toHaveLength(0);
    });

    it('should have valid muscle group values', () => {
      const validMuscleGroups = [
        'core', 'abs', 'obliques', 'shoulders', 'chest', 'triceps',
        'quads', 'glutes', 'hamstrings', 'calves', 'cardio', 'legs',
        'flexibility', 'back', 'hips', 'balance', 'full-body', 'hands',
        'mobility', 'adductors', 'hip-flexors', 'upper-back', 'biceps',
        'lats', 'lower-back', 'forearms', 'traps', 'neck'
      ];

      GENERAL_FITNESS_EXERCISES.forEach(exercise => {
        exercise.muscle_groups?.forEach(muscle => {
          expect(validMuscleGroups,
            `Exercise "${exercise.name}" (${exercise.id}) has invalid muscle_groups value: "${muscle}"`
          ).toContain(muscle);
        });
      });
    });

    describe('Core Exercises', () => {
      it('plank should target core, abs, and shoulders', () => {
        const plank = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'plank');

        expect(plank).toBeDefined();
        expect(plank?.muscle_groups).toContain('core');
        expect(plank?.muscle_groups).toContain('abs');
        expect(plank?.muscle_groups).toContain('shoulders');
      });

      it('side-plank should target core, obliques, and shoulders', () => {
        const sidePlank = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'side-plank');

        expect(sidePlank).toBeDefined();
        expect(sidePlank?.muscle_groups).toContain('core');
        expect(sidePlank?.muscle_groups).toContain('obliques');
        expect(sidePlank?.muscle_groups).toContain('shoulders');
      });

      it('bicycle-crunches should target core, abs, and obliques', () => {
        const bicycleCrunches = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'bicycle-crunches');

        expect(bicycleCrunches).toBeDefined();
        expect(bicycleCrunches?.muscle_groups).toContain('core');
        expect(bicycleCrunches?.muscle_groups).toContain('abs');
        expect(bicycleCrunches?.muscle_groups).toContain('obliques');
      });

      it('mountain-climbers should target core, shoulders, legs, and cardio', () => {
        const mountainClimbers = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'mountain-climbers');

        expect(mountainClimbers).toBeDefined();
        expect(mountainClimbers?.muscle_groups).toContain('core');
        expect(mountainClimbers?.muscle_groups).toContain('shoulders');
        expect(mountainClimbers?.muscle_groups).toContain('legs');
        expect(mountainClimbers?.muscle_groups).toContain('cardio');
      });
    });

    describe('Strength Exercises', () => {
      it('push-ups should target chest, shoulders, triceps, and core', () => {
        const pushups = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'push-ups');

        expect(pushups).toBeDefined();
        expect(pushups?.muscle_groups).toContain('chest');
        expect(pushups?.muscle_groups).toContain('shoulders');
        expect(pushups?.muscle_groups).toContain('triceps');
        expect(pushups?.muscle_groups).toContain('core');
      });

      it('squats should target quads, glutes, hamstrings, and core', () => {
        const squats = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'squats');

        expect(squats).toBeDefined();
        expect(squats?.muscle_groups).toContain('quads');
        expect(squats?.muscle_groups).toContain('glutes');
        expect(squats?.muscle_groups).toContain('hamstrings');
        expect(squats?.muscle_groups).toContain('core');
      });

      it('lunges should target quads, glutes, hamstrings, and calves', () => {
        const lunges = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'lunges');

        expect(lunges).toBeDefined();
        expect(lunges?.muscle_groups).toContain('quads');
        expect(lunges?.muscle_groups).toContain('glutes');
        expect(lunges?.muscle_groups).toContain('hamstrings');
        expect(lunges?.muscle_groups).toContain('calves');
      });
    });

    describe('Cardio Exercises', () => {
      it('jumping-jacks should target cardio, legs, and shoulders', () => {
        const jumpingJacks = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'jumping-jacks');

        expect(jumpingJacks).toBeDefined();
        expect(jumpingJacks?.muscle_groups).toContain('cardio');
        expect(jumpingJacks?.muscle_groups).toContain('legs');
        expect(jumpingJacks?.muscle_groups).toContain('shoulders');
      });

      it('high-knees should target cardio, legs, and core', () => {
        const highKnees = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'high-knees');

        expect(highKnees).toBeDefined();
        expect(highKnees?.muscle_groups).toContain('cardio');
        expect(highKnees?.muscle_groups).toContain('legs');
        expect(highKnees?.muscle_groups).toContain('core');
      });

      it('burpees should target full-body with specific muscle groups', () => {
        const burpees = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'burpees');

        expect(burpees).toBeDefined();
        expect(burpees?.muscle_groups).toContain('full-body');
        expect(burpees?.muscle_groups).toContain('chest');
        expect(burpees?.muscle_groups).toContain('shoulders');
        expect(burpees?.muscle_groups).toContain('legs');
        expect(burpees?.muscle_groups).toContain('core');
        expect(burpees?.muscle_groups).toContain('cardio');
      });
    });

    describe('Flexibility Exercises', () => {
      it('downward-dog should target flexibility, hamstrings, shoulders, and back', () => {
        const downwardDog = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'downward-dog');

        expect(downwardDog).toBeDefined();
        expect(downwardDog?.muscle_groups).toContain('flexibility');
        expect(downwardDog?.muscle_groups).toContain('hamstrings');
        expect(downwardDog?.muscle_groups).toContain('shoulders');
        expect(downwardDog?.muscle_groups).toContain('back');
      });

      it('child-pose should target flexibility, back, and hips', () => {
        const childPose = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'child-pose');

        expect(childPose).toBeDefined();
        expect(childPose?.muscle_groups).toContain('flexibility');
        expect(childPose?.muscle_groups).toContain('back');
        expect(childPose?.muscle_groups).toContain('hips');
      });

      it('forward-fold should target flexibility, hamstrings, and back', () => {
        const forwardFold = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'forward-fold');

        expect(forwardFold).toBeDefined();
        expect(forwardFold?.muscle_groups).toContain('flexibility');
        expect(forwardFold?.muscle_groups).toContain('hamstrings');
        expect(forwardFold?.muscle_groups).toContain('back');
      });
    });

    describe('Balance Exercises', () => {
      it('single-leg-stand should target balance, legs, and core', () => {
        const singleLegStand = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'single-leg-stand');

        expect(singleLegStand).toBeDefined();
        expect(singleLegStand?.muscle_groups).toContain('balance');
        expect(singleLegStand?.muscle_groups).toContain('legs');
        expect(singleLegStand?.muscle_groups).toContain('core');
      });

      it('tree-pose should target balance, legs, core, and hips', () => {
        const treePose = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'tree-pose');

        expect(treePose).toBeDefined();
        expect(treePose?.muscle_groups).toContain('balance');
        expect(treePose?.muscle_groups).toContain('legs');
        expect(treePose?.muscle_groups).toContain('core');
        expect(treePose?.muscle_groups).toContain('hips');
      });

      it('warrior-3 should target balance, legs, glutes, back, and core', () => {
        const warrior3 = GENERAL_FITNESS_EXERCISES.find(ex => ex.id === 'warrior-3');

        expect(warrior3).toBeDefined();
        expect(warrior3?.muscle_groups).toContain('balance');
        expect(warrior3?.muscle_groups).toContain('legs');
        expect(warrior3?.muscle_groups).toContain('glutes');
        expect(warrior3?.muscle_groups).toContain('back');
        expect(warrior3?.muscle_groups).toContain('core');
      });
    });

    describe('Summary Statistics', () => {
      it('should show distribution of muscle groups across all exercises', () => {
        const muscleGroupCounts = new Map<string, number>();

        GENERAL_FITNESS_EXERCISES.forEach(exercise => {
          exercise.muscle_groups?.forEach(muscle => {
            muscleGroupCounts.set(muscle, (muscleGroupCounts.get(muscle) || 0) + 1);
          });
        });

        // Sort by frequency (descending)
        const sortedGroups = Array.from(muscleGroupCounts.entries())
          .sort((a, b) => b[1] - a[1]);

        console.log('\n📊 Muscle Group Distribution:');
        sortedGroups.forEach(([muscle, count]) => {
          const percentage = ((count / GENERAL_FITNESS_EXERCISES.length) * 100).toFixed(1);
          console.log(`  ${muscle}: ${count} exercises (${percentage}%)`);
        });

        // Verify core muscle groups have good coverage
        expect(muscleGroupCounts.get('core')).toBeGreaterThan(5);
        expect(muscleGroupCounts.get('legs')).toBeGreaterThan(3);
        expect(muscleGroupCounts.get('shoulders')).toBeGreaterThan(3);
      });
    });
  });
});
