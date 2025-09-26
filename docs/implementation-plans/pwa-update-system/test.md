# PWA Update System - Testing Guide

## Overview

This comprehensive testing guide covers all features implemented in the PWA Update System. Each test case includes setup instructions, step-by-step procedures, expected results, and troubleshooting tips.

## Test Environment Setup

### Prerequisites

Before running tests, ensure you have:

- [ ] **Development environment running** (`pnpm dev`)
- [ ] **Database migrations applied** (both dev and prod environments)
- [ ] **Edge functions deployed** (`check-version` function)
- [ ] **Browser developer tools open** (Console + Network tabs)
- [ ] **Clean browser state** (no cached data from previous tests)

### Environment Reset

```bash
# Reset to clean state before testing
cd apps/frontend

# Clear application data
localStorage.clear()
sessionStorage.clear()

# Unregister service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});

# Clear all caches
caches.keys().then(names => {
  return Promise.all(names.map(name => caches.delete(name)));
});

# Reload page
window.location.reload();
```

## Test Categories

### 1. Service Initialization Tests

#### Test 1.1: Basic Service Initialization
**Purpose**: Verify all update services initialize correctly

**Steps**:
1. Open browser console
2. Navigate to application
3. Execute test commands:

```javascript
// Check service availability
console.log('UpdateService:', typeof updateService);
console.log('ConsentService:', typeof consentService);
console.log('StorageService:', typeof storageService);

// Check initialization status
console.log('Update Health:', updateService.getHealthStatus());
```

**Expected Results**:
- All services should be defined (not 'undefined')
- Health status should show `isHealthy: true`
- No console errors during initialization

**Troubleshooting**:
- If services are undefined: Check service imports in App.tsx
- If unhealthy: Check browser support and network connectivity

#### Test 1.2: Service Dependencies
**Purpose**: Verify services integrate correctly

**Steps**:
```javascript
// Test consent service integration
console.log('Has Consent:', consentService.hasConsent());
console.log('Consent Status:', consentService.getConsentStatus());

// Test storage service integration
storageService.getAppSettings().then(settings => {
  console.log('App Settings:', settings);
});

// Test preferences loading
console.log('Update Preferences:', updateService.getUserPreferences());
```

**Expected Results**:
- Consent methods work without errors
- AppSettings loads (may be null for new users)
- Update preferences show default values if no consent

### 2. Consent and Privacy Tests

#### Test 2.1: No Consent Scenario
**Purpose**: Verify privacy compliance when user hasn't consented

**Setup**:
```javascript
// Ensure no consent is given
consentService.revokeConsent();
window.location.reload();
```

**Steps**:
1. Check update preferences behavior:
```javascript
const prefs = updateService.getUserPreferences();
console.log('Preferences without consent:', prefs);

// Try to save preferences
updateService.setUserPreferences({
  updateMode: 'automatic'
});

// Check where data is stored
console.log('LocalStorage keys:', Object.keys(localStorage));
console.log('SessionStorage keys:', Object.keys(sessionStorage));
```

**Expected Results**:
- Preferences should use default values
- No data stored in localStorage
- Data may be in sessionStorage only
- No persistent update data saved

#### Test 2.2: With Consent Scenario
**Purpose**: Verify full functionality when user consents

**Setup**:
```javascript
// Grant consent
consentService.grantConsent();
```

**Steps**:
1. Test preference persistence:
```javascript
// Set custom preferences
updateService.setUserPreferences({
  updateMode: 'notify',
  allowAutoUpdates: false,
  updateOnMetered: true
});

// Reload page
window.location.reload();

// Check if preferences persisted
setTimeout(() => {
  const prefs = updateService.getUserPreferences();
  console.log('Persisted preferences:', prefs);
}, 2000);
```

**Expected Results**:
- Preferences should persist across page reloads
- Data stored in AppSettings via storageService
- All update functionality available

### 3. Version Checking Tests

#### Test 3.1: Basic Version Check
**Purpose**: Verify version checking API functionality

