# PWA Dynamic Versioning Implementation Plan

## Overview

This implementation plan addresses the missing dynamic version management components in RepCue's PWA update system. The current system uses a static version constant that prevents proper version comparison and update detection. This plan implements build-time version injection, post-update version persistence, and dynamic version tracking while maintaining the app's offline-first architecture.

## Problem Statement

### Current Issues
- **Static Version**: `APP_VERSION = '0.1.0'` is hardcoded and never changes
- **No Version Persistence**: Updates don't persist the new version after app reload
- **No Build-time Injection**: Version isn't injected during build process
- **Broken Update Detection**: Version comparison is impossible with static versions
- **Missing Offline Support**: No fallback version tracking for offline scenarios

### Requirements
- ✅ Maintain offline-first architecture
- ✅ Respect user consent for version persistence
- ✅ Support build-time version injection
- ✅ Enable post-update version tracking
- ✅ Preserve existing PWA functionality
- ✅ Support CI/CD integration
- ✅ Handle version rollback scenarios

---

## Implementation Phases

### Phase 1: Build-time Version Infrastructure
**Goal**: Implement dynamic version injection during build process

#### Task 1.1: Environment-based Version Injection
- **File**: `apps/frontend/vite.config.ts`
- **Changes**:
  - Add environment variable reading for version
  - Implement fallback to package.json version
  - Configure Vite environment injection
- **Implementation**:
  ```typescript
  // Add to vite.config.ts
  const getAppVersion = () => {
    return process.env.APP_VERSION ||
           process.env.npm_package_version ||
           packageJson.version ||
           '0.1.0-unknown';
  };

  export default defineConfig({
    define: {
      __APP_VERSION__: JSON.stringify(getAppVersion()),
      __BUILD_TIMESTAMP__: JSON.stringify(Date.now()),
      __GIT_COMMIT__: JSON.stringify(process.env.GIT_COMMIT || 'unknown')
    }
  });
  ```

#### Task 1.2: Type Definitions for Build Variables
- **File**: `apps/frontend/src/types/env.d.ts`
- **Changes**:
  - Add global type definitions for injected variables
- **Implementation**:
  ```typescript
  declare global {
    const __APP_VERSION__: string;
    const __BUILD_TIMESTAMP__: number;
    const __GIT_COMMIT__: string;
  }
  ```

#### Task 1.3: Dynamic Version Constants
- **File**: `apps/frontend/src/constants/index.ts`
- **Changes**:
  - Replace static `APP_VERSION` with dynamic version
  - Add build metadata constants
- **Implementation**:
  ```typescript
  // Replace static version
  export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined'
    ? __APP_VERSION__
    : '0.1.0-fallback';

  export const BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined'
    ? __BUILD_TIMESTAMP__
    : Date.now();

  export const GIT_COMMIT = typeof __GIT_COMMIT__ !== 'undefined'
    ? __GIT_COMMIT__
    : 'unknown';
  ```

#### Task 1.4: Package.json Script Integration
- **File**: `apps/frontend/package.json`
- **Changes**:
  - Update build scripts to inject version from git tags
  - Add version generation commands
- **Implementation**:
  ```json
  {
    "scripts": {
      "version:get": "git describe --tags --always --dirty 2>/dev/null || echo '0.1.0-dev'",
      "build": "cross-env APP_VERSION=$(npm run version:get --silent) pnpm generate-splash && ...",
      "build:prod": "cross-env APP_VERSION=$(npm run version:get --silent) pnpm generate-splash && ..."
    }
  }
  ```

---

### Phase 2: Persistent Version State Management
**Goal**: Implement version state that survives app reloads and updates

