# PWA Update System - Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered with the RepCue PWA Update System. The troubleshooting steps are organized by component and symptom for quick resolution.

## Common Issues and Solutions

### 1. Update Service Not Initializing

**Symptoms:**
- Update service throws errors during initialization
- Health status shows as unhealthy
- Service worker fails to register

**Diagnostic Steps:**
```javascript
// Check service initialization in browser console
console.log('UpdateService Health:', updateService.getHealthStatus());
console.log('Consent Status:', consentService.getConsentStatus());
console.log('Storage Service Ready:', await storageService.ready());
```

**Solutions:**

#### Issue: ConsentService Integration Error
```javascript
// Error: "hasConsented is not a function"
// Solution: Verify correct method name usage
if (consentService.hasConsent()) { // Correct
  // Update logic
}
```

#### Issue: StorageService Integration Error
```javascript
// Error: "setItem is not a function on storageService"
// Solution: Use AppSettings instead of generic storage
const appSettings = await storageService.getAppSettings();
const updatedSettings = {
  ...appSettings,
  update_mode: 'automatic'
};
await storageService.saveAppSettings(updatedSettings);
```

#### Issue: Service Worker Registration Failure
```javascript
// Check service worker support
if (!('serviceWorker' in navigator)) {
  console.warn('Service Worker not supported');
}

// Check registration
navigator.serviceWorker.getRegistration().then(reg => {
  if (!reg) {
    console.error('No service worker registered');
  }
});
```

### 2. Version Checking Failures

**Symptoms:**
- "Failed to check for updates" errors
- Network timeouts
- 403/401 authentication errors

**Diagnostic Steps:**
```bash
# Test edge function directly
curl -X POST "https://your-project.supabase.co/functions/v1/check-version" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"current_version": "1.0.0"}' \
  -v
```

**Solutions:**

#### Issue: Authentication Errors
```javascript
// Check API key configuration
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Anon Key configured:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Verify environment variables
// .env file should contain:
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### Issue: Network Connectivity
```javascript
// Test basic connectivity
fetch('https://your-project.supabase.co/rest/v1/')
  .then(response => console.log('API accessible:', response.ok))
  .catch(error => console.error('Network error:', error));
```

#### Issue: Edge Function Not Deployed
```bash
# List deployed functions
supabase functions list --project-ref your-project-id

# Redeploy if missing
supabase functions deploy check-version --project-ref your-project-id
```

### 3. Database Connection Issues

**Symptoms:**
- "Database connection failed" errors
- RLS policy violations
- Missing table errors

**Diagnostic Steps:**
```sql
-- Check table existence
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('admin_users', 'app_versions', 'version_audit');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('admin_users', 'app_versions', 'version_audit');
```

**Solutions:**

#### Issue: Missing Tables
```bash
# Apply missing migrations
supabase db push --project-ref your-project-id

# Verify migration status
supabase db status --project-ref your-project-id
```

#### Issue: RLS Policy Violations
```sql
-- Check if user has proper role
SELECT auth.role();

-- Verify RLS policies allow access
-- For app_versions, authenticated users should have read access
SELECT * FROM app_versions LIMIT 1;
```

#### Issue: Foreign Key Constraint Violations
```sql
-- Check for orphaned records
SELECT av.* FROM app_versions av
LEFT JOIN admin_users au ON av.reviewer = au.user_id
WHERE au.user_id IS NULL;

-- Fix by creating missing admin user or updating reviewer
```

### 4. Update Installation Failures

**Symptoms:**
- Updates download but fail to install
- Service worker update errors
- Browser cache issues

**Diagnostic Steps:**
```javascript
// Check service worker state
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW State:', reg.active?.state);
  console.log('SW Installing:', reg.installing?.state);
  console.log('SW Waiting:', reg.waiting?.state);
});

// Check for service worker errors
navigator.serviceWorker.addEventListener('error', event => {
  console.error('Service worker error:', event);
});
```

**Solutions:**

#### Issue: Service Worker Update Stuck
```javascript
// Force service worker update
if (reg.waiting) {
  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
}

// Force page reload after update
window.location.reload();
```

#### Issue: Cache Corruption
```javascript
// Clear all caches
caches.keys().then(names => {
  return Promise.all(
    names.map(name => caches.delete(name))
  );
}).then(() => {
  window.location.reload();
});
```

#### Issue: Browser Storage Quota Exceeded
```javascript
// Check storage usage
navigator.storage.estimate().then(estimate => {
  console.log('Storage used:', estimate.usage);
  console.log('Storage quota:', estimate.quota);
  console.log('Usage percentage:', (estimate.usage / estimate.quota * 100).toFixed(2) + '%');
});

// Clear unnecessary data
await storageService.resetDatabase(); // Use with caution
```

### 5. User Preference Issues

**Symptoms:**
- Preferences not saving
- Default preferences not loading
- Update mode not respected

**Diagnostic Steps:**
```javascript
// Check current preferences
console.log('User Preferences:', updateService.getUserPreferences());

// Check AppSettings storage
storageService.getAppSettings().then(settings => {
  console.log('AppSettings:', settings);
});

// Check consent status
console.log('Consent Status:', consentService.getConsentStatus());
```

**Solutions:**

#### Issue: Preferences Not Persisting
```javascript
// Verify consent is granted for persistent storage
if (!consentService.hasConsent()) {
  console.warn('User has not consented to data storage');
  // Preferences will use sessionStorage only
}

