---
applyTo: '*'
description: "Comprehensive Supabase database migration and environment synchronization instructions for AI agents."
---

# Supabase Migration and Environment Synchronization Instructions

## Environment Setup

RepCue uses dual Supabase environments with specific MCP server configurations:

- **Development**: Project `repcue-dev` (xwzrsfkzqxdybjrkkkvh) - accessed via `mcp_supabase_*` tools
- **Production**: Project `RepCue` (zumzzuvfsuzvvymhpymk) - accessed via `mcp_supabase-prod_*` tools

## Critical Migration Principles

### 🚨 NEVER Assume Environment Parity
Always verify that production and development environments are synchronized before making changes. Production can lag significantly behind development in both database schema and edge functions.

### 🔄 Environment Synchronization Workflow

1. **Before Any Major Feature Work**:
   ```
   - Compare database schemas between dev and prod
   - Compare edge function versions between environments
   - Apply any missing migrations to production
   - Deploy any outdated edge functions to production
   ```

2. **During Development**:
   ```
   - Always work in development environment first
   - Test all database changes thoroughly
   - Document migration dependencies
   ```

3. **Before Production Deployment**:
   ```
   - Verify all migrations are applied to production
   - Verify all edge functions are up-to-date in production
   - Test critical functionality in production environment
   ```

## Database Migration Management

### Schema Comparison Tools
Use these MCP tools to compare environments:

**Development Environment**:
```
mcp_supabase_list_tables
mcp_supabase_list_migrations
mcp_supabase_execute_sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
```

**Production Environment**:
```
mcp_supabase-prod_list_tables
mcp_supabase-prod_list_migrations
mcp_supabase-prod_execute_sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
```

### Migration Application Process

1. **Identify Missing Migrations**:
   - Compare migration lists between environments
   - Look for gaps in version numbers or missing files

2. **Apply Migrations to Production**:
   ```
   mcp_supabase-prod_apply_migration(
     name: "descriptive-migration-name",
     query: "SQL content from development migration"
   )
   ```

3. **Verify Migration Success**:
   - Re-run table and migration lists
   - Test affected functionality
   - Check for any constraint or policy issues

### Emergency Schema Recreation

In cases of significant drift, you may need to recreate production schema from development:

1. **Export Development Schema**:
   ```sql
   -- Use pg_dump equivalent or export via Supabase dashboard
   -- Include tables, constraints, RLS policies, triggers
   ```

2. **Create Comprehensive Migration**:
   ```sql
   -- Example: recreate-production-from-dev-schema.sql
   -- Drop existing structures (if safe)
   -- Recreate all tables, indexes, constraints
   -- Apply RLS policies
   -- Set up triggers and functions
   ```

3. **Apply with Extreme Caution**:
   - Backup production data first
   - Apply during maintenance window
   - Verify all functionality post-migration

## Edge Function Synchronization

### Function Version Comparison

**Development Functions**:
```
mcp_supabase_list_edge_functions
```

**Production Functions**:
```
mcp_supabase-prod_list_edge_functions
```

### Critical Functions to Monitor

1. **sync_v2**: Core data synchronization engine
   - Handle version conflicts carefully
   - Major version differences indicate significant changes

2. **share-exercise**: Exercise sharing functionality
   - Rate limiting and security updates are critical

3. **get-shared-exercise**: Shared exercise retrieval
   - Security and validation logic updates essential

4. **webauthn-***: Authentication functions
   - Security updates must be deployed immediately

### Function Deployment Process

1. **Retrieve Latest Function Code** (from development):
   ```
   mcp_supabase_get_edge_function(function_slug: "function-name")
   ```

2. **Deploy to Production**:
   ```
   mcp_supabase-prod_deploy_edge_function(
     name: "function-name",
     files: [
       {
         name: "index.ts",
         content: "function code from development"
       }
     ]
   )
   ```

3. **Verify Deployment**:
   - Check function version increased
   - Test function functionality
   - Monitor logs for errors

## Security Considerations

### Database Security
- Always use parameterized queries in migrations
- Never hardcode sensitive data in migrations
- Maintain RLS policies during schema changes
- Test permission systems after major migrations

### Function Security
- Validate JWT tokens in all authenticated functions
- Implement rate limiting for public functions
- Sanitize all user inputs
- Use environment variables for secrets

## Common Pitfalls and Solutions

### Migration Issues

**Problem**: Migration fails due to data constraints
**Solution**: 
- Add data migration steps before schema changes
- Use conditional logic for optional updates
- Implement rollback procedures

**Problem**: RLS policies block legitimate access
**Solution**:
- Test policies with different user roles
- Verify auth.uid() availability in contexts
- Check policy conditions thoroughly

### Function Issues

**Problem**: Function versions severely out of sync
**Solution**:
- Compare function lists first
- Deploy critical security functions immediately
- Test integration points after updates

**Problem**: Function deployment fails
**Solution**:
- Check for syntax errors in TypeScript
- Verify import paths and dependencies
- Review Deno runtime compatibility

## Automation Recommendations

### Pre-Flight Checks
Before any major work, AI agents should:

1. Run environment comparison
2. List any discrepancies
3. Recommend synchronization actions
4. Wait for user approval before proceeding

### Continuous Monitoring
Regular checks should include:

1. Weekly environment comparison reports
2. Function version drift monitoring
3. Migration status verification
4. Security update identification

## Documentation Requirements

### Migration Documentation
Every migration must include:

- Purpose and scope of changes
- Dependencies on other migrations
- Rollback procedures (if applicable)
- Testing requirements
- Impact on existing data

### Function Documentation
Function updates must document:

- Version changes and new features
- Security implications
- Breaking changes
- Integration impact

## Emergency Procedures

### Production Data Loss Prevention
- Always backup before major migrations
- Test migrations in development first
- Use transaction blocks for related changes
- Implement point-in-time recovery plans

### Rollback Procedures
- Document rollback steps for each migration
- Test rollback procedures in development
- Maintain database backups before changes
- Have communication plan for users

## Tools and Commands Reference

### Essential MCP Commands

**Environment Comparison**:
```
mcp_supabase_list_tables vs mcp_supabase-prod_list_tables
mcp_supabase_list_migrations vs mcp_supabase-prod_list_migrations
mcp_supabase_list_edge_functions vs mcp_supabase-prod_list_edge_functions
```

**Schema Operations**:
```
mcp_supabase-prod_apply_migration(name, query)
mcp_supabase-prod_execute_sql(query)
```

**Function Operations**:
```
mcp_supabase_get_edge_function(function_slug)
mcp_supabase-prod_deploy_edge_function(name, files)
```

**Monitoring**:
```
mcp_supabase-prod_get_logs(service)
mcp_supabase-prod_get_advisors(type)
```

## Best Practices Summary

1. **Always compare environments before making changes**
2. **Test all migrations in development first**
3. **Deploy security updates immediately**
4. **Document all changes thoroughly**
5. **Verify functionality after synchronization**
6. **Monitor for drift regularly**
7. **Maintain rollback procedures**
8. **Use transaction blocks for related changes**
9. **Backup before major operations**
10. **Communicate changes to stakeholders**

Remember: Production environment synchronization is critical for feature parity and user experience. Never assume environments are in sync - always verify and document the current state.