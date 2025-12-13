/**
 * InsightsModal Component
 * 
 * Displays coaching insights in a modal overlay with a clean list format.
 * Replaces the card-based display on the coach page for better clarity.
 * 
 * Features:
 * - Platform-aware modal (sheet on iOS, dialog on web)
 * - List-style insight display with icons
 * - Grouped by source (AI vs rule-based)
 * - Dismissible insights
 * - Action buttons for each insight
 * - Accessible and RTL-compatible
 * - Theme-aware styling
 */

import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PlatformModal } from './platform/PlatformModal';
import type { CoachingInsight } from '../types/coaching';

interface InsightsModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** List of insights to display */
  insights: CoachingInsight[];
  /** Callback when an action is triggered */
  onAction?: (action: string, data?: unknown) => void;
  /** Callback when an insight is dismissed */
  onDismiss?: (insightId: string) => void;
}

/**
 * Icon component mapping - simplified versions for list display
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

/**
 * Single insight item in the list
 */
interface InsightItemProps {
  insight: CoachingInsight;
  onAction?: (action: string, data?: unknown) => void;
  onDismiss?: (insightId: string) => void;
}

const InsightItem: React.FC<InsightItemProps> = ({ insight, onAction, onDismiss }) => {
  const { t } = useTranslation(['coaching', 'common', 'exerciseDetails', 'exercises']);

  // Parse message with interpolation support
  const parseMessage = useCallback((messageKey: string): { key: string; params: Record<string, string> } => {
    const parts = messageKey.split(':');
    if (parts.length === 1) {
      return { key: messageKey, params: {} };
    }

    const key = parts[0];
    const paramValues = parts.slice(1);
    const params: Record<string, string> = {};

    paramValues.forEach((value, index) => {
      if ((key === 'progression.readyMessage' || key === 'progression.readyDurationMessage') && index === 0) {
        const translatedName = t(`exerciseDetails:${value}.name`, { defaultValue: value });
        params[`param${index}`] = translatedName || value;
      } else if ((key === 'muscleBalance.underTrainedMessage' || key === 'muscleBalance.overTrainedMessage' || key === 'muscleBalance.neglectedMessage') && index === 0 && value.includes(',')) {
        const muscleGroups = value.split(',');
        const translatedGroups = muscleGroups.map(muscle =>
          t(`exercises:muscleGroupsList.${muscle.trim()}`, { defaultValue: muscle.trim() })
        );
        params[`param${index}`] = translatedGroups.join(', ');
      } else if ((key === 'muscleBalance.underTrainedMessage' || key === 'muscleBalance.overTrainedMessage' || key === 'muscleBalance.neglectedMessage') && index === 0) {
        const translatedMuscle = t(`exercises:muscleGroupsList.${value}`, { defaultValue: value });
        params[`param${index}`] = translatedMuscle;
      } else {
        params[`param${index}`] = value;
      }
    });

    return { key, params };
  }, [t]);

  const { key: titleKey, params: titleParams } = useMemo(() => 
    parseMessage(insight.title),
    [insight.title, parseMessage]
  );
  
  const { key: messageKey, params: messageParams } = useMemo(() => 
    parseMessage(insight.message),
    [insight.message, parseMessage]
  );

  const IconComponent = useMemo(() => 
    insight.icon ? IconMap[insight.icon] : IconMap.info,
    [insight.icon]
  );

  const handleDismiss = useCallback(() => {
    if (onDismiss && insight.dismissible) {
      onDismiss(insight.id);
    }
  }, [onDismiss, insight.dismissible, insight.id]);

  const handleAction = useCallback((actionId: string, data?: unknown) => {
    if (onAction) {
      onAction(actionId, data);
    }
  }, [onAction]);

  // Priority indicator color
  const priorityColor = useMemo(() => {
    switch (insight.priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-gray-400 dark:bg-gray-500';
      default: return 'bg-gray-400 dark:bg-gray-500';
    }
  }, [insight.priority]);

  return (
    <div 
      className="py-4 border-b border-surface-200 dark:border-surface-700 last:border-b-0"
      role="article"
      aria-label={t(titleKey, titleParams)}
    >
      {/* Header row: Icon + Title + AI Badge + Dismiss */}
      <div className="flex items-start gap-3">
        {/* Priority indicator + Icon */}
        <div className="flex-shrink-0 relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            insight.source === 'ai' 
              ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 dark:from-purple-500/30 dark:to-blue-500/30' 
              : 'bg-surface-100 dark:bg-surface-700'
          }`}>
            <IconComponent className={`w-5 h-5 ${insight.iconColor || 'text-text-600 dark:text-text-300'}`} />
          </div>
          {/* Priority dot */}
          <span 
            className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ${priorityColor} border-2 border-white dark:border-surface-800`}
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row with badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-body font-semibold text-text-900 dark:text-text-50">
              {t(titleKey, titleParams)}
            </h4>
            {insight.source === 'ai' && (
              <span className="ai-badge inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium">
                <svg className="w-3 h-3 ltr:mr-0.5 rtl:ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t('coaching:aiPowered', { defaultValue: 'AI' })}
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-caption text-text-600 dark:text-text-300 mb-3">
            {t(messageKey, messageParams)}
          </p>

          {/* Actions */}
          {insight.actions && insight.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {insight.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action.action, action.data)}
                  className="px-3 py-1.5 text-small font-medium rounded-lg
                    bg-primary-50 dark:bg-primary-900/30
                    text-primary-700 dark:text-primary-300
                    hover:bg-primary-100 dark:hover:bg-primary-900/50
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
                    dark:focus:ring-offset-surface-800
                    transition-colors motion-reduce:transition-none"
                >
                  {t(action.label)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {insight.dismissible && onDismiss && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 rounded-lg
              text-text-400 hover:text-text-600 dark:hover:text-text-200
              hover:bg-surface-100 dark:hover:bg-surface-700
              focus:outline-none focus:ring-2 focus:ring-surface-400
              transition-colors motion-reduce:transition-none"
            aria-label={t('common:dismiss', { defaultValue: 'Dismiss' })}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * InsightsModal Component
 */
export const InsightsModal: React.FC<InsightsModalProps> = ({
  isOpen,
  onClose,
  insights,
  onAction,
  onDismiss,
}) => {
  const { t } = useTranslation(['coaching', 'common']);

  // Group insights by source
  const { aiInsights, ruleInsights } = useMemo(() => ({
    aiInsights: insights.filter(i => i.source === 'ai'),
    ruleInsights: insights.filter(i => i.source === 'rule' || !i.source),
  }), [insights]);

  // Handle action and close modal
  const handleAction = useCallback((action: string, data?: unknown) => {
    if (onAction) {
      onAction(action, data);
    }
    onClose();
  }, [onAction, onClose]);

  return (
    <PlatformModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('coaching:insightsModal.title', { defaultValue: 'Your Coach Recommendations' })}
      size="large"
      sheetOnMobile={true}
      showHandle={true}
      ariaLabel={t('coaching:insightsModal.ariaLabel', { defaultValue: 'Coach recommendations and insights' })}
    >
      <div className="px-4 py-2">
        {/* Summary header */}
        <p className="text-caption text-text-500 dark:text-text-400 mb-4">
          {t('coaching:insightsModal.summary', { 
            count: insights.length,
            defaultValue: '{{count}} recommendations to help you improve' 
          })}
        </p>

        {/* Empty state */}
        {insights.length === 0 && (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-surface-400 dark:text-surface-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-body text-text-500 dark:text-text-400">
              {t('coaching:insightsModal.empty', { defaultValue: 'No recommendations right now. Keep working out!' })}
            </p>
          </div>
        )}

        {/* AI Insights section */}
        {aiInsights.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-caption font-semibold text-text-700 dark:text-text-200 uppercase tracking-wide">
                {t('coaching:insightsModal.aiSection', { defaultValue: 'AI-Powered' })}
              </h3>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800/50 rounded-xl">
              {aiInsights.map(insight => (
                <InsightItem
                  key={insight.id}
                  insight={insight}
                  onAction={handleAction}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          </div>
        )}

        {/* Rule-based Insights section */}
        {ruleInsights.length > 0 && (
          <div>
            {aiInsights.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-text-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-caption font-semibold text-text-700 dark:text-text-200 uppercase tracking-wide">
                  {t('coaching:insightsModal.standardSection', { defaultValue: 'Standard Insights' })}
                </h3>
              </div>
            )}
            <div className={`${aiInsights.length > 0 ? 'bg-surface-50 dark:bg-surface-800/50 rounded-xl' : ''}`}>
              {ruleInsights.map(insight => (
                <InsightItem
                  key={insight.id}
                  insight={insight}
                  onAction={handleAction}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </PlatformModal>
  );
};

export default InsightsModal;
