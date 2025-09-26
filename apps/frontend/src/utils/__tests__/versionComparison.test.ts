import { describe, it, expect } from 'vitest';
import {
  parseVersion,
  compareVersions,
  getUpdateType,
  isMajorUpdate,
  isMinorUpdate,
  getRelevantChanges,
  getChangePriority,
  prioritizeChanges,
  getTopChanges,
  hasPrivacyChanges,
  getUserFacingChanges
} from '../versionComparison';
import type { VersionChangelog } from '../../types';

describe('versionComparison utilities', () => {
  describe('parseVersion', () => {
    it('should parse standard semantic versions', () => {
      expect(parseVersion('1.2.3')).toEqual({
        major: 1,
        minor: 2,
        patch: 3
      });
    });

    it('should parse versions with v prefix', () => {
      expect(parseVersion('v2.0.1')).toEqual({
        major: 2,
        minor: 0,
        patch: 1
      });
    });

    it('should parse versions with prerelease', () => {
      expect(parseVersion('1.0.0-beta.1')).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: 'beta.1'
      });
    });

    it('should parse versions with build metadata', () => {
      expect(parseVersion('1.0.0+build.123')).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        build: 'build.123'
      });
    });

    it('should parse versions with both prerelease and build', () => {
      expect(parseVersion('2.1.0-alpha.2+build.456')).toEqual({
        major: 2,
        minor: 1,
        patch: 0,
        prerelease: 'alpha.2',
        build: 'build.456'
      });
    });

    it('should return null for invalid versions', () => {
      expect(parseVersion('invalid')).toBeNull();
      expect(parseVersion('1.2')).toBeNull();
      expect(parseVersion('1.2.3.4')).toBeNull();
    });
  });

  describe('compareVersions', () => {
    it('should compare major versions correctly', () => {
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    });

    it('should compare minor versions correctly', () => {
      expect(compareVersions('1.5.0', '1.4.9')).toBeGreaterThan(0);
      expect(compareVersions('1.3.0', '1.4.0')).toBeLessThan(0);
    });

    it('should compare patch versions correctly', () => {
      expect(compareVersions('1.0.5', '1.0.3')).toBeGreaterThan(0);
      expect(compareVersions('1.0.1', '1.0.2')).toBeLessThan(0);
    });

    it('should handle equal versions', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    });

    it('should handle prerelease versions', () => {
      expect(compareVersions('1.0.0', '1.0.0-beta')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
    });

    it('should fallback to string comparison for invalid versions', () => {
      expect(compareVersions('invalid1', 'invalid2')).toBeLessThan(0);
    });
  });

  describe('getUpdateType', () => {
    it('should identify major updates', () => {
      expect(getUpdateType('1.9.9', '2.0.0')).toBe('major');
      expect(getUpdateType('0.5.0', '1.0.0')).toBe('major');
    });

    it('should identify minor updates', () => {
      expect(getUpdateType('1.5.9', '1.6.0')).toBe('minor');
      expect(getUpdateType('2.0.5', '2.1.0')).toBe('minor');
    });

    it('should identify patch updates', () => {
      expect(getUpdateType('1.0.0', '1.0.1')).toBe('patch');
      expect(getUpdateType('2.5.3', '2.5.4')).toBe('patch');
    });

    it('should identify prerelease updates', () => {
      expect(getUpdateType('1.0.0', '1.0.0-beta')).toBe('prerelease');
    });

    it('should return unknown for invalid versions', () => {
      expect(getUpdateType('invalid', '1.0.0')).toBe('unknown');
    });
  });

  describe('isMajorUpdate and isMinorUpdate', () => {
    it('should correctly identify major updates', () => {
      expect(isMajorUpdate('1.9.9', '2.0.0')).toBe(true);
      expect(isMajorUpdate('1.0.0', '1.1.0')).toBe(false);
    });

    it('should correctly identify minor updates', () => {
      expect(isMinorUpdate('1.0.0', '1.1.0')).toBe(true);
      expect(isMinorUpdate('1.9.9', '2.0.0')).toBe(true); // Major updates include new features
      expect(isMinorUpdate('1.0.0', '1.0.1')).toBe(false);
    });
  });

  describe('getRelevantChanges', () => {
    const fullChangelog: VersionChangelog = {
      new_features: ['New workout timer', 'Dark mode support'],
      improvements: ['Better performance', 'Critical stability fix'],
      bug_fixes: ['Fixed crash on startup', 'Minor UI glitch'],
      security_updates: ['Fixed auth vulnerability']
    };

    it('should return all changes for major updates', () => {
      const result = getRelevantChanges(fullChangelog, '1.9.9', '2.0.0');
      expect(result).toEqual(fullChangelog);
    });

    it('should return all changes for minor updates', () => {
      const result = getRelevantChanges(fullChangelog, '1.0.0', '1.1.0');
      expect(result).toEqual(fullChangelog);
    });

    it('should filter changes for patch updates', () => {
      const result = getRelevantChanges(fullChangelog, '1.0.0', '1.0.1');
      expect(result.new_features).toBeUndefined();
      expect(result.bug_fixes).toEqual(fullChangelog.bug_fixes);
      expect(result.security_updates).toEqual(fullChangelog.security_updates);
      expect(result.improvements).toEqual(['Critical stability fix']);
    });

    it('should handle prerelease updates', () => {
      const result = getRelevantChanges(fullChangelog, '1.0.0', '1.1.0-beta');
      expect(result.new_features).toEqual(fullChangelog.new_features);
      expect(result.improvements).toEqual(fullChangelog.improvements);
      expect(result.security_updates).toEqual(fullChangelog.security_updates);
    });
  });

  describe('getChangePriority', () => {
    it('should assign highest priority to security updates', () => {
      const securityPriority = getChangePriority('Fixed security issue', 'security_updates', 'patch');
      const featurePriority = getChangePriority('Added new feature', 'new_features', 'patch');
      expect(securityPriority).toBeGreaterThan(featurePriority);
    });

    it('should boost priority for critical changes', () => {
      const criticalPriority = getChangePriority('Critical bug fix', 'bug_fixes', 'patch');
      const normalPriority = getChangePriority('Minor bug fix', 'bug_fixes', 'patch');
      expect(criticalPriority).toBeGreaterThan(normalPriority);
    });

    it('should boost priority for major updates', () => {
      const majorPriority = getChangePriority('New feature', 'new_features', 'major');
      const patchPriority = getChangePriority('New feature', 'new_features', 'patch');
      expect(majorPriority).toBeGreaterThan(patchPriority);
    });

    it('should boost priority for performance improvements', () => {
      const perfPriority = getChangePriority('Improved performance', 'improvements', 'minor');
      const normalPriority = getChangePriority('Updated UI', 'improvements', 'minor');
      expect(perfPriority).toBeGreaterThan(normalPriority);
    });
  });

  describe('prioritizeChanges', () => {
    const changelog: VersionChangelog = {
      new_features: ['New dashboard'],
      improvements: ['Performance boost', 'UI update'],
      bug_fixes: ['Critical crash fix'],
      security_updates: ['Auth vulnerability fix']
    };

    it('should sort changes by priority', () => {
      const result = prioritizeChanges(changelog, '1.0.0', '1.0.1');

      // Security should be first
      expect(result[0].type).toBe('security_updates');

      // Critical fixes should be high priority
      const criticalFix = result.find(item => item.change.includes('Critical'));
      expect(criticalFix?.priority).toBeGreaterThan(90);
    });

    it('should include all changes with priorities', () => {
      const result = prioritizeChanges(changelog, '1.0.0', '1.1.0');
      expect(result).toHaveLength(5); // Total number of individual changes
    });
  });

  describe('getTopChanges', () => {
    const changelog: VersionChangelog = {
      new_features: ['Feature A', 'Feature B'],
      improvements: ['Improvement A'],
      bug_fixes: ['Fix A', 'Fix B'],
      security_updates: ['Security fix A']
    };

    it('should return limited number of top changes', () => {
      const result = getTopChanges(changelog, '1.0.0', '1.1.0', 3);
      expect(result).toHaveLength(3);
    });

    it('should prioritize security changes', () => {
      const result = getTopChanges(changelog, '1.0.0', '1.0.1', 3);
      expect(result[0].type).toBe('security_updates');
    });

    it('should handle empty changelog', () => {
      const result = getTopChanges({}, '1.0.0', '1.0.1', 3);
      expect(result).toHaveLength(0);
    });
  });

  describe('hasPrivacyChanges', () => {
    it('should detect privacy-related changes', () => {
      const privacyChangelog: VersionChangelog = {
        improvements: ['Updated privacy policy', 'Better performance'],
        security_updates: ['Enhanced data protection']
      };

      expect(hasPrivacyChanges(privacyChangelog)).toBe(true);
    });

    it('should detect various privacy keywords', () => {
      const keywords = [
        'privacy policy update',
        'data collection changes',
        'user consent improvements',
        'tracking preferences',
        'analytics updates',
        'personal data handling'
      ];

      keywords.forEach(keyword => {
        const changelog: VersionChangelog = {
          improvements: [keyword]
        };
        expect(hasPrivacyChanges(changelog)).toBe(true);
      });
    });

    it('should return false for non-privacy changes', () => {
      const normalChangelog: VersionChangelog = {
        new_features: ['New timer feature'],
        bug_fixes: ['Fixed UI bug']
      };

      expect(hasPrivacyChanges(normalChangelog)).toBe(false);
    });
  });

  describe('getUserFacingChanges', () => {
    const technicalChangelog: VersionChangelog = {
      new_features: ['New user dashboard', 'Internal API updates'],
      improvements: ['Better performance', 'Code refactoring', 'Updated dependencies'],
      bug_fixes: ['Fixed login issue', 'Internal test fixes'],
      security_updates: ['User auth fix', 'Build system security']
    };

    it('should filter out technical changes', () => {
      const result = getUserFacingChanges(technicalChangelog);

      expect(result.new_features).toEqual(['New user dashboard']);
      expect(result.improvements).toEqual(['Better performance']);
      expect(result.bug_fixes).toEqual(['Fixed login issue']);
      expect(result.security_updates).toEqual(['User auth fix']);
    });

    it('should handle undefined arrays', () => {
      const sparseChangelog: VersionChangelog = {
        new_features: ['User feature'],
        bug_fixes: undefined
      };

      const result = getUserFacingChanges(sparseChangelog);
      expect(result.new_features).toEqual(['User feature']);
      expect(result.bug_fixes).toBeUndefined();
    });

    it('should filter various technical keywords', () => {
      const technicalTerms = [
        'internal refactor',
        'code cleanup',
        'dependency update',
        'build improvement',
        'test enhancement',
        'ci/cd pipeline',
        'infrastructure change'
      ];

      technicalTerms.forEach(term => {
        const changelog: VersionChangelog = {
          improvements: [term, 'User-facing improvement']
        };

        const result = getUserFacingChanges(changelog);
        expect(result.improvements).toEqual(['User-facing improvement']);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty changelog', () => {
      const emptyChangelog: VersionChangelog = {};

      expect(getRelevantChanges(emptyChangelog, '1.0.0', '1.1.0')).toEqual({});
      expect(hasPrivacyChanges(emptyChangelog)).toBe(false);
      expect(getUserFacingChanges(emptyChangelog)).toEqual({});
    });

    it('should handle changelog with empty arrays', () => {
      const emptyArraysChangelog: VersionChangelog = {
        new_features: [],
        improvements: [],
        bug_fixes: [],
        security_updates: []
      };

      expect(prioritizeChanges(emptyArraysChangelog, '1.0.0', '1.1.0')).toHaveLength(0);
      expect(getTopChanges(emptyArraysChangelog, '1.0.0', '1.1.0')).toHaveLength(0);
    });
  });
});