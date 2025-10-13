import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExerciseForm } from '../components/ExerciseForm';
import { FeatureGuard } from '../hooks/useFeatureFlags';
import { useSnackbar } from '../components/SnackbarProvider';
import { storageService } from '../services/storageService';
import { useAuth } from '../hooks/useAuth';
import type { Exercise } from '../types';
import { DEBUG } from '../config/features';
import logger from '../utils/logger';

export const EditExercisePage: React.FC = () => {
  const navigate = useNavigate();
  const { id: exerciseId } = useParams<{ id: string }>();
  const { t } = useTranslation(['common', 'exercises']);
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  // Load the exercise data on component mount
  useEffect(() => {
    const loadExercise = async () => {
      logger.log('🔧 EditExercisePage: Loading exercise, exerciseId:', exerciseId);
      logger.log('🔧 EditExercisePage: User available:', !!user);
      
      if (!exerciseId) {
        logger.log('🔧 EditExercisePage: Missing exerciseId, redirecting to exercises');
        navigate('/exercises');
        return;
      }

      try {
        logger.log('🔧 EditExercisePage: Fetching exercise from local storage...');
        const exercises = await storageService.getExercises();
        const foundExercise = exercises.find(ex => ex.id === exerciseId);

        logger.log('🔧 EditExercisePage: Found exercise:', foundExercise);

        if (!foundExercise) {
          logger.error('🔧 EditExercisePage: Exercise not found in local storage');
          showSnackbar(t('errors.exerciseNotFound', 'Exercise not found'), {
            type: 'error'
          });
          navigate('/exercises');
          return;
        }

        // Verify user ownership - allow editing orphaned exercises (owner_id: null)
        logger.log('🔧 EditExercisePage: Exercise owner_id:', foundExercise.owner_id, 'User id:', user?.id);

        // If user is logged in, check ownership constraints
        if (user) {
          // Allow editing if user owns the exercise OR it's an orphaned exercise (owner_id is null)
          if (foundExercise.owner_id !== null && foundExercise.owner_id !== user.id) {
            logger.log('🔧 EditExercisePage: User not authorized, redirecting to exercises');
            showSnackbar(t('errors.unauthorized', 'You can only edit your own exercises'), {
              type: 'error'
            });
            navigate('/exercises');
            return;
          }
        } else {
          // If not logged in, only allow editing orphaned exercises (created offline)
          if (foundExercise.owner_id !== null) {
            logger.log('🔧 EditExercisePage: User not authenticated and exercise has owner, redirecting to exercises');
            showSnackbar(t('errors.notAuthenticated', 'Please log in to edit exercises'), {
              type: 'error'
            });
            navigate('/exercises');
            return;
          }
        }

        logger.log('🔧 EditExercisePage: Successfully loaded exercise, setting state');
        setExercise(foundExercise);
      } catch (error) {
        logger.error('🔧 EditExercisePage: Error loading exercise:', error);
        showSnackbar(t('errors.loadFailed', 'Failed to load exercise'), {
          type: 'error'
        });
        navigate('/exercises');
      } finally {
        logger.log('🔧 EditExercisePage: Setting initialLoading to false');
        setInitialLoading(false);
      }
    };

    loadExercise();
  }, [exerciseId, navigate, showSnackbar, t, user?.id]);

  const handleSubmit = async (exerciseData: Partial<Exercise>) => {
    if (!exercise) {
      showSnackbar(t('errors.exerciseNotFound', 'Exercise not found'), {
        type: 'error'
      });
      return;
    }

    // If user is logged in, check ownership constraints
    if (user) {
      // Allow editing if user owns the exercise OR it's an orphaned exercise (owner_id is null)
      if (exercise.owner_id !== null && exercise.owner_id !== user.id) {
        showSnackbar(t('errors.unauthorized', 'You can only edit your own exercises'), {
          type: 'error'
        });
        return;
      }
    } else {
      // If not logged in, only allow editing orphaned exercises (created offline)
      if (exercise.owner_id !== null) {
        showSnackbar(t('errors.notAuthenticated', 'Please log in to edit exercises'), {
          type: 'error'
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Update exercise via IndexedDB storage service (offline-first)
      // The sync service will handle pushing to server later
      const updatedExercise: Exercise = {
        // Keep existing required fields
        id: exercise.id,
        owner_id: exercise.owner_id || user?.id || null, // Claim ownership if orphaned and logged in
        created_at: exercise.created_at,
        // Update with new data
        name: exerciseData.name || exercise.name,
        exercise_type: exerciseData.exercise_type || exercise.exercise_type,
        catalogId: exercise.catalogId || 'general-fitness', // Preserve existing catalogId
        description: exerciseData.description ?? exercise.description,
        instructions: exerciseData.instructions ?? exercise.instructions,
        tags: exerciseData.tags ?? exercise.tags,
        muscle_groups: exerciseData.muscle_groups ?? exercise.muscle_groups,
        equipment_needed: exerciseData.equipment_needed ?? exercise.equipment_needed,
        difficulty_level: exerciseData.difficulty_level ?? exercise.difficulty_level,
        default_duration: exerciseData.default_duration ?? exercise.default_duration,
        default_sets: exerciseData.default_sets ?? exercise.default_sets,
        default_reps: exerciseData.default_reps ?? exercise.default_reps,
        rep_duration_seconds: exerciseData.rep_duration_seconds ?? exercise.rep_duration_seconds,
        has_video: exerciseData.has_video ?? exercise.has_video,
        custom_video_url: Object.prototype.hasOwnProperty.call(exerciseData, 'custom_video_url') ? exerciseData.custom_video_url : exercise.custom_video_url,
        is_public: exerciseData.is_public ?? exercise.is_public,
        // Preserve system fields
        is_favorite: exercise.is_favorite,
        is_verified: exercise.is_verified,
        rating_average: exercise.rating_average,
        rating_count: exercise.rating_count,
        copy_count: exercise.copy_count,
        // Update timestamp and version (prepareUpsert will handle this)
        updated_at: new Date().toISOString(),
        deleted: false,
        version: exercise.version // prepareUpsert will increment this
      };
      
      if (DEBUG) {
        logger.log('=== EXERCISE UPDATE DEBUG ===');
        logger.log('User:', user);
        logger.log('Original exercise:', exercise);
        logger.log('Updated exercise payload:', JSON.stringify(updatedExercise, null, 2));
        logger.log('==============================');
      }
      
      // Save to IndexedDB (this will mark it as dirty for sync)
      await storageService.saveExercise(updatedExercise);

      // Notify App.tsx to refresh exercises
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('exercise-updated', { 
          detail: { exerciseId: updatedExercise.id } 
        }));
      }

      showSnackbar(t('exercises.updateSuccess', 'Exercise updated successfully!'), {
        type: 'success'
      });

      // Reset scroll position to top when navigating back
      window.scrollTo({ top: 0, behavior: 'instant' });
      // Navigate back to exercises list
      navigate('/exercises');
    } catch (error) {
      logger.error('Error updating exercise:', error);
      showSnackbar(t('errors.updateFailed', 'Failed to update exercise'), {
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset scroll position to top when navigating back
    window.scrollTo({ top: 0, behavior: 'instant' });
    navigate('/exercises');
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return null; // This shouldn't happen as we navigate away on error
  }

  return (
    <FeatureGuard feature="canCreateExercises">
      <div className="min-h-screen pt-safe pb-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('exercises.editExercise', 'Edit Exercise')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('exercises.editExerciseSubtitle', 'Update your custom exercise details')}
            </p>
          </div>

          {/* Exercise Form */}
          <ExerciseForm
            exercise={exercise}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEditing={true}
            loading={loading}
            catalogId={exercise?.catalogId || 'general-fitness'}
          />
        </div>
      </div>
    </FeatureGuard>
  );
};

export default EditExercisePage;