import type { VersionChangelog } from '../types';

/**
 * Version comparison utilities for changelog and feature highlight systems
 * Handles semantic versioning and determines relevant changes between versions
 */

export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * Parse a version string into components
 */
export function parseVersion(version: string): VersionInfo | null {
  // Handle various version formats: 1.0.0, v1.0.0, 1.0.0-beta.1, 1.0.0+build.123
  const cleanVersion = version.replace(/^v/, '');
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.+))?$/;
  const match = cleanVersion.match(versionRegex);

  if (!match) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5]
  };
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const version1 = parseVersion(v1);
  const version2 = parseVersion(v2);

  if (!version1 || !version2) {
    // Fallback to string comparison if parsing fails
    return v1.localeCompare(v2, undefined, { numeric: true });
  }

  // Compare major versions
  if (version1.major !== version2.major) {
    return version1.major - version2.major;
  }

  // Compare minor versions
  if (version1.minor !== version2.minor) {
    return version1.minor - version2.minor;
  }

  // Compare patch versions
  if (version1.patch !== version2.patch) {
    return version1.patch - version2.patch;
  }

  // Compare prerelease versions
  if (version1.prerelease && version2.prerelease) {
    return version1.prerelease.localeCompare(version2.prerelease);
  }

  // Stable version > prerelease version
  if (version1.prerelease && !version2.prerelease) {
    return -1;
  }
  if (!version1.prerelease && version2.prerelease) {
    return 1;
  }

  return 0;
}

/**
 * Determine the type of version update
 */
export function getUpdateType(currentVersion: string, newVersion: string): 'major' | 'minor' | 'patch' | 'prerelease' | 'unknown' {
  const current = parseVersion(currentVersion);
  const next = parseVersion(newVersion);

  if (!current || !next) {
    return 'unknown';
  }

  if (next.major > current.major) {
    return 'major';
  }

  if (next.minor > current.minor) {
    return 'minor';
  }

  if (next.patch > current.patch) {
    return 'patch';
  }

  if (next.prerelease && !current.prerelease) {
    return 'prerelease';
  }

  return 'unknown';
}

/**
 * Check if a version is a major update (indicates significant changes)
 */
export function isMajorUpdate(currentVersion: string, newVersion: string): boolean {
  return getUpdateType(currentVersion, newVersion) === 'major';
}

/**
 * Check if a version is a minor update (indicates new features)
 */
export function isMinorUpdate(currentVersion: string, newVersion: string): boolean {
  const updateType = getUpdateType(currentVersion, newVersion);
  return updateType === 'minor' || updateType === 'major';
}

/**
 * Filter changelog entries based on version significance
 * Major/minor updates show all changes, patch updates focus on fixes and security
 */
export function getRelevantChanges(
  changelog: VersionChangelog,
  currentVersion: string,
  newVersion: string
): VersionChangelog {
  const updateType = getUpdateType(currentVersion, newVersion);

  switch (updateType) {
    case 'major':
    case 'minor':
      // Show all changes for significant updates
      return changelog;

    case 'patch':
      // Focus on fixes and security for patch updates
      return {
        bug_fixes: changelog.bug_fixes,
        security_updates: changelog.security_updates,
        // Include only critical improvements
        improvements: changelog.improvements?.filter(improvement =>
          improvement.toLowerCase().includes('critical')
        )
      };

    case 'prerelease':
      // Show new features and improvements for prereleases
      return {
        new_features: changelog.new_features,
        improvements: changelog.improvements,
        // Include critical fixes
        bug_fixes: changelog.bug_fixes?.filter(fix =>
          fix.toLowerCase().includes('critical') ||
          fix.toLowerCase().includes('crash') ||
          fix.toLowerCase().includes('security')
        ),
        security_updates: changelog.security_updates
      };

    default:
      return changelog;
  }
}

/**
 * Generate priority score for changes based on version type and content
 */
