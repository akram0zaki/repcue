import React, { useState } from 'react';
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

      const response = await supabase.functions.invoke('export-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

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
      setError(err instanceof Error ? err.message : 'Export failed');
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
        aria-label="Export your data"
      >
        {isExporting ? 'Exporting...' : 'Export My Data'}
      </button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-2" role="status">
          Your data has been exported successfully!
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>Export includes your workouts, exercises, settings, and activity logs.</p>
        <p>You can request up to 3 exports per day.</p>
      </div>
    </div>
  );
};

export default DataExportButton;