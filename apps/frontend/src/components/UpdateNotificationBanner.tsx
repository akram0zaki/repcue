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
          bgColor: 'bg-error-soft',
          borderColor: 'border-error',
          textColor: 'text-error',
          icon: '🔒',
          urgency: 'high' as const,
          canDismiss: false
        };
      case 'critical':
        return {
          bgColor: 'bg-warning-soft',
          borderColor: 'border-warning',
          textColor: 'text-warning',
          icon: '⚠️',
          urgency: 'medium' as const,
          canDismiss: true
        };
      case 'optional':
        return {
          bgColor: 'bg-success-soft',
          borderColor: 'border-success',
          textColor: 'text-success',
          icon: '🔄',
          urgency: 'low' as const,
          canDismiss: true
        };
      default:
        return {
          bgColor: 'bg-surface-0 dark:bg-surface-800',
          borderColor: 'border-primary',
          textColor: 'text-body',
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
    // Always use client-side i18n translations instead of server-provided message
    // Server message is in English only and doesn't respect user's locale
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
      className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none"
      role={config.urgency === 'high' ? 'alert' : 'status'}
      aria-live={config.urgency === 'high' ? 'assertive' : 'polite'}
    >
      <div
        className={`${config.bgColor} border ${config.borderColor} ${config.textColor} rounded-lg shadow-lg max-w-md w-full pointer-events-auto p-4 ${className}`}
        data-testid="update-notification-banner"
      >
        <div className="flex items-start justify-between">
        <div className="flex items-start flex-1">
          <div className="flex-shrink-0 mr-3" aria-hidden="true">
            <span className="text-2xl">{config.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-h3 mb-2">
              {getUpdateTitle()}
            </h3>

            <div className="space-y-2">
              <p className="text-body">
                {getUpdateMessage()}
              </p>

              {updateInfo.version && updateInfo.version !== 'unknown' && (
                <p className="text-small opacity-90">
                  {t('update.version', 'Version: {{version}}', { version: updateInfo.version })}
                </p>
              )}

              {connectionInfo?.warning && (
                <div className="bg-warning-soft border border-warning rounded-md p-3 mt-3">
                  <div className="flex items-start">
                    <span className="text-warning mr-2" aria-hidden="true">
                      📱
                    </span>
                    <div className="text-caption text-warning">
                      <p className="font-medium mb-1">
                        {t('update.meteredConnection.title', 'Metered Connection Detected')}
                      </p>
                      <p className="text-small">
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
                  className="text-caption underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded-sm touch-target"
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
                  className="bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-md p-3 mt-2"
                >
                  <h4 className="text-h3 mb-2">
                    {t('changelog.title', 'What\'s New')}
                  </h4>
                  <div className="text-caption space-y-1">
                    {updateInfo.changelog.new_features && updateInfo.changelog.new_features.length > 0 && (
                      <div>
                        <strong>{t('changelog.categories.newFeatures', 'New Features')}:</strong>
                        <ul className="list-disc list-inside ml-2 rtl:mr-2 rtl:ml-0">
                          {updateInfo.changelog.new_features.map((feature, index) => (
                            <li key={index}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {updateInfo.changelog.improvements && updateInfo.changelog.improvements.length > 0 && (
                      <div>
                        <strong>{t('changelog.categories.improvements', 'Improvements')}:</strong>
                        <ul className="list-disc list-inside ml-2 rtl:mr-2 rtl:ml-0">
                          {updateInfo.changelog.improvements.map((improvement, index) => (
                            <li key={index}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {updateInfo.changelog.bug_fixes && updateInfo.changelog.bug_fixes.length > 0 && (
                      <div>
                        <strong>{t('changelog.categories.bugFixes', 'Bug Fixes')}:</strong>
                        <ul className="list-disc list-inside ml-2 rtl:mr-2 rtl:ml-0">
                          {updateInfo.changelog.bug_fixes.map((fix, index) => (
                            <li key={index}>{fix}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {updateInfo.changelog.security_updates && updateInfo.changelog.security_updates.length > 0 && (
                      <div>
                        <strong>{t('changelog.categories.securityUpdates', 'Security Updates')}:</strong>
                        <ul className="list-disc list-inside ml-2 rtl:mr-2 rtl:ml-0">
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

      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <button
          onClick={handleApplyUpdate}
          className={`${
            updateInfo.policy === 'force'
              ? 'btn-danger'
              : 'btn-primary'
          } w-full sm:w-auto touch-target`}
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
            className="btn-secondary w-full sm:w-auto touch-target"
            data-testid="update-postpone-button"
          >
            {t('update.postpone', 'Later')}
          </button>
        )}

        <div className="text-small opacity-75 flex items-center sm:ml-auto">
          <span className="mr-2 rtl:ml-2 rtl:mr-0" aria-hidden="true">📊</span>
          {t('update.estimatedSize', 'Est. {{size}}MB', { size: estimatedSize })}
        </div>
      </div>
      </div>
    </div>
  );
};

export default UpdateNotificationBanner;