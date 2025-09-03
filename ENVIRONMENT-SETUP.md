# RepCue Environment Setup Guide

## ✅ What Has Been Configured

### 1. **Separate Supabase Projects**
- **Production**: `RepCue` (zumzzuvfsuzvvymhpymk) - https://zumzzuvfsuzvvymhpymk.supabase.co
- **Development**: `repcue-dev` (xwzrsfkzqxdybjrkkkvh) - https://xwzrsfkzqxdybjrkkkvh.supabase.co

### 2. **Environment Files Created**
- `.env.local` - Default development environment (uses dev project)
- `.env.development` - Explicit development environment
- `.env.production` - Production environment

### 3. **Code Changes**
- ✅ Removed hardcoded production credentials from `src/config/supabase.ts`
- ✅ Removed hardcoded URLs from `src/services/syncService.ts`
- ✅ Updated package.json scripts for environment-specific builds
- ✅ Enhanced .gitignore to protect environment files

### 4. **New Scripts Available**
```bash
# Development (uses dev database)
pnpm dev              # Uses development mode by default
pnpm build:dev        # Build for development

# Production (uses prod database)  
pnpm dev:prod         # Dev server with production environment
pnpm build:prod       # Build for production
```

## 🚨 **REQUIRED: Set Up Development Database**

**⚠️ IMPORTANT**: You must apply the database schema to your development project before you can use it.

### Step 1: Apply Database Schema
1. Go to: https://supabase.com/dashboard/project/xwzrsfkzqxdybjrkkkvh/sql
2. Copy and paste the entire contents of `setup-dev-database.sql` 
3. Click "Run" to execute all the schema creation commands

### Step 2: Verify Setup
After applying the schema, test your development environment:

```bash
# Start development server (uses dev database)
pnpm dev

# Visit http://localhost:5173
# Check browser console - should show: xwzrsfkzqxdybjrkkkvh
```

## 🔄 **How to Switch Between Environments**

### During Development
```bash
# Use development database (default)
pnpm dev

# Use production database (for testing)
pnpm dev:prod
```

### For Building/Deployment
```bash
# Build for development
pnpm build:dev

# Build for production (Raspberry Pi deployment)
pnpm build:prod
```

## 🛡️ **Safety Benefits**

✅ **No More Breaking Changes**: Database changes only affect development project
✅ **Safe Testing**: Test user accounts, new features without affecting production
✅ **Isolated Data**: Development data completely separate from production users
✅ **Production Protection**: Hardcoded credentials removed - production requires explicit build

## 🔧 **Development Workflow**

1. **Feature Development**: Use `pnpm dev` (development database)
2. **Database Changes**: Apply to development project first, test thoroughly
3. **Production Deployment**: 
   - Use `pnpm build:prod` 
   - Apply database migrations to production project
   - Deploy to Raspberry Pi

## 📝 **Environment Variables Summary**

### Development (.env.local)
```env
VITE_SUPABASE_URL=https://xwzrsfkzqxdybjrkkkvh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3enJzZmt6cXhkeWJqcmtra3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MzYwMDYsImV4cCI6MjA3MjUxMjAwNn0.Nu0vDoZUaMZ9hL7xhMJtX-Gbfc3z5hZzdgiRcCQH6fw
```

### Production (.env.production)
```env
VITE_SUPABASE_URL=https://zumzzuvfsuzvvymhpymk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bXp6dXZmc3V6dnZ5bWhweW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4OTY3NzEsImV4cCI6MjA3MTQ3Mjc3MX0.WZP6atdKBRqODWqbcAYL03DmB42hTHMTblYeRBQnYbE
```

## 🎯 **Next Steps**

1. ✅ **Apply database schema** using `setup-dev-database.sql`
2. ✅ **Test development environment** with `pnpm dev`
3. ✅ **Implement user-created exercises feature** safely on development
4. ✅ **Test thoroughly** before deploying to production

Your production environment is now completely protected! 🛡️
