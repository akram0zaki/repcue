/**
 * ExerciseBadgeDisplay Component
 * 
 * Displays the badges associated with a single exercise.
 * Used on detail pages (ExerciseDetailsPage, StandaloneSharedExercisePage, etc.)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise } from '../types';
import { getCatalogBadges, extractExerciseBadges } from '../utils/catalogBadges';

interface ExerciseBadgeDisplayProps {
  /** The exercise to display badges for */
  exercise: Exercise;
  /** Optional CSS class name */
  className?: string;
}

/**
 * ExerciseBadgeDisplay Component
 * 
 * Extracts and displays badges from an exercise's tags.
 * Returns null if no badges are present.
 * 
 * @example
 * <ExerciseBadgeDisplay exercise={exercise} />
 * 
 * @example
 * <ExerciseBadgeDisplay exercise={exercise} className="my-4" />
 */
export const ExerciseBadgeDisplay: React.FC<ExerciseBadgeDisplayProps> = ({
  exercise,
  className = ''
}) => {
  const { t } = useTranslation(['catalogs', 'common']);
  
  // Get catalog badges and extract exercise badges
  const catalogBadges = getCatalogBadges(exercise.catalogId);
  const exerciseBadges = extractExerciseBadges(exercise, catalogBadges);
  
  // Don't render if no badges
  if (exerciseBadges.length === 0) return null;
  
  return (
    <div className={`exercise-badge-display ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
        {t('common:badges', { defaultValue: 'Exercise Details' })}
      </h3>
      
      <div className="space-y-3">
        {exerciseBadges.map(({ badge, values }) => {
          const badgeLabel = t(badge.label, { defaultValue: badge.id });
          
          return (
            <div key={badge.id} className="badge-group">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {badgeLabel}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {values.map(value => {
                  const valueLabel = String(
                    value.labelParams
                      ? t(value.label, value.labelParams)
                      : t(value.label, { defaultValue: value.fallbackLabel || String(value.id) })
                  );
                  
                  return (
                    <span
                      key={value.id}
                      className="inline-flex items-center px-3 py-1 text-sm rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
                    >
                      {value.icon && <span className="mr-1.5">{value.icon}</span>}
                      {valueLabel}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExerciseBadgeDisplay;

