# Production Synchronization Tracker - [FEATURE_NAME]

## Overview
This document tracks all database migrations and edge functions that need to be deployed to production for the `[BRANCH_NAME]` feature.

**Feature Description:** [Brief description of the feature being developed]

**Source Commits:**
- `[COMMIT_HASH]` - [Commit description]
- `[COMMIT_HASH]` - [Commit description]
- Add commits as development progresses...

**Status:** 🚧 In Development | ✅ Ready for Production | 🚀 Deployed

---

## 🗄️ Database Migrations Required

### New Migrations (Apply in Order)
```sql
-- List migrations as they are created during development
-- Example:
-- supabase/migrations/YYYYMMDD_feature_name_core.sql
-- supabase/migrations/YYYYMMDD_feature_name_policies.sql
```

### Migration Descriptions

#### [Migration Category 1]
1. **[migration_file_name].sql**
   - **Purpose**: [What this migration does]
   - **Tables**: [Tables created/modified]
   - **Policies**: [RLS policies added/modified]
   - **Critical**: [Yes/No] - [Why it's critical if yes]

2. **[migration_file_name].sql**
   - **Purpose**: [What this migration does]
   - **Tables**: [Tables created/modified]
   - **Policies**: [RLS policies added/modified]
   - **Critical**: [Yes/No] - [Why it's critical if yes]

#### [Migration Category 2]
3. **[migration_file_name].sql**
   - **Purpose**: [What this migration does]
   - **Tables**: [Tables created/modified]
   - **Policies**: [RLS policies added/modified]
   - **Critical**: [Yes/No] - [Why it's critical if yes]

---

## ⚡ Edge Functions to Deploy/Update

### New Edge Functions
```
✅ NEW: [function-name] (v1)
```
- **Purpose**: [What the function does]
- **Authentication**: [JWT required/Anonymous access/etc.]
- **Dependencies**: [Required tables/policies]

### Updated Edge Functions
```
⚠️  UPDATE: [function-name] (v[OLD] → v[NEW]) - [CRITICAL/OPTIONAL]
```
- **[function-name] (v[OLD] → v[NEW])**:
  - **Changes**: [What changed in this update]
  - **Critical**: [Yes/No] - [Why it's critical if yes]
  - **Breaking Changes**: [Yes/No] - [Details if yes]

## 🛠️ Common Issues & Troubleshooting

### CORS Errors
**Symptoms**: `Response to preflight request doesn't pass access control check` in browser console

**Common Causes**:
- Edge function not deployed to production
- Function exists but CORS headers not properly configured
- Function returning non-200 status on OPTIONS request

**Resolution Steps**:
1. **Check function exists**: Use `mcp_supabase-prod_list_edge_functions` to verify deployment
2. **Deploy missing function**: Use `mcp_supabase-prod_deploy_edge_function` to deploy
3. **Verify CORS headers**: Ensure function handles OPTIONS requests properly
4. **Test function directly**: Use Postman/curl to test function endpoint

### Supabase Auth Connection Errors
**Symptoms**: `ERR_CONNECTION_CLOSED` or `Failed to fetch` for `/auth/v1/user` endpoint

**Common Causes**:
- Intermittent network connectivity issues
- Browser cache/service worker conflicts
- Expired or invalid JWT tokens
- Rate limiting on auth endpoints

**Resolution Steps**:
1. **Test connectivity**: `ping [project-ref].supabase.co`
2. **Hard refresh browser**: Ctrl+F5 to clear cache
3. **Clear auth state**: Remove `sb-*` keys from LocalStorage
4. **Reset service worker**: Unregister and re-register PWA
5. **Check Supabase status**: Visit https://status.supabase.com
6. **Wait and retry**: Often resolves automatically within minutes

### Function Version Mismatches
**Symptoms**: Unexpected behavior, missing features, or errors in production vs development

**Resolution Steps**:
1. **Compare versions**: Check dev vs prod function versions
2. **Review changes**: Use git diff to see what changed between versions  
3. **Deploy updates**: Use deployment sequence to update production functions
4. **Verify functionality**: Test updated functions thoroughly

### Database Schema Drift
**Symptoms**: SQL errors, missing columns/tables, policy violations

**Resolution Steps**:
1. **Compare schemas**: Use `mcp_supabase_list_tables` vs `mcp_supabase-prod_list_tables`
2. **Apply missing migrations**: Deploy missing migrations in correct order
3. **Verify policies**: Check RLS policies are correctly applied
4. **Test data access**: Verify application functionality works correctly

---

## 🚨 Production Issues Tracker

### Current Issues
| Issue | Status | Impact | Next Action |
|-------|--------|--------|-------------|
| [Issue description] | 🔴 Active | [High/Medium/Low] | [What needs to be done] |

### Resolved Issues
| Issue | Resolved Date | Resolution | Impact |
|-------|---------------|------------|--------|
| [Issue description] | [YYYY-MM-DD] | [How it was fixed] | [Impact level] |

### Issue Categories
- **🔴 Active**: Currently affecting users
- **🟡 Monitoring**: Being watched but not critical
- **✅ Resolved**: Fixed and verified

---

## � Diagnostic Commands

### Quick Environment Comparison
```bash
# Compare edge functions between environments
mcp_supabase_list_edge_functions          # Development
mcp_supabase-prod_list_edge_functions      # Production

# Compare database tables
mcp_supabase_list_tables                   # Development  
mcp_supabase-prod_list_tables              # Production

# Compare migrations
mcp_supabase_list_migrations               # Development
mcp_supabase-prod_list_migrations          # Production
```

### Function Debugging
```bash
# Get function details
mcp_supabase_get_edge_function(function_slug: "function-name")
mcp_supabase-prod_get_edge_function(function_slug: "function-name")

# Check logs for errors
mcp_supabase-prod_get_logs(service: "edge-function")

# Test function deployment
mcp_supabase-prod_deploy_edge_function(name: "function-name", files: [...])
```

### Database Debugging
```bash
# Check table structure
mcp_supabase-prod_execute_sql("DESCRIBE table_name;")

# Verify RLS policies  
mcp_supabase-prod_execute_sql("SELECT * FROM pg_policies WHERE tablename = 'table_name';")

# Check for missing migrations
mcp_supabase-prod_execute_sql("SELECT version FROM schema_migrations ORDER BY version;")
```

---

### 1. Pre-Deployment Checklist
- [ ] Backup production database
- [ ] Test all migrations on development branch
- [ ] Verify edge function dependencies are met
- [ ] Review RLS policies for security
- [ ] Test feature functionality end-to-end in development
- [ ] Document any breaking changes

### 2. Database Migrations
```bash
# Apply migrations in order (production Supabase project)
# Use MCP tools: mcp_supabase-prod_apply_migration
1. [migration_file_name].sql
2. [migration_file_name].sql
3. [Add more as needed...]
```

### 3. Edge Function Deployments
```bash
# Deploy/update functions using MCP tools: mcp_supabase-prod_deploy_edge_function
# Order by dependencies (core functions first)

# Deploy new functions
supabase functions deploy [function-name] --project-ref zumzzuvfsuzvvymhpymk

# Update existing functions
supabase functions deploy [function-name] --project-ref zumzzuvfsuzvvymhpymk
```

---

## 📋 Template Usage Instructions

1. **Copy this template** for each new feature branch
2. **Replace placeholders** in brackets with actual values
3. **Track migrations** as they are created during development
4. **Update edge function versions** as they are modified
5. **Document testing** as it's completed
6. **Update status** as feature progresses
7. **Use for production deployment** when feature is ready

### File Naming Convention
`[feature-name]-sync-tracker.md`

Example: `user-profiles-sync-tracker.md`, `workout-analytics-sync-tracker.md`