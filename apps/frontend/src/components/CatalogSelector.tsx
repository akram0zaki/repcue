import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ExerciseCatalog } from '../types';
import { EXERCISE_CATALOGS } from '../data/catalogs';

interface CatalogSelectorProps {
  selectedCatalogId: string;
  onCatalogChange: (catalogId: string) => void;
  className?: string;
}

const CatalogSelector: React.FC<CatalogSelectorProps> = ({
  selectedCatalogId,
  onCatalogChange,
  className = ''
}) => {
  const { t, i18n } = useTranslation(['common', 'catalogs']);


  // Get color theme classes based on catalog color theme
  const getThemeClasses = (catalog: ExerciseCatalog, isSelected: boolean) => {
    const baseClasses = 'px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center gap-2';

    if (isSelected) {
      switch (catalog.colorTheme) {
        case 'blue':
          return `${baseClasses} bg-blue-600 text-white`;
        case 'green':
          return `${baseClasses} bg-green-600 text-white`;
        case 'purple':
          return `${baseClasses} bg-purple-600 text-white`;
        case 'pink':
          return `${baseClasses} bg-pink-600 text-white`;
        default:
          return `${baseClasses} bg-blue-600 text-white`;
      }
    } else {
      return `${baseClasses} bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700`;
    }
  };

  // Get catalog icon (using emoji for now, can be replaced with proper icons later)
  const getCatalogIcon = (catalog: ExerciseCatalog) => {
    switch (catalog.icon) {
      case 'fitness':
        return '💪';
      case 'tai-chi':
        return '🧘';
      case 'dance':
        return '💃';
      case 'woman':
        return '👩‍⚕️';
      default:
        return '🏃';
    }
  };

  // Sort catalogs by display order
  const sortedCatalogs = [...EXERCISE_CATALOGS].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className={`catalog-selector ${className}`}>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('selectCatalog', { ns: 'catalogs', defaultValue: 'Exercise Catalog' })}
        </label>
        <div className="flex flex-wrap gap-2">
          {sortedCatalogs.map((catalog) => {
            const isSelected = catalog.id === selectedCatalogId;
            return (
              <button
                key={catalog.id}
                onClick={() => onCatalogChange(catalog.id)}
                className={getThemeClasses(catalog, isSelected)}
                aria-pressed={isSelected}
                title={t(catalog.descriptionKey, { ns: 'catalogs' })}
              >
                <span className="text-base" role="img" aria-hidden="true">
                  {getCatalogIcon(catalog)}
                </span>
                <span>
                  {t(catalog.nameKey, { ns: 'catalogs' })}
                </span>
                {catalog.isPremium && (
                  <span className="text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded-full ml-1">
                    {t('common.premium', { defaultValue: 'PRO' })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog description */}
      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
        {(() => {
          const selectedCatalog = EXERCISE_CATALOGS.find(c => c.id === selectedCatalogId);
          if (selectedCatalog) {
            return t(selectedCatalog.descriptionKey, { ns: 'catalogs' });
          }
          return t('selectDescription', { ns: 'catalogs', defaultValue: 'Choose an exercise catalog to view exercises' });
        })()}
      </div>
    </div>
  );
};

export default CatalogSelector;