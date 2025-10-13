/**
 * Unit tests for useBadgeValues hook
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useBadgeValues } from '../useBadgeValues';
import type { Exercise, CatalogBadge } from '../../types';

describe('useBadgeValues', () => {
  const exercises: Exercise[] = [
    {
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
    },
    {
      id: 'ex-2',
      name: 'Dumbbell Curls',
      catalogId: 'general-fitness',
      tags: ['category:strength', 'equipment:dumbbells', 'intensity:high'],
      exercise_type: 'repetition_based',
      default_sets: 3,
      default_reps: 12,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      version: 1,
      deleted: false,
    },
    {
      id: 'ex-3',
      name: 'Running',
      catalogId: 'general-fitness',
      tags: ['category:cardio', 'equipment:none'],
      exercise_type: 'time_based',
      default_duration: 1800,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      version: 1,
      deleted: false,
    },
  ];

  describe('predefined values', () => {
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

      const { result } = renderHook(() =>
        useBadgeValues(exercises, 'general-fitness', badge)
      );

      expect(result.current).toHaveLength(3);
      expect(result.current.map(v => v.id)).toEqual(['low', 'moderate', 'high']);
    });
  });

  describe('dynamic discovery', () => {
    it('should discover values from exercise tags', () => {
      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        dynamicDiscovery: true,
        tagPattern: { prefix: 'equipment:' },
      };

      const { result } = renderHook(() =>
        useBadgeValues(exercises, 'general-fitness', badge)
      );

      expect(result.current.length).toBeGreaterThan(0);
      const ids = result.current.map(v => v.id).sort();
      expect(ids).toEqual(['bodyweight', 'dumbbells', 'none']);
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

      const { result } = renderHook(() =>
        useBadgeValues(exercises, 'general-fitness', badge)
      );

      expect(result.current.length).toBeGreaterThan(0);
      const ids = result.current.map(v => v.id).sort();
      expect(ids).toEqual(['cardio', 'strength']);
    });

    it('should filter by catalogId', () => {
      const exercisesMultipleCatalogs: Exercise[] = [
        ...exercises,
        {
          id: 'ex-4',
          name: 'Aikido Basic',
          catalogId: 'aikido',
          tags: ['equipment:weapons'],
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

      const { result } = renderHook(() =>
        useBadgeValues(exercisesMultipleCatalogs, 'general-fitness', badge)
      );

      const ids = result.current.map(v => v.id);
      expect(ids).not.toContain('weapons');
    });
  });

  describe('memoization', () => {
    it('should cache results for same inputs', () => {
      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        dynamicDiscovery: true,
        tagPattern: { prefix: 'equipment:' },
      };

      const { result, rerender } = renderHook(() =>
        useBadgeValues(exercises, 'general-fitness', badge)
      );

      const firstResult = result.current;

      // Rerender with same inputs
      rerender();

      // Should return the same reference (memoized)
      expect(result.current).toBe(firstResult);
    });

    it('should recompute when catalogId changes', () => {
      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        dynamicDiscovery: true,
        tagPattern: { prefix: 'equipment:' },
      };

      const { result, rerender } = renderHook(
        ({ catalogId }) => useBadgeValues(exercises, catalogId, badge),
        { initialProps: { catalogId: 'general-fitness' } }
      );

      const firstResult = result.current;

      // Rerender with different catalogId
      rerender({ catalogId: 'aikido' });

      // Should return different reference (recomputed)
      expect(result.current).not.toBe(firstResult);
    });

    it('should recompute when exercises change', () => {
      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        dynamicDiscovery: true,
        tagPattern: { prefix: 'equipment:' },
      };

      const { result, rerender } = renderHook(
        ({ exercises }) => useBadgeValues(exercises, 'general-fitness', badge),
        { initialProps: { exercises } }
      );

      const firstResult = result.current;
      expect(firstResult.length).toBe(3);

      // Add new exercise
      const newExercises = [
        ...exercises,
        {
          id: 'ex-4',
          name: 'Kettlebell Swing',
          catalogId: 'general-fitness',
          tags: ['equipment:kettlebell'],
          exercise_type: 'repetition_based',
          default_sets: 3,
          default_reps: 15,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          version: 1,
          deleted: false,
        },
      ];

      rerender({ exercises: newExercises });

      // Should discover new value
      expect(result.current.length).toBe(4);
      expect(result.current.map(v => v.id)).toContain('kettlebell');
    });
  });

  describe('edge cases', () => {
    it('should handle empty exercises array', () => {
      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        dynamicDiscovery: true,
        tagPattern: { prefix: 'equipment:' },
      };

      const { result } = renderHook(() =>
        useBadgeValues([], 'general-fitness', badge)
      );

      expect(result.current).toEqual([]);
    });

    it('should handle badge without tagPattern', () => {
      const badge: CatalogBadge = {
        id: 'test',
        label: 'Test',
        values: [{ id: 'value1', label: 'Value 1' }],
      };

      const { result } = renderHook(() =>
        useBadgeValues(exercises, 'general-fitness', badge)
      );

      expect(result.current).toEqual([{ id: 'value1', label: 'Value 1' }]);
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

      const { result } = renderHook(() =>
        useBadgeValues(exercisesNoTags, 'general-fitness', badge)
      );

      expect(result.current).toEqual([]);
    });

    it('should generate fallback labels for discovered values', () => {
      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        dynamicDiscovery: true,
        tagPattern: { prefix: 'equipment:' },
      };

      const { result } = renderHook(() =>
        useBadgeValues(exercises, 'general-fitness', badge)
      );

      result.current.forEach(value => {
        expect(value.label).toBeDefined();
        expect(value.fallbackLabel).toBe(value.id);
      });
    });
  });

  describe('performance', () => {
    it('should handle large number of exercises efficiently', () => {
      // Create 1000 exercises
      const largeExerciseSet: Exercise[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `ex-${i}`,
        name: `Exercise ${i}`,
        catalogId: 'general-fitness',
        tags: [`equipment:${i % 10}`, `category:${i % 5}`],
        exercise_type: 'repetition_based',
        default_sets: 3,
        default_reps: 10,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        version: 1,
        deleted: false,
      }));

      const badge: CatalogBadge = {
        id: 'equipment',
        label: 'Equipment',
        dynamicDiscovery: true,
        tagPattern: { prefix: 'equipment:' },
      };

      const startTime = performance.now();
      const { result } = renderHook(() =>
        useBadgeValues(largeExerciseSet, 'general-fitness', badge)
      );
      const endTime = performance.now();

      // Should complete in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.current.length).toBe(10);
    });

    it('should compile regex pattern only once', () => {
      const badge: CatalogBadge = {
        id: 'category',
        label: 'Category',
        dynamicDiscovery: true,
        tagPattern: {
          prefix: 'category:',
          extractPattern: /^category:(.+)$/,
        },
      };

      const { result, rerender } = renderHook(() =>
        useBadgeValues(exercises, 'general-fitness', badge)
      );

      const firstResult = result.current;

      // Multiple rerenders
      rerender();
      rerender();
      rerender();

      // Should return same memoized result
      expect(result.current).toBe(firstResult);
    });
  });
});