// Force preference save
updateService.setUserPreferences({
  updateMode: 'notify',
  allowAutoUpdates: true,
  updateOnMetered: false
});
```

#### Issue: Default Preferences Not Loading
```javascript
// Check if AppSettings exists
const settings = await storageService.getAppSettings();
if (!settings) {
  // Create default AppSettings
  await storageService.saveAppSettings({
    // ... other settings
    update_mode: 'notify',
    allow_auto_updates: true,
    update_on_metered: false
  });
}
```

### 6. Performance Issues

**Symptoms:**
- Slow update checks
- High memory usage
- Frequent timeouts

**Diagnostic Steps:**
```javascript
// Check update metrics
const health = updateService.getHealthStatus();
console.log('Update Stats:', health.stats);
console.log('Last Check Duration:', health.stats.lastCheckDuration + 'ms');

// Monitor memory usage
performance.memory && console.log('Memory:', {
  used: performance.memory.usedJSHeapSize,
  total: performance.memory.totalJSHeapSize,
  limit: performance.memory.jsHeapSizeLimit
});
```

**Solutions:**

#### Issue: Frequent Update Checks
```javascript
// Check update interval configuration
const state = updateService.getState();
console.log('Last Check:', state.lastCheckTime);

// Adjust check frequency if needed
// Update checks are throttled by default (30 min for normal, 5 min for force)
```

#### Issue: Memory Leaks
```javascript
// Check for proper event listener cleanup
// Ensure components properly remove listeners on unmount

// Monitor service worker memory
navigator.serviceWorker.controller?.postMessage({
  type: 'GET_MEMORY_USAGE'
});
```

### 7. Privacy and Consent Issues

**Symptoms:**
- Updates work without user consent
- Data stored when consent withdrawn
- Privacy policy violations

**Diagnostic Steps:**
```javascript
// Verify consent checking
console.log('Has Consent:', consentService.hasConsent());
console.log('Consent Data:', consentService.getConsentStatus());

// Check storage behavior
const prefs = updateService.getUserPreferences();
console.log('Preferences source:',
  consentService.hasConsent() ? 'localStorage' : 'sessionStorage');
```

**Solutions:**

#### Issue: Updates Bypassing Consent
```javascript
// Verify all update operations check consent
// Pattern should be:
if (consentService.hasConsent()) {
  // Perform update with persistent storage
} else {
  // Use session-only storage or skip update
}
```

#### Issue: Data Persistence Without Consent
```javascript
// Audit all storage operations
// Ensure no localStorage use without consent check
// Use sessionStorage for temporary data only
```

## Error Code Reference

### Update Service Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `UPDATE_001` | Service initialization failed | Check service dependencies and browser support |
| `UPDATE_002` | Version check failed | Verify network connectivity and API configuration |
| `UPDATE_003` | Update installation failed | Check service worker and cache status |
| `UPDATE_004` | Consent violation | Verify user consent before data operations |
| `UPDATE_005` | Storage quota exceeded | Clear unnecessary data or request storage increase |
| `UPDATE_006` | Network timeout | Check connection and retry with exponential backoff |
| `UPDATE_007` | Authentication failed | Verify API keys and user permissions |
| `UPDATE_008` | Version validation failed | Check version format and database constraints |

### Database Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `DB_001` | Table not found | Run database migrations |
| `DB_002` | RLS policy violation | Check user permissions and policies |
| `DB_003` | Foreign key constraint | Verify referenced records exist |
| `DB_004` | Unique constraint violation | Check for duplicate entries |
| `DB_005` | Connection timeout | Check database availability and network |

## Debug Mode

Enable debug mode for additional logging:

```javascript
// In browser console
localStorage.setItem('repcue_debug', 'true');
window.location.reload();

// Check debug output
// All update operations will log detailed information
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Update Success Rate**
   ```javascript
   const health = updateService.getHealthStatus();
   const successRate = health.stats.successfulUpdates /
                      (health.stats.successfulUpdates + health.stats.failedUpdates);
   ```

2. **Average Check Duration**
   ```javascript
   const avgDuration = health.stats.lastCheckDuration;
   // Alert if > 5000ms
   ```

3. **Error Frequency**
   ```javascript
   const errorRate = health.stats.failedChecks / health.stats.totalChecks;
   // Alert if > 0.1 (10%)
   ```

### Health Check Endpoint

```javascript
// Expose health check for monitoring
window.updateSystemHealth = () => updateService.getHealthStatus();
```

## Support Escalation

### When to Escalate

1. **Database corruption** - Contact database administrator
2. **Service worker conflicts** - Contact frontend team lead
3. **Privacy violations** - Contact legal/compliance team
4. **Performance degradation** - Contact DevOps team

### Information to Collect

Before escalating, collect:

1. **Browser information**
   ```javascript
   console.log('Browser:', navigator.userAgent);
   console.log('SW Support:', 'serviceWorker' in navigator);
   ```

2. **Update service state**
   ```javascript
   console.log('Update State:', updateService.getState());
   console.log('Health Status:', updateService.getHealthStatus());
   ```

3. **Console errors**
   - Screenshot or copy all console errors
   - Include network tab information
   - Note exact steps to reproduce

4. **Environment details**
   - Production vs development
   - User consent status
   - Device type and OS

## Recovery Procedures

### Emergency Recovery

If the update system is completely broken:

1. **Disable automatic updates**
   ```javascript
   // In browser console
   localStorage.setItem('repcue_disable_updates', 'true');
   ```

2. **Clear service worker**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```

3. **Reset user preferences**
   ```javascript
   updateService.setUserPreferences({
     updateMode: 'manual',
     allowAutoUpdates: false
   });
   ```

### Full System Reset

As a last resort:

```javascript
// WARNING: This will clear all user data
await storageService.resetDatabase();
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

## Related Documentation

- [Deployment Guide](./pwa-update-system-deployment.md)
- [Migration Checklist](./pwa-update-system-migration-checklist.md)
- [Rollback Procedures](./pwa-update-system-rollback.md)