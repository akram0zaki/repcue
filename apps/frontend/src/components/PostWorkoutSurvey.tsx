/**
 * PostWorkoutSurvey Component
 *
 * Quick 1-tap post-workout survey to collect personalization signals
 * for AI coaching insights.
 *
 * Features:
 * - 4 quick response options (great/good/okay/tired)
 * - Optional detailed feedback (difficulty, energy, notes)
 * - Skippable - user can dismiss without answering
 * - Saves metadata to ActivityLog for AI analysis
 * - Accessible with keyboard navigation and screen reader support
 * - Mobile-optimized with large tap targets
 *
 * Usage:
 * Shown after workout completion on TimerPage
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ActivityLog } from '../types';
import logger from '../utils/logger';

/**
 * Survey response data
 */
export interface SurveyResponse {
  mood: 'great' | 'good' | 'okay' | 'tired';
  perceived_difficulty?: 1 | 2 | 3 | 4 | 5;
  perceived_energy?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

/**
 * Component props
 */
interface PostWorkoutSurveyProps {
  /** Activity log to attach metadata to */
  activityLog: ActivityLog;
  /** Callback when survey is submitted */
  onSubmit: (response: SurveyResponse) => void;
  /** Callback when survey is skipped */
  onSkip: () => void;
  /** Whether survey is being submitted */
  isSubmitting?: boolean;
}

/**
 * PostWorkoutSurvey Component
 */
export const PostWorkoutSurvey: React.FC<PostWorkoutSurveyProps> = ({
  activityLog: _activityLog, // Reserved for future use (could display exercise name in header)
  onSubmit,
  onSkip,
  isSubmitting = false,
}) => {
  const { t } = useTranslation(['coaching', 'common']);
  const [showDetailed, setShowDetailed] = useState(false);
  const [response, setResponse] = useState<SurveyResponse | null>(null);

  /**
   * Handle quick response (1-tap)
   */
  const handleQuickResponse = (mood: SurveyResponse['mood']) => {
    logger.log('[PostWorkoutSurvey] Quick response:', mood);

    const quickResponse: SurveyResponse = { mood };
    setResponse(quickResponse);

    // Submit immediately for quick responses
    onSubmit(quickResponse);
  };

  /**
   * Handle detailed response submission
   */
  const handleDetailedSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!response) {
      logger.warn('[PostWorkoutSurvey] No response selected');
      return;
    }

