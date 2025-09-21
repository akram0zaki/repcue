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

### Edge Functions Status Summary
| Function | Production | Development | Action Required |
|----------|------------|-------------|-----------------|
| [function-name] | ❌ Missing | ✅ v[N] | 🆕 **Deploy New** |
| [function-name] | ⚠️ v[OLD] | ✅ v[NEW] | 🔄 **Update Critical** |
| [function-name] | ✅ v[N] | ✅ v[N] | ✅ **Up to Date** |

---

## 🔄 Deployment Sequence

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