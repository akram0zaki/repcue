import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExerciseForm } from '../components/ExerciseForm';
import { FeatureGuard } from '../hooks/useFeatureFlags';
import { useSnackbar } from '../components/SnackbarProvider';
import { storageService } from '../services/storageService';
import { useAuth } from '../hooks/useAuth';
import type { Exercise } from '../types';
// import { DEBUG } from '../config/features';
import logger from '../utils/logger';

export const CreateExercisePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'exercises']);
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (exerciseData: Partial<Exercise>) => {
    if (!user) {
      showSnackbar(t('errors.notAuthenticated', 'Please log in to create exercises'), {
        type: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      // Create exercise via IndexedDB storage service (offline-first)
      // The sync service will handle pushing to server later
      const exercisePayload: Exercise = {
        // Generate unique ID
        id: crypto.randomUUID(),
        // Set owner and required fields
        owner_id: user.id,
        name: exerciseData.name || '',
        category: exerciseData.category || 'core',
        exercise_type: exerciseData.exercise_type || 'repetition_based',
        catalogId: 'general-fitness', // Default to general fitness catalog for user-created exercises
        // Optional fields with defaults
        description: exerciseData.description,
        instructions: exerciseData.instructions || [],
        tags: exerciseData.tags || [],
        muscle_groups: exerciseData.muscle_groups || [],
        equipment_needed: exerciseData.equipment_needed || [],
        difficulty_level: exerciseData.difficulty_level || 'beginner',
        default_duration: exerciseData.default_duration,
        default_sets: exerciseData.default_sets,
        default_reps: exerciseData.default_reps,
        rep_duration_seconds: exerciseData.rep_duration_seconds,
        has_video: exerciseData.has_video || false,
        custom_video_url: exerciseData.custom_video_url,
        is_public: exerciseData.is_public || false,
        // System fields
        is_favorite: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted: false,
        version: 1
      };
      
      // if (DEBUG) {
      //   logger.log('=== EXERCISE CREATION DEBUG ===');
      //   logger.log('User:', user);
      //   logger.log('Exercise payload:', JSON.stringify(exercisePayload, null, 2));
      //   logger.log('muscle_groups:', exercisePayload.muscle_groups, 'type:', typeof exercisePayload.muscle_groups, 'isArray:', Array.isArray(exercisePayload.muscle_groups));
      //   logger.log('equipment_needed:', exercisePayload.equipment_needed, 'type:', typeof exercisePayload.equipment_needed, 'isArray:', Array.isArray(exercisePayload.equipment_needed));
      //   logger.log('instructions:', exercisePayload.instructions, 'type:', typeof exercisePayload.instructions);
      //   logger.log('tags:', exercisePayload.tags, 'type:', typeof exercisePayload.tags);
      //   logger.log('===============================');
      // }
      
      // Save to IndexedDB (this will mark it as dirty for sync)
      await storageService.saveExercise(exercisePayload);

      // Notify App.tsx to refresh exercises
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('exercise-created', { 
          detail: { exerciseId: exercisePayload.id } 
        }));
      }

      showSnackbar(t('exercises.createSuccess', 'Exercise created successfully!'), {
        type: 'success'
      });

      // Navigate back to exercises page
      navigate('/exercises');
    } catch (error) {
      logger.error('Failed to create exercise:', error);
      showSnackbar(
        t('exercises.createError', 'Failed to create exercise. Please try again.'),
        { type: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/exercises');
  };

  return (
    <FeatureGuard
      feature="canCreateExercises"
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t('errors.featureNotAvailable', 'Feature Not Available')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('exercises.createNotEnabled', 'Exercise creation is not currently enabled.')}
              </p>
              <button 
                onClick={() => navigate('/exercises')} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {t('common.goBack', 'Go Back')}
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t('exercises.createExercise', 'Create Exercise')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('exercises.createDescription', 'Create a custom exercise that you can use in your workouts')}
            </p>
          </div>

          <ExerciseForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>
      </div>
    </FeatureGuard>
  );
};

export default CreateExercisePage;