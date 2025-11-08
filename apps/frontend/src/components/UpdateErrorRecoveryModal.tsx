import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  UpdateError,
  UpdateRecoveryState,
  RecoveryAction
} from '../types';
import { updateService } from '../services/updateService';
import logger from '../utils/logger';

interface UpdateErrorRecoveryModalProps {
  isOpen: boolean;
  error?: UpdateError;
  recoveryState?: UpdateRecoveryState;
  onClose: () => void;
  onRecoveryComplete?: () => void;
  className?: string;
}

/**
 * UpdateErrorRecoveryModal component for handling update failures
 * Provides user-friendly error messages and actionable recovery options
 */
export const UpdateErrorRecoveryModal: React.FC<UpdateErrorRecoveryModalProps> = ({
  isOpen,
  error,
  recoveryState,
  onClose,
  onRecoveryComplete,
  className = ''
}) => {
  const { t } = useTranslation();
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Map<string, { success: boolean; error?: string }>>(new Map());

  useEffect(() => {
    if (!isOpen) {
      setIsExecutingAction(false);
      setExecutingActionId(null);
      setActionResults(new Map());
    }
  }, [isOpen]);

  if (!isOpen || !error) {
    return null;
  }

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          borderColor: 'border-red-500',
          textColor: 'text-red-800 dark:text-red-200',
          icon: '🚨',
          iconColor: 'text-red-600 dark:text-red-400'
        };
      case 'high':
        return {
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          borderColor: 'border-orange-500',
          textColor: 'text-orange-800 dark:text-orange-200',
          icon: '⚠️',
          iconColor: 'text-orange-600 dark:text-orange-400'
        };
      case 'medium':
        return {
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-500',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          icon: '⚡',
          iconColor: 'text-yellow-600 dark:text-yellow-400'
        };
      default:
        return {
          bgColor: 'bg-primary-100 dark:bg-primary-900/20',
          borderColor: 'border-primary-500',
          textColor: 'text-primary-800 dark:text-primary-200',
          icon: 'ℹ️',
          iconColor: 'text-primary-600 dark:text-primary-400'
        };
    }
  };

  const getErrorTypeTitle = (errorType: string): string => {
    const titles: Record<string, string> = {
      network_error: t('updateError.types.network', 'Network Connection Error'),
      download_error: t('updateError.types.download', 'Download Failed'),
      installation_error: t('updateError.types.installation', 'Installation Failed'),
      verification_error: t('updateError.types.verification', 'Update Verification Failed'),
      storage_error: t('updateError.types.storage', 'Storage Error'),
      service_worker_error: t('updateError.types.serviceWorker', 'Service Worker Error'),
      timeout_error: t('updateError.types.timeout', 'Update Timeout'),
      permission_error: t('updateError.types.permission', 'Permission Denied'),
      compatibility_error: t('updateError.types.compatibility', 'Compatibility Error'),
      rollback_error: t('updateError.types.rollback', 'Recovery Failed'),
      unknown_error: t('updateError.types.unknown', 'Unknown Error')
    };
    return titles[errorType] || titles.unknown_error;
  };

  const getActionIcon = (actionId: string): string => {
    const icons: Record<string, string> = {
      retry: '🔄',
      rollback: '⏪',
      'clear-cache': '🗑️',
      'force-reload': '🔃'
    };
    return icons[actionId] || '🔧';
  };

  const getActionButtonStyle = (action: RecoveryAction): string => {
    if (action.dangerous) {
      return 'bg-red-600 hover:bg-red-700 text-white border-red-600';
    }
    if (action.id === 'retry') {
      return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
    }
    return 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600';
  };

  const executeRecoveryAction = async (action: RecoveryAction) => {
    if (isExecutingAction) return;

    setIsExecutingAction(true);
    setExecutingActionId(action.id);

    try {
      logger.log(`Executing recovery action: ${action.id}`);

      if (action.confirmationRequired) {
        const confirmed = window.confirm(
          t('updateError.confirmAction',
            'Are you sure you want to {{description}}? This action cannot be undone.',
            { description: action.description.toLowerCase() }
          )
        );

        if (!confirmed) {
          setIsExecutingAction(false);
          setExecutingActionId(null);
          return;
        }
      }

      await updateService.executeRecoveryAction(action.id);

      setActionResults(prev => new Map(prev.set(action.id, { success: true })));

      logger.log(`Recovery action ${action.id} completed successfully`);

      // If this was a successful recovery, close modal after brief delay
      setTimeout(() => {
        if (onRecoveryComplete) {
          onRecoveryComplete();
        } else {
          onClose();
        }
      }, 1500);

    } catch (actionError) {
      const errorMessage = actionError instanceof Error ? actionError.message : String(actionError);
      setActionResults(prev => new Map(prev.set(action.id, {
        success: false,
        error: errorMessage
      })));
      logger.error(`Recovery action ${action.id} failed:`, actionError);
    } finally {
      setIsExecutingAction(false);
      setExecutingActionId(null);
    }
  };

  const config = getSeverityConfig(error.severity);
  const actions = recoveryState?.recoveryActions || [];
  const canRollback = recoveryState?.canRollback || false;
  const rollbackInProgress = recoveryState?.rollbackInProgress || false;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-recovery-title"
      data-testid="update-error-recovery-modal"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${config.bgColor} ${config.borderColor} border-l-4`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <span className={`text-3xl mr-4 ${config.iconColor}`} aria-hidden="true">
                {config.icon}
              </span>
              <div>
                <h2 id="error-recovery-title" className={`text-xl font-bold ${config.textColor} mb-1`}>
                  {getErrorTypeTitle(error.type)}
                </h2>
                <p className={`text-sm ${config.textColor} opacity-90`}>
                  {t(`updateError.severity.${error.severity}`, `Severity: ${error.severity.charAt(0).toUpperCase() + error.severity.slice(1)}`)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label={t('updateError.close', 'Close error dialog')}
              data-testid="error-recovery-close-button"
            >
              <svg
                className="w-6 h-6 text-gray-500 dark:text-gray-400"
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
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('updateError.whatHappened', 'What happened?')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {error.message}
            </p>

            {error.metadata?.suggestedActions && error.metadata.suggestedActions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t('updateError.suggestions', 'Suggestions:')}
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {error.metadata.suggestedActions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recovery Actions */}
          {actions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('updateError.recoveryActions', 'Recovery Options')}
              </h3>
              <div className="space-y-3">
                {actions.map((action) => {
                  const result = actionResults.get(action.id);
                  const isExecuting = isExecutingAction && executingActionId === action.id;

                  return (
                    <div key={action.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <span className="text-xl mr-3 mt-1" aria-hidden="true">
                            {getActionIcon(action.id)}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                              {action.label}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {action.description}
                            </p>

                            {result && (
                              <div className={`text-sm p-2 rounded ${
                                result.success
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                  : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                              }`}>
                                {result.success
                                  ? t('updateError.actionSuccess', 'Action completed successfully')
                                  : t('updateError.actionFailed', 'Action failed: {{error}}', { error: result.error })
                                }
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => executeRecoveryAction(action)}
                          disabled={isExecutingAction || result?.success}
                          className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${getActionButtonStyle(action)}`}
                          data-testid={`recovery-action-${action.id}`}
                        >
                          {isExecuting ? (
                            <div className="flex items-center">
                              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              {t('updateError.executing', 'Executing...')}
                            </div>
                          ) : result?.success ? (
                            t('updateError.completed', 'Completed')
                          ) : (
                            action.label
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rollback Information */}
          {canRollback && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 text-xl mr-3" aria-hidden="true">
                  ⏪
                </span>
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    {t('updateError.rollbackAvailable', 'Rollback Available')}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t('updateError.rollbackDescription',
                      'You can restore the previous version ({{version}}) if the recovery actions don\'t work.',
                      { version: recoveryState?.previousVersion || 'unknown' }
                    )}
                  </p>
                  {rollbackInProgress && (
                    <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {t('updateError.rollbackInProgress', 'Rollback in progress...')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Technical Details (Expandable) */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
              {t('updateError.technicalDetails', 'Technical Details')}
            </summary>
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
              <div><strong>Type:</strong> {error.type}</div>
              <div><strong>Severity:</strong> {error.severity}</div>
              <div><strong>Timestamp:</strong> {new Date(error.timestamp).toLocaleString()}</div>
              <div><strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}</div>
              {error.metadata && (
                <div className="mt-2">
                  <strong>Metadata:</strong>
                  <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(error.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('updateError.needHelp', 'Need help? Contact support with the technical details above.')}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              data-testid="error-recovery-close-footer-button"
            >
              {t('updateError.close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateErrorRecoveryModal;