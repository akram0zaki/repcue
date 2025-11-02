/**
 * @deprecated This component is deprecated as of the badge system implementation.
 * Use BadgeFilterGroup component with catalog-specific badges instead.
 * 
 * The legacy category system has been replaced with a flexible badge system.
 * Categories are now defined per-catalog in the catalog.badges array.
 * 
 * Migration path:
 * - Replace CategoryFilter with BadgeFilterGroup
 * - Use useExerciseFilter hook for filtering logic
 * - Define category badge in catalog definition with tag pattern 'category:'
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExerciseCategory } from '../types';
import { ExerciseCategory as Categories } from '../types';

interface CategoryFilterProps {
  /** Currently selected categories */
  selectedCategories: Set<ExerciseCategory>;
  /** Callback when a category is toggled */
  onCategoryToggle: (category: ExerciseCategory) => void;
  /** Callback when all categories are cleared */
  onClearAll: () => void;
  /** Display style - 'dropdown' shows a button that opens a modal, 'badges' shows inline category buttons */
  style?: 'dropdown' | 'badges';
  /** Optional label text (used in dropdown mode) */
  label?: string;
  /** Size variant for badges */
  size?: 'sm' | 'md';
  /** Allow multiple selections (default: true) */
  allowMultiple?: boolean;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategories,
  onCategoryToggle,
  onClearAll,
  style = 'dropdown',
  label,
  size = 'md',
  allowMultiple = true
}) => {
  const { t } = useTranslation(['exercises', 'common']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Handle category selection for single-select mode
  const handleCategorySelect = (category: ExerciseCategory | 'all') => {
    if (category === 'all') {
      onClearAll();
    } else {
      if (!allowMultiple) {
        // Single select mode - clear others first
        onClearAll();
      }
      onCategoryToggle(category);
    }
  };

  // Get category color classes per style guide
  const getCategoryColors = (category: ExerciseCategory, isSelected: boolean) => {
    if (isSelected) {
      switch (category) {
        case Categories.CORE: return 'bg-primary-500 text-white border-primary-500';
        case Categories.STRENGTH: return 'bg-red-500 text-white border-red-500';
        case Categories.CARDIO: return 'bg-green-500 text-white border-green-500';
        case Categories.FLEXIBILITY: return 'bg-purple-500 text-white border-purple-500';
        case Categories.BALANCE: return 'bg-yellow-500 text-white border-yellow-500';
        default: return 'bg-gray-500 text-white border-gray-500';
      }
    } else {
      return 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700';
    }
  };

  if (style === 'badges') {
    const buttonSize = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-3 py-2 text-sm';
    
    return (
      <div className="flex flex-wrap gap-2">
        {/* All button */}
        <button
          onClick={() => handleCategorySelect('all')}
          className={`${buttonSize} rounded-lg font-medium transition-colors border ${
            selectedCategories.size === 0
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {t('activity.all', { defaultValue: 'All' })}
        </button>

        {/* Category buttons */}
        {Object.values(Categories).map(category => {
          const isSelected = selectedCategories.has(category);
          return (
            <button
              key={category}
              onClick={() => handleCategorySelect(category)}
              className={`${buttonSize} rounded-lg font-medium transition-colors border capitalize ${getCategoryColors(category, isSelected)}`}
            >
              {t(`common:categories.${String(category)}`, { defaultValue: category.replace('-', ' ') })}
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown style (original modal implementation)
  return (
    <div className="flex items-center gap-2 flex-1">
      {label && (
        <label className="text-sm font-medium sort-label-text flex-shrink-0">
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{label}</span>
        </label>
      )}
      
      <button
        onClick={() => setIsDropdownOpen(true)}
        className="px-2.5 py-1.5 text-sm font-medium bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors flex items-center gap-2"
      >
        {selectedCategories.size > 0 ? (
          <span className="text-primary-600 dark:text-primary-400">
            {t('categoriesSelected', {
              ns: 'common',
              count: selectedCategories.size,
              defaultValue: `${selectedCategories.size} selected`
            })}
          </span>
        ) : (
          <span className="text-text-500 dark:text-text-400">
            {t('exercises:selectCategories', { defaultValue: 'Select' })}
          </span>
        )}
        <svg className="w-4 h-4 text-text-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Clear button - only show in dropdown mode when selections exist */}
      {selectedCategories.size > 0 && (
        <button
          onClick={onClearAll}
          className="px-2.5 py-1.5 text-sm font-medium text-text-500 dark:text-text-400 hover:text-text-700 dark:hover:text-text-200 transition-colors"
        >
          {t('exercises:clearCategories', { defaultValue: 'Clear' })}
        </button>
      )}

      {/* Modal overlay */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsDropdownOpen(false)}>
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
                onClick={() => setIsDropdownOpen(false)}
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
                  onClick={() => setIsDropdownOpen(false)}
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
      )}
    </div>
  );
};

export default CategoryFilter;