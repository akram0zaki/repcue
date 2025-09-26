import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UpdateInfo, VersionChangelog } from '../types';

interface ChangelogModalProps {
  updateInfo: UpdateInfo;
  isOpen: boolean;
  onClose: () => void;
  onApplyUpdate?: () => void;
  className?: string;
}

interface ChangelogSection {
  title: string;
  items: string[];
  type: 'features' | 'improvements' | 'fixes' | 'security' | 'breaking';
}

/**
 * ChangelogModal component for displaying detailed update information
 * Supports categorized changelog entries and privacy change acknowledgments
 */
export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  updateInfo,
  isOpen,
  onClose,
  onApplyUpdate,
  className = ''
}) => {
  const { t } = useTranslation();
  const [privacyChangesAcknowledged, setPrivacyChangesAcknowledged] = useState(false);

  if (!isOpen) return null;

  // Convert structured changelog to sections
  const getChangelogSections = (changelog?: VersionChangelog): ChangelogSection[] => {
    const sections: ChangelogSection[] = [];

    if (changelog?.new_features && changelog.new_features.length > 0) {
      sections.push({
        title: t('changelog.categories.newFeatures', 'New Features'),
        items: changelog.new_features,
        type: 'features'
      });
    }

    if (changelog?.improvements && changelog.improvements.length > 0) {
      sections.push({
        title: t('changelog.categories.improvements', 'Improvements'),
        items: changelog.improvements,
        type: 'improvements'
      });
    }

    if (changelog?.bug_fixes && changelog.bug_fixes.length > 0) {
      sections.push({
        title: t('changelog.categories.bugFixes', 'Bug Fixes'),
        items: changelog.bug_fixes,
        type: 'fixes'
      });
    }

    if (changelog?.security_updates && changelog.security_updates.length > 0) {
      sections.push({
        title: t('changelog.categories.securityUpdates', 'Security Updates'),
        items: changelog.security_updates,
        type: 'security'
      });
    }

    return sections;
  };

  // Fallback parser for string-based changelogs (backwards compatibility)
  const parseStringChangelog = (changelog: string): ChangelogSection[] => {
    const sections: ChangelogSection[] = [];
    const lines = changelog.split('\n').filter(line => line.trim());

    let currentSection: ChangelogSection | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for section headers (lines ending with colon or common section names)
      const lowerLine = trimmedLine.toLowerCase();

      if ((lowerLine === 'features:' || lowerLine === 'new features:' || lowerLine === 'features') && !trimmedLine.startsWith('- ')) {
        currentSection = { title: t('changelog.categories.newFeatures', 'Features'), items: [], type: 'features' };
        sections.push(currentSection);
      } else if ((lowerLine === 'improvements:' || lowerLine === 'improvements') && !trimmedLine.startsWith('- ')) {
        currentSection = { title: t('changelog.categories.improvements', 'Improvements'), items: [], type: 'improvements' };
        sections.push(currentSection);
      } else if ((lowerLine === 'bug fixes:' || lowerLine === 'fixes:' || lowerLine === 'bug fixes' || lowerLine === 'fixes') && !trimmedLine.startsWith('- ')) {
        currentSection = { title: t('changelog.categories.bugFixes', 'Bug Fixes'), items: [], type: 'fixes' };
        sections.push(currentSection);
      } else if ((lowerLine === 'security:' || lowerLine === 'security updates:' || lowerLine === 'security') && !trimmedLine.startsWith('- ')) {
        currentSection = { title: t('changelog.categories.securityUpdates', 'Security'), items: [], type: 'security' };
        sections.push(currentSection);
      } else if ((lowerLine === 'breaking changes:' || lowerLine === 'breaking:' || lowerLine === 'breaking changes') && !trimmedLine.startsWith('- ')) {
        currentSection = { title: 'Breaking Changes', items: [], type: 'breaking' };
        sections.push(currentSection);
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || trimmedLine.startsWith('* ')) {
        // This is a list item
        const item = trimmedLine.substring(2).trim();
        if (currentSection) {
          currentSection.items.push(item);
        } else {
          // Create a general section if none exists
          if (sections.length === 0) {
            currentSection = { title: 'Changes', items: [], type: 'improvements' };
            sections.push(currentSection);
          } else {
            currentSection = sections[sections.length - 1];
          }
          currentSection.items.push(item);
        }
      } else if (trimmedLine.length > 0 && !trimmedLine.includes(':')) {
        // Plain text line, add to current section or create one
        if (currentSection) {
          currentSection.items.push(trimmedLine);
        } else {
          currentSection = { title: 'Changes', items: [trimmedLine], type: 'improvements' };
          sections.push(currentSection);
        }
      }
    }

    return sections;
  };

  const getSectionIcon = (type: ChangelogSection['type']) => {
    switch (type) {
      case 'features':
        return '✨';
      case 'improvements':
        return '🔧';
      case 'fixes':
        return '🐛';
      case 'security':
        return '🔒';
      case 'breaking':
        return '⚠️';
      default:
        return '📝';
    }
  };

  const getSectionColor = (type: ChangelogSection['type']) => {
    switch (type) {
      case 'features':
        return 'text-green-800 dark:text-green-200 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'improvements':
        return 'text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'fixes':
        return 'text-orange-800 dark:text-orange-200 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'security':
        return 'text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'breaking':
        return 'text-purple-800 dark:text-purple-200 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      default:
        return 'text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  // Handle both structured and string-based changelogs
  const isStructuredChangelog = updateInfo.changelog && typeof updateInfo.changelog === 'object';
  const sections = isStructuredChangelog
    ? getChangelogSections(updateInfo.changelog as VersionChangelog)
    : (updateInfo.changelog as string)
      ? parseStringChangelog(updateInfo.changelog as string)
      : [];

  // Check for privacy-related changes
  const hasPrivacyChanges = isStructuredChangelog
    ? (updateInfo.changelog as VersionChangelog)?.security_updates?.some(update =>
        update.toLowerCase().includes('privacy') ||
        update.toLowerCase().includes('data') ||
        update.toLowerCase().includes('consent')
      ) || false
    : (updateInfo.changelog as string)?.toLowerCase().includes('privacy') ||
      (updateInfo.changelog as string)?.toLowerCase().includes('data') ||
      (updateInfo.changelog as string)?.toLowerCase().includes('consent') ||
      false;

  const handleApplyUpdate = () => {
    if (onApplyUpdate) {
      onApplyUpdate();
    }
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-title"
      data-testid="changelog-modal"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 id="changelog-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('changelog.title', 'What\'s New')}
            </h2>
            {updateInfo.version && updateInfo.version !== 'unknown' && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('update.version', 'Version: {{version}}', { version: updateInfo.version })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label={t('changelog.closeButton', 'Close changelog')}
            data-testid="changelog-close-button"
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {sections.length > 0 ? (
            <div className="space-y-6">
              {sections.map((section, index) => (
                <div key={index} className={`border rounded-lg p-4 ${getSectionColor(section.type)}`}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <span className="mr-2" aria-hidden="true">
                      {getSectionIcon(section.type)}
                    </span>
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start">
                        <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-current rounded-full flex-shrink-0" aria-hidden="true" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl" aria-hidden="true">📝</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t('changelog.empty.title', 'No Detailed Changes Available')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {updateInfo.message || t('changelog.empty.message', 'This update includes various improvements and bug fixes.')}
              </p>
            </div>
          )}

          {/* Privacy changes acknowledgment */}
          {hasPrivacyChanges && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.19 2.5 1.732 2.5z"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    {t('changelog.privacy.title', 'Privacy Changes Detected')}
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    {t('changelog.privacy.message', 'This update includes changes to how we handle your data. Please review the changes above and confirm your understanding.')}
                  </p>
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={privacyChangesAcknowledged}
                      onChange={(e) => setPrivacyChangesAcknowledged(e.target.checked)}
                      className="mt-1 mr-3 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-yellow-300 rounded"
                      data-testid="privacy-acknowledgment-checkbox"
                    />
                    <span className="text-sm text-yellow-800 dark:text-yellow-200">
                      {t('changelog.privacy.acknowledge', 'I understand and acknowledge the privacy changes in this update')}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
          {onApplyUpdate && (
            <button
              onClick={handleApplyUpdate}
              disabled={hasPrivacyChanges && !privacyChangesAcknowledged}
              className={`btn-primary flex-1 px-6 py-3 text-base font-medium rounded-lg transition-colors touch-target ${
                updateInfo.policy === 'force'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : updateInfo.policy === 'critical'
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              data-testid="changelog-update-button"
            >
              {updateInfo.policy === 'force'
                ? t('update.force.action', 'Update Now')
                : t('update.action', 'Update')
              }
            </button>
          )}

          <button
            onClick={onClose}
            className="btn-secondary flex-1 px-6 py-3 text-base font-medium rounded-lg transition-colors touch-target border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            data-testid="changelog-close-footer-button"
          >
            {onApplyUpdate ? t('changelog.close', 'Close') : t('changelog.done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;