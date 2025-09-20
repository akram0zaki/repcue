# PWA Update System - Rollback Procedures

## Overview

This document provides comprehensive rollback procedures for the RepCue PWA Update System. These procedures are designed to quickly restore service in case of deployment issues, data corruption, or system failures.

## Emergency Contacts

- **Database Administrator**: [Contact Info]
- **DevOps Engineer**: [Contact Info]
- **Technical Lead**: [Contact Info]
- **Product Owner**: [Contact Info]
- **24/7 Support**: [Contact Info]

## Rollback Decision Matrix

### When to Rollback

| Severity | Issue Type | Action | Timeframe |
|----------|------------|--------|-----------|
| **Critical** | System completely down | Immediate rollback | < 15 minutes |
| **Critical** | Data corruption detected | Immediate rollback | < 30 minutes |
| **Critical** | Security vulnerability | Immediate rollback | < 15 minutes |
| **High** | Major functionality broken | Rollback after triage | < 1 hour |
| **High** | Performance degradation >50% | Rollback after triage | < 2 hours |
| **Medium** | Minor feature issues | Monitor and fix forward | Next deployment |
| **Low** | Cosmetic issues | Fix forward | Next deployment |

### Rollback Authority

- **Immediate Rollback**: DevOps Engineer, Technical Lead
- **Authorized Rollback**: Database Administrator, Product Owner
- **Emergency Rollback**: Any senior team member (with post-rollback notification)

## Database Rollback Procedures

### Level 1: Preference and Configuration Rollback

**When to use**: User preference issues, configuration problems

**Duration**: 5-10 minutes

**Steps**:

1. **Disable new version activation**
   ```sql
   -- Connect to production database
   UPDATE app_versions
   SET is_active = false
   WHERE version_number = 'PROBLEMATIC_VERSION';
   ```

2. **Activate previous stable version**
   ```sql
   UPDATE app_versions
   SET is_active = true
   WHERE version_number = 'LAST_STABLE_VERSION';
   ```

3. **Clear problematic version data**
   ```sql
   -- Only if data is corrupted
   DELETE FROM version_audit
   WHERE version_id = (
     SELECT id FROM app_versions
     WHERE version_number = 'PROBLEMATIC_VERSION'
   );
   ```

4. **Verify rollback**
   ```sql
   SELECT version_number, is_active, release_date
   FROM app_versions
   WHERE is_active = true;
   ```

### Level 2: Schema Rollback

**When to use**: Migration issues, table corruption

**Duration**: 15-30 minutes

**Prerequisites**:
- Database backup from before deployment
- Migration rollback scripts prepared

**Steps**:

1. **Stop all application traffic**
   ```bash
   # Put application in maintenance mode
   # This prevents new data from being written during rollback
   ```

2. **Backup current state**
   ```bash
   # Create backup of current state for forensics
   supabase db dump --project-ref zumzzuvfsuzvvymhpymk > rollback-backup-$(date +%Y%m%d-%H%M%S).sql
   ```

3. **Execute rollback migrations**
   ```sql
   -- Drop problematic tables in reverse dependency order
   DROP TABLE IF EXISTS version_audit CASCADE;
   DROP TABLE IF EXISTS app_versions CASCADE;
   DROP TABLE IF EXISTS admin_users CASCADE;

   -- Restore from backup if needed
   ```

4. **Restore from backup**
   ```bash
   # If complete restoration is needed
   supabase db reset --project-ref zumzzuvfsuzvvymhpymk
   psql -h db.your-project.supabase.co -d postgres -U postgres < backup-file.sql
   ```

5. **Verify schema integrity**
   ```sql
   -- Check all expected tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;

   -- Verify data integrity
   SELECT COUNT(*) as total_records
   FROM information_schema.tables t
   JOIN pg_class c ON c.relname = t.table_name
   WHERE t.table_schema = 'public';
   ```

### Level 3: Complete System Rollback

**When to use**: Complete system failure, data corruption

**Duration**: 30-60 minutes

**Prerequisites**:
- Full database backup
- Previous deployment artifacts
- Emergency access credentials

**Steps**:

1. **Activate incident response**
   ```bash
   # Notify all stakeholders
   # Activate emergency protocols
   ```

2. **Stop all services**
   ```bash
   # Stop application servers
   pm2 stop all

   # Disable edge functions
   supabase functions delete check-version --project-ref zumzzuvfsuzvvymhpymk
   ```

3. **Complete database restoration**
   ```bash
   # Restore entire database from backup
   supabase db reset --project-ref zumzzuvfsuzvvymhpymk
   psql -h db.your-project.supabase.co -d postgres -U postgres < full-backup.sql
   ```

4. **Redeploy previous stable version**
   ```bash
   # Checkout previous stable commit
   git checkout STABLE_COMMIT_HASH

   # Rebuild and deploy
   cd apps/frontend
   pnpm install
   pnpm build:prod

   # Deploy previous version
   # (Platform-specific deployment commands)
   ```

5. **Restore edge functions**
   ```bash
   # Deploy previous stable edge functions
   supabase functions deploy check-version --project-ref zumzzuvfsuzvvymhpymk
   ```

