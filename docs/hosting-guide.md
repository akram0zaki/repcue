# RepCue Static Hosting Guide

## Overview

RepCue is deployed as a **privacy-first, offline-first PWA** on **Cloudflare Pages** with **Cloudflare R2** for video storage and **Supabase** for backend services (database, authentication, Edge Functions).

## Current Production Architecture

**Production**: `repcue.me`  
**Preview/Dev**: `dev.repcue.me` / `repcue-dev.pages.dev`

| Component | Service | Notes |
|-----------|---------|-------|
| Static Frontend | Cloudflare Pages | SPA with service worker |
| Video Storage | Cloudflare R2 | `repcue-exercise-videos` bucket |
| Video Proxy | Cloudflare Pages Functions | `/media/*` proxy to R2 |
| Database | Supabase PostgreSQL | User data, exercises, workouts |
| Authentication | Supabase Auth | WebAuthn, Magic Links |
| Backend Functions | Supabase Edge Functions | sync_v2, analyze-progress, etc. |

## Architecture

RepCue uses a local-first architecture where:

- **All data storage** happens locally in IndexedDB using Dexie
- **Core functionality** (timer, exercises, workouts) works 100% offline
- **Optional features** (auth, sync) communicate directly with Supabase
- **No custom backend API** required

### Express Server (Legacy/Development Only)

The Express server (`apps/backend/`) is now **only used for local development** or self-hosting scenarios:

1. **Static file serving** → Handled by Cloudflare Pages in production
2. **Health check endpoint** (`/health`) → Cloudflare provides monitoring
3. **SPA routing fallback** → Handled by `_redirects` file
4. **Security headers** → Configured via Cloudflare
5. **Compression** → Automatic via Cloudflare

## Features That Work Without Server

### ✅ Complete Offline Functionality
- Exercise tracking and timer functionality
- Local data persistence via IndexedDB/Dexie
- All user preferences and settings
- Workout creation and management

### ✅ PWA Capabilities
- Service worker registration and caching
- Web App Manifest for installability
- Offline-first caching strategies
- Background sync (when online)

### ✅ Static Assets
- Exercise demo videos from `/public/videos/`
- Exercise metadata from `/exercise_media.json`
- Internationalization files from `/locales/`
- App icons and splash screens

### ✅ Authentication & Sync (Optional)
- Anonymous usage works 100% without authentication
- Supabase authentication via client-side SDK
- Data synchronization via Supabase Edge Functions
- No custom backend API endpoints required

## Hosting Providers

### Current Production: Cloudflare Pages (✅ In Use)

**Why Cloudflare Pages:**
- ✅ Fast global CDN with edge locations
- ✅ Native R2 integration for video storage
- ✅ Pages Functions for serverless proxy (`/media/*`)
- ✅ Automatic SPA routing via `_redirects`
- ✅ Built-in DDoS protection
- ✅ Free tier with generous limits
- ✅ Preview deployments for PRs
- ✅ Environment-specific builds (production/preview)

### Alternative Providers (For Self-Hosting)

**Vercel**
- ✅ Automatic SPA routing
- ✅ Excellent PWA support
- ✅ Environment variable management
- ✅ Global CDN
- ⚠️ Would require separate video hosting solution

**Netlify**
- ✅ Built-in SPA redirects
- ✅ Great React app support
- ✅ Branch previews
- ⚠️ Would require separate video hosting solution

**Self-Hosted (Raspberry Pi / VPS)**
- ✅ Full control
- ✅ PM2 + nginx setup documented
- ✅ Cloudflare Tunnel for SSL
- ⚠️ More complex maintenance
- ⚠️ See `README.md` for Pi deployment guide

## Configuration for Cloudflare Pages

### 1. Wrangler Configuration

The `wrangler.toml` in the project root configures Cloudflare Pages:

```toml
name = "repcue"
compatibility_date = "2025-11-01"
pages_build_output_dir = "apps/frontend/dist"

# R2 Bucket binding for exercise demo videos
[[r2_buckets]]
binding = "VIDEOS"
bucket_name = "repcue-exercise-videos"
preview_bucket_name = "repcue-exercise-videos"

[env.production]
name = "repcue"

[env.preview]
name = "repcue-dev"
```

### 2. Build Configuration

The current build process already generates static files:

```bash
pnpm build:prod
```

This creates a `dist/` folder with all static assets.

### 2. Environment Variables

Ensure these are available at build time:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. SPA Routing Configuration

#### Cloudflare Pages (Current Production)
The `apps/frontend/public/_redirects` file handles SPA routing:
```
# Serve actual files directly
/assets/*  200
/legal/*   200
/locales/* 200
/videos/*  200
/splash/*  200
/icons/*   200
/exercise_media.json  200
/legal/manifest.json  200

# Serve all other routes through index.html for SPA routing
/*  /index.html  200
```

#### Alternative: Vercel
Create `apps/frontend/vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### Alternative: Netlify
Create `apps/frontend/public/_redirects`:
```
/*    /index.html   200
```

#### Apache
Create `apps/frontend/public/.htaccess`:
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QR,L]
```

#### Nginx
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 4. Security Headers (Optional)

Most static hosts allow custom headers. Example for Netlify in `_headers`:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
```

## Deployment Steps

### Cloudflare Pages (Current Production)

Deployment is automatic via Cloudflare Pages connected to the GitHub repository:

1. **Push to GitHub**
   ```bash
   git push origin main  # Production deployment
   git push origin develop  # Preview deployment
   ```

2. **Cloudflare Pages Settings**
   - Build command: `pnpm build:prod`
   - Build output directory: `apps/frontend/dist`
   - Root directory: `/`
   - Node.js version: 18

3. **Environment Variables** (set in Cloudflare dashboard)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **Pages Functions**
   - `/media/*` proxy to R2 bucket
   - Configured via `functions/media/[[path]].ts`

### Alternative: Manual Deployment with Wrangler

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the app
pnpm build:prod

# Deploy to Cloudflare Pages
wrangler pages deploy apps/frontend/dist --project-name=repcue
```

### Alternative: Vercel

1. **Connect Repository**
   ```bash
   # Push to GitHub/GitLab
   git push origin main
   ```

2. **Configure Build Settings**
   - Build command: `cd apps/frontend && pnpm build:prod`
   - Publish directory: `apps/frontend/dist`
   - Node version: 18+

3. **Set Environment Variables**
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

4. **Deploy**
   - Automatic deployment on git push

### Alternative: Netlify

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd apps/frontend
   vercel --prod
   ```

3. **Configure**
   - Set build command: `pnpm build:prod`
   - Set output directory: `dist`
   - Add environment variables

## Video Storage (R2 Integration)

### R2 Bucket Configuration

Exercise demo videos are stored in Cloudflare R2 and served via a Pages Function proxy:

- **Bucket**: `repcue-exercise-videos`
- **Proxy**: `functions/media/[[path]].ts`
- **URL Pattern**: `/media/{exerciseId}_v1_{width}x{height}_{hash}.{ext}`

### Pages Function Features

- Range request support (HTTP 206) for video seeking
- Immutable cache headers for hashed filenames
- Path validation and sanitization (OWASP A01)
- Content-Type inference
- Fallback from hashed to non-hashed filenames

### Cache Headers

| File Type | Cache-Control |
|-----------|---------------|
| Hashed videos | `public, max-age=31536000, immutable` |
| Non-hashed videos | `public, max-age=3600, must-revalidate` |

## Configuration Changes for Alternative Providers

### 1. Remove Vite Proxy (Optional)

If you want to remove the API proxy from `vite.config.ts`:

```diff
export default defineConfig({
  server: {
    port: 5173,
-   proxy: {
-     '/api': 'http://localhost:3001'
-   }
  },
  // ... rest of config
})
```

### 2. Update Package Scripts

Add static deployment scripts to `apps/frontend/package.json`:

```json
{
  "scripts": {
    "deploy:netlify": "pnpm build:prod && netlify deploy --prod --dir=dist",
    "deploy:vercel": "pnpm build:prod && vercel --prod",
    "preview:static": "pnpm build && pnpm preview"
  }
}
```

## Cloudflare Pages vs Express

| Feature | Express (Self-hosted) | Cloudflare Pages | Notes |
|---------|----------------------|------------------|-------|
| Health Check | `/health` endpoint | ❌ | Use Cloudflare analytics |
| Custom Headers | Middleware | ✅ `_headers` file | Same capability |
| Compression | Express middleware | ✅ Automatic | Better with CDN |
| Custom API | Possible | ✅ Pages Functions | `/media/*` proxy |
| Server Logs | Console output | ✅ Cloudflare dashboard | Better analytics |
| Video Storage | Local filesystem | ✅ R2 bucket | Better scalability |
| SSL | Manual or Tunnel | ✅ Automatic | Managed SSL |

## Performance Considerations

### Advantages of Static Hosting

- **Faster loading** - Files served from CDN edges
- **Better caching** - Aggressive browser and CDN caching
- **Higher reliability** - No server downtime
- **Infinite scaling** - Handle any traffic load
- **Lower costs** - Many free tiers available

### Optimizations

1. **Enable compression** - Most hosts do this automatically
2. **Set cache headers** - For static assets
3. **Optimize images** - Use WebP format where possible
4. **Minimize bundles** - Already configured in Vite

## Testing Static Deployment

Before deploying, test locally:

```bash
# Build the app
cd apps/frontend
pnpm build:prod

# Test with Python (if available)
cd dist
python -m http.server 8000

# Or with Node.js serve
npx serve -s dist -l 8000

# Test PWA functionality at http://localhost:8000
```

## Monitoring and Analytics

### Recommended Tools

- **Netlify Analytics** - Built-in for Netlify
- **Vercel Analytics** - Built-in for Vercel
- **Google Analytics** - Add to app if needed
- **Sentry** - Error tracking for PWAs
- **Lighthouse CI** - Performance monitoring

## Conclusion

RepCue's architecture makes it ideal for static hosting deployment. The local-first design ensures all core functionality works without a backend, while optional features leverage Supabase's infrastructure directly.

**Recommended path**: Deploy to Netlify or Vercel for the best developer experience and performance.

## Troubleshooting

### Common Issues

1. **Routes not working** - Check `_redirects` file is in `public/` directory
2. **Environment variables missing** - Set in Cloudflare Pages dashboard
3. **PWA not installing** - Verify HTTPS and manifest.json accessible
4. **Assets not loading** - Check `_redirects` allows static file paths
5. **Supabase errors** - Verify environment variables and CORS settings
6. **Videos not loading** - Check R2 bucket binding in `wrangler.toml`
7. **R2 upload issues** - See `docs/R2-storage-issues.md` for credential help

### Debug Steps

1. Check browser console for errors
2. Verify all environment variables are set in Cloudflare dashboard
3. Test offline functionality
4. Validate service worker registration
5. Check network tab for failed requests
6. Check Cloudflare Pages deployment logs
7. Verify R2 bucket permissions

### Cloudflare Pages Debugging

```bash
# Check deployment status
wrangler pages deployment list --project-name=repcue

# View build logs
wrangler pages deployment tail --project-name=repcue

# Test Pages Function locally
wrangler pages dev apps/frontend/dist
```

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [RepCue Video System Guide](./video-system.md)
- [RepCue R2 Storage Issues](./R2-storage-issues.md)
- [RepCue Environments Guide](./environments-guide.md)

**Last Updated**: November 30, 2025
