/**
 * BadgeFilterGroup Component
 * 
 * Renders a group of badge filters for a specific catalog.
 * Implements progressive disclosure with "More filters" collapse for mobile UX.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Exercise, CatalogBadge } from '../types';
import { getCatalogBadges } from '../utils/catalogBadges';
import { useBadgeValues } from '../hooks/useBadgeValues';

interface BadgeFilterGroupProps {
  /** The catalog ID to show badges for */
  catalogId: string;
  /** All exercises (used for dynamic discovery) */
  exercises: Exercise[];
  /** Currently selected badge values: badgeId -> Set of selected values */
  selectedBadges: Record<string, Set<string | number>>;
  /** Callback when a badge value is toggled */
  onToggleBadgeValue: (badgeId: string, value: string | number) => void;
  /** Callback when all values for a badge are cleared */
  onClearBadge: (badgeId: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Maximum number of badges to show before collapsing (default: 3) */
  maxVisibleBadges?: number;
}

/**
 * Badge filter for a single badge
 * Simple functional implementation for MVP
 */
interface BadgeFilterProps {
  badge: CatalogBadge;
  catalogId: string;
  exercises: Exercise[];
  selectedValues: Set<string | number>;
  onToggleValue: (badgeId: string, value: string | number) => void;
  onClear: (badgeId: string) => void;
}

const BadgeFilter: React.FC<BadgeFilterProps> = ({
  badge,
  catalogId,
  exercises,
  selectedValues,
  onToggleValue,
  onClear
}) => {
  const { t } = useTranslation(['catalogs', 'exercises', 'common']);
  
  // Get badge values (memoized with caching)
  const badgeValues = useBadgeValues(exercises, catalogId, badge);
  
  // Don't render if no values available
  if (badgeValues.length === 0) return null;
  
  // Skip computed badges in filtering UI (they're read-only)
  if (badge.computed) return null;
  
  const badgeLabel = t(badge.label, { defaultValue: badge.id });
  const hasSelections = selectedValues.size > 0;
  
  return (
    <div className="badge-filter mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {badgeLabel}
        </label>
        {hasSelections && (
          <button
            type="button"
            onClick={() => onClear(badge.id)}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            aria-label={t('common:clear')}
          >
            {t('common:clear', { defaultValue: 'Clear' })}
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
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
              onClick={() => onToggleValue(badge.id, value.id)}
              className={`
                px-3 py-1.5 text-sm rounded-full border transition-colors
                ${isSelected
                  ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400'
                }
              `}
              aria-pressed={isSelected}
            >
              {value.icon && <span className="mr-1">{value.icon}</span>}
              {valueLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Badge Filter Group
 * 
 * Renders all badges for a catalog with progressive disclosure for mobile
 */
export const BadgeFilterGroup: React.FC<BadgeFilterGroupProps> = ({
  catalogId,
  exercises,
  selectedBadges,
  onToggleBadgeValue,
  onClearBadge,
  className = '',
  maxVisibleBadges = 3
}) => {
  const { t } = useTranslation(['catalogs', 'exercises', 'common']);
  const [showAllBadges, setShowAllBadges] = useState(false);
  
  // Get all badges for this catalog
  const badges = getCatalogBadges(catalogId);
  
  // Filter out computed badges (they're for display/filtering only, not editable)
  const filterableBadges = badges.filter(b => !b.computed);
  
  // Don't render if no badges
  if (filterableBadges.length === 0) return null;
  
  // Determine which badges to show
  const visibleBadges = showAllBadges || filterableBadges.length <= maxVisibleBadges
    ? filterableBadges
    : filterableBadges.slice(0, maxVisibleBadges);
  
  const hiddenCount = filterableBadges.length - visibleBadges.length;
  
  return (
    <div className={`badge-filter-group ${className}`}>
      {/* Render visible badges */}
      {visibleBadges.map(badge => (
        <BadgeFilter
          key={badge.id}
          badge={badge}
          catalogId={catalogId}
          exercises={exercises}
          selectedValues={selectedBadges[badge.id] || new Set()}
          onToggleValue={onToggleBadgeValue}
          onClear={onClearBadge}
        />
      ))}
      
      {/* "More filters" toggle button */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAllBadges(!showAllBadges)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2"
        >
          {showAllBadges
            ? t('common:showFewerFilters', { defaultValue: 'Show fewer filters' })
            : t('common:moreFilters', { defaultValue: `More filters (${hiddenCount})`, count: hiddenCount })
          }
        </button>
      )}
    </div>
  );
};

export default BadgeFilterGroup;

