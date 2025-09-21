# PWA Update System - Migration Checklist

## Pre-Migration Checklist

### Environment Preparation

- [ ] **Verify Supabase CLI installation and version**
  ```bash
  supabase --version
  # Should be >= 1.0.0
  ```

- [ ] **Confirm access to both environments**
  - [ ] Development: `xwzrsfkzqxdybjrkkkvh`
  - [ ] Production: `zumzzuvfsuzvvymhpymk`

- [ ] **Backup production database**
  ```bash
  supabase db dump --project-ref zumzzuvfsuzvvymhpymk > backup-$(date +%Y%m%d-%H%M%S).sql
  ```

- [ ] **Test development environment functionality**
  - [ ] All existing features working
  - [ ] Update system components functional
  - [ ] Edge functions responding correctly

### Code Review

- [ ] **Review migration files for syntax errors**
  ```bash
  # Check each migration file
  cat supabase/migrations/20250919-02-create-admin-users-table.sql
  cat supabase/migrations/20250919-03-create-app-versions-table.sql
  cat supabase/migrations/20250919-04-create-version-audit-table.sql
  ```

- [ ] **Verify migration order and dependencies**
  - [ ] Admin users table created first
  - [ ] App versions table references admin users
  - [ ] Version audit table references app versions

- [ ] **Check for potential breaking changes**
  - [ ] No existing table modifications
  - [ ] New columns are nullable or have defaults
  - [ ] RLS policies don't conflict with existing data

## Migration Execution Checklist

### Phase 1: Database Schema Migration

- [ ] **Connect to production environment**
  ```bash
  supabase link --project-ref zumzzuvfsuzvvymhpymk
  ```

- [ ] **Check current migration status**
  ```bash
  supabase db status
  ```

- [ ] **Apply migrations in order**
  ```bash
  supabase db push
  ```

- [ ] **Verify migration success**
  ```bash
  supabase db status
  # All migrations should show as applied
  ```

### Phase 2: Table Structure Verification

- [ ] **Verify admin_users table**
  ```sql
  -- Check table exists and structure
  \d admin_users;

  -- Verify RLS is enabled
  SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'admin_users';

  -- Check policies exist
  SELECT policyname FROM pg_policies WHERE tablename = 'admin_users';
  ```

- [ ] **Verify app_versions table**
  ```sql
  \d app_versions;
  SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'app_versions';
  SELECT policyname FROM pg_policies WHERE tablename = 'app_versions';
  ```

- [ ] **Verify version_audit table**
  ```sql
  \d version_audit;
  SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'version_audit';
  SELECT policyname FROM pg_policies WHERE tablename = 'version_audit';
  ```

### Phase 3: Index and Constraint Verification

- [ ] **Check primary key constraints**
  ```sql
  SELECT conname, contype FROM pg_constraint
  WHERE conrelid::regclass::text IN ('admin_users', 'app_versions', 'version_audit');
  ```

- [ ] **Verify foreign key constraints**
  ```sql
  SELECT conname, contype, confrelid::regclass AS referenced_table
  FROM pg_constraint
  WHERE contype = 'f'
  AND conrelid::regclass::text IN ('app_versions', 'version_audit');
  ```

- [ ] **Check indexes are created**
  ```sql
  SELECT indexname, tablename, indexdef
  FROM pg_indexes
  WHERE tablename IN ('admin_users', 'app_versions', 'version_audit');
  ```

### Phase 4: RLS Policy Verification

- [ ] **Test admin_users RLS policies**
  ```sql
  -- Should only return rows for authenticated admin users
  SET ROLE authenticated;
  SELECT COUNT(*) FROM admin_users;
  RESET ROLE;
  ```

- [ ] **Test app_versions RLS policies**
  ```sql
  -- Should be readable by authenticated users
  SET ROLE authenticated;
  SELECT COUNT(*) FROM app_versions;
  RESET ROLE;
  ```

- [ ] **Test version_audit RLS policies**
  ```sql
  -- Should be readable by admin users only
  SET ROLE authenticated;
  SELECT COUNT(*) FROM version_audit;
  RESET ROLE;
  ```

## Edge Function Migration Checklist

### Phase 1: Function Preparation

- [ ] **Verify check-version function exists**
  ```bash
  ls -la supabase/functions/check-version/
  ```

- [ ] **Test function in development**
  ```bash
  supabase functions serve check-version --no-verify-jwt
  ```

- [ ] **Test function with authentication**
  ```bash
  curl -X POST "http://localhost:54321/functions/v1/check-version" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"current_version": "1.0.0"}'
  ```

### Phase 2: Production Deployment

- [ ] **Deploy to production**
  ```bash
  supabase functions deploy check-version --project-ref zumzzuvfsuzvvymhpymk
  ```

