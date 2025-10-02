# Environment Configuration Guide

RepCue uses multiple environment configurations to support different stages of development and deployment. This guide explains how each environment is configured, how to switch between them, and what scripts to run.

## Environment Overview

| Environment | Supabase Project | Project URL | Purpose |
|-------------|------------------|-------------|---------|
| **Development** | `repcue-dev` (xwzrsfkzqxdybjrkkkvh) | https://xwzrsfkzqxdybjrkkkvh.supabase.co | Active development, testing new features |
| **Production** | `RepCue` (zumzzuvfsuzvvymhpymk) | https://zumzzuvfsuzvvymhpymk.supabase.co | Live application for end users |

## Environment Files

All environment files are located in `apps/frontend/` directory:

### `.env.development`
- **Project**: `repcue-dev` (xwzrsfkzqxdybjrkkkvh.supabase.co)
- **Used when**: Running `pnpm dev` (Vite development server)
- **Purpose**: Local development with development database

### `.env.production`
- **Project**: `RepCue` (zumzzuvfsuzvvymhpymk.supabase.co)
- **Used when**: Building for production with `pnpm build:prod`
- **Purpose**: Production builds and deployment

### `.env.local`
- **Project**: Currently points to `repcue-dev` 
- **Used when**: Local overrides (highest priority)
- **Purpose**: Developer-specific local settings

### `.env` (Default)
- **Project**: Currently points to production (`RepCue`)
- **Used when**: Fallback when no specific environment is set
- **Purpose**: Base configuration

### `.env.example`
- **Project**: Template file
- **Purpose**: Example configuration for new developers

## Environment Priority

Vite loads environment files in this priority order (highest to lowest):

1. `.env.local` (always loaded, ignored by git)
2. `.env.development` / `.env.production` (based on NODE_ENV)
3. `.env`

## Development Workflows

### Local Development (Development Database)

```powershell
# Start development server with development database
pnpm dev

# Run tests against development environment
pnpm test

# Lint code
pnpm lint

# Type check
pnpm exec tsc --noEmit
```

**Environment Used**: `.env.development` → `repcue-dev` project

### Building for Development Deployment

```powershell
# Build using development environment
pnpm build:dev

# Serve the built app locally
pnpm build:serve
```

**Environment Used**: `.env.development` → `repcue-dev` project

### Production Build and Deployment

```powershell
# Build for production
pnpm build:prod

# Deploy to Raspberry Pi (from Pi)
pnpm pm2:start

# Or restart if already running
pnpm pm2:restart
```

**Environment Used**: `.env.production` → `RepCue` project

## Switching Environments

### Method 1: Use Dedicated Scripts (Recommended)

```powershell
# Development
pnpm dev              # Uses .env.development (repcue-dev)
pnpm build:dev        # Uses .env.development (repcue-dev)

# Production  
pnpm dev:prod         # Uses .env.production (RepCue)
pnpm build:prod       # Uses .env.production (RepCue)
```

### Method 2: Environment Variable Override

```powershell
# Force production environment in dev server
$env:NODE_ENV="production"; pnpm dev

# Force development environment in build
$env:NODE_ENV="development"; pnpm build
```

### Method 3: Modify .env.local

Create or edit `apps/frontend/.env.local`:

```bash
# For development database
VITE_SUPABASE_URL=https://xwzrsfkzqxdybjrkkkvh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3enJzZmt6cXhkeWJqcmtra3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MzYwMDYsImV4cCI6MjA3MjUxMjAwNn0.Nu0vDoZUaMZ9hL7xhMJtX-Gbfc3z5hZzdgiRcCQH6fw

# For production database
VITE_SUPABASE_URL=https://zumzzuvfsuzvvymhpymk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bXp6dXZmc3V6dnZ5bWhweW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4OTY3NzEsImV4cCI6MjA3MTQ3Mjc3MX0.WZP6atdKBRqODWqbcAYL03DmB42hTHMTblYeRBQnYbE
```

## Verification Steps

### Check Current Environment

