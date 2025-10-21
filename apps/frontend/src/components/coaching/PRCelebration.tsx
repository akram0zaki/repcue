/**
 * PRCelebration Component
 * 
 * Displays a celebration modal/toast when a user sets a new personal record.
 * Features:
 * - Trophy icon and congratulatory message
 * - Previous vs new PR comparison
 * - Confetti animation (respects reduced motion)
 * - Auto-dismiss after 8 seconds
 * - Accessible with proper ARIA labels
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { PersonalRecord } from '../../types/coaching';

interface PRCelebrationProps {
  record: PersonalRecord;
  onDismiss: () => void;
  autoDismiss?: boolean;
  dismissDelay?: number;
}

/**
 * PR Celebration Component
 * 
 * Shows a modal celebrating a new personal record with animation and details
 */
export function PRCelebration({
  record,
  onDismiss,
  autoDismiss = true,
  dismissDelay = 8000
}: PRCelebrationProps) {
  const { t } = useTranslation('coaching');
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Format the record type for display
  const getRecordTypeLabel = (type: string): string => {
    switch (type) {
      case 'max-reps':
        return t('pr.type.maxReps', 'Max Reps');
      case 'max-sets':
        return t('pr.type.maxSets', 'Max Sets');
      case 'max-duration':
        return t('pr.type.maxDuration', 'Max Duration');
      case 'max-weight':
        return t('pr.type.maxWeight', 'Max Weight');
      default:
        return type;
    }
  };

  // Format the value with appropriate unit
  const formatValue = (value: number, type: string): string => {
    switch (type) {
      case 'max-reps':
        return `${value} ${t('pr.unit.reps', 'reps')}`;
      case 'max-sets':
        return `${value} ${t('pr.unit.sets', 'sets')}`;
      case 'max-duration': {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return minutes > 0 
          ? `${minutes}m ${seconds}s`
          : `${seconds}s`;
      }
      case 'max-weight':
        return `${value} kg`;
      default:
        return `${value}`;
    }
  };

  // Trigger confetti animation
  const triggerConfetti = useCallback(() => {
    if (prefersReducedMotion) {
      // Skip animation if user prefers reduced motion
      return;
    }

    setShowConfetti(true);
    // Clear confetti after animation completes
    setTimeout(() => setShowConfetti(false), 3000);
  }, [prefersReducedMotion]);

  // Show modal on mount
  useEffect(() => {
    // Delay to allow entrance animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    // Trigger confetti on mount
    triggerConfetti();

    return () => clearTimeout(showTimer);
  }, [triggerConfetti]);

  // Auto-dismiss after delay
  useEffect(() => {
    if (!autoDismiss) return;

    const dismissTimer = setTimeout(() => {
      handleClose();
    }, dismissDelay);

    return () => clearTimeout(dismissTimer);
  }, [autoDismiss, dismissDelay]);

  const handleClose = () => {
    setIsVisible(false);
    // Wait for exit animation before calling onDismiss
    setTimeout(onDismiss, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-labelledby="pr-celebration-title"
        aria-describedby="pr-celebration-description"
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] 
          w-[90%] max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 
          transition-all duration-300 motion-reduce:transition-none ${
            isVisible 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-95'
          }`}
      >
        {/* Confetti Animation (CSS-based, respects reduced motion) */}
        {showConfetti && !prefersReducedMotion && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" aria-hidden="true">
            {/* Generate confetti particles with Tailwind classes */}
            {Array.from({ length: 30 }).map((_, i) => {
              const colors = ['bg-yellow-400', 'bg-red-400', 'bg-teal-400', 'bg-blue-400', 'bg-orange-400'];
              const leftPositions = ['left-[10%]', 'left-[20%]', 'left-[30%]', 'left-[40%]', 'left-[50%]', 'left-[60%]', 'left-[70%]', 'left-[80%]', 'left-[90%]'];
              const delays = ['animation-delay-0', 'animation-delay-1', 'animation-delay-2'];
              
              return (
                <div
                  key={i}
                  className={`absolute top-[-10px] w-2 h-2 ${colors[i % colors.length]} 
                    ${leftPositions[i % leftPositions.length]} ${delays[i % delays.length]} 
                    animate-confetti-fall`}
                />
              );
            })}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 
            focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
          aria-label={t('pr.close', 'Close celebration')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Trophy Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full 
            flex items-center justify-center shadow-lg motion-reduce:transition-none
            animate-bounce-slow">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-.293.707L15 12.414V15a1 1 0 01-.293.707l-2 2A1 1 0 0111 18v-5.586l-.293-.293A1 1 0 0110 11.5V4a1 1 0 011-1h.001z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 
          id="pr-celebration-title"
          className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white"
        >
          {t('pr.newRecord', '🎉 New Personal Record!')}
        </h2>

        {/* Exercise Name */}
        <p className="text-lg text-center text-gray-700 dark:text-gray-300 mb-4 font-semibold">
          {record.exerciseName}
        </p>

        {/* Record Details */}
        <div 
          id="pr-celebration-description"
          className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4"
        >
          {/* Record Type */}
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 text-center">
            {getRecordTypeLabel(record.recordType)}
          </div>

          {/* New Value */}
          <div className="text-4xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2">
            {formatValue(record.value, record.recordType)}
          </div>

          {/* Previous Record & Improvement */}
          {record.previousRecord !== undefined && record.improvementPercentage !== undefined && (
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('pr.previousBest', 'Previous best')}: {formatValue(record.previousRecord, record.recordType)}
              </div>
              <div className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
                <span>
                  +{record.improvementPercentage}% {t('pr.improvement', 'improvement')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Motivational Message */}
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6 text-sm">
          {t('pr.keepGoing', 'Keep up the great work! Your hard work is paying off.')}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold 
              rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 
              focus:ring-offset-2"
          >
            {t('pr.awesome', 'Awesome!')}
          </button>
          
          {/* Future: Share button */}
          {/* <button
            className="px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
              dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold 
              rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 
              focus:ring-offset-2"
          >
            {t('pr.share', 'Share')}
          </button> */}
        </div>

        {/* Auto-dismiss indicator */}
        {autoDismiss && (
          <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            {t('pr.autoDismiss', 'Auto-closing in {{seconds}} seconds', { 
              seconds: Math.ceil(dismissDelay / 1000) 
            })}
          </div>
        )}
      </div>

      {/* Confetti Styles */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(120vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-confetti-fall {
          animation: confetti-fall 3s linear forwards;
        }

        .animation-delay-0 {
          animation-delay: 0s;
        }

        .animation-delay-1 {
          animation-delay: 1s;
        }

        .animation-delay-2 {
          animation-delay: 2s;
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        /* Respect reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          .animate-confetti-fall,
          .animate-bounce-slow {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