#### Task 2.1: Version State Storage Service
- **File**: `apps/frontend/src/services/versionStateService.ts` (NEW)
- **Purpose**: Manage persistent version state with offline support
- **Implementation**:
  ```typescript
  interface VersionState {
    installedVersion: string;          // Actually installed app version
    buildVersion: string;              // Current build version
    lastUpdateTime?: string;           // When last update was applied
    updateHistory: VersionHistoryEntry[];
    isFirstRun: boolean;
  }

  interface VersionHistoryEntry {
    fromVersion: string;
    toVersion: string;
    updateTime: string;
    updatePolicy: 'force' | 'critical' | 'optional';
    rollbackCapable: boolean;
  }

  class VersionStateService {
    // Offline-first version state management
    // Respects consent for persistence (localStorage vs sessionStorage)
    // Handles version history for rollback capability
  }
  ```

#### Task 2.2: Version Detection Logic
- **File**: `apps/frontend/src/utils/versionDetection.ts` (NEW)
- **Purpose**: Detect current vs installed version states
- **Implementation**:
  ```typescript
  interface VersionInfo {
    buildVersion: string;        // From build injection
    installedVersion: string;    // From persistent storage
    isFirstInstall: boolean;     // Never run before
    isUpdated: boolean;          // Build version > installed version
    requiresSync: boolean;       // Version mismatch detected
  }

  export function detectVersionState(): VersionInfo {
    // Compare build version vs stored installed version
    // Handle first run scenarios
    // Detect version mismatches
  }
  ```

#### Task 2.3: Update Service Integration
- **File**: `apps/frontend/src/services/updateService.ts`
- **Changes**:
  - Integrate with VersionStateService
  - Replace static version usage with dynamic detection
  - Add post-update version persistence
- **Key Changes**:
  - Replace `currentVersion: APP_VERSION` with dynamic detection
  - Add version state persistence after successful updates
  - Handle offline version state synchronization

---

### Phase 3: Service Worker Version Coordination
**Goal**: Coordinate version state between main thread and service worker

#### Task 3.1: Service Worker Version Messaging
- **File**: `apps/frontend/public/sw-custom.js`
- **Changes**:
  - Add version state messaging between SW and main thread
  - Handle version conflicts during offline periods
- **Implementation**:
  ```javascript
  // Message channel for version coordination
  self.addEventListener('message', (event) => {
    if (event.data.type === 'VERSION_UPDATE') {
      // Handle version state updates from main thread
    }
  });
  ```

#### Task 3.2: Version State Synchronization
- **File**: `apps/frontend/src/utils/serviceWorker.ts`
- **Changes**:
  - Add version state sync with service worker
  - Handle offline version conflict resolution
- **Implementation**:
  ```typescript
  export async function syncVersionWithServiceWorker(versionInfo: VersionInfo) {
    // Send version state to service worker
    // Handle offline synchronization conflicts
    // Coordinate cache invalidation on version changes
  }
  ```

---

### Phase 4: Offline-First Version Handling
**Goal**: Ensure version management works seamlessly offline

#### Task 4.1: Offline Version Cache Strategy
- **File**: `apps/frontend/src/services/versionCacheService.ts` (NEW)
- **Purpose**: Manage version state during offline periods
- **Implementation**:
  ```typescript
  class VersionCacheService {
    // Cache version state in IndexedDB for offline access
    // Handle version conflicts when going online
    // Provide fallback version detection

    async cacheVersionState(state: VersionState): Promise<void>;
    async getOfflineVersionState(): Promise<VersionState | null>;
    async syncOnlineVersionState(): Promise<void>;
  }
  ```

#### Task 4.2: Version Conflict Resolution
- **File**: `apps/frontend/src/utils/versionConflictResolver.ts` (NEW)
- **Purpose**: Resolve version mismatches after offline periods
- **Implementation**:
  ```typescript
  interface VersionConflict {
    offlineVersion: string;
    onlineVersion: string;
    conflictType: 'minor' | 'major' | 'breaking';
    resolutionStrategy: 'force-update' | 'user-choice' | 'rollback';
  }

  export function resolveVersionConflict(conflict: VersionConflict): Promise<VersionResolution>;
  ```