## Application Rollback Procedures

### Frontend Application Rollback

**When to use**: Frontend deployment issues, UI problems

**Steps**:

1. **Identify last stable commit**
   ```bash
   git log --oneline | head -10
   # Find last stable commit before problematic deployment
   ```

2. **Create rollback branch**
   ```bash
   git checkout -b rollback-$(date +%Y%m%d-%H%M%S) STABLE_COMMIT_HASH
   ```

3. **Rebuild application**
   ```bash
   cd apps/frontend
   pnpm install
   pnpm build:prod
   ```

4. **Deploy previous version**
   ```bash
   # For Raspberry Pi deployment
   pm2 stop ecosystem.config.cjs
   # Copy files to production directory
   pm2 start ecosystem.config.cjs

   # For cloud deployment
   # Use platform-specific deployment commands
   ```

5. **Verify rollback**
   ```bash
   # Test critical paths
   curl -I https://your-domain.com
   # Should return 200 OK

   # Test update service
   curl -X POST "https://your-project.supabase.co/functions/v1/check-version" \
     -H "Authorization: Bearer $ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"current_version": "1.0.0"}'
   ```

### Service Worker Rollback

**When to use**: Service worker update issues, caching problems

**Steps**:

1. **Force service worker update**
   ```javascript
   // In browser console for emergency user fix
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => {
       registration.unregister();
     });
   });

   // Clear all caches
   caches.keys().then(names => {
     return Promise.all(names.map(name => caches.delete(name)));
   });

   // Reload to get fresh service worker
   window.location.reload();
   ```

2. **Deploy previous service worker**
   ```bash
   # Restore previous sw-custom.js
   git checkout STABLE_COMMIT_HASH -- apps/frontend/public/sw-custom.js

   # Rebuild and deploy
   pnpm build:prod
   ```

3. **Clear CDN cache if applicable**
   ```bash
   # Platform-specific cache purging commands
   # Ensure old service worker isn't cached
   ```

## Edge Function Rollback Procedures

### Quick Function Rollback

**When to use**: Edge function errors, API issues

**Steps**:

1. **Disable problematic function**
   ```bash
   supabase functions delete check-version --project-ref zumzzuvfsuzvvymhpymk
   ```

2. **Deploy previous version**
   ```bash
   # Checkout previous stable function
   git checkout STABLE_COMMIT_HASH -- supabase/functions/check-version/

   # Redeploy
   supabase functions deploy check-version --project-ref zumzzuvfsuzvvymhpymk
   ```

3. **Test function**
   ```bash
   curl -X POST "https://zumzzuvfsuzvvymhpymk.supabase.co/functions/v1/check-version" \
     -H "Authorization: Bearer $ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"current_version": "1.0.0"}'
   ```

### Function Fallback Mode

**When to use**: Complete edge function failure

**Steps**:

1. **Implement client-side fallback**
   ```javascript
   // Emergency fallback in updateService
   if (edgeFunctionFailed) {
     // Use service worker based update detection
     return await this.checkServiceWorkerUpdate();
   }
   ```

2. **Disable server-side update checking**
   ```javascript
   // In application configuration
   const UPDATE_CONFIG = {
     useEdgeFunction: false,
     fallbackToServiceWorker: true
   };
   ```

## User Data Recovery

### Preference Recovery

**When to use**: User preferences lost or corrupted

**Steps**:

1. **Check backup data**
   ```sql
   -- Look for user preference backups
   SELECT * FROM app_settings_backup
   WHERE user_id = 'AFFECTED_USER_ID'
   ORDER BY created_at DESC;
   ```

2. **Restore user preferences**
   ```sql
   -- Restore from backup
   INSERT INTO app_settings (user_id, settings, created_at)
   SELECT user_id, settings, NOW()
   FROM app_settings_backup
   WHERE user_id = 'AFFECTED_USER_ID'
   AND created_at = (
     SELECT MAX(created_at)
     FROM app_settings_backup
     WHERE user_id = 'AFFECTED_USER_ID'
   );
   ```

3. **Reset to defaults if no backup**
   ```javascript
   // Client-side reset
   updateService.setUserPreferences({
     updateMode: 'notify',
     allowAutoUpdates: true,
     updateOnMetered: false
   });
   ```

### Activity Log Recovery

**When to use**: Exercise data lost due to update issues

**Steps**:

1. **Check for data in backup tables**
   ```sql
   SELECT COUNT(*) FROM activity_logs_backup
   WHERE created_at >= 'DEPLOYMENT_DATE';
   ```

2. **Restore activity logs**
   ```sql
   INSERT INTO activity_logs
   SELECT * FROM activity_logs_backup
   WHERE created_at >= 'DEPLOYMENT_DATE';
   ```

## Automated Rollback Procedures

### Health Check Based Rollback

**Setup monitoring that automatically triggers rollback**:

```bash
#!/bin/bash
# health-check-rollback.sh

# Check application health
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/health)

if [ "$HEALTH_STATUS" != "200" ]; then
  echo "Health check failed with status: $HEALTH_STATUS"

  # Trigger automatic rollback
  git checkout LAST_STABLE_COMMIT
  pnpm build:prod
  pm2 restart all

  # Notify team
  curl -X POST "$SLACK_WEBHOOK" -d "{'text': 'Automatic rollback triggered due to health check failure'}"
fi
```