1. **During Development**:
   ```powershell
   pnpm dev
   # Open http://localhost:5173
   # Open browser DevTools (F12) → Network tab
   # Look for requests to supabase.co - check the project ID in URL
   ```

2. **Via Environment Variables**:
   ```powershell
   # Check what Vite will load
   echo $env:VITE_SUPABASE_URL
   
   # Or check the build output
   pnpm build:dev
   # Look at the build logs for environment info
   ```

3. **Direct Database Query**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select the active project
   - Run: `SELECT current_database(), current_user;`

### Verify Project Access

#### Development Project (repcue-dev)
- **URL**: https://supabase.com/dashboard/project/xwzrsfkzqxdybjrkkkvh
- **Should have**: All tables including `feature_flags`, `exercise_shares`, etc.
- **Use for**: Development, testing, feature work

#### Production Project (RepCue)  
- **URL**: https://supabase.com/dashboard/project/zumzzuvfsuzvvymhpymk
- **Should have**: Production data and schema
- **Use for**: Production builds, live deployment

## Database Schema Synchronization

### Development to Production Sync

When you add new features to development:

1. **Test in Development**:
   ```powershell
   pnpm dev  # Uses repcue-dev
   # Test your changes thoroughly
   ```

2. **Create Migration Script**:
   ```sql
   -- Example: Add new table
   CREATE TABLE new_feature (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **Apply to Production**:
   - Go to production Supabase project
   - Run migration in SQL editor
   - Test with `pnpm dev:prod`

### Production to Development Sync

If production has changes that development needs:

1. **Export production schema**:
   ```bash
   # From Supabase dashboard, use backup/export tools
   ```

2. **Apply to development**:
   - Import schema to repcue-dev project
   - Update local development database

## SMTP Configuration

Each environment can have different SMTP settings for email:

### Development SMTP
```bash
SMTP_HOST=smtp.zoho.com
SMTP_FROM="RepCue Dev <dev@example.com>"
```

### Production SMTP  
```bash
SMTP_HOST=smtp.zoho.com
SMTP_FROM="RepCue <noreply@repcue.me>"
```

## Best Practices

### For Developers

1. **Always use development environment for feature work**:
   ```powershell
   pnpm dev  # Not pnpm dev:prod
   ```

2. **Test production builds before deployment**:
   ```powershell
   pnpm build:prod
   pnpm preview
   ```

3. **Keep .env.local for personal overrides**:
   - Never commit `.env.local` to git
   - Use for local database connections, API keys, etc.

### For Deployment

1. **Development deployment** (staging server):
   ```powershell
   pnpm build:dev
   # Deploy to staging environment
   ```

2. **Production deployment** (live server):
   ```powershell
   pnpm build:prod  
   # Deploy to Raspberry Pi or EC2
   pnpm pm2:start
   ```

### For Database Changes

1. **Always test in development first**
2. **Create migration scripts for production**
3. **Backup production before major schema changes**
4. **Use Supabase migration tools when available**

## Troubleshooting

### Wrong Database Connected

**Symptoms**: Changes not appearing, different data than expected

**Solution**: Check environment files and current NODE_ENV:
```powershell
echo $env:NODE_ENV
# Should be 'development' for dev, 'production' for prod
```

### Environment Variables Not Loading

**Symptoms**: App fails to start, "Missing Supabase environment variables" error

**Solutions**:
1. Check file exists: `apps/frontend/.env.development`
2. Verify file format (no spaces around =)
3. Restart development server
4. Check file permissions

### Build Using Wrong Environment

**Symptoms**: Production build connects to development database

**Solution**: Use correct build script:
```powershell
pnpm build:prod    # For production
pnpm build:dev     # For development
```

### Database Schema Mismatch

**Symptoms**: App errors, missing tables/columns

**Solution**: 
1. Check which project you're connected to
2. Run appropriate migration scripts
3. Verify schema in Supabase dashboard

## Security Notes

- **Never commit** actual API keys or passwords to git
- **Use different keys** for development and production
- **Rotate keys regularly**, especially production keys
- **Limit permissions** on anon keys appropriately
- **Use .env.local** for sensitive local development settings