#### Task 4.3: IndexedDB Version Schema
- **File**: `apps/frontend/src/db/versionSchema.ts` (NEW)
- **Purpose**: Database schema for offline version state
- **Implementation**:
  ```typescript
  // Add to existing Dexie database
  export interface VersionStateDB {
    version_state: {
      id: string;
      installed_version: string;
      build_version: string;
      last_update_time: string;
      update_history: VersionHistoryEntry[];
      created_at: string;
      updated_at: string;
    }
  }
  ```

---

### Phase 5: Update Flow Integration
**Goal**: Integrate dynamic versioning with existing update system

#### Task 5.1: Update Detection Enhancement
- **File**: `apps/frontend/src/services/updateService.ts`
- **Changes**:
  - Use dynamic version for server comparisons
  - Handle version state transitions during updates
- **Key Modifications**:
  ```typescript
  async checkForUpdates(): Promise<UpdateInfo | null> {
    const versionInfo = detectVersionState();

    const requestBody: VersionCheckRequest = {
      current_version: versionInfo.installedVersion, // Not static APP_VERSION
      build_version: versionInfo.buildVersion,
      user_consent: hasConsent(),
      platform: this.getPlatformInfo()
    };

    // Continue with existing logic...
  }
  ```

#### Task 5.2: Post-Update Version Persistence
- **File**: `apps/frontend/src/services/updateService.ts`
- **Changes**:
  - Persist new version after successful updates
  - Update version history
  - Handle rollback scenarios
- **Implementation**:
  ```typescript
  private async completeUpdate(updateInfo: UpdateInfo): Promise<void> {
    // Existing update logic...

    // NEW: Persist updated version state
    await versionStateService.recordSuccessfulUpdate({
      fromVersion: this.versionInfo.installedVersion,
      toVersion: updateInfo.version,
      updatePolicy: updateInfo.policy,
      updateTime: new Date().toISOString()
    });

    // Update current version state
    this.versionInfo = detectVersionState();
  }
  ```

#### Task 5.3: Rollback Version Handling
- **File**: `apps/frontend/src/services/updateErrorHandler.ts`
- **Changes**:
  - Add version rollback capability
  - Restore previous version state on update failures
- **Implementation**:
  ```typescript
  async rollbackVersion(targetVersion: string): Promise<void> {
    // Restore version state to previous working version
    // Update version history with rollback entry
    // Clear failed update artifacts
  }
  ```

---

### Phase 6: CI/CD and Build Integration
**Goal**: Integrate with build and deployment processes

#### Task 6.1: Version Management Script Enhancement
- **File**: `apps/frontend/scripts/version-management.mjs`
- **Changes**:
  - Add dynamic version validation
  - Generate version metadata for build process
- **Enhancements**:
  ```javascript
  // Add functions for CI/CD integration
  static generateBuildVersionInfo() {
    return {
      version: this.getVersionFromGit(),
      buildTime: new Date().toISOString(),
      commitHash: GitUtils.getCommitHash(),
      buildNumber: BuildMetadata.generateBuildNumber()
    };
  }
  ```

#### Task 6.2: Environment Variable Template
- **File**: `apps/frontend/.env.example`
- **Changes**:
  - Add version-related environment variables
- **Content**:
  ```env
  # Version Management
  APP_VERSION=           # Auto-injected by build process
  GIT_COMMIT=           # Auto-injected by build process
  BUILD_TIMESTAMP=      # Auto-injected by build process
  VERSION_CHECK_URL=    # Optional: Custom version check endpoint
  ```

#### Task 6.3: CI/CD Integration Guide
- **File**: `docs/deployment/version-management.md` (NEW)
- **Purpose**: Guide for CI/CD version management integration
- **Content**:
  - GitHub Actions integration examples
  - Build script modifications
  - Version tagging strategies
  - Rollback procedures

---

### Phase 7: Testing and Validation
**Goal**: Comprehensive testing of dynamic version system

#### Task 7.1: Unit Tests for Version Services
- **Files**:
  - `apps/frontend/src/services/__tests__/versionStateService.test.ts` (NEW)
  - `apps/frontend/src/utils/__tests__/versionDetection.test.ts` (NEW)
- **Coverage**:
  - Version state persistence
  - Offline version handling
  - Version conflict resolution
  - Update version transitions

#### Task 7.2: Integration Tests for Update Flow
- **File**: `apps/frontend/src/services/__tests__/updateService.version.test.ts` (NEW)
- **Coverage**:
  - End-to-end version update flow
  - Version persistence after updates
  - Rollback scenarios
  - Offline-to-online version sync

#### Task 7.3: E2E Tests for Version Management
- **File**: `apps/frontend/cypress/e2e/version-management.cy.ts` (NEW)
- **Coverage**:
  - Version display in UI
  - Update notifications with correct versions
  - Version persistence across app restarts
  - Offline version handling

---

## Implementation Timeline

### Phase 1: Build Infrastructure (1-2 days)
- Set up build-time version injection
- Dynamic version constants
- Environment configuration

### Phase 2: Version State Management (2-3 days)
- Version state service
- Persistent storage with consent
- Update service integration

### Phase 3: Service Worker Coordination (1-2 days)
- SW-main thread messaging
- Version state synchronization

### Phase 4: Offline Support (2-3 days)
- Offline version caching
- Conflict resolution
- IndexedDB schema updates

### Phase 5: Update Flow Integration (1-2 days)
- Enhanced update detection
- Post-update persistence
- Rollback handling

### Phase 6: CI/CD Integration (1 day)
- Build script enhancements
- Environment templates
- Documentation

### Phase 7: Testing (2-3 days)
- Unit tests
- Integration tests
- E2E validation

**Total Estimated Time: 10-16 days**

---

## Risk Mitigation

### High Risk Items
1. **Version State Corruption**: Implement validation and recovery mechanisms
2. **Offline-Online Sync Conflicts**: Comprehensive conflict resolution
3. **Service Worker Cache Issues**: Version-aware cache invalidation
4. **Build Process Failures**: Fallback version mechanisms

### Rollback Plan
1. **Feature Flag**: Implement feature flag for dynamic versioning
2. **Static Fallback**: Maintain static version as fallback
3. **Migration Path**: Gradual migration from static to dynamic versioning
4. **Monitoring**: Version state health monitoring

---

## Success Criteria

### Functional Requirements
- ✅ Version updates persist across app reloads
- ✅ Offline version state management works correctly
- ✅ Update detection compares actual installed vs server versions
- ✅ Version history provides rollback capability
- ✅ CI/CD builds inject correct version information

### Technical Requirements
- ✅ Respects user consent for persistent storage
- ✅ Maintains offline-first architecture
- ✅ No regressions in existing PWA functionality
- ✅ Performance impact < 50ms on app startup
- ✅ Storage overhead < 10KB for version state

### Quality Requirements
- ✅ 95%+ test coverage for version management code
- ✅ All E2E tests pass including offline scenarios
- ✅ Documentation updated for new version system
- ✅ Build process consistently injects version information

---

## Future Enhancements

### Post-Implementation Improvements
1. **Version Analytics**: Track version adoption rates (with consent)
2. **Smart Rollback**: Automatic rollback on critical errors
3. **A/B Version Testing**: Gradual rollout capabilities
4. **Version Metadata**: Rich version information display
5. **Cross-Device Sync**: Version state sync across user devices

### Integration Opportunities
1. **Error Reporting**: Include version info in error reports
2. **Performance Monitoring**: Version-based performance tracking
3. **Feature Flags**: Version-based feature enabling
4. **Support Tools**: Version information for troubleshooting

---

**Last Updated**: 2025-09-21
**Status**: Ready for Implementation
**Dependencies**: PWA Update System (must be completed first)