### Database Constraint Based Rollback

**Automatic rollback on constraint violations**:

```sql
-- Create monitoring function
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS void AS $$
DECLARE
  constraint_violations INTEGER;
BEGIN
  -- Check for constraint violations
  SELECT COUNT(*) INTO constraint_violations
  FROM information_schema.constraint_column_usage
  WHERE table_name IN ('app_versions', 'version_audit')
  AND constraint_name LIKE '%_fkey'
  AND table_schema = 'public';

  -- If constraints are missing, trigger alert
  IF constraint_violations < 2 THEN
    RAISE EXCEPTION 'Data integrity compromised - rollback required';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## Rollback Verification Procedures

### Post-Rollback Checklist

- [ ] **Database integrity verified**
  ```sql
  SELECT * FROM pg_stat_user_tables WHERE schemaname = 'public';
  ```

- [ ] **Application functionality tested**
  - [ ] User login/logout works
  - [ ] Exercise tracking functions
  - [ ] Update system disabled/working
  - [ ] Data sync operational

- [ ] **Performance metrics normal**
  - [ ] Response times < 500ms
  - [ ] Error rates < 1%
  - [ ] Database connections stable

- [ ] **Security checks passed**
  - [ ] RLS policies active
  - [ ] Authentication working
  - [ ] API keys valid

- [ ] **User data intact**
  - [ ] User preferences preserved
  - [ ] Exercise data available
  - [ ] No data corruption detected

### Success Criteria

Rollback is considered successful when:

1. **System stability**: No errors for 1 hour post-rollback
2. **User functionality**: All critical paths working
3. **Data integrity**: No data loss or corruption
4. **Performance**: Metrics within normal ranges
5. **Security**: All security measures active

## Post-Rollback Procedures

### Incident Analysis

1. **Document root cause**
   - What went wrong?
   - When did it happen?
   - What was the impact?

2. **Create incident report**
   - Timeline of events
   - Actions taken
   - Lessons learned

3. **Update procedures**
   - Improve deployment process
   - Add additional safeguards
   - Update monitoring

### Team Communication

1. **Immediate notification**
   ```bash
   # Send to team channels
   curl -X POST "$TEAM_WEBHOOK" -d '{
     "text": "Rollback completed successfully. System restored to stable state."
   }'
   ```

2. **Stakeholder update**
   - Notify product owner
   - Update user communication
   - Document in incident log

3. **Post-mortem meeting**
   - Schedule within 24 hours
   - Include all involved parties
   - Focus on prevention

### Recovery Planning

1. **Plan forward fix**
   - Identify root cause
   - Develop proper solution
   - Test in development

2. **Schedule redeployment**
   - Set timeline for fix
   - Plan deployment window
   - Prepare rollback plan

3. **Update documentation**
   - Improve deployment guide
   - Update rollback procedures
   - Enhance monitoring

## Emergency Scripts

### Quick Database Rollback Script

```bash
#!/bin/bash
# emergency-db-rollback.sh

set -e

PROJECT_REF="zumzzuvfsuzvvymhpymk"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql>"
  exit 1
fi

echo "WARNING: This will completely reset the database!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
  echo "Resetting database..."
  supabase db reset --project-ref $PROJECT_REF

  echo "Restoring from backup..."
  psql -h db.$PROJECT_REF.supabase.co -d postgres -U postgres < "$BACKUP_FILE"

  echo "Rollback complete!"
else
  echo "Rollback cancelled."
fi
```

### Quick Application Rollback Script

```bash
#!/bin/bash
# emergency-app-rollback.sh

set -e

STABLE_COMMIT="$1"

if [ -z "$STABLE_COMMIT" ]; then
  echo "Usage: $0 <stable-commit-hash>"
  exit 1
fi

echo "Rolling back to commit: $STABLE_COMMIT"

# Checkout stable commit
git checkout $STABLE_COMMIT

# Rebuild application
cd apps/frontend
pnpm install
pnpm build:prod

# Restart services
pm2 restart all

echo "Application rollback complete!"
```

## Testing Rollback Procedures

### Rollback Drill Checklist

Regularly test rollback procedures:

- [ ] **Monthly**: Test Level 1 rollback in development
- [ ] **Quarterly**: Test Level 2 rollback in staging
- [ ] **Annually**: Full disaster recovery drill

### Simulation Scripts

Create test scenarios to validate rollback procedures:

```bash
#!/bin/bash
# rollback-drill.sh

echo "Starting rollback drill..."

# Simulate database corruption
# Test rollback procedures
# Verify recovery

echo "Rollback drill complete!"
```

## Documentation Updates

After any rollback event:

1. **Update this document** with lessons learned
2. **Revise deployment procedures** to prevent recurrence
3. **Enhance monitoring** to catch issues earlier
4. **Improve testing** to catch problems before deployment

---

**Last Updated**: [Date]
**Version**: 1.0
**Reviewed By**: [Name]
**Approved By**: [Name]