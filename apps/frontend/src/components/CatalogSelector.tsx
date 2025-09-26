import React, { useState } from 'react';
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
  const { t } = useTranslation(['common', 'catalogs']);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Handle image loading errors
  const handleImageError = (catalogId: string) => {
    setImageErrors(prev => new Set(prev).add(catalogId));
  };

  // Get fallback icon for catalog when image fails
  const getFallbackIcon = (catalog: ExerciseCatalog) => {
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

  // Get fallback background color
  const getFallbackBackground = (catalog: ExerciseCatalog) => {
    switch (catalog.colorTheme) {
      case 'blue':
        return 'bg-blue-600';
      case 'green':
        return 'bg-green-600';
      case 'purple':
        return 'bg-purple-600';
      case 'pink':
        return 'bg-pink-600';
      default:
        return 'bg-blue-600';
    }
  };

  // Get catalog thumbnail classes with size variations
  const getThumbnailClasses = (catalog: ExerciseCatalog, isSelected: boolean) => {
    const baseClasses = 'relative rounded-xl overflow-hidden transition-all duration-300 ease-in-out cursor-pointer group hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
    
    if (isSelected) {
      // Selected catalog is larger
      return `${baseClasses} w-32 h-24 sm:w-40 sm:h-28 ring-2 ring-offset-2 ${getRingColor(catalog)} shadow-lg`;
    } else {
      // Unselected catalogs are smaller
      return `${baseClasses} w-24 h-18 sm:w-28 sm:h-20 opacity-80 hover:opacity-100`;
    }
  };

  // Get ring color based on catalog theme
  const getRingColor = (catalog: ExerciseCatalog) => {
    switch (catalog.colorTheme) {
      case 'blue':
        return 'ring-blue-500';
      case 'green':
        return 'ring-green-500';
      case 'purple':
        return 'ring-purple-500';
      case 'pink':
        return 'ring-pink-500';
      default:
        return 'ring-blue-500';
    }
  };

  // Get overlay gradient based on catalog theme
  const getOverlayGradient = (catalog: ExerciseCatalog) => {
    switch (catalog.colorTheme) {
      case 'blue':
        return 'from-blue-600/70 to-blue-800/90';
      case 'green':
        return 'from-green-600/70 to-green-800/90';
      case 'purple':
        return 'from-purple-600/70 to-purple-800/90';
      case 'pink':
        return 'from-pink-600/70 to-pink-800/90';
      default:
        return 'from-blue-600/70 to-blue-800/90';
    }
  };

  // Sort catalogs by display order
  const sortedCatalogs = [...EXERCISE_CATALOGS].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className={`catalog-selector ${className}`}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('selectCatalog', { ns: 'catalogs', defaultValue: 'Exercise Catalog' })}
        </label>
        <div className="flex flex-wrap gap-3 items-end">
          {sortedCatalogs.map((catalog) => {
            const isSelected = catalog.id === selectedCatalogId;
            return (
              <button
                key={catalog.id}
                onClick={() => onCatalogChange(catalog.id)}
                className={getThumbnailClasses(catalog, isSelected)}
                aria-pressed={isSelected ? 'true' : 'false'}
                title={t(catalog.descriptionKey, { ns: 'catalogs' })}
              >
                {/* Background Image or Fallback */}
                {!imageErrors.has(catalog.id) ? (
                  <img
                    src={catalog.pictureUrl}
                    alt={t(catalog.nameKey, { ns: 'catalogs' })}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                    onError={() => handleImageError(catalog.id)}
                  />
                ) : (
                  /* Fallback when image fails to load */
                  <div className={`absolute inset-0 ${getFallbackBackground(catalog)} flex items-center justify-center`}>
                    <span className="text-4xl sm:text-5xl opacity-90" role="img" aria-hidden="true">
                      {getFallbackIcon(catalog)}
                    </span>
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${getOverlayGradient(catalog)}`} />
                
                {/* Content */}
                <div className="relative z-10 p-2 sm:p-3 h-full flex flex-col justify-between">
                  {/* Premium Badge - Always reserve space */}
                  <div className="flex justify-end">
                    {catalog.isPremium && (
                      <span className="text-xs bg-yellow-400 text-black px-1.5 py-0.5 rounded-full font-semibold shadow-sm">
                        {t('common.premium', { defaultValue: 'PRO' })}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="text-white">
                    <h3 className={`font-semibold leading-tight text-center ${isSelected ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'} ${!isSelected ? 'h-8 flex items-center justify-center' : ''}`}>
                      {t(catalog.nameKey, { ns: 'catalogs' })}
                    </h3>
                  </div>
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 left-2 w-3 h-3 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  </div>
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