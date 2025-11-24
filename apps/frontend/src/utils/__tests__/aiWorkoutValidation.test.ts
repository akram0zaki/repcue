/**
 * Unit tests for AI workout validation utilities
 *
 * These tests ensure that form validation works correctly for all three screens
 * of the AI workout onboarding flow, including edge cases and boundary values.
 */

import { describe, it, expect } from 'vitest';
import {
  validateScreen1,
  validateScreen2,
  validateScreen3,
  sanitizeUserInput,
  hasErrors,
  getFirstError,
  VALIDATION,
} from '../aiWorkoutValidation';
import type { Screen1Data, Screen2Data, Screen3Data } from '../../types/aiWorkout';

describe('aiWorkoutValidation', () => {
  describe('sanitizeUserInput', () => {
    it('should remove HTML tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Hello World');
    });

    it('should remove dangerous characters', () => {
      const input = 'Normal text with {brackets} and [arrays] and <angles>';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Normal text with brackets and arrays and');
    });

    it('should preserve normal punctuation', () => {
      const input = 'Lower back pain, knee injury. Some issues!';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Lower back pain, knee injury. Some issues!');
    });

    it('should trim and collapse multiple spaces', () => {
      const input = '  Too    many    spaces  ';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Too many spaces');
    });

    it('should handle empty string', () => {
      const result = sanitizeUserInput('');
      expect(result).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(sanitizeUserInput(null as any)).toBe('');
      expect(sanitizeUserInput(undefined as any)).toBe('');
    });
  });

  describe('validateScreen1', () => {
    const validData: Screen1Data = {
      gender: 'male',
      age: 30,
      height: { value: 180, unit: 'cm' },
      weight: { value: 75, unit: 'kg' },
    };

    describe('gender validation', () => {
      it('should accept valid gender', () => {
        const errors = validateScreen1(validData);
        expect(errors.gender).toBeUndefined();
      });

      it('should reject missing gender', () => {
        const data = { ...validData, gender: undefined as any };
        const errors = validateScreen1(data);
        expect(errors.gender).toBe('Gender is required');
      });

      it('should reject invalid gender', () => {
        const data = { ...validData, gender: 'invalid' as any };
        const errors = validateScreen1(data);
        expect(errors.gender).toBe('Invalid gender selection');
      });
    });

    describe('age validation', () => {
      it('should accept valid age', () => {
        const errors = validateScreen1(validData);
        expect(errors.age).toBeUndefined();
      });

      it('should accept minimum age', () => {
        const data = { ...validData, age: VALIDATION.AGE_MIN };
        const errors = validateScreen1(data);
        expect(errors.age).toBeUndefined();
      });

      it('should accept maximum age', () => {
        const data = { ...validData, age: VALIDATION.AGE_MAX };
        const errors = validateScreen1(data);
        expect(errors.age).toBeUndefined();
      });

      it('should reject age below minimum', () => {
        const data = { ...validData, age: VALIDATION.AGE_MIN - 1 };
        const errors = validateScreen1(data);
        expect(errors.age).toContain('at least');
      });

      it('should reject age above maximum', () => {
        const data = { ...validData, age: VALIDATION.AGE_MAX + 1 };
        const errors = validateScreen1(data);
        expect(errors.age).toContain('or less');
      });

      it('should reject missing age', () => {
        const data = { ...validData, age: undefined as any };
        const errors = validateScreen1(data);
        expect(errors.age).toBe('Age is required');
      });

      it('should reject NaN age', () => {
        const data = { ...validData, age: NaN };
        const errors = validateScreen1(data);
        expect(errors.age).toBe('Age is required');
      });
    });

    describe('height validation (cm)', () => {
      it('should accept valid height in cm', () => {
        const errors = validateScreen1(validData);
        expect(errors.height).toBeUndefined();
      });

      it('should accept minimum height in cm', () => {
        const data = {
          ...validData,
          height: { value: VALIDATION.HEIGHT_CM_MIN, unit: 'cm' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toBeUndefined();
      });

      it('should accept maximum height in cm', () => {
        const data = {
          ...validData,
          height: { value: VALIDATION.HEIGHT_CM_MAX, unit: 'cm' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toBeUndefined();
      });

      it('should reject height below minimum in cm', () => {
        const data = {
          ...validData,
          height: { value: VALIDATION.HEIGHT_CM_MIN - 1, unit: 'cm' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toContain('at least');
      });

      it('should reject height above maximum in cm', () => {
        const data = {
          ...validData,
          height: { value: VALIDATION.HEIGHT_CM_MAX + 1, unit: 'cm' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toContain('or less');
      });
    });

    describe('height validation (ft-in)', () => {
      it('should accept valid height in ft-in', () => {
        const data = {
          ...validData,
          height: { value: 5, unit: 'ft-in' as const, inches: 10 },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toBeUndefined();
      });

      it('should accept minimum height in ft-in', () => {
        const data = {
          ...validData,
          height: { value: VALIDATION.HEIGHT_FT_MIN, unit: 'ft-in' as const, inches: 0 },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toBeUndefined();
      });

      it('should accept maximum height in ft-in', () => {
        const data = {
          ...validData,
          height: { value: VALIDATION.HEIGHT_FT_MAX, unit: 'ft-in' as const, inches: 0 },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toBeUndefined();
      });

      it('should reject height below minimum in ft-in', () => {
        const data = {
          ...validData,
          height: { value: VALIDATION.HEIGHT_FT_MIN - 1, unit: 'ft-in' as const, inches: 0 },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toContain('at least');
      });

      it('should reject height above maximum in ft-in', () => {
        const data = {
          ...validData,
          height: { value: VALIDATION.HEIGHT_FT_MAX + 1, unit: 'ft-in' as const, inches: 0 },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toContain('or less');
      });

      it('should reject inches below minimum', () => {
        const data = {
          ...validData,
          height: { value: 5, unit: 'ft-in' as const, inches: -1 },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toContain('between');
      });

      it('should reject inches above maximum', () => {
        const data = {
          ...validData,
          height: { value: 5, unit: 'ft-in' as const, inches: 12 },
        };
        const errors = validateScreen1(data);
        expect(errors.height).toContain('between');
      });
    });

    describe('weight validation (kg)', () => {
      it('should accept valid weight in kg', () => {
        const errors = validateScreen1(validData);
        expect(errors.weight).toBeUndefined();
      });

      it('should accept minimum weight in kg', () => {
        const data = {
          ...validData,
          weight: { value: VALIDATION.WEIGHT_KG_MIN, unit: 'kg' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.weight).toBeUndefined();
      });

      it('should accept maximum weight in kg', () => {
        const data = {
          ...validData,
          weight: { value: VALIDATION.WEIGHT_KG_MAX, unit: 'kg' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.weight).toBeUndefined();
      });

      it('should reject weight below minimum in kg', () => {
        const data = {
          ...validData,
          weight: { value: VALIDATION.WEIGHT_KG_MIN - 1, unit: 'kg' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.weight).toContain('at least');
      });

      it('should reject weight above maximum in kg', () => {
        const data = {
          ...validData,
          weight: { value: VALIDATION.WEIGHT_KG_MAX + 1, unit: 'kg' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.weight).toContain('or less');
      });
    });

    describe('weight validation (lbs)', () => {
      it('should accept valid weight in lbs', () => {
        const data = {
          ...validData,
          weight: { value: 165, unit: 'lbs' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.weight).toBeUndefined();
      });

      it('should accept minimum weight in lbs', () => {
        const data = {
          ...validData,
          weight: { value: VALIDATION.WEIGHT_LBS_MIN, unit: 'lbs' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.weight).toBeUndefined();
      });

      it('should accept maximum weight in lbs', () => {
        const data = {
          ...validData,
          weight: { value: VALIDATION.WEIGHT_LBS_MAX, unit: 'lbs' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.weight).toBeUndefined();
      });

      it('should reject weight below minimum in lbs', () => {
        const data = {
          ...validData,
          weight: { value: VALIDATION.WEIGHT_LBS_MIN - 1, unit: 'lbs' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.weight).toContain('at least');
      });

      it('should reject weight above maximum in lbs', () => {
        const data = {
          ...validData,
          weight: { value: VALIDATION.WEIGHT_LBS_MAX + 1, unit: 'lbs' as const },
        };
        const errors = validateScreen1(data);
        expect(errors.weight).toContain('or less');
      });
    });

    it('should return no errors for completely valid data', () => {
      const errors = validateScreen1(validData);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should return multiple errors for invalid data', () => {
      const data = {
        gender: undefined as any,
        age: undefined as any,
        height: undefined as any,
        weight: undefined as any,
      };
      const errors = validateScreen1(data);
      expect(Object.keys(errors).length).toBeGreaterThan(1);
    });
  });

  describe('validateScreen2', () => {
    const validData: Screen2Data = {
      goals: ['muscle_building'],
      fitnessLevel: 'intermediate',
      trainingTime: 'morning',
    };

    describe('goals validation', () => {
      it('should accept valid single goal', () => {
        const errors = validateScreen2(validData);
        expect(errors.goals).toBeUndefined();
      });

      it('should accept multiple valid goals', () => {
        const data: Screen2Data = {
          ...validData,
          goals: ['weight_loss', 'muscle_building', 'flexibility'],
        };
        const errors = validateScreen2(data);
        expect(errors.goals).toBeUndefined();
      });

      it('should accept all valid goals including marathon_des_sables', () => {
        const goals: FitnessGoal[] = [
          'weight_loss',
          'muscle_building',
          'health_maintenance',
          'flexibility',
          'marathon_des_sables',
        ];

        goals.forEach((goal) => {
          const errors = validateScreen2({ ...validData, goals: [goal] });
          expect(errors.goals).toBeUndefined();
        });
      });

      it('should reject empty goals array', () => {
        const data = { ...validData, goals: [] };
        const errors = validateScreen2(data);
        expect(errors.goals).toBe('At least one goal is required');
      });

      it('should reject missing goals', () => {
        const data = { ...validData, goals: undefined as any };
        const errors = validateScreen2(data);
        expect(errors.goals).toBe('At least one goal is required');
      });

      it('should reject invalid goal in array', () => {
        const data = { ...validData, goals: ['invalid' as any] };
        const errors = validateScreen2(data);
        expect(errors.goals).toBe('Invalid goal selection');
      });
    });

    describe('goalDuration validation', () => {
      it('should accept valid goal duration', () => {
        const data = { ...validData, goalDuration: 6 };
        const errors = validateScreen2(data);
        expect(errors.goalDuration).toBeUndefined();
      });

      it('should accept undefined goal duration (optional)', () => {
        const errors = validateScreen2(validData);
        expect(errors.goalDuration).toBeUndefined();
      });

      it('should reject goal duration less than 1', () => {
        const data = { ...validData, goalDuration: 0 };
        const errors = validateScreen2(data);
        expect(errors.goalDuration).toBe('Goal duration must be between 1 and 24 months');
      });

      it('should reject goal duration greater than 24', () => {
        const data = { ...validData, goalDuration: 25 };
        const errors = validateScreen2(data);
        expect(errors.goalDuration).toBe('Goal duration must be between 1 and 24 months');
      });

      it('should reject invalid goal duration (NaN)', () => {
        const data = { ...validData, goalDuration: NaN };
        const errors = validateScreen2(data);
        expect(errors.goalDuration).toBe('Goal duration must be between 1 and 24 months');
      });
    });

    describe('fitness level validation', () => {
      it('should accept valid fitness level', () => {
        const errors = validateScreen2(validData);
        expect(errors.fitnessLevel).toBeUndefined();
      });

      it('should accept all valid fitness levels', () => {
        const levels: Array<Screen2Data['fitnessLevel']> = ['beginner', 'intermediate', 'advanced'];

        levels.forEach((fitnessLevel) => {
          const errors = validateScreen2({ ...validData, fitnessLevel });
          expect(errors.fitnessLevel).toBeUndefined();
        });
      });

      it('should reject missing fitness level', () => {
        const data = { ...validData, fitnessLevel: undefined as any };
        const errors = validateScreen2(data);
        expect(errors.fitnessLevel).toBe('Fitness level is required');
      });

      it('should reject invalid fitness level', () => {
        const data = { ...validData, fitnessLevel: 'invalid' as any };
        const errors = validateScreen2(data);
        expect(errors.fitnessLevel).toBe('Invalid fitness level selection');
      });
    });

    describe('training time validation', () => {
      it('should accept valid training time', () => {
        const errors = validateScreen2(validData);
        expect(errors.trainingTime).toBeUndefined();
      });

      it('should accept all valid training times', () => {
        const times: Array<Screen2Data['trainingTime']> = ['morning', 'afternoon', 'evening', 'mixed'];

        times.forEach((trainingTime) => {
          const errors = validateScreen2({ ...validData, trainingTime });
          expect(errors.trainingTime).toBeUndefined();
        });
      });

      it('should reject missing training time', () => {
        const data = { ...validData, trainingTime: undefined as any };
        const errors = validateScreen2(data);
        expect(errors.trainingTime).toBe('Preferred training time is required');
      });

      it('should reject invalid training time', () => {
        const data = { ...validData, trainingTime: 'invalid' as any };
        const errors = validateScreen2(data);
        expect(errors.trainingTime).toBe('Invalid training time selection');
      });
    });

    it('should return no errors for completely valid data', () => {
      const errors = validateScreen2(validData);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('validateScreen3', () => {
    const validData: Screen3Data = {
      injuries: 'Lower back pain',
      trainingStyle: 'balanced',
      timeAvailability: '30-45',
    };

    describe('injuries validation', () => {
      it('should accept valid injuries text', () => {
        const errors = validateScreen3(validData);
        expect(errors.injuries).toBeUndefined();
      });

      it('should accept empty injuries (optional field)', () => {
        const data = { ...validData, injuries: '' };
        const errors = validateScreen3(data);
        expect(errors.injuries).toBeUndefined();
      });

      it('should reject injuries exceeding max length', () => {
        const data = {
          ...validData,
          injuries: 'a'.repeat(VALIDATION.INJURIES_MAX_LENGTH + 1),
        };
        const errors = validateScreen3(data);
        expect(errors.injuries).toContain('characters or less');
      });

      it('should accept injuries at max length', () => {
        const data = {
          ...validData,
          injuries: 'a'.repeat(VALIDATION.INJURIES_MAX_LENGTH),
        };
        const errors = validateScreen3(data);
        expect(errors.injuries).toBeUndefined();
      });
    });

    describe('training style validation', () => {
      it('should accept valid training style', () => {
        const errors = validateScreen3(validData);
        expect(errors.trainingStyle).toBeUndefined();
      });

      it('should accept all valid training styles', () => {
        const styles: Array<Screen3Data['trainingStyle']> = ['strength', 'cardio', 'balanced'];

        styles.forEach((trainingStyle) => {
          const errors = validateScreen3({ ...validData, trainingStyle });
          expect(errors.trainingStyle).toBeUndefined();
        });
      });

      it('should reject missing training style', () => {
        const data = { ...validData, trainingStyle: undefined as any };
        const errors = validateScreen3(data);
        expect(errors.trainingStyle).toBe('Training style is required');
      });

      it('should reject invalid training style', () => {
        const data = { ...validData, trainingStyle: 'invalid' as any };
        const errors = validateScreen3(data);
        expect(errors.trainingStyle).toBe('Invalid training style selection');
      });
    });

    describe('time availability validation', () => {
      it('should accept valid time availability', () => {
        const errors = validateScreen3(validData);
        expect(errors.timeAvailability).toBeUndefined();
      });

      it('should accept all valid time availabilities', () => {
        const times: Array<Screen3Data['timeAvailability']> = ['15-30', '30-45', '45-60', '60+'];

        times.forEach((timeAvailability) => {
          const errors = validateScreen3({ ...validData, timeAvailability });
          expect(errors.timeAvailability).toBeUndefined();
        });
      });

      it('should reject missing time availability', () => {
        const data = { ...validData, timeAvailability: undefined as any };
        const errors = validateScreen3(data);
        expect(errors.timeAvailability).toBe('Time availability is required');
      });

      it('should reject invalid time availability', () => {
        const data = { ...validData, timeAvailability: 'invalid' as any };
        const errors = validateScreen3(data);
        expect(errors.timeAvailability).toBe('Invalid time availability selection');
      });
    });

    it('should return no errors for completely valid data', () => {
      const errors = validateScreen3(validData);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('hasErrors', () => {
    it('should return false for empty errors object', () => {
      expect(hasErrors({})).toBe(false);
    });

    it('should return true for errors object with errors', () => {
      expect(hasErrors({ age: 'Age is required' })).toBe(true);
    });
  });

  describe('getFirstError', () => {
    it('should return undefined for empty errors object', () => {
      expect(getFirstError({})).toBeUndefined();
    });

    it('should return first error message', () => {
      const errors = { age: 'Age is required', gender: 'Gender is required' };
      const firstError = getFirstError(errors);
      expect(firstError).toBeDefined();
      expect(['Age is required', 'Gender is required']).toContain(firstError);
    });
  });
});