- [ ] **Verify deployment**
  ```bash
  supabase functions list --project-ref zumzzuvfsuzvvymhpymk
  ```

- [ ] **Test production function**
  ```bash
  curl -X POST "https://zumzzuvfsuzvvymhpymk.supabase.co/functions/v1/check-version" \
    -H "Authorization: Bearer $PROD_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"current_version": "1.0.0"}'
  ```

## Data Migration Checklist

### Initial Data Setup

- [ ] **Create initial admin user entries**
  ```sql
  INSERT INTO admin_users (user_id, email, permissions, created_by)
  VALUES ('admin-uuid', 'admin@example.com',
          '{"manage_versions": true, "deploy_updates": true}', 'system');
  ```

- [ ] **Create initial version entry**
  ```sql
  INSERT INTO app_versions (
    version_number, build_number, release_date,
    update_policy, changelog, git_commit_hash,
    reviewer, is_active
  ) VALUES (
    '1.0.0', '1-initial', NOW(),
    'optional', 'Initial PWA update system deployment',
    'commit-hash', 'admin-uuid', true
  );
  ```

- [ ] **Verify data integrity**
  ```sql
  SELECT COUNT(*) FROM admin_users;
  SELECT COUNT(*) FROM app_versions;
  SELECT COUNT(*) FROM version_audit;
  ```

## Post-Migration Verification Checklist

### Database Health Check

- [ ] **Run database health check**
  ```bash
  supabase db check --project-ref zumzzuvfsuzvvymhpymk
  ```

- [ ] **Check for orphaned data**
  ```sql
  -- Check for app_versions without valid reviewers
  SELECT * FROM app_versions av
  LEFT JOIN admin_users au ON av.reviewer = au.user_id
  WHERE au.user_id IS NULL;
  ```

- [ ] **Verify data consistency**
  ```sql
  -- Check audit trail integrity
  SELECT av.version_number, COUNT(va.id) as audit_count
  FROM app_versions av
  LEFT JOIN version_audit va ON av.id = va.version_id
  GROUP BY av.version_number;
  ```

### Application Integration Test

- [ ] **Test frontend update service initialization**
  - [ ] Service worker loads correctly
  - [ ] Update service connects to database
  - [ ] Health status reports correctly

- [ ] **Test version checking functionality**
  - [ ] Version check API responds
  - [ ] User preferences are respected
  - [ ] Update notifications work

- [ ] **Test admin functionality**
  - [ ] Version creation works
  - [ ] Version management scripts function
  - [ ] Audit logging operates correctly

### Performance Verification

- [ ] **Check query performance**
  ```sql
  EXPLAIN ANALYZE SELECT * FROM app_versions
  WHERE is_active = true
  ORDER BY release_date DESC
  LIMIT 1;
  ```

- [ ] **Monitor edge function response times**
  ```bash
  time curl -X POST "https://zumzzuvfsuzvvymhpymk.supabase.co/functions/v1/check-version" \
    -H "Authorization: Bearer $PROD_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"current_version": "1.0.0"}'
  ```

- [ ] **Verify caching behavior**
  - [ ] Repeated requests are cached appropriately
  - [ ] Cache invalidation works correctly

## Rollback Preparation Checklist

- [ ] **Document current production state**
  ```bash
  # Save current migration status
  supabase db status > pre-migration-status.txt

  # Save current function list
  supabase functions list > pre-migration-functions.txt
  ```

- [ ] **Prepare rollback scripts**
  - [ ] Drop table scripts ready
  - [ ] Function removal commands prepared
  - [ ] Database restore procedure documented

- [ ] **Test rollback procedure in development**
  - [ ] Verify rollback scripts work
  - [ ] Confirm no data loss occurs
  - [ ] Test application functionality post-rollback

## Sign-off Checklist

- [ ] **Technical lead approval**
  - [ ] Database schema review completed
  - [ ] Edge function implementation approved
  - [ ] Security review passed

- [ ] **QA verification**
  - [ ] All functionality tested
  - [ ] Performance benchmarks met
  - [ ] No regressions identified

- [ ] **DevOps approval**
  - [ ] Monitoring configured
  - [ ] Backup procedures verified
  - [ ] Rollback plan approved

- [ ] **Final production deployment authorization**
  - [ ] All stakeholders notified
  - [ ] Maintenance window scheduled
  - [ ] Emergency contacts prepared

## Emergency Contacts

- **Database Administrator**: [Contact Info]
- **DevOps Engineer**: [Contact Info]
- **Technical Lead**: [Contact Info]
- **Product Owner**: [Contact Info]

## Notes Section

_Use this space to document any specific issues encountered during migration or deviations from the standard process:_

---

**Migration Date**: _______________
**Performed By**: _______________
**Reviewed By**: _______________
**Approved By**: _______________