    logger.log('[PostWorkoutSurvey] Detailed response:', response);
    onSubmit(response);
  };

  /**
   * Update detailed response fields
   */
  const updateResponse = (field: keyof SurveyResponse, value: unknown) => {
    setResponse(prev => ({
      ...prev!,
      [field]: value,
    }));
  };

  // If already submitted quick response, show thank you
  if (response && !showDetailed) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-900 dark:text-text-50 mb-2">
              {t('coaching:survey.thankYou', { defaultValue: 'Thank You!' })}
            </h3>
            <p className="text-body text-sm mb-4">
              {t('coaching:survey.feedbackHelps', {
                defaultValue: 'Your feedback helps us provide better coaching insights.'
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-text-900 dark:text-text-50 mb-1">
            {t('coaching:survey.title', { defaultValue: 'How was your workout?' })}
          </h3>
          <p className="text-body text-sm">
            {t('coaching:survey.subtitle', {
              defaultValue: 'Help us personalize your coaching insights'
            })}
          </p>
        </div>

        {!showDetailed ? (
          /* Quick Response Options */
          <div className="space-y-2 mb-3">
            {/* Great */}
            <button
              onClick={() => handleQuickResponse('great')}
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('coaching:survey.great', { defaultValue: 'Felt great!' })}
            >
              <div className="flex items-center">
                <span className="text-2xl me-2">😊</span>
                <div className="text-start flex-1">
                  <div className="font-semibold text-green-900 dark:text-green-100">
                    {t('coaching:survey.great', { defaultValue: 'Felt great!' })}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300">
                    {t('coaching:survey.greatDesc', { defaultValue: 'Strong energy, good form' })}
                  </div>
                </div>
              </div>
            </button>

            {/* Good */}
            <button
              onClick={() => handleQuickResponse('good')}
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('coaching:survey.good', { defaultValue: 'Felt good' })}
            >
              <div className="flex items-center">
                <span className="text-2xl me-2">🙂</span>
                <div className="text-start flex-1">
                  <div className="font-semibold text-primary-900 dark:text-primary-100">
                    {t('coaching:survey.good', { defaultValue: 'Felt good' })}
                  </div>
                  <div className="text-xs text-primary-700 dark:text-primary-300">
                    {t('coaching:survey.goodDesc', { defaultValue: 'Solid workout, no issues' })}
                  </div>
                </div>
              </div>
            </button>

            {/* Okay */}
            <button
              onClick={() => handleQuickResponse('okay')}
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('coaching:survey.okay', { defaultValue: 'It was okay' })}
            >
              <div className="flex items-center">
                <span className="text-2xl me-2">😐</span>
                <div className="text-start flex-1">
                  <div className="font-semibold text-yellow-900 dark:text-yellow-100">
                    {t('coaching:survey.okay', { defaultValue: 'It was okay' })}
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">
                    {t('coaching:survey.okayDesc', { defaultValue: 'Got through it' })}
                  </div>
                </div>
              </div>
            </button>

            {/* Tired */}
            <button
              onClick={() => handleQuickResponse('tired')}
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('coaching:survey.tired', { defaultValue: 'Felt tired' })}
            >
              <div className="flex items-center">
                <span className="text-2xl me-2">😓</span>
                <div className="text-start flex-1">
                  <div className="font-semibold text-orange-900 dark:text-orange-100">
                    {t('coaching:survey.tired', { defaultValue: 'Felt tired' })}
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-300">
                    {t('coaching:survey.tiredDesc', { defaultValue: 'Low energy, challenging' })}
                  </div>
                </div>
              </div>
            </button>
          </div>
        ) : (
          /* Detailed Feedback Form */
          <form onSubmit={handleDetailedSubmit} className="space-y-4">
            {/* Difficulty Rating */}
            <div>
              <label className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
                {t('coaching:survey.difficulty', { defaultValue: 'Difficulty Level' })}
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateResponse('perceived_difficulty', level)}
                    className={`flex-1 py-2 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      response?.perceived_difficulty === level
                        ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    aria-label={`Difficulty level ${level}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{t('coaching:survey.veryEasy', { defaultValue: 'Very Easy' })}</span>
                <span>{t('coaching:survey.veryHard', { defaultValue: 'Very Hard' })}</span>
              </div>
            </div>

            {/* Energy Rating */}
            <div>
              <label className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
                {t('coaching:survey.energy', { defaultValue: 'Energy Level After' })}
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateResponse('perceived_energy', level)}
                    className={`flex-1 py-2 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      response?.perceived_energy === level
                        ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    aria-label={`Energy level ${level}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{t('coaching:survey.exhausted', { defaultValue: 'Exhausted' })}</span>
                <span>{t('coaching:survey.energized', { defaultValue: 'Energized' })}</span>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label htmlFor="workout-notes" className="block text-sm font-medium text-text-900 dark:text-text-50 mb-2">
                {t('coaching:survey.notes', { defaultValue: 'Notes (Optional)' })}
              </label>
              <textarea
                id="workout-notes"
                rows={3}
                value={response?.notes || ''}
                onChange={(e) => updateResponse('notes', e.target.value)}
                placeholder={t('coaching:survey.notesPlaceholder', {
                  defaultValue: 'Any thoughts about this workout?'
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-900 dark:text-text-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !response?.mood}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? t('common:submitting', { defaultValue: 'Submitting...' })
                : t('common:submit', { defaultValue: 'Submit' })
              }
            </button>
          </form>
        )}

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between text-sm">
          {!showDetailed && (
            <button
              onClick={() => {
                setShowDetailed(true);
                setResponse({ mood: 'good' }); // Default mood for detailed form
              }}
              className="text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            >
              {t('coaching:survey.moreDetails', { defaultValue: 'Add more details' })}
            </button>
          )}

          <button
            onClick={onSkip}
            disabled={isSubmitting}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:underline focus:outline-none focus:ring-2 focus:ring-gray-500 rounded px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          >
            {t('common:skip', { defaultValue: 'Skip' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostWorkoutSurvey;
