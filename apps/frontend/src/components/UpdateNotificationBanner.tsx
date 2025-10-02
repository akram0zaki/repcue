import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpdateInfo, UpdatePolicy } from '../types';
import { updateService } from '../services/updateService';
import logger from '../utils/logger';

interface UpdateNotificationBannerProps {
  updateInfo: UpdateInfo;
  onApplyUpdate: () => void;
  onDismiss?: () => void;
  onShowChangelog?: () => void;
  className?: string;
}

/**
 * UpdateNotificationBanner component for displaying PWA update notifications
 * Follows RepCue design system with accessibility compliance
 */
export const UpdateNotificationBanner: React.FC<UpdateNotificationBannerProps> = ({
  updateInfo,
  onApplyUpdate,
  onDismiss,
  onShowChangelog,
  className = ''
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{
    isMetered: boolean;
    warning: string;
  } | null>(null);

  // Check metered connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const meteredInfo = await updateService.checkMeteredConnectionPolicy(updateInfo);
      if (meteredInfo.needsUserConfirmation || meteredInfo.warningMessage) {
        setConnectionInfo({
          isMetered: !meteredInfo.shouldProceed,
          warning: meteredInfo.warningMessage
        });
      }
    };
    checkConnection();
  }, [updateInfo]);

  const getPolicyConfig = (policy: UpdatePolicy) => {
    switch (policy) {
      case 'force':
        return {
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          borderColor: 'border-red-500',
          textColor: 'text-red-800 dark:text-red-200',
          icon: '🔒',
          urgency: 'high' as const,
          canDismiss: false
        };
      case 'critical':
        return {
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          borderColor: 'border-orange-500',
          textColor: 'text-orange-800 dark:text-orange-200',
          icon: '⚠️',
          urgency: 'medium' as const,
          canDismiss: true
        };
      case 'optional':
        return {
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          borderColor: 'border-blue-500',
          textColor: 'text-blue-800 dark:text-blue-200',
          icon: '🔄',
          urgency: 'low' as const,
          canDismiss: true
        };
      default:
        return {
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
          borderColor: 'border-gray-500',
          textColor: 'text-gray-800 dark:text-gray-200',
          icon: 'ℹ️',
          urgency: 'low' as const,
          canDismiss: true
        };
    }
  };

  const config = getPolicyConfig(updateInfo.policy);

  const getUpdateTitle = () => {
    switch (updateInfo.policy) {
      case 'force':
        return t('update.force.title', 'Security Update Required');
      case 'critical':
        return t('update.critical.title', 'Important Update Available');
      case 'optional':
        return t('update.optional.title', 'New Version Available');
      default:
        return t('update.default.title', 'Update Available');
    }
  };

  const getUpdateMessage = () => {
    if (updateInfo.message) {
      return updateInfo.message;
    }
    return updateService.getUpdatePolicyMessage(updateInfo);
  };

  const handleApplyUpdate = async () => {
    try {
      logger.log('User initiated update from banner');
      await onApplyUpdate();
    } catch (error) {
      logger.error('Failed to apply update from banner:', error);
      // Error handling will be done by the parent component
    }
  };

  const handleDismiss = () => {
    if (config.canDismiss && onDismiss) {
      logger.log('User dismissed update notification');
      onDismiss();
    }
  };

  const getEstimatedSize = (updateInfo: UpdateInfo): number => {
    // Rough estimate based on update policy
    switch (updateInfo.policy) {
      case 'force':
        return 5; // Security updates tend to be smaller
      case 'critical':
        return 10; // Medium-sized updates
      case 'optional':
        return 15; // Feature updates can be larger
      default:
        return 8; // Default estimate
    }
  };

  const estimatedSize = getEstimatedSize(updateInfo);

  return (
    <div
      className={`${config.bgColor} border-l-4 ${config.borderColor} ${config.textColor} p-4 mb-4 ${className}`}
      role={config.urgency === 'high' ? 'alert' : 'status'}
      aria-live={config.urgency === 'high' ? 'assertive' : 'polite'}
      data-testid="update-notification-banner"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1">
          <div className="flex-shrink-0 mr-3" aria-hidden="true">
            <span className="text-2xl">{config.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-2">
              {getUpdateTitle()}
            </h3>

            <div className="space-y-2">
              <p className="text-sm">
                {getUpdateMessage()}
              </p>

              {updateInfo.version && updateInfo.version !== 'unknown' && (
                <p className="text-xs opacity-90">
                  {t('update.version', 'Version: {{version}}', { version: updateInfo.version })}
                </p>
              )}

              {connectionInfo?.warning && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mt-3">
                  <div className="flex items-start">
                    <span className="text-yellow-600 dark:text-yellow-400 mr-2" aria-hidden="true">
                      📱
                    </span>
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium mb-1">
                        {t('update.meteredConnection.title', 'Metered Connection Detected')}
                      </p>
                      <p className="text-xs">
                        {connectionInfo.warning}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(updateInfo.changelog || onShowChangelog) && (
                <button
                  onClick={() => {
                    setIsExpanded(!isExpanded);
                    if (!isExpanded && onShowChangelog) {
                      onShowChangelog();
                    }
                  }}
                  className="text-sm underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded-sm"
                  aria-expanded={isExpanded}
                  aria-controls="update-changelog"
                >
                  {isExpanded
                    ? t('update.hideChangelog', 'Hide what\'s new')
                    : t('update.showChangelog', 'See what\'s new')
                  }
                </button>
              )}

              {isExpanded && updateInfo.changelog && (
                <div
                  id="update-changelog"
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 mt-2"
                >
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">
                    {t('update.changelog.title', 'What\'s New')}
                  </h4>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    {updateInfo.changelog.new_features && updateInfo.changelog.new_features.length > 0 && (
                      <div>
                        <strong>New Features:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {updateInfo.changelog.new_features.map((feature, index) => (
                            <li key={index}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {updateInfo.changelog.improvements && updateInfo.changelog.improvements.length > 0 && (
                      <div>
                        <strong>Improvements:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {updateInfo.changelog.improvements.map((improvement, index) => (
                            <li key={index}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {updateInfo.changelog.bug_fixes && updateInfo.changelog.bug_fixes.length > 0 && (
                      <div>
                        <strong>Bug Fixes:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {updateInfo.changelog.bug_fixes.map((fix, index) => (
                            <li key={index}>{fix}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {updateInfo.changelog.security_updates && updateInfo.changelog.security_updates.length > 0 && (
                      <div>
                        <strong>Security Updates:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {updateInfo.changelog.security_updates.map((update, index) => (
                            <li key={index}>{update}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {config.canDismiss && onDismiss && (
          <button
            onClick={handleDismiss}
            className="ml-4 flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
            aria-label={t('update.dismiss', 'Dismiss update notification')}
            data-testid="update-dismiss-button"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleApplyUpdate}
          className={`btn-primary flex-1 sm:flex-none px-6 py-2 text-base font-medium touch-target ${
            updateInfo.policy === 'force'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : updateInfo.policy === 'critical'
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          data-testid="update-apply-button"
        >
          {updateInfo.policy === 'force'
            ? t('update.force.action', 'Update Now')
            : t('update.action', 'Update')
          }
        </button>

        {config.canDismiss && onDismiss && (
          <button
            onClick={handleDismiss}
            className="btn-secondary flex-1 sm:flex-none px-6 py-2 text-base font-medium rounded-lg transition-colors touch-target"
            data-testid="update-postpone-button"
          >
            {t('update.postpone', 'Later')}
          </button>
        )}

        <div className="text-xs opacity-75 flex items-center">
          <span className="mr-2">📊</span>
          {t('update.estimatedSize', 'Est. {{size}}MB', { size: estimatedSize })}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotificationBanner;