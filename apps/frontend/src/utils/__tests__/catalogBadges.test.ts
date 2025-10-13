/**
 * Unit tests for catalog badge utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getCatalogBadges,
  discoverBadgeValues,
  matchesBadgeFilter,
  getBadgeValuesForCatalog,
  extractExerciseBadges,
  getExerciseCategory,
} from '../catalogBadges';
import type { Exercise, CatalogBadge } from '../../types';

describe('catalogBadges utilities', () => {
  describe('getCatalogBadges', () => {
    it('should return badges for aikido catalog', () => {
      const badges = getCatalogBadges('aikido');
      expect(badges).toBeDefined();
      expect(badges.length).toBeGreaterThan(0);
      expect(badges.some(b => b.id === 'kyuLevel')).toBe(true);
      expect(badges.some(b => b.id === 'category')).toBe(true);
    });

    it('should return badges for general-fitness catalog', () => {
      const badges = getCatalogBadges('general-fitness');
      expect(badges).toBeDefined();
      expect(badges.length).toBeGreaterThan(0);
      expect(badges.some(b => b.id === 'equipment')).toBe(true);
      expect(badges.some(b => b.id === 'intensity')).toBe(true);
    });

    it('should return empty array for catalog without badges', () => {
      const badges = getCatalogBadges('non-existent-catalog');
      expect(badges).toEqual([]);
    });
  });

  describe('discoverBadgeValues', () => {
    const exercises: Exercise[] = [
      {
        id: 'ex-1',
        name: 'Test 1',
        catalogId: 'general-fitness',
        tags: ['category:strength', 'equipment:bodyweight'],
        exercise_type: 'repetition_based',
        default_sets: 3,
        default_reps: 10,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        version: 1,
        deleted: false,
      },
      {
        id: 'ex-2',
        name: 'Test 2',
        catalogId: 'general-fitness',
        tags: ['category:cardio', 'equipment:dumbbells'],
        exercise_type: 'time_based',
        default_duration: 600,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        version: 1,
        deleted: false,
      },
    ];

    it('should discover values from tags with prefix', () => {
      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        dynamicDiscovery: true,
        tagPattern: { prefix: 'equipment:' },
      };

      const values = discoverBadgeValues(exercises, badge, 'general-fitness');
      expect(values).toHaveLength(2);
      expect(values.map(v => v.id).sort()).toEqual(['bodyweight', 'dumbbells']);
    });

    it('should discover values using regex pattern', () => {
      const badge: CatalogBadge = {
        id: 'category',
        label: 'Category',
        dynamicDiscovery: true,
        tagPattern: {
          prefix: 'category:',
          extractPattern: /^category:(.+)$/,
        },
      };

      const values = discoverBadgeValues(exercises, badge, 'general-fitness');
      expect(values).toHaveLength(2);
      expect(values.map(v => v.id).sort()).toEqual(['cardio', 'strength']);
    });

    it('should filter by catalogId', () => {
      const exercisesMultipleCatalogs: Exercise[] = [
        ...exercises,
        {
          id: 'ex-3',
          name: 'Aikido Test',
          catalogId: 'aikido',
          tags: ['equipment:none'],
          exercise_type: 'time_based',
          default_duration: 300,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          version: 1,
          deleted: false,
        },
      ];

      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        dynamicDiscovery: true,
        tagPattern: { prefix: 'equipment:' },
      };

      const values = discoverBadgeValues(exercisesMultipleCatalogs, badge, 'general-fitness');
      expect(values).toHaveLength(2);
      expect(values.map(v => v.id)).not.toContain('none');
    });

    it('should return predefined values when not using dynamic discovery', () => {
      const badge: CatalogBadge = {
        id: 'intensity',
        label: 'Intensity',
        values: [
          { id: 'low', label: 'Low' },
          { id: 'moderate', label: 'Moderate' },
          { id: 'high', label: 'High' },
        ],
        tagPattern: { prefix: 'intensity:' },
      };

      const values = discoverBadgeValues(exercises, badge, 'general-fitness');
      expect(values).toHaveLength(3);
      expect(values.map(v => v.id)).toEqual(['low', 'moderate', 'high']);
    });

    it('should handle exercises without tags', () => {
      const exercisesNoTags: Exercise[] = [
        {
          id: 'ex-1',
          name: 'Test',
          catalogId: 'general-fitness',
          tags: [],
          exercise_type: 'repetition_based',
          default_sets: 3,
          default_reps: 10,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          version: 1,
          deleted: false,
        },
      ];

      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        dynamicDiscovery: true,
        tagPattern: { prefix: 'equipment:' },
      };

      const values = discoverBadgeValues(exercisesNoTags, badge, 'general-fitness');
      expect(values).toEqual([]);
    });
  });

  describe('matchesBadgeFilter', () => {
    const exercise: Exercise = {
      id: 'ex-1',
      name: 'Push-ups',
      catalogId: 'general-fitness',
      tags: ['category:strength', 'equipment:bodyweight', 'intensity:moderate'],
      exercise_type: 'repetition_based',
      default_sets: 3,
      default_reps: 10,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      version: 1,
      deleted: false,
    };

    it('should return true when no values selected', () => {
      const badge: CatalogBadge = {
        id: 'category',
        label: 'Category',
        tagPattern: { prefix: 'category:' },
      };

      const matches = matchesBadgeFilter(exercise, badge, new Set());
      expect(matches).toBe(true);
    });

    it('should match with prefix pattern', () => {
      const badge: CatalogBadge = {
        id: 'category',
        label: 'Category',
        tagPattern: { prefix: 'category:' },
      };

      const matches = matchesBadgeFilter(exercise, badge, new Set(['strength']));
      expect(matches).toBe(true);
    });

    it('should not match when value not present', () => {
      const badge: CatalogBadge = {
        id: 'category',
        label: 'Category',
        tagPattern: { prefix: 'category:' },
      };

      const matches = matchesBadgeFilter(exercise, badge, new Set(['cardio']));
      expect(matches).toBe(false);
    });

    it('should match with regex pattern', () => {
      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        tagPattern: {
          prefix: 'equipment:',
          extractPattern: /^equipment:(.+)$/,
        },
      };

      const matches = matchesBadgeFilter(exercise, badge, new Set(['bodyweight']));
      expect(matches).toBe(true);
    });

    it('should match OR logic within badge (any value matches)', () => {
      const badge: CatalogBadge = {
        id: 'category',
        label: 'Category',
        tagPattern: { prefix: 'category:' },
      };

      const matches = matchesBadgeFilter(exercise, badge, new Set(['strength', 'cardio']));
      expect(matches).toBe(true);
    });

    it('should handle numeric values', () => {
      const exerciseWithKyu: Exercise = {
        ...exercise,
        catalogId: 'aikido',
        tags: ['kyu:3'],
      };

      const badge: CatalogBadge = {
        id: 'kyuLevel',
        label: 'Kyu Level',
        tagPattern: { prefix: 'kyu:' },
      };

      const matches = matchesBadgeFilter(exerciseWithKyu, badge, new Set([3]));
      expect(matches).toBe(true);
    });

    it('should return true when badge has no tagPattern', () => {
      const badge: CatalogBadge = {
        id: 'test',
        label: 'Test',
      };

      const matches = matchesBadgeFilter(exercise, badge, new Set(['anything']));
      expect(matches).toBe(true);
    });
  });

  describe('getBadgeValuesForCatalog', () => {
    const exercises: Exercise[] = [
      {
        id: 'ex-1',
        name: 'Test 1',
        catalogId: 'general-fitness',
        tags: ['category:strength', 'equipment:bodyweight'],
        exercise_type: 'repetition_based',
        default_sets: 3,
        default_reps: 10,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        version: 1,
        deleted: false,
      },
      {
        id: 'ex-2',
        name: 'Test 2',
        catalogId: 'general-fitness',
        tags: ['category:cardio', 'equipment:dumbbells'],
        exercise_type: 'time_based',
        default_duration: 600,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        version: 1,
        deleted: false,
      },
    ];

    it('should return map of badge values for catalog', () => {
      const valuesMap = getBadgeValuesForCatalog(exercises, 'general-fitness');
      expect(valuesMap).toBeInstanceOf(Map);
      expect(valuesMap.size).toBeGreaterThan(0);
    });

    it('should include all badges for the catalog', () => {
      const valuesMap = getBadgeValuesForCatalog(exercises, 'general-fitness');
      expect(valuesMap.has('category')).toBe(true);
      expect(valuesMap.has('equipment')).toBe(true);
    });
  });

  describe('extractExerciseBadges', () => {
    const exercise: Exercise = {
      id: 'ex-1',
      name: 'Push-ups',
      catalogId: 'general-fitness',
      tags: ['category:strength', 'equipment:bodyweight', 'intensity:moderate'],
      exercise_type: 'repetition_based',
      default_sets: 3,
      default_reps: 10,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      version: 1,
      deleted: false,
    };

    it('should extract badges from exercise tags', () => {
      const catalogBadges = getCatalogBadges('general-fitness');
      const exerciseBadges = extractExerciseBadges(exercise, catalogBadges);

      expect(exerciseBadges.length).toBeGreaterThan(0);
      expect(exerciseBadges.some(b => b.badge.id === 'category')).toBe(true);
    });

    it('should return empty array for exercise without tags', () => {
      const exerciseNoTags: Exercise = {
        ...exercise,
        tags: [],
      };

      const catalogBadges = getCatalogBadges('general-fitness');
      const exerciseBadges = extractExerciseBadges(exerciseNoTags, catalogBadges);

      expect(exerciseBadges).toEqual([]);
    });

    it('should include badge values', () => {
      const catalogBadges = getCatalogBadges('general-fitness');
      const exerciseBadges = extractExerciseBadges(exercise, catalogBadges);

      const categoryBadge = exerciseBadges.find(b => b.badge.id === 'category');
      expect(categoryBadge).toBeDefined();
      expect(categoryBadge!.values.length).toBeGreaterThan(0);
    });
  });

  describe('getExerciseCategory', () => {
    it('should return category from tags', () => {
      const exercise: Exercise = {
        id: 'ex-1',
        name: 'Test',
        catalogId: 'general-fitness',
        tags: ['category:strength'],
        exercise_type: 'repetition_based',
        default_sets: 3,
        default_reps: 10,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        version: 1,
        deleted: false,
      };

      const category = getExerciseCategory(exercise);
      expect(category).toBe('strength');
    });

    it('should return category from legacy field when no tags', () => {
      const exercise: Exercise = {
        id: 'ex-1',
        name: 'Test',
        catalogId: 'general-fitness',
        tags: [],
        category: 'core',
        exercise_type: 'repetition_based',
        default_sets: 3,
        default_reps: 10,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        version: 1,
        deleted: false,
      };

      const category = getExerciseCategory(exercise);
      expect(category).toBe('core');
    });

    it('should prefer tags over legacy field', () => {
      const exercise: Exercise = {
        id: 'ex-1',
        name: 'Test',
        catalogId: 'general-fitness',
        tags: ['category:strength'],
        category: 'core',
        exercise_type: 'repetition_based',
        default_sets: 3,
        default_reps: 10,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        version: 1,
        deleted: false,
      };

      const category = getExerciseCategory(exercise);
      expect(category).toBe('strength');
    });

    it('should return null when neither tags nor field present', () => {
      const exercise: Exercise = {
        id: 'ex-1',
        name: 'Test',
        catalogId: 'general-fitness',
        tags: [],
        exercise_type: 'repetition_based',
        default_sets: 3,
        default_reps: 10,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        version: 1,
        deleted: false,
      };

      const category = getExerciseCategory(exercise);
      expect(category).toBeNull();
    });
  });
});