**Steps**:
```javascript
// Trigger manual version check
updateService.checkForUpdates().then(result => {
  console.log('Version check result:', result);
}).catch(error => {
  console.error('Version check failed:', error);
});

// Check network requests in Network tab
// Should see POST to /functions/v1/check-version
```

**Expected Results**:
- Network request to check-version function
- Response with version information
- No errors in console
- Result should be null if no updates available

#### Test 3.2: Network Failure Handling
**Purpose**: Test error handling when network fails

**Steps**:
1. Open Network tab in Developer Tools
2. Enable "Offline" mode
3. Trigger version check:

```javascript
updateService.checkForUpdates().then(result => {
  console.log('Offline result:', result);
}).catch(error => {
  console.log('Expected error:', error);
});
```

**Expected Results**:
- Should handle network failure gracefully
- Error should be logged but not crash app
- Retry mechanism should activate
- User should see appropriate error message

#### Test 3.3: Rate Limiting
**Purpose**: Verify update checks are properly throttled

**Steps**:
```javascript
// Check multiple times rapidly
const results = [];
for (let i = 0; i < 5; i++) {
  updateService.checkForUpdates().then(result => {
    results.push({ attempt: i, result, time: new Date() });
    console.log(`Check ${i}:`, result);
  });
}

// Check metrics
setTimeout(() => {
  const health = updateService.getHealthStatus();
  console.log('Check stats:', health.stats);
}, 5000);
```

**Expected Results**:
- Only first check should make network request
- Subsequent checks should return cached result
- Rate limiting should prevent excessive API calls

### 4. Update Preferences Tests

#### Test 4.1: Preference Storage Integration
**Purpose**: Verify preferences integrate with AppSettings

**Steps**:
```javascript
// Test each preference type
const testPreferences = [
  { updateMode: 'automatic' },
  { updateMode: 'notify' },
  { updateMode: 'manual' },
  { allowAutoUpdates: true },
  { allowAutoUpdates: false },
  { updateOnMetered: true },
  { updateOnMetered: false }
];

// Test each preference
for (const pref of testPreferences) {
  updateService.setUserPreferences(pref);

  // Verify immediate update
  const current = updateService.getUserPreferences();
  console.log('Set:', pref, 'Got:', current);

  // Wait for async save
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Verify persistence in AppSettings
storageService.getAppSettings().then(settings => {
  console.log('AppSettings after test:', {
    update_mode: settings?.update_mode,
    allow_auto_updates: settings?.allow_auto_updates,
    update_on_metered: settings?.update_on_metered
  });
});
```

**Expected Results**:
- Each preference should update immediately
- Preferences should persist in AppSettings
- No conflicts with other app settings

#### Test 4.2: Preference Loading on Startup
**Purpose**: Verify preferences load correctly during app initialization

**Steps**:
1. Set specific preferences:
```javascript
updateService.setUserPreferences({
  updateMode: 'automatic',
  allowAutoUpdates: false,
  updateOnMetered: true
});
```

2. Reload page and check loading:
```javascript
// Wait for async initialization
setTimeout(() => {
  const prefs = updateService.getUserPreferences();
  console.log('Loaded preferences:', prefs);

  const health = updateService.getHealthStatus();
  console.log('Health after load:', health.preferences);
}, 3000);
```

**Expected Results**:
- Preferences should match what was saved
- No default values should override saved preferences
- Loading should complete within 3 seconds

### 5. Health Monitoring Tests

#### Test 5.1: Health Status Information
**Purpose**: Verify health monitoring provides correct information

**Steps**:
```javascript
// Get comprehensive health status
const health = updateService.getHealthStatus();
console.log('Complete health status:', health);

// Check each component
console.log('Is Healthy:', health.isHealthy);
console.log('Service Worker Status:', health.serviceWorkerStatus);
console.log('Update Available:', health.updateAvailable);
console.log('Has Errors:', health.hasErrors);
console.log('Can Rollback:', health.canRollback);
console.log('Statistics:', health.stats);
```

