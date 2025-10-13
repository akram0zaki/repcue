/**
 * @deprecated This component is deprecated as of the badge system implementation.
 * Use BadgeFilter component with catalog-specific badges instead.
 * 
 * The legacy category system has been replaced with a flexible badge system.
 * Categories are now defined per-catalog in the catalog.badges array.
 * 
 * Migration path:
 * - Replace CategorySelector with BadgeFilter or BadgeFilterGroup
 * - Use catalog-specific badge definitions
 * - Categories are now just one type of badge among many (equipment, intensity, etc.)
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ExerciseCategory } from '../types';
import { ExerciseCategory as Categories } from '../types';

interface CategorySelectorProps {
  selectedCategories: Set<ExerciseCategory>;
  onCategoryToggle: (category: ExerciseCategory) => void;
  onClose: () => void;
  onClearAll: () => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategories,
  onCategoryToggle,
  onClose,
  onClearAll
}) => {
  const { t } = useTranslation(['exercises', 'common']);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h3 className="text-lg font-semibold text-text-900 dark:text-text-50">
            {t('exercises:selectCategories', { defaultValue: 'Select Categories' })}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-text-500 dark:text-text-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category List */}
        <div className="p-4 space-y-2">
          {Object.values(Categories).map(category => (
            <button
              key={category}
              onClick={() => onCategoryToggle(category)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                selectedCategories.has(category)
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                  : 'bg-surface-50 dark:bg-surface-800 border-2 border-transparent hover:bg-surface-100 dark:hover:bg-surface-700'
              }`}
            >
              <span className={`font-medium ${
                selectedCategories.has(category)
                  ? 'text-primary-700 dark:text-primary-300'
                  : 'text-text-900 dark:text-text-50'
              }`}>
                {t(`exercises:categories.${category.replace('-', '')}` as const, { defaultValue: category.replace('-', ' ') })}
              </span>
              {selectedCategories.has(category) && (
                <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-surface-200 dark:border-surface-700">
          <button
            onClick={onClearAll}
            className="px-4 py-2 text-sm font-medium text-text-600 dark:text-text-400 hover:text-text-900 dark:hover:text-text-50 transition-colors"
          >
            {t('exercises:clearAll', { defaultValue: 'Clear All' })}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            >
              {t('done', { ns: 'common', defaultValue: 'Done' })}
            </button>
          </div>
        </div>

        {/* Selected count */}
        {selectedCategories.size > 0 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-text-500 dark:text-text-400">
              {t('categoriesSelected', {
                ns: 'common',
                count: selectedCategories.size,
                defaultValue: `${selectedCategories.size} ${selectedCategories.size === 1 ? 'category' : 'categories'} selected`
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategorySelector;