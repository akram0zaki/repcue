import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';

interface DataExportButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary';
}

const DataExportButton: React.FC<DataExportButtonProps> = ({ 
  className = '', 
  variant = 'secondary' 
}) => {
  const { t } = useTranslation(['common']);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { session } = useAuth();

  const handleExportData = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(false);

    try {
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const { data: functionData } = await supabase.functions.invoke('export-data', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const response = { data: functionData, error: null };

      if (response.error) {
        throw new Error(response.error.message || 'Export failed');
      }

      // Create and trigger download
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repcue-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);

    } catch (err) {
      console.error('Data export failed:', err);
      const errorMessage = err instanceof Error ? err.message : t('settings.exportError');
      setError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const baseClasses = variant === 'primary' 
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : 'bg-gray-200 hover:bg-gray-300 text-gray-900';

  return (
    <div className="space-y-2">
      <button
        onClick={handleExportData}
        disabled={isExporting}
        className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${baseClasses} ${className}`}
        aria-label={t('settings.exportData')}
      >
        {isExporting ? t('settings.exportInProgress') : t('settings.exportData')}
      </button>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600 rounded-md p-2" role="alert">
          {error.includes('Authentication') ? t('errors.notAuthenticated') : error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-2" role="status">
          {t('settings.exportSuccess')}
        </div>
      )}

      <div className="help-text">
        <p>{t('settings.exportDataHelp')}</p>
        <p>{t('settings.exportRateLimit')}</p>
      </div>
    </div>
  );
};

export default DataExportButton;