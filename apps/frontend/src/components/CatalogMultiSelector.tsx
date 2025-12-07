import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExerciseCatalog } from '../types';
import { getAvailableCatalogs } from '../data/catalogs';

interface CatalogMultiSelectorProps {
  selectedCatalogIds: string[];
  onChange: (catalogIds: string[]) => void;
  availableCatalogs?: ExerciseCatalog[];
  disabled?: boolean;
  className?: string;
  minSelected?: number; // enforce minimum selected count (default 1)
  /** Callback to inform parent how many catalogs are available */
  onCatalogCountChange?: (count: number) => void;
}

/**
 * Accessible multi-select control for assigning catalogs to an exercise.
 * - Tailwind only (no inline styles)
 * - Keyboard friendly (checkbox group)
 * - Screen-reader labels
 * - Auto-selects single catalog when only one is available
 */
const CatalogMultiSelector: React.FC<CatalogMultiSelectorProps> = ({
  selectedCatalogIds,
  onChange,
  availableCatalogs,
  disabled = false,
  className = '',
  minSelected = 1,
  onCatalogCountChange
}) => {
  const { t } = useTranslation(['catalogs', 'common']);
  const catalogs = (availableCatalogs && availableCatalogs.length > 0)
    ? availableCatalogs
    : getAvailableCatalogs(); // This now filters by isVisible

  // Report catalog count to parent
  useEffect(() => {
    onCatalogCountChange?.(catalogs.length);
  }, [catalogs.length, onCatalogCountChange]);

  // Auto-select the single catalog if only one is available
  useEffect(() => {
    if (catalogs.length === 1 && !selectedCatalogIds.includes(catalogs[0].id)) {
      onChange([catalogs[0].id]);
    }
  }, [catalogs, selectedCatalogIds, onChange]);

  const toggle = (id: string) => {
    if (disabled) return;
    const set = new Set(selectedCatalogIds);
    if (set.has(id)) {
      // prevent deselecting below minSelected
      if (set.size <= minSelected) return;
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange(Array.from(set));
  };

  return (
    <div className={`w-full ${className}`}>
      <fieldset className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
        <legend className="px-1 text-sm font-medium text-text-800 dark:text-text-100">
          {t('catalogs:assignCatalogs', { defaultValue: 'Assign to catalogs' })}
        </legend>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {catalogs.map(c => {
            const checked = selectedCatalogIds.includes(c.id);
            return (
              <label key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors cursor-pointer select-none
                ${checked
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-gray-800 hover:bg-surface-50 dark:hover:bg-surface-700'}`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500"
                  checked={checked}
                  onChange={() => toggle(c.id)}
                  disabled={disabled}
                  aria-label={t(c.nameKey, { ns: 'catalogs', defaultValue: c.id })}
                />
                <span className="text-sm text-text-800 dark:text-text-100">
                  {t(c.nameKey, { ns: 'catalogs', defaultValue: c.id })}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-text-500 dark:text-text-400">
          {t('catalogs:assignHint', { defaultValue: 'Select one or more catalogs. You can adjust tags per catalog later.' })}
        </p>
      </fieldset>
    </div>
  );
};

export default CatalogMultiSelector;
