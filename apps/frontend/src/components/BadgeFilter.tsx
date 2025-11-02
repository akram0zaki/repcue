/**
 * BadgeFilter Component
 * 
 * A polished, reusable component for filtering by a single badge.
 * Supports both single and multiple selection modes.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CatalogBadge, BadgeValue } from '../types';

interface BadgeFilterProps {
  /** The badge definition */
  badge: CatalogBadge;
  /** Currently selected values */
  selectedValues: Set<string | number>;
  /** Available badge values (for dynamic discovery) */
  availableValues?: BadgeValue[];
  /** Callback when a value is toggled */
  onToggleValue: (badgeId: string, value: string | number) => void;
  /** Callback when all values are cleared */
  onClearValues: (badgeId: string) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * BadgeFilter Component
 * 
 * Polished badge filter with responsive design and accessibility features.
 * 
 * Features:
 * - Single and multiple selection modes
 * - Icon rendering support
 * - Clear button when selections exist
 * - ARIA labels for accessibility
 * - Responsive design
 * 
 * @example
 * <BadgeFilter
 *   badge={kyuLevelBadge}
 *   selectedValues={new Set([3, 4])}
 *   availableValues={discoveredValues}
 *   onToggleValue={(badgeId, value) => handleToggle(badgeId, value)}
 *   onClearValues={(badgeId) => handleClear(badgeId)}
 * />
 */
export const BadgeFilter: React.FC<BadgeFilterProps> = ({
  badge,
  selectedValues,
  availableValues,
  onToggleValue,
  onClearValues,
  className = ''
}) => {
  const { t } = useTranslation(['catalogs', 'common']);
  
  // Use provided values or badge's predefined values
  const badgeValues = availableValues || badge.values || [];
  
  // Don't render if no values available
  if (badgeValues.length === 0) return null;
  
  // Skip computed badges (read-only, not editable)
  if (badge.computed) return null;
  
  const badgeLabel = t(badge.label, { defaultValue: badge.id });
  const hasSelections = selectedValues.size > 0;
  const isSingleSelect = badge.filterType === 'single';
  
  const handleValueClick = (value: string | number) => {
    if (isSingleSelect) {
      // For single select, if clicking the already selected value, deselect it
      if (selectedValues.has(value)) {
        onClearValues(badge.id);
      } else {
        // Otherwise, select the new value (will replace existing selection)
        onToggleValue(badge.id, value);
      }
    } else {
      // For multiple select, toggle the value
      onToggleValue(badge.id, value);
    }
  };
  
  return (
    <div className={`badge-filter ${className}`} role="group" aria-labelledby={`badge-${badge.id}-label`}>
      {/* Badge label and clear button */}
      <div className="flex items-center justify-between mb-2">
        <label
          id={`badge-${badge.id}-label`}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {badgeLabel}
          {isSingleSelect && (
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              ({t('common:selectOne', { defaultValue: 'select one' })})
            </span>
          )}
        </label>
        
        {hasSelections && (
          <button
            type="button"
            onClick={() => onClearValues(badge.id)}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
            aria-label={t('common:clearFilter', { defaultValue: `Clear ${badgeLabel}` })}
          >
            {t('common:clear', { defaultValue: 'Clear' })}
          </button>
        )}
      </div>
      
      {/* Badge value buttons */}
      <div className="flex flex-wrap gap-2" role={isSingleSelect ? 'radiogroup' : 'group'}>
        {badgeValues.map(value => {
          const isSelected = selectedValues.has(value.id);
          const valueLabel = String(
            value.labelParams
              ? t(value.label, value.labelParams)
              : t(value.label, { defaultValue: value.fallbackLabel || String(value.id) })
          );
          
          return (
            <button
              key={value.id}
              type="button"
              onClick={() => handleValueClick(value.id)}
              role={isSingleSelect ? 'radio' : 'checkbox'}
              aria-checked={isSelected}
              aria-label={valueLabel}
              className={`
                inline-flex items-center px-3 py-1.5 text-sm rounded-full border 
                transition-all duration-150 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-900
                ${isSelected
                  ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 hover:shadow'
                }
              `}
            >
              {value.icon && (
                <span className="mr-1.5 flex-shrink-0">
                  {value.icon}
                </span>
              )}
              <span>{valueLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BadgeFilter;

