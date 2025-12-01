/**
 * Storage Management Component
 * 
 * Provides UI for managing video cache storage:
 * - Display storage statistics
 * - Clear expired videos
 * - Clear all video cache
 * - Configure prefetch strategy
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { VideoCacheService, type StorageStats } from '../services/videoCacheService';
import logger from '../utils/logger';

export function StorageManagement() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load storage stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const videoCacheService = VideoCacheService.getInstance();
      const storageStats = await videoCacheService.getStorageStats();
      setStats(storageStats);
    } catch (err) {
      logger.error('[StorageManagement] Failed to load stats:', err);
      setError('Failed to load storage statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearExpired = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const videoCacheService = VideoCacheService.getInstance();
      const count = await videoCacheService.clearExpiredVideos();
      
      // Reload stats
      await loadStats();
      
      logger.log('[StorageManagement] Cleared', count, 'expired videos');
    } catch (err) {
      logger.error('[StorageManagement] Failed to clear expired:', err);
      setError('Failed to clear expired videos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(t('settings.videoCacheConfirmClearAll', 'Are you sure you want to clear all cached videos? They will be re-downloaded when needed.'))) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const videoCacheService = VideoCacheService.getInstance();
      await videoCacheService.clearAll();
      
      // Reload stats
      await loadStats();
      
      logger.log('[StorageManagement] All videos cleared');
    } catch (err) {
      logger.error('[StorageManagement] Failed to clear all:', err);
      setError('Failed to clear video cache');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return t('common.never', 'Never');
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          {t('settings.videoStorage', 'Video Storage')}
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {stats && (
          <div className="space-y-4">
            {/* Storage Statistics */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t('settings.cachedVideos', 'Cached Videos')}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {stats.totalVideos}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t('settings.storageUsed', 'Storage Used')}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {formatBytes(stats.totalSize)}
                </span>
              </div>

              {stats.quotaAvailable > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {t('settings.quotaUsage', 'Quota Usage')}
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {stats.quotaPercentage.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress bar - Using width classes for common percentages */}
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        stats.quotaPercentage <= 10 ? 'w-[10%]' :
                        stats.quotaPercentage <= 20 ? 'w-[20%]' :
                        stats.quotaPercentage <= 30 ? 'w-[30%]' :
                        stats.quotaPercentage <= 40 ? 'w-[40%]' :
                        stats.quotaPercentage <= 50 ? 'w-[50%]' :
                        stats.quotaPercentage <= 60 ? 'w-[60%]' :
                        stats.quotaPercentage <= 70 ? 'w-[70%]' :
                        stats.quotaPercentage <= 80 ? 'w-[80%]' :
                        stats.quotaPercentage <= 90 ? 'w-[90%]' :
                        'w-full'
                      } ${
                        stats.quotaPercentage > 80
                          ? 'bg-red-500'
                          : stats.quotaPercentage > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      aria-label={`Storage usage: ${stats.quotaPercentage.toFixed(1)}%`}
                    >
                      <span className="sr-only">{stats.quotaPercentage.toFixed(1)}% used</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{formatBytes(stats.quotaUsed)}</span>
                    <span>{formatBytes(stats.quotaAvailable)}</span>
                  </div>
                </>
              )}

              {stats.oldestVideo && (
                <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {t('settings.oldestVideo', 'Oldest Video')}
                  </span>
                  <span className="text-sm text-neutral-900 dark:text-white">
                    {formatDate(stats.oldestVideo)}
                  </span>
                </div>
              )}

              {stats.newestVideo && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {t('settings.newestVideo', 'Newest Video')}
                  </span>
                  <span className="text-sm text-neutral-900 dark:text-white">
                    {formatDate(stats.newestVideo)}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleClearExpired}
                disabled={isLoading || stats.totalVideos === 0}
                className="w-full px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('settings.clearExpiredVideos', 'Clear Expired Videos')}
              </button>

              <button
                onClick={handleClearAll}
                disabled={isLoading || stats.totalVideos === 0}
                className="w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-neutral-800 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('settings.clearAllVideos', 'Clear All Videos')}
              </button>

              <button
                onClick={loadStats}
                disabled={isLoading}
                className="w-full px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-neutral-800 border border-primary-300 dark:border-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('settings.refreshStats', 'Refresh Statistics')}
              </button>
            </div>

            {/* Information Note */}
            <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
              <p>
                {t('settings.videoStorageInfo', 'Videos are cached locally for faster playback and offline access. Cached videos will be automatically removed after 90 days or when storage is full.')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StorageManagement;
