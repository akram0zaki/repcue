import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExerciseCatalog } from '../types';
import { EXERCISE_CATALOGS, getAvailableCatalogs } from '../data/catalogs';
import { useRTLDetection } from '../hooks/useRTLDetection';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/NavigationIcons';

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
  const { t } = useTranslation(['common', 'catalogs', 'a11y']);
  const { isRTL } = useRTLDetection();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get only visible catalogs sorted by display order
  // Note: getAvailableCatalogs filters by isVisible and premium status
  // For catalog selector, we show all visible catalogs regardless of premium
  const sortedCatalogs = EXERCISE_CATALOGS
    .filter(catalog => catalog.isVisible !== false)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Handle image loading errors
  const handleImageError = (catalogId: string) => {
    setImageErrors(prev => new Set(prev).add(catalogId));
  };

  // Check scroll state (kept for scroll event listener, but state management removed)
  const checkScrollState = () => {
    // Function kept for onScroll event listener compatibility
    // Scroll state detection is no longer needed since we use hover-based navigation
  };

  // Scroll functions - simplified to match ExercisePage pattern
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll = currentScroll - scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
      // Re-check scroll state after animation
      setTimeout(() => checkScrollState(), 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll = currentScroll + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
      // Re-check scroll state after animation
      setTimeout(() => checkScrollState(), 300);
    }
  };

  // Initialize scroll state check
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      // Use a timeout to ensure DOM is fully rendered
      const timeoutId = setTimeout(() => {
        checkScrollState();
      }, 100);

      checkScrollState();
      container.addEventListener('scroll', checkScrollState);
      window.addEventListener('resize', checkScrollState);

      return () => {
        clearTimeout(timeoutId);
        container.removeEventListener('scroll', checkScrollState);
        window.removeEventListener('resize', checkScrollState);
      };
    }
  }, [isRTL]);

  // Re-check scroll state when catalogs, selection, or RTL changes
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkScrollState();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedCatalogId, sortedCatalogs.length, isRTL]);

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
        return 'bg-primary-500';
      case 'green':
        return 'bg-green-600';
      case 'purple':
        return 'bg-purple-600';
      case 'pink':
        return 'bg-pink-600';
      default:
        return 'bg-primary-500';
    }
  };

  // Get catalog thumbnail classes with different sizing for selected vs unselected
  const getThumbnailClasses = (catalog: ExerciseCatalog, isSelected: boolean) => {
    const baseClasses = 'relative rounded-xl overflow-hidden transition-all duration-300 ease-in-out cursor-pointer group hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex-shrink-0';

    if (isSelected) {
      // Selected catalog - bigger with ring indicator
      return `${baseClasses} w-40 h-32 sm:w-44 sm:h-36 ring-2 ${getRingColor(catalog)} shadow-lg`;
    } else {
      // Unselected catalogs - smaller
      return `${baseClasses} w-32 h-24 sm:w-36 sm:h-28 opacity-80 hover:opacity-100`;
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

  return (
    <div className={`catalog-selector ${className}`}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('selectCatalog', { ns: 'catalogs', defaultValue: 'Exercise Catalog' })}
        </label>
        <div className="relative group">
          {/* Left Navigation Button */}
          {sortedCatalogs.length > 1 && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 catalog-selector"
              aria-label={t('a11y.scrollLeft', 'Scroll left')}
            >
              <ChevronLeftIcon size={20} />
            </button>
          )}

          {/* Right Navigation Button */}
          {sortedCatalogs.length > 1 && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 catalog-selector"
              aria-label={t('a11y.scrollRight', 'Scroll right')}
            >
              <ChevronRightIcon size={20} />
            </button>
          )}

          {/* Catalog Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 items-center overflow-x-auto pb-2 scrollbar-hide px-3 py-1"
            onScroll={checkScrollState}
          >
            {sortedCatalogs.map((catalog) => {
            const isSelected = catalog.id === selectedCatalogId;
            return (
              <button
                key={catalog.id}
                onClick={() => onCatalogChange(catalog.id)}
                className={getThumbnailClasses(catalog, isSelected)}
                aria-pressed={isSelected}
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
                
                {/* Light overlay for text readability */}
                <div className="absolute inset-0 bg-black/20" />
                
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
                    <h3 className="font-semibold leading-tight text-center text-xs sm:text-sm">
                      {t(catalog.nameKey, { ns: 'catalogs' })}
                    </h3>
                  </div>
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 left-2 w-3 h-3 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full catalog-indicator-dot"></div>
                  </div>
                )}
              </button>
            );
          })}
          </div>
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