export function getChangePriority(
  change: string,
  changeType: keyof VersionChangelog,
  updateType: ReturnType<typeof getUpdateType>
): number {
  let priority = 0;

  // Base priority by change type
  switch (changeType) {
    case 'security_updates':
      priority += 100;
      break;
    case 'new_features':
      priority += 80;
      break;
    case 'improvements':
      priority += 60;
      break;
    case 'bug_fixes':
      priority += 40;
      break;
  }

  // Boost priority for significant updates
  if (updateType === 'major') {
    priority += 20;
  } else if (updateType === 'minor') {
    priority += 10;
  }

  // Content-based priority adjustments
  const lowercaseChange = change.toLowerCase();

  if (lowercaseChange.includes('security') || lowercaseChange.includes('vulnerability')) {
    priority += 50;
  }

  if (lowercaseChange.includes('critical') || lowercaseChange.includes('breaking')) {
    priority += 30;
  }

  if (lowercaseChange.includes('performance') || lowercaseChange.includes('speed')) {
    priority += 15;
  }

  if (lowercaseChange.includes('crash') || lowercaseChange.includes('data loss')) {
    priority += 25;
  }

  if (lowercaseChange.includes('privacy') || lowercaseChange.includes('data')) {
    priority += 20;
  }

  return priority;
}

/**
 * Sort and prioritize changelog entries
 */
export function prioritizeChanges(
  changelog: VersionChangelog,
  currentVersion: string,
  newVersion: string
): Array<{ change: string; type: keyof VersionChangelog; priority: number }> {
  const updateType = getUpdateType(currentVersion, newVersion);
  const changes: Array<{ change: string; type: keyof VersionChangelog; priority: number }> = [];

  // Collect all changes with priorities
  Object.entries(changelog).forEach(([type, changeList]) => {
    if (changeList && Array.isArray(changeList)) {
      changeList.forEach(change => {
        changes.push({
          change,
          type: type as keyof VersionChangelog,
          priority: getChangePriority(change, type as keyof VersionChangelog, updateType)
        });
      });
    }
  });

  // Sort by priority (highest first)
  return changes.sort((a, b) => b.priority - a.priority);
}

/**
 * Get the most important changes for display in compact UI
 */
export function getTopChanges(
  changelog: VersionChangelog,
  currentVersion: string,
  newVersion: string,
  limit: number = 3
): Array<{ change: string; type: keyof VersionChangelog }> {
  const prioritizedChanges = prioritizeChanges(changelog, currentVersion, newVersion);

  return prioritizedChanges
    .slice(0, limit)
    .map(({ change, type }) => ({ change, type }));
}

/**
 * Check if update contains privacy-related changes
 */
export function hasPrivacyChanges(changelog: VersionChangelog): boolean {
  const allChanges = [
    ...(changelog.new_features || []),
    ...(changelog.improvements || []),
    ...(changelog.bug_fixes || []),
    ...(changelog.security_updates || [])
  ];

  return allChanges.some(change => {
    const lowerChange = change.toLowerCase();
    return lowerChange.includes('privacy') ||
           lowerChange.includes('data collection') ||
           lowerChange.includes('consent') ||
           lowerChange.includes('tracking') ||
           lowerChange.includes('analytics') ||
           lowerChange.includes('personal data');
  });
}

/**
 * Extract user-facing changes (filter out technical/internal changes)
 */
export function getUserFacingChanges(changelog: VersionChangelog): VersionChangelog {
  const filterTechnical = (changes: string[]): string[] => {
    return changes.filter(change => {
      const lowerChange = change.toLowerCase();
      // Filter out internal/technical changes
      return !lowerChange.includes('internal') &&
             !lowerChange.includes('refactor') &&
             !lowerChange.includes('code cleanup') &&
             !lowerChange.includes('dependency') &&
             !lowerChange.includes('dependencies') &&
             !lowerChange.includes('build') &&
             !lowerChange.includes('test') &&
             !lowerChange.includes('ci/cd') &&
             !lowerChange.includes('infrastructure');
    });
  };

  return {
    new_features: changelog.new_features ? filterTechnical(changelog.new_features) : undefined,
    improvements: changelog.improvements ? filterTechnical(changelog.improvements) : undefined,
    bug_fixes: changelog.bug_fixes ? filterTechnical(changelog.bug_fixes) : undefined,
    security_updates: changelog.security_updates ? filterTechnical(changelog.security_updates) : undefined
  };
}