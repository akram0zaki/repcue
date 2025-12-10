/**
 * InsightsCarousel Component
 *
 * Compact horizontal carousel displaying weekly coaching insights on the home page.
 *
 * Features:
 * - Swipeable card carousel with touch support
 * - Shows 1-3 top priority insights
 * - Auto-rotates every 8 seconds (optional)
 * - Tap to expand insight or navigate to Coach page
 * - Accessible with keyboard navigation
 * - Respects reduced motion preferences
 *
 * Usage:
 * Displayed on HomePage when coach_show_on_home is enabled
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { CoachingInsight } from '../types/coaching';
import type { AppSettings } from '../types';
import { prefersReducedMotion } from '../utils/microInteractions';
import logger from '../utils/logger';

/**
 * Component props
 */
interface InsightsCarouselProps {
  /** Coaching insights to display (max 3) */
  insights: CoachingInsight[];
  /** App settings */
  settings: AppSettings;
  /** Callback when user wants to view all insights */
  onViewAll?: () => void;
  /** Auto-rotate interval in ms (0 to disable) */
  autoRotateInterval?: number;
}

/**
 * InsightsCarousel Component
 */
export const InsightsCarousel: React.FC<InsightsCarouselProps> = ({
  insights,
  settings: _settings, // Reserved for future use (persona-based message formatting)
  onViewAll,
  autoRotateInterval = 8000,
}) => {
  const { t } = useTranslation(['coaching', 'common', 'exerciseDetails', 'exercises']);
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const autoRotateTimer = useRef<NodeJS.Timeout | null>(null);

  // Limit to top 3 insights
  const displayInsights = insights.slice(0, 3);

  /**
   * Navigate to next insight
   */
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayInsights.length);
  };

  /**
   * Navigate to previous insight
   */
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + displayInsights.length) % displayInsights.length);
  };

  /**
   * Navigate to specific insight
   */
  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  /**
   * Handle touch start
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  /**
   * Handle touch move
   */
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  /**
   * Handle touch end (swipe detection)
   */
  const handleTouchEnd = () => {
    const swipeThreshold = 50; // minimum swipe distance in pixels
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - go to next
        goToNext();
      } else {
        // Swiped right - go to previous
        goToPrevious();
      }
    }

    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  /**
   * Handle insight click - navigate to Coach page
   */
  const handleInsightClick = () => {
    logger.log('[InsightsCarousel] Insight clicked, navigating to Coach page');
    navigate('/coach');
  };

  /**
   * Auto-rotate effect
   */
  useEffect(() => {
    // Don't auto-rotate if:
    // - User prefers reduced motion
    // - Auto-rotate is disabled
    // - Only 1 insight
    // - Carousel is paused
    if (
      prefersReducedMotion() ||
      autoRotateInterval === 0 ||
      displayInsights.length <= 1 ||
      isPaused
    ) {
      if (autoRotateTimer.current) {
        clearInterval(autoRotateTimer.current);
        autoRotateTimer.current = null;
      }
      return;
    }

    // Start auto-rotate timer
    autoRotateTimer.current = setInterval(() => {
      goToNext();
    }, autoRotateInterval);

    // Cleanup
    return () => {
      if (autoRotateTimer.current) {
        clearInterval(autoRotateTimer.current);
        autoRotateTimer.current = null;
      }
    };
  }, [autoRotateInterval, displayInsights.length, isPaused, currentIndex]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNext();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleInsightClick();
    }
  };

  // No insights to display
  if (displayInsights.length === 0) {
    return null;
  }

  const currentInsight = displayInsights[currentIndex];

  // Icon mapping (reuse from CoachingCard)
  const iconMap: Record<string, React.ReactNode> = {
    fire: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
    trophy: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    'trending-up': (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    target: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    lightbulb: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    default: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="section-title">
          {t('coaching:insights', { defaultValue: 'Coach Insights' })}
        </h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded px-2 py-1 view-all-btn"
          >
            {t('coaching:viewAll', { defaultValue: 'View All' })}
          </button>
        )}
      </div>

      {/* Carousel */}
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        {/* Card */}
        <div
          role="group"
          aria-label={t('coaching:insightsCarousel', { defaultValue: 'Coaching insights carousel' })}
          aria-roledescription="carousel"
          aria-live="polite"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleInsightClick}
          className="insights-card"
        >
          <div className="flex flex-col items-stretch">
            {/* Top row: Icon centered */}
            <div className="flex justify-center insight-icon">
              {(currentInsight.icon && iconMap[currentInsight.icon]) || iconMap.default}
            </div>

            {/* Second row: Wrapped insight text (title + message) */}
            <div className="flex-1 min-w-0 mt-2">
              <h3 className="font-semibold text-text-900 dark:text-text-50 mb-1">
                {t(currentInsight.title, { defaultValue: currentInsight.title })}
              </h3>
              <p className="text-sm text-body whitespace-normal break-words">
                {(() => {
                  // Parse message format: "key:param1:param2:param3"
                  const parts = currentInsight.message.split(':');
                  const key = parts[0];
                  
                  // If there are parameters, extract and translate them
                  if (parts.length > 1) {
                    const paramValues = parts.slice(1);
                    const params: Record<string, string> = {};
                    
                    paramValues.forEach((value, index) => {
                      // Check if this is an exercise name in a progression message (first param)
                      if ((key === 'progression.readyMessage' || key === 'progression.readyDurationMessage') && index === 0) {
                        // Translate exercise name from exerciseDetails namespace
                        // Try translation first, if not found, use the raw value (which might be already a name)
                        const translatedName = t(`exerciseDetails:${value}.name`, { defaultValue: value });
                        params[`param${index}`] = translatedName;
                      }
                      // Check if this is a muscle balance message with comma-separated muscle groups
                      else if ((key === 'muscleBalance.underTrainedMessage' || key === 'muscleBalance.overTrainedMessage') && index === 0 && value.includes(',')) {
                        // Split the comma-separated muscle groups and translate each one
                        const muscleGroups = value.split(',').map(m => m.trim());
                        const translatedGroups = muscleGroups.map(muscle =>
                          t(`exercises:muscleGroupsList.${muscle}`, { defaultValue: muscle })
                        );
                        params[`param${index}`] = translatedGroups.join('، '); // Use Arabic comma for RTL
                      }
                      // Check if this is a single muscle group (neglected message or first param)
                      else if ((key === 'muscleBalance.neglectedMessage' || key === 'muscleBalance.underTrainedMessage' || key === 'muscleBalance.overTrainedMessage') && index === 0) {
                        // Translate single muscle group or comma-separated list
                        if (value.includes(',')) {
                          const muscleGroups = value.split(',').map(m => m.trim());
                          const translatedGroups = muscleGroups.map(muscle =>
                            t(`exercises:muscleGroupsList.${muscle}`, { defaultValue: muscle })
                          );
                          params[`param${index}`] = translatedGroups.join('، '); // Use Arabic comma for RTL
                        } else {
                          const translatedMuscle = t(`exercises:muscleGroupsList.${value}`, { defaultValue: value });
                          params[`param${index}`] = translatedMuscle;
                        }
                      }
                      else {
                        params[`param${index}`] = value;
                      }
                    });
                    
                    return t(`coaching:${key}`, { ...params, defaultValue: currentInsight.message });
                  }
                  
                  // Otherwise, translate as-is
                  return t(currentInsight.message, { defaultValue: currentInsight.message });
                })()}
              </p>
              {/* AI badge */}
              {currentInsight.source === 'ai' && (
                <span className="ai-badge">
                  {t('coaching:aiPowered', { defaultValue: 'AI' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Dots */}
        {displayInsights.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3" role="tablist" aria-label={t('coaching:carouselNavigation', { defaultValue: 'Carousel navigation' })}>
            {displayInsights.map((_, index) => {
              const isActive = index === currentIndex;
              return (
                <button
                  key={index}
                  role="tab"
                  data-carousel-indicator="true"
                  aria-label={t('coaching:goToInsight', { defaultValue: 'Go to insight {{number}}', number: index + 1 })}
                  aria-selected={isActive ? 'true' : 'false'}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToIndex(index);
                  }}
                  className={
                    isActive
                      ? 'w-6 h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 p-0 carousel-indicator-active'
                      : 'w-2 h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 p-0'
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsCarousel;
