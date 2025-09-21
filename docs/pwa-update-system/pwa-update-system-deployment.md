# PWA Update System - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the RepCue PWA Update System to production. The system includes database migrations, edge functions, and frontend components that enable automatic application updates with privacy-first design principles.

## Prerequisites

- Access to both development (xwzrsfkzqxdybjrkkkvh) and production (zumzzuvfsuzvvymhpymk) Supabase projects
- Supabase CLI installed and configured
- Node.js and pnpm installed
- Appropriate permissions for database and edge function deployment

## Architecture Overview

The PWA Update System consists of:

1. **Database Components**:
   - `admin_users` table for managing update permissions
   - `app_versions` table for version tracking and policies
   - `version_audit` table for change auditing
   - RLS policies for privacy and security

2. **Edge Functions**:
   - `check-version` function for client version checking

3. **Frontend Components**:
   - Update notification system
   - Version management scripts
   - Service worker integration

## Deployment Process

### Phase 1: Database Migration Deployment

#### Step 1: Verify Development Environment

```bash
# Connect to development environment
supabase login
supabase link --project-ref xwzrsfkzqxdybjrkkkvh

# Verify all migrations are applied
supabase db status
```

#### Step 2: Review Migration Files

The following migration files must be applied in order:

1. `20250919-02-create-admin-users-table.sql` - Admin users management
2. `20250919-03-create-app-versions-table.sql` - Version tracking
3. `20250919-04-create-version-audit-table.sql` - Audit trail

#### Step 3: Apply Migrations to Production

```bash
# Switch to production environment
supabase link --project-ref zumzzuvfsuzvvymhpymk

# Apply migrations in order
supabase db push

# Verify migration status
supabase db status
```

#### Step 4: Validate Database Schema

```bash
# Check that all tables exist
supabase db check

# Verify RLS policies are active
```

### Phase 2: Edge Function Deployment

#### Step 1: Test Edge Function in Development

```bash
# Switch back to development
supabase link --project-ref xwzrsfkzqxdybjrkkkvh

# Test the check-version function
supabase functions serve check-version

# Test with curl
curl -X POST "http://localhost:54321/functions/v1/check-version" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"current_version": "1.0.0"}'
```

#### Step 2: Deploy to Production

```bash
# Switch to production
supabase link --project-ref zumzzuvfsuzvvymhpymk

# Deploy the check-version function
supabase functions deploy check-version

# Verify deployment
supabase functions list
```

#### Step 3: Test Production Edge Function

```bash
# Test production endpoint
curl -X POST "https://zumzzuvfsuzvvymhpymk.supabase.co/functions/v1/check-version" \
  -H "Authorization: Bearer PROD_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"current_version": "1.0.0"}'
```

### Phase 3: Frontend Deployment

#### Step 1: Build Production Assets

```bash
# In the frontend directory
cd apps/frontend

# Install dependencies
pnpm install

# Build for production
pnpm build:prod
```

#### Step 2: Deploy Frontend

```bash
# Deploy to your hosting platform (e.g., Raspberry Pi, EC2)
# Copy dist/ contents to web server

# For Raspberry Pi deployment:
pnpm run build:prod
pm2 restart ecosystem.config.cjs
```

### Phase 4: Version Management Setup

#### Step 1: Create Initial Version Entry

```bash
# Use the version management script
pnpm version:create 1.0.0 --policy optional --changelog "Initial PWA update system deployment"
```

#### Step 2: Configure Admin Users

```sql
-- Insert admin users (replace with actual user IDs)
INSERT INTO admin_users (user_id, email, permissions, created_by)
VALUES
  ('admin-user-id', 'admin@example.com',
   '{"manage_versions": true, "deploy_updates": true}',
   'system');
```

#### Step 3: Verify Update System

1. Check that the update service initializes correctly
2. Test update checking functionality
3. Verify user preferences are properly stored
4. Test service worker integration

## Post-Deployment Verification

### Database Verification

```sql
-- Check that all tables exist and have correct structure
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('admin_users', 'app_versions', 'version_audit');

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('admin_users', 'app_versions', 'version_audit');

-- Check indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE tablename IN ('admin_users', 'app_versions', 'version_audit');
```

### Edge Function Verification

```bash
# Test version checking
curl -X POST "https://your-project.supabase.co/functions/v1/check-version" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"current_version": "1.0.0"}'

# Expected response format:
# {
#   "update_available": false,
#   "latest_version": "1.0.0",
#   "update_policy": "optional",
#   "changelog": "...",
#   "download_url": null
# }
```

### Frontend Verification

1. **Update Service Health Check**:
   ```javascript
   // In browser console
   console.log('Update Service Health:', updateService.getHealthStatus());
   ```

2. **Service Worker Status**:
   ```javascript
   // Check service worker registration
   navigator.serviceWorker.getRegistration().then(reg => {
     console.log('SW Registration:', reg);
   });
   ```

3. **Update Preferences**:
   ```javascript
   // Verify preferences are loaded
   console.log('Update Preferences:', updateService.getUserPreferences());
   ```

## Configuration Management

### Environment Variables

Ensure the following environment variables are properly configured:

```bash
# Production environment
VITE_SUPABASE_URL=https://zumzzuvfsuzvvymhpymk.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key

# Development environment
VITE_SUPABASE_URL=https://xwzrsfkzqxdybjrkkkvh.supabase.co
VITE_SUPABASE_ANON_KEY=your_development_anon_key
```

### App Configuration

Update the application configuration in `src/config/supabase.ts`:

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

## Security Considerations

1. **RLS Policies**: Ensure all tables have appropriate Row Level Security policies
2. **API Keys**: Use environment-specific API keys for development and production
3. **HTTPS**: Ensure all communications use HTTPS in production
4. **CORS**: Configure appropriate CORS settings for edge functions

## Performance Optimization

1. **Caching**: Implement appropriate caching strategies for version checks
2. **CDN**: Use CDN for static assets if applicable
3. **Service Worker**: Ensure service worker caching is optimized
4. **Database Indexes**: Verify all necessary indexes are in place

## Monitoring and Alerting

1. **Database Metrics**: Monitor table sizes and query performance
2. **Edge Function Metrics**: Track function invocation rates and errors
3. **Frontend Errors**: Monitor client-side errors related to updates
4. **Update Success Rates**: Track successful vs failed update installations

## Next Steps

After successful deployment:

1. Monitor system performance for 24-48 hours
2. Test update scenarios with different user configurations
3. Verify privacy compliance with GDPR requirements
4. Set up automated monitoring and alerting
5. Create operational runbooks for common scenarios

## Related Documentation

- [Migration Checklist](./pwa-update-system-migration-checklist.md)
- [Troubleshooting Guide](./pwa-update-system-troubleshooting.md)
- [Rollback Procedures](./pwa-update-system-rollback.md)