**Expected Results**:
- All health fields should be present
- serviceWorkerStatus should be 'active' or 'inactive'
- Stats should show reasonable numbers
- isHealthy should be true for normal operation

#### Test 5.2: Metrics Tracking
**Purpose**: Verify update metrics are tracked correctly

**Steps**:
```javascript
// Reset metrics tracking
// (Note: This is for testing only, not available in production)

// Perform several operations
await updateService.checkForUpdates();
await updateService.checkForUpdates();

// Check metrics
const health = updateService.getHealthStatus();
console.log('Metrics after operations:', health.stats);

// Verify metrics persistence
window.location.reload();
setTimeout(() => {
  const newHealth = updateService.getHealthStatus();
  console.log('Metrics after reload:', newHealth.stats);
}, 2000);
```

**Expected Results**:
- totalChecks should increment with each check
- lastCheckDuration should be reasonable (< 5000ms)
- Metrics should persist across page reloads

### 6. Service Worker Integration Tests

#### Test 6.1: Service Worker Registration
**Purpose**: Verify service worker integrates correctly with update system

**Steps**:
```javascript
// Check service worker status
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Registration:', reg);
  if (reg) {
    console.log('SW State:', reg.active?.state);
    console.log('SW Script URL:', reg.active?.scriptURL);
  }
});

// Check update service SW integration
const health = updateService.getHealthStatus();
console.log('SW Status from update service:', health.serviceWorkerStatus);
```

**Expected Results**:
- Service worker should be registered
- State should be 'activated'
- Update service should correctly detect SW status

#### Test 6.2: Service Worker Communication
**Purpose**: Test message passing between update service and service worker

**Steps**:
```javascript
// Listen for SW messages
navigator.serviceWorker.addEventListener('message', event => {
  console.log('Message from SW:', event.data);
});

// Send test message to SW
if (navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({
    type: 'GET_VERSION'
  });
}

// Check for version info response
```

**Expected Results**:
- Messages should be sent/received without errors
- Service worker should respond to version requests
- Communication should be bidirectional

### 7. Error Handling Tests

#### Test 7.1: Update Error Creation and Categorization
**Purpose**: Verify error handling system works correctly

**Steps**:
```javascript
// Test error categorization (internal testing)
// Note: This accesses internal components for testing

// Simulate different error types
const testErrors = [
  new Error('Network request failed'),
  new Error('Service worker install failed'),
  new Error('Download incomplete'),
  { status: 500, message: 'Server error' },
  { name: 'TimeoutError', message: 'Request timed out' }
];

// Check error categorization
testErrors.forEach(error => {
  console.log('Error:', error);
  // Internal error handling would categorize these
});
```

**Expected Results**:
- Network errors should be categorized as 'network_error'
- SW errors should be 'installation_error'
- Download errors should be 'download_error'
- Timeout errors should be 'timeout_error'

#### Test 7.2: Recovery Actions
**Purpose**: Test error recovery mechanisms

**Steps**:
1. Trigger an error condition (disconnect network)
2. Attempt update check:
```javascript
updateService.checkForUpdates().catch(error => {
  console.log('Caught error:', error);

  // Check if recovery actions are available
  const health = updateService.getHealthStatus();
  console.log('Recovery state:', health);
});
```

**Expected Results**:
- Errors should be caught gracefully
- Recovery actions should be suggested
- System should remain stable after errors

### 8. Version Management Script Tests

#### Test 8.1: Version Creation Script
**Purpose**: Test the version management CLI tools

**Steps**:
```bash
# Test version validation
cd apps/frontend
pnpm version:validate 1.0.0
pnpm version:validate invalid.version

# Test build info
pnpm version:build-info

# Test version creation (dry run)
node scripts/version-management.mjs create 1.0.1 --dry-run --force
```

**Expected Results**:
- Valid versions should pass validation
- Invalid versions should fail with helpful error
- Build info should show current git and environment data
- Dry run should create JSON file without database changes

