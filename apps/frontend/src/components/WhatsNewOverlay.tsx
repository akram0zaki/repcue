import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpdateInfo, VersionChangelog } from '../types';
import logger from '../utils/logger';

interface WhatsNewOverlayProps {
  isVisible: boolean;
  updateInfo?: UpdateInfo;
  onDismiss: () => void;
  autoShowDelay?: number; // Delay before showing overlay after update completion
}

interface FeatureHighlight {
  title: string;
  description: string;
  icon: string;
  category: 'feature' | 'improvement' | 'security';
}

/**
 * WhatsNewOverlay component
 *
 * Displays a post-update feature highlights overlay with key changes and improvements.
 * Shows automatically after successful updates with a delay to avoid interrupting user flow.
 * Focuses on the most important user-facing features and improvements.
 */
export const WhatsNewOverlay: React.FC<WhatsNewOverlayProps> = ({
  isVisible,
  updateInfo,
  onDismiss,
  autoShowDelay = 2000
}) => {
  const { t } = useTranslation(['common']);
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState(0);

  // Extract feature highlights from changelog
  const getFeatureHighlights = (changelog?: VersionChangelog): FeatureHighlight[] => {
    const highlights: FeatureHighlight[] = [];

    // Add significant new features
    if (changelog?.new_features) {
      changelog.new_features.slice(0, 3).forEach((feature) => {
        highlights.push({
          title: extractFeatureTitle(feature),
          description: feature,
          icon: '✨',
          category: 'feature'
        });
      });
    }

    // Add important improvements
    if (changelog?.improvements) {
      changelog.improvements.slice(0, 2).forEach((improvement) => {
        highlights.push({
          title: extractFeatureTitle(improvement),
          description: improvement,
          icon: '🚀',
          category: 'improvement'
        });
      });
    }

    // Add critical security updates (user-facing)
    if (changelog?.security_updates) {
      changelog.security_updates
        .filter(update => !update.toLowerCase().includes('internal') && !update.toLowerCase().includes('backend'))
        .slice(0, 1)
        .forEach((update) => {
          highlights.push({
            title: extractFeatureTitle(update),
            description: update,
            icon: '🔒',
            category: 'security'
          });
        });
    }

    return highlights.slice(0, 5); // Limit to 5 highlights max
  };

  // Extract a readable title from feature description
  const extractFeatureTitle = (description: string): string => {
    // Remove common prefixes and clean up the text for display
    const cleanDescription = description
      .replace(/^(Added?|Implemented?|Enhanced?|Improved?|Fixed?|Updated?)\s+/i, '')
      .replace(/^(New|Better)\s+/i, '')
      .trim();

    // Take first part before colon or dash, or limit to reasonable length
    const titleMatch = cleanDescription.match(/^([^:—-]+)[—:-]/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // Fallback: take first 50 characters
    return cleanDescription.length > 50
      ? cleanDescription.substring(0, 47) + '...'
      : cleanDescription;
  };

  const getCategoryColor = (category: FeatureHighlight['category']) => {
    switch (category) {
      case 'feature':
        return 'from-green-400 to-blue-500';
      case 'improvement':
        return 'from-blue-400 to-purple-500';
      case 'security':
        return 'from-red-400 to-pink-500';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const getCategoryLabel = (category: FeatureHighlight['category']) => {
    switch (category) {
      case 'feature':
        return t('whatsNew.categories.newFeature');
      case 'improvement':
        return t('whatsNew.categories.improvement');
      case 'security':
        return t('whatsNew.categories.security');
      default:
        return t('whatsNew.categories.update');
    }
  };

  const highlights = updateInfo?.changelog ? getFeatureHighlights(updateInfo.changelog) : [];

  // Show overlay with delay after update
  useEffect(() => {
    if (isVisible && highlights.length > 0) {
      const timer = setTimeout(() => {
        setShowOverlay(true);
        logger.log('Showing What\'s New overlay for version:', updateInfo?.version);
      }, autoShowDelay);

      return () => clearTimeout(timer);
    } else {
      setShowOverlay(false);
    }
  }, [isVisible, highlights.length, autoShowDelay, updateInfo?.version]);

  // Auto-advance highlights
  useEffect(() => {
    if (showOverlay && highlights.length > 1) {
      const interval = setInterval(() => {
        setCurrentHighlight(prev => (prev + 1) % highlights.length);
      }, 4000); // Change highlight every 4 seconds

      return () => clearInterval(interval);
    }
  }, [showOverlay, highlights.length]);

  const handleNext = () => {
    setCurrentHighlight(prev => (prev + 1) % highlights.length);
  };

  const handlePrevious = () => {
    setCurrentHighlight(prev => (prev - 1 + highlights.length) % highlights.length);
  };

  const handleDismiss = () => {
    setShowOverlay(false);
    // Small delay before calling onDismiss to allow animation to complete
    setTimeout(onDismiss, 300);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleDismiss();
    } else if (event.key === 'ArrowRight') {
      handleNext();
    } else if (event.key === 'ArrowLeft') {
      handlePrevious();
    }
  };

  if (!showOverlay || highlights.length === 0) {
    return null;
  }

  const currentFeature = highlights[currentHighlight];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      aria-describedby="whats-new-description"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor(currentFeature.category)} opacity-10`}></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getCategoryColor(currentFeature.category)} flex items-center justify-center text-white text-lg font-bold mr-3`}>
                  {currentFeature.icon}
                </div>
                <div>
                  <h2 id="whats-new-title" className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('whatsNew.title')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('update.version', { version: updateInfo?.version })}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={t('whatsNew.close')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Category Badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-80 dark:bg-gray-700 dark:bg-opacity-80 text-gray-700 dark:text-gray-300">
              {getCategoryLabel(currentFeature.category)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6" id="whats-new-description">
          <div className="min-h-[120px]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {currentFeature.title}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {currentFeature.description}
            </p>
          </div>

          {/* Navigation */}
          {highlights.length > 1 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={handlePrevious}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={t('whatsNew.previous')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Indicators */}
              <div className="flex space-x-2">
                {highlights.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentHighlight(index)}
                    className={`w-2 h-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      index === currentHighlight
                        ? 'bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    }`}
                    aria-label={t('whatsNew.goToHighlight', { number: index + 1 })}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={t('whatsNew.next')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                // Open full changelog
                logger.log('User requested full changelog from What\'s New overlay');
                // This would trigger the ChangelogModal
                window.dispatchEvent(new CustomEvent('show-changelog', {
                  detail: { updateInfo }
                }));
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            >
              {t('whatsNew.seeAllChanges')}
            </button>

            <button
              onClick={handleDismiss}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {t('whatsNew.gotIt')}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};