import React, { useState, useRef } from 'react';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Handle image loading errors
  const handleImageError = (catalogId: string) => {
    setImageErrors(prev => new Set(prev).add(catalogId));
  };

  // Check scroll state
  const checkScrollState = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -200,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 200,
        behavior: 'smooth'
      });
    }
  };

  // Initialize scroll state check
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScrollState();
      container.addEventListener('scroll', checkScrollState);
      window.addEventListener('resize', checkScrollState);

      return () => {
        container.removeEventListener('scroll', checkScrollState);
        window.removeEventListener('resize', checkScrollState);
      };
    }
  }, []);

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

  // Get catalog thumbnail classes with consistent sizing for horizontal navigation
  const getThumbnailClasses = (catalog: ExerciseCatalog, isSelected: boolean) => {
    const baseClasses = 'relative rounded-xl overflow-hidden transition-all duration-300 ease-in-out cursor-pointer group hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex-shrink-0';

    if (isSelected) {
      // Selected catalog with ring indicator
      return `${baseClasses} w-28 h-20 sm:w-32 sm:h-24 ring-2 ring-offset-2 ${getRingColor(catalog)} shadow-lg`;
    } else {
      // Unselected catalogs with consistent size
      return `${baseClasses} w-28 h-20 sm:w-32 sm:h-24 opacity-80 hover:opacity-100`;
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
        <div className="relative">
          {/* Left Navigation Button */}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-gray-800 shadow-lg rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              aria-label="Scroll left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Right Navigation Button */}
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-gray-800 shadow-lg rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              aria-label="Scroll right"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Catalog Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 items-center overflow-x-auto pb-2 scrollbar-hide px-10"
            onScroll={checkScrollState}
          >
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
                    <h3 className="font-semibold leading-tight text-center text-xs sm:text-sm">
                      {t(catalog.nameKey, { ns: 'catalogs' })}
                    </h3>
                  </div>
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 left-2 w-3 h-3 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
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