#### Test 8.2: Development Workflow Scripts
**Purpose**: Test release management tools

**Steps**:
```bash
# Test status command
pnpm release:status

# Test preparation
pnpm release:prepare

# Test version bumping (dry run)
node scripts/dev-workflow.mjs bump patch --dry-run
```

**Expected Results**:
- Status should show current git and version information
- Preparation should show possible release versions
- Bump should show what changes would be made

### 9. Database Integration Tests

#### Test 9.1: Database Connectivity
**Purpose**: Verify database integration works correctly

**Steps**:
```javascript
// Test database connectivity through edge function
fetch('/api/test-db-connection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
}).then(response => response.json())
  .then(data => console.log('DB Test Result:', data))
  .catch(error => console.error('DB Test Failed:', error));
```

**Expected Results**:
- Connection should succeed
- Response should indicate healthy database
- No authentication errors

#### Test 9.2: Version Table Operations
**Purpose**: Test version management database operations

**Steps**:
```bash
# Test version creation in database
pnpm version:create 1.0.1 --policy optional --changelog "Test version" --force

# Verify in database (if you have access)
# SELECT * FROM app_versions ORDER BY created_at DESC LIMIT 1;
```

**Expected Results**:
- Version should be created in database
- All required fields should be populated
- Audit trail should be created

### 10. Integration Tests

#### Test 10.1: Full Update Flow Simulation
**Purpose**: Test complete update process end-to-end

**Setup**: This requires a test version to be available in the database

**Steps**:
1. Check for updates:
```javascript
const updateInfo = await updateService.checkForUpdates();
console.log('Update info:', updateInfo);
```

2. If update available, test notification:
```javascript
// Check if update notification appears
// Look for UI elements indicating update availability
```

3. Test user interaction:
```javascript
// Simulate user choosing to install update
if (updateInfo) {
  await updateService.applyUpdateWithConfirmation();
}
```

**Expected Results**:
- Update check should find available update
- UI should reflect update availability
- Update installation should proceed smoothly

#### Test 10.2: Privacy Compliance Flow
**Purpose**: Verify privacy compliance throughout update process

**Steps**:
1. Start without consent:
```javascript
consentService.revokeConsent();
window.location.reload();
```

2. Trigger update check:
```javascript
// Should still work but with limited functionality
const result = await updateService.checkForUpdates();
console.log('No consent result:', result);
```

3. Grant consent:
```javascript
consentService.grantConsent();
```

4. Verify enhanced functionality:
```javascript
// Should now have full functionality
updateService.setUserPreferences({ updateMode: 'automatic' });
const prefs = updateService.getUserPreferences();
console.log('With consent prefs:', prefs);
```

**Expected Results**:
- System should work without consent but with limitations
- No persistent data should be stored without consent
- Full functionality should be available with consent

### 11. Performance Tests

#### Test 11.1: Initialization Performance
**Purpose**: Verify system initializes quickly

**Steps**:
```javascript
// Measure initialization time
const startTime = performance.now();

// Reload page and measure
window.addEventListener('load', () => {
  const loadTime = performance.now() - startTime;
  console.log('Page load time:', loadTime + 'ms');

  // Check when update service is ready
  const checkReady = () => {
    if (typeof updateService !== 'undefined') {
      const readyTime = performance.now() - startTime;
      console.log('Update service ready:', readyTime + 'ms');

      const health = updateService.getHealthStatus();
      console.log('Service healthy:', health.isHealthy);
    } else {
      setTimeout(checkReady, 10);
    }
  };
  checkReady();
});

window.location.reload();
```

**Expected Results**:
- Page should load in < 2 seconds
- Update service should be ready in < 3 seconds
- No blocking operations during initialization

#### Test 11.2: Update Check Performance
**Purpose**: Verify update checks are fast

**Steps**:
```javascript
// Measure update check time
const measureUpdateCheck = async () => {
  const startTime = performance.now();

  try {
    const result = await updateService.checkForUpdates();
    const duration = performance.now() - startTime;

    console.log('Update check duration:', duration + 'ms');
    console.log('Result:', result);

    const health = updateService.getHealthStatus();
    console.log('Tracked duration:', health.stats.lastCheckDuration + 'ms');

  } catch (error) {
    const duration = performance.now() - startTime;
    console.log('Failed update check duration:', duration + 'ms');
    console.error('Error:', error);
  }
};

measureUpdateCheck();
```

**Expected Results**:
- Update checks should complete in < 5 seconds
- Multiple rapid checks should be throttled
- Performance should be consistent across checks

### 12. Accessibility Tests

#### Test 12.1: Update Notification Accessibility
**Purpose**: Verify update UI is accessible

**Steps**:
1. Enable screen reader testing mode
2. Navigate using keyboard only
3. Check for proper ARIA labels:

```javascript
// Check for accessibility attributes
const updateElements = document.querySelectorAll('[data-testid*="update"]');
updateElements.forEach(element => {
  console.log('Element:', element.tagName);
  console.log('ARIA Label:', element.getAttribute('aria-label'));
  console.log('Role:', element.getAttribute('role'));
  console.log('Focusable:', element.tabIndex);
});
```

**Expected Results**:
- All update UI elements should be keyboard accessible
- Proper ARIA labels should be present
- Screen reader announcements should be appropriate

### 13. Cross-Browser Tests

#### Test 13.1: Browser Compatibility
**Purpose**: Verify functionality across different browsers

**Test Matrix**:
| Browser | Version | Service Workers | Update System |
|---------|---------|----------------|---------------|
| Chrome | Latest | ✓ | ✓ |
| Firefox | Latest | ✓ | ✓ |
| Safari | Latest | ✓ | ✓ |
| Edge | Latest | ✓ | ✓ |

**Steps for each browser**:
1. Open application
2. Run basic functionality test:
```javascript
console.log('Browser:', navigator.userAgent);
console.log('SW Support:', 'serviceWorker' in navigator);
console.log('Update Service:', typeof updateService);

const health = updateService.getHealthStatus();
console.log('System Health:', health.isHealthy);
```

**Expected Results**:
- All modern browsers should support the system
- Feature detection should work correctly
- Graceful degradation for unsupported features

## Test Results Template

Use this template to document test results:

```
## Test Results - [Date]

### Environment
- Application Version: [Version]
- Browser: [Browser/Version]
- Database: [Environment - dev/prod]
- Tester: [Name]

### Test Summary
- Total Tests: [Number]
- Passed: [Number]
- Failed: [Number]
- Skipped: [Number]

### Failed Tests
[List any failed tests with details]

### Performance Metrics
- Initialization Time: [Time]
- Update Check Time: [Time]
- Memory Usage: [Amount]

### Notes
[Any additional observations]
```

## Automated Testing Integration

For continuous testing, consider integrating these tests into your existing test suite:

```javascript
// Example Vitest integration
import { describe, it, expect, beforeEach } from 'vitest';

describe('PWA Update System', () => {
  beforeEach(() => {
    // Reset state before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should initialize all services', () => {
    expect(updateService).toBeDefined();
    expect(consentService).toBeDefined();
    expect(storageService).toBeDefined();
  });

  it('should respect user consent', async () => {
    consentService.revokeConsent();
    const prefs = updateService.getUserPreferences();
    expect(prefs.updateMode).toBe('notify'); // default
  });

  // Add more automated tests...
});
```

## Troubleshooting Common Test Issues

### Issue: Services Not Initialized
**Solution**: Wait for async initialization or check service imports

### Issue: Network Errors During Testing
**Solution**: Ensure development server and database are running

### Issue: Inconsistent Test Results
**Solution**: Clear browser state between tests

### Issue: Permission Errors
**Solution**: Check database permissions and API keys

---

**Document Version**: 1.0
**Created**: [Date]
**Last Updated**: [Date]
**Reviewed By**: [Name]