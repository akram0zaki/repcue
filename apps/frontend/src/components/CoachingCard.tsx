/**
 * CoachingCard Component
 * 
 * Displays a single coaching insight with icon, title, message, and actions.
 * Supports dismissible insights and action buttons.
 * 
 * Features:
 * - Icon with dynamic color
 * - Localized title and message
 * - Priority-based visual styling
 * - Action buttons
 * - Dismiss functionality
 * - Accessibility compliant
 * - Responsive design
 * - Performance optimized with React.memo
 */

import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CoachingInsight } from '../types/coaching';

interface CoachingCardProps {
  insight: CoachingInsight;
  onAction?: (action: string, data?: unknown) => void;
  onDismiss?: (insightId: string) => void;
}

/**
 * Icon component mapping
 */
const IconMap: Record<string, React.FC<{ className?: string }>> = {
  fire: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
    </svg>
  ),
  trophy: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" />
    </svg>
  ),
  target: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  alert: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  'alert-circle': ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'alert-triangle': ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  calendar: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'trending-up': ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  lightbulb: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
    </svg>
  ),
  info: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  )
};

export const CoachingCard: React.FC<CoachingCardProps> = ({ insight, onAction, onDismiss }) => {
  const { t } = useTranslation(['coaching', 'common', 'exerciseDetails', 'exercises']);

  // Memoize action handler to prevent recreating on every render
  const handleAction = useCallback((actionId: string, data?: unknown) => {
    if (onAction) {
      onAction(actionId, data);
    }
  }, [onAction]);

  // Memoize dismiss handler to prevent recreating on every render
  const handleDismiss = useCallback(() => {
    if (onDismiss && insight.dismissible) {
      onDismiss(insight.id);
    }
  }, [onDismiss, insight.dismissible, insight.id]);

  // Memoize icon component lookup
  const IconComponent = useMemo(() => 
    insight.icon ? IconMap[insight.icon] : IconMap.info,
    [insight.icon]
  );

  // Memoize priority-based border color calculation
  // AI insights get purple accent, rule-based insights get priority colors
  const borderColor = useMemo(() => {
    if (insight.source === 'ai') {
      return 'border-purple-400 dark:border-purple-600';
    }
    return {
      high: 'border-red-400 dark:border-red-600',
      medium: 'border-amber-400 dark:border-amber-600',
      low: 'border-blue-400 dark:border-blue-600'
    }[insight.priority];
  }, [insight.priority, insight.source]);

  // Memoize background color for AI insights
  const bgColor = useMemo(() => {
    if (insight.source === 'ai') {
      return 'bg-purple-50/50 dark:bg-purple-900/10';
    }
    return 'bg-white dark:bg-gray-800';
  }, [insight.source]);

  // Parse message with interpolation support (memoized)
  const parseMessage = useCallback((messageKey: string): { key: string; params: Record<string, string> } => {
    const parts = messageKey.split(':');
    if (parts.length === 1) {
      return { key: messageKey, params: {} };
    }

    const key = parts[0];
    const paramValues = parts.slice(1);

    // Create params object with generic param names
    const params: Record<string, string> = {};
    paramValues.forEach((value, index) => {
      // Check if this is the first param in a progression message context
      // These are exercise IDs and need translation from exerciseDetails
      if ((key === 'progression.readyMessage' || key === 'progression.readyDurationMessage') && index === 0) {
        // Translate exercise name from exerciseDetails
        // Use the exercise ID as fallback if translation fails
        const translatedName = t(`exerciseDetails:${value}.name`, { defaultValue: value });
        params[`param${index}`] = translatedName || value;
      }
      // Check if this is a muscle balance message with comma-separated muscle groups
      else if ((key === 'muscleBalance.underTrainedMessage' || key === 'muscleBalance.overTrainedMessage' || key === 'muscleBalance.neglectedMessage') && index === 0 && value.includes(',')) {
        // Split the comma-separated muscle groups and translate each one
        const muscleGroups = value.split(',');
        const translatedGroups = muscleGroups.map(muscle =>
          t(`exercises:muscleGroupsList.${muscle.trim()}`, { defaultValue: muscle.trim() })
        );
        params[`param${index}`] = translatedGroups.join(', ');
      }
      // Check if this is a single muscle group (all muscle balance messages)
      else if ((key === 'muscleBalance.underTrainedMessage' || key === 'muscleBalance.overTrainedMessage' || key === 'muscleBalance.neglectedMessage') && index === 0) {
        // Translate single muscle group
        const translatedMuscle = t(`exercises:muscleGroupsList.${value}`, { defaultValue: value });
        params[`param${index}`] = translatedMuscle;
      }
      else {
        params[`param${index}`] = value;
      }
    });

    return { key, params };
  }, [t]);

  // Memoize parsed title and message to avoid recalculating on every render
  const { key: titleKey, params: titleParams } = useMemo(() => 
    parseMessage(insight.title),
    [insight.title, parseMessage]
  );
  
  const { key: messageKey, params: messageParams } = useMemo(() => 
    parseMessage(insight.message),
    [insight.message, parseMessage]
  );

  // Generate unique IDs for ARIA relationships
  const titleId = `coaching-title-${insight.id}`;
  const messageId = `coaching-message-${insight.id}`;

  return (
    <div 
      className={`${bgColor} rounded-xl shadow-sm border-l-4 ${borderColor} border-t border-r border-b border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-900 transition-shadow motion-reduce:transition-none`}
      role="article"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Row 1: Icon (left/right), AI Badge (center), Dismiss Button (right/left) - RTL aware */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {/* Icon */}
        <div 
          className="flex-shrink-0" 
          aria-hidden="true"
        >
          <IconComponent className={`w-6 h-6 ${insight.iconColor || 'text-gray-500 dark:text-gray-400'}`} />
        </div>

        {/* AI Badge - Centered */}
        {insight.source === 'ai' && (
          <span 
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-200 dark:text-purple-900"
            aria-label={t('coaching:aiPowered', { defaultValue: 'AI-Powered' })}
            title={t('coaching:aiPowered', { defaultValue: 'AI-Powered' })}
          >
            <svg className="w-3 h-3 ltr:mr-1 rtl:ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('coaching:aiPowered', { defaultValue: 'AI' })}
          </span>
        )}

        {/* Spacer for non-AI insights to maintain layout */}
        {insight.source !== 'ai' && <div className="flex-1" />}

        {/* Dismiss button */}
        {insight.dismissible && onDismiss && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            aria-label={`${t('common:dismiss', { defaultValue: 'Dismiss' })} ${t(titleKey, titleParams)}`}
            title={t('common:dismiss', { defaultValue: 'Dismiss' })}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Row 2: Title/Heading */}
      <div className="px-4 pb-2">
        <h4
          id={titleId}
          className="text-base font-semibold text-text-900 dark:text-text-50 break-words"
        >
          {t(titleKey, titleParams)}
        </h4>
      </div>

      {/* Row 3: Message/Description */}
      <div className="px-4 pb-3">
        <p 
          id={messageId}
          className="text-body"
        >
          {t(messageKey, messageParams)}
        </p>
      </div>

      {/* Section 3: Action buttons */}
      {insight.actions && insight.actions.length > 0 && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div 
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t('coaching:actionsLabel', 'Available actions')}
          >
            {insight.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleAction(action.action, action.data)}
                className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                aria-label={`${t(action.label)} - ${t(titleKey, titleParams)}`}
              >
                {t(action.label)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Memoized version of CoachingCard to prevent unnecessary re-renders
 * Only re-renders when insight, onAction, or onDismiss props actually change
 */
export default React.memo(CoachingCard, (prevProps, nextProps) => {
  // Custom comparison function for deep insight comparison
  return (
    prevProps.insight.id === nextProps.insight.id &&
    prevProps.insight.title === nextProps.insight.title &&
    prevProps.insight.message === nextProps.insight.message &&
    prevProps.insight.priority === nextProps.insight.priority &&
    prevProps.insight.source === nextProps.insight.source &&
    prevProps.insight.icon === nextProps.insight.icon &&
    prevProps.insight.dismissible === nextProps.insight.dismissible &&
    prevProps.onAction === nextProps.onAction &&
    prevProps.onDismiss === nextProps.onDismiss
  );
});
