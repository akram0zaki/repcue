# RepCue Static Hosting Guide

## Overview

RepCue is excellently architected for static hosting deployment. The application is designed as a **privacy-first, offline-first PWA** that can run completely without a backend server, making it perfect for static hosting platforms.

## Can RepCue Run on Static Hosting?

**✅ YES** - The application can run completely on static page hosting without Express.

## Current Architecture

RepCue uses a local-first architecture where:

- **All data storage** happens locally in IndexedDB using Dexie
- **Core functionality** (timer, exercises, workouts) works 100% offline
- **Optional features** (auth, sync) communicate directly with Supabase
- **No custom backend API** required

### Express Server Current Role

The current Express server only provides:

1. **Static file serving** → Replaceable by static hosting
2. **Health check endpoint** (`/health`) → Optional, for monitoring only
3. **SPA routing fallback** → Handled by static hosting configurations
4. **Security headers** → Configurable in hosting provider settings
5. **Compression** → Handled automatically by static hosts

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

## Recommended Static Hosting Providers

### Tier 1 - Perfect Matches

**Vercel**
- ✅ Automatic SPA routing
- ✅ Excellent PWA support
- ✅ Environment variable management
- ✅ Global CDN
- ✅ HTTPS by default

**Netlify**
- ✅ Built-in SPA redirects
- ✅ Great React app support
- ✅ Form handling (if needed later)
- ✅ Branch previews
- ✅ Edge functions support

**Cloudflare Pages**
- ✅ Fast global CDN
- ✅ SPA routing support
- ✅ Excellent performance
- ✅ DDoS protection
- ✅ Free tier with generous limits

### Tier 2 - Also Suitable

**GitHub Pages**
- ✅ Free hosting
- ✅ SPA routing support
- ✅ Custom domains
- ⚠️ Public repos only (free tier)

**Firebase Hosting**
- ✅ Google infrastructure
- ✅ SPA configuration
- ✅ SSL certificates
- ✅ Performance monitoring

**AWS S3 + CloudFront**
- ✅ Highly scalable
- ✅ Full control
- ⚠️ More complex setup
- ⚠️ Requires AWS knowledge

## Configuration for Static Hosting

### 1. Build Configuration

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

#### Netlify
Create `apps/frontend/public/_redirects`:
```
/*    /index.html   200
```

#### Vercel
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

### Option 1: Netlify (Recommended)

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

### Option 2: Vercel

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

### Option 3: GitHub Pages

1. **Create Deploy Action**
   Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [ main ]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: 18
         - run: npm install -g pnpm
         - run: pnpm install
         - run: cd apps/frontend && pnpm build:prod
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: apps/frontend/dist
   ```

## Configuration Changes Needed

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

## What You Lose vs Express

| Feature | Express | Static Hosting | Mitigation |
|---------|---------|----------------|------------|
| Health Check | `/health` endpoint | ❌ | Use hosting provider monitoring |
| Custom Headers | Middleware | ✅ | Configure in hosting settings |
| Compression | Express middleware | ✅ | Automatic in most hosts |
| Custom API | Possible | ❌ | Use Supabase Edge Functions |
| Server Logs | Console output | ❌ | Use hosting analytics |

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

1. **Routes not working** - Ensure SPA routing is configured
2. **Environment variables missing** - Set them in hosting provider
3. **PWA not installing** - Verify HTTPS and manifest.json
4. **Assets not loading** - Check public directory structure
5. **Supabase errors** - Verify environment variables and CORS settings

### Debug Steps

1. Check browser console for errors
2. Verify all environment variables are set
3. Test offline functionality
4. Validate service worker registration
5. Check network tab for failed requests
