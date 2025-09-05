import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExerciseForm } from '../components/ExerciseForm';
import { FeatureGuard } from '../hooks/useFeatureFlags';
import { useSnackbar } from '../components/SnackbarProvider';
import { supabase } from '../config/supabase';
import type { Exercise } from '../types';

export const CreateExercisePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'exercises']);
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (exerciseData: Partial<Exercise>) => {
    if (!supabase) {
      showSnackbar(t('errors.notAuthenticated', 'Please log in to create exercises'), {
        type: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      // Create exercise via direct database insert
      // The sync function will handle server-side processing
      const { error } = await supabase
        .from('exercises')
        .insert({
          // Ensure required fields are present
          category: exerciseData.category || 'strength',
          name: exerciseData.name || '',
          exercise_type: exerciseData.exercise_type || 'repetition_based',
          // Transform complex fields
          instructions: JSON.stringify(exerciseData.instructions || []),
          tags: JSON.stringify(exerciseData.tags || []),
          // Spread the rest of the data (excluding problematic fields)
          description: exerciseData.description,
          muscle_groups: exerciseData.muscle_groups,
          equipment_needed: exerciseData.equipment_needed,
          difficulty_level: exerciseData.difficulty_level,
          default_duration: exerciseData.default_duration,
          default_sets: exerciseData.default_sets,
          default_reps: exerciseData.default_reps,
          rep_duration_seconds: exerciseData.rep_duration_seconds,
          has_video: exerciseData.has_video,
          custom_video_url: exerciseData.custom_video_url,
          // Override with system-generated fields
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted: false,
          version: 1,
          is_favorite: false,
          rating_average: 0,
          rating_count: 0,
          copy_count: 0,
          is_verified: false,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      showSnackbar(t('exercises.createSuccess', 'Exercise created successfully!'), {
        type: 'success'
      });

      // Navigate back to exercises page
      navigate('/exercises');
    } catch (error) {
      console.error('Failed to create exercise:', error);
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