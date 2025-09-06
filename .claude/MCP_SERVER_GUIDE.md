# MCP Server Configuration Guide

## 🚨 CRITICAL: Always Use the Correct MCP Server!

### Available MCP Servers:

1. **`supabase`** → **Production** project "RepCue"
   - URL: `https://zumzzuvfsuzvvymhpymk.supabase.co`
   - Use for: Production data queries, production issues

2. **`supabase-dev`** → **Development** project "repcue-dev"  
   - URL: `https://xwzrsfkzqxdybjrkkkvh.supabase.co`
   - Use for: Development work, testing, current workspace issues

### 🎯 Current Workspace Context:
- **Frontend is pointing to**: `repcue-dev` (development)
- **Always use**: `mcp__supabase-dev__*` functions
- **NOT**: `mcp__supabase__*` functions

### Function Name Patterns:
```
✅ CORRECT (for current dev work):
- mcp__supabase-dev__execute_sql
- mcp__supabase-dev__list_tables  
- mcp__supabase-dev__get_project_url

❌ WRONG (points to production):
- mcp__supabase__execute_sql
- mcp__supabase__list_tables
- mcp__supabase__get_project_url
```

## 🔍 Quick Verification:
Always run `mcp__supabase-dev__get_project_url` first to confirm you're on the right project!