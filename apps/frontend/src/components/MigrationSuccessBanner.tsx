import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface MigrationSuccessDetail {
  recordsClaimed: number;
  tableStats: Record<string, number>;
  timestamp: string;
}

interface MigrationSuccessBannerProps {
  onDismiss?: () => void;
}

const MigrationSuccessBanner: React.FC<MigrationSuccessBannerProps> = ({ onDismiss }) => {
  const { t } = useTranslation(['auth', 'common']);
  const [migrationData, setMigrationData] = useState<MigrationSuccessDetail | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
    
    // Clear data after animation
    setTimeout(() => {
      setMigrationData(null);
    }, 300);
  };

  useEffect(() => {
    const handleMigrationSuccess = (event: CustomEvent<MigrationSuccessDetail>) => {
      setMigrationData(event.detail);
      setIsVisible(true);
      
      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        handleDismiss();
      }, 8000);
    };

    window.addEventListener('data-migration-success', handleMigrationSuccess as EventListener);

    return () => {
      window.removeEventListener('data-migration-success', handleMigrationSuccess as EventListener);
    };
  }, [handleDismiss]);

  const formatRecordTypes = (tableStats: Record<string, number>): string => {
    const nonZeroTables = Object.entries(tableStats)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a) // Sort by count descending
      .map(([table, count]) => {
        // Map internal table names to user-friendly names
        const friendlyNames: Record<string, string> = {
          exercises: t('auth:migration.exercises'),
          activityLogs: t('auth:migration.workouts'),
          userPreferences: t('auth:migration.preferences'),
          appSettings: t('auth:migration.settings'),
          workouts: t('auth:migration.workoutPlans'),
          workoutSessions: t('auth:migration.sessions')
        };
        
        return `${count} ${friendlyNames[table] || table}`;
      });

    if (nonZeroTables.length === 0) {
      return '';
    } else if (nonZeroTables.length === 1) {
      return nonZeroTables[0];
    } else if (nonZeroTables.length === 2) {
      return nonZeroTables.join(` ${t('common:and')} `);
    } else if (nonZeroTables.length <= 4) {
      const last = nonZeroTables.pop();
      return `${nonZeroTables.join(', ')}, ${t('common:and')} ${last}`;
    } else {
      // For very long lists, show top 3 and summarize the rest
      const shown = nonZeroTables.slice(0, 3);
      const remaining = nonZeroTables.length - 3;
      return `${shown.join(', ')}, ${t('common:and')} ${remaining} ${t('auth:migration.others')}`;
    }
  };

  if (!migrationData || !isVisible) {
    return null;
  }

  return (
    <div 
      className={`fixed top-4 left-4 right-4 z-50 transform transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 mx-auto max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
        <div className="flex items-start">
          <div className="flex-shrink-0" aria-hidden="true">
            <div className="w-6 h-6 text-green-600">
              ✅
            </div>
          </div>
          
          <div className="ml-3 flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-medium text-green-800 break-words">
              {t('auth:migration.success.title')}
            </h3>
            
            <div className="mt-2 text-sm sm:text-base text-green-700 space-y-2">
              <p className="break-words">
                {t('auth:migration.success.message', { 
                  count: migrationData.recordsClaimed 
                })}
              </p>
              
              {migrationData.recordsClaimed > 0 && (
                <div className="text-xs sm:text-sm bg-green-100/50 rounded-md p-2 break-words">
                  <span className="font-medium">{t('auth:migration.success.details')}:</span>{' '}
                  <span>{formatRecordTypes(migrationData.tableStats)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="ml-4 flex-shrink-0 self-start">
            <button
              type="button"
              className="bg-green-50 rounded-md p-1.5 sm:p-2 text-green-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50 transition-colors"
              onClick={handleDismiss}
              aria-label={t('common:dismiss')}
            >
              <span className="sr-only">{t('common:dismiss')}</span>
              <svg className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationSuccessBanner;
