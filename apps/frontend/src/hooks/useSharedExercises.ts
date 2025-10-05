import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { StorageService } from '../services/storageService';
import logger from '../utils/logger';

export function useSharedExercises() {
  const [sharedExerciseIds, setSharedExerciseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    const loadSharedExercises = async () => {
      if (!user?.id) {
        setSharedExerciseIds(new Set());
        setLoading(false);
        return;
      }

      try {
        const storageService = StorageService.getInstance();
        const sharedRefs = await storageService.getSharedExerciseReferences(user.id);

        if (mounted) {
          // Debug: log the raw references
          // logger.log(`[useSharedExercises] Raw shared refs:`, sharedRefs);

          const exerciseIds = new Set(sharedRefs.map(ref => ref.item_id).filter(id => id)); // Filter out null/undefined
          // logger.log(`[useSharedExercises] Converted to exercise IDs:`, Array.from(exerciseIds));
          // logger.log(`[useSharedExercises] Loaded ${exerciseIds.size} shared exercise IDs for user ${user.id}`);
          setSharedExerciseIds(exerciseIds);
          setLoading(false);
        }
      } catch (error) {
        logger.warn('[useSharedExercises] Failed to load shared exercises:', error);
        if (mounted) {
          setSharedExerciseIds(new Set());
          setLoading(false);
        }
      }
    };

    loadSharedExercises();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const isSharedExercise = (exerciseId: string): boolean => {
    return sharedExerciseIds.has(exerciseId);
  };

  return {
    sharedExerciseIds,
    isSharedExercise,
    loading
  };
}