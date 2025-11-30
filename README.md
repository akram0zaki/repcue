# RepCue - Privacy-First Fitness Tracking PWA

RepCue is a modern, privacy-first fitness tracking Progressive Web App (PWA) designed for interval training and exercise logging. Built with React, TypeScript, and Tailwind CSS, it delivers a native-like app experience while being optimized for mobile devices and perfect for self-hosting on Raspberry Pi.

> Want details on the offline-first data layer? See the new **[Sync Architecture (v2)](./docs/sync-system.md)** guide for per-table cursors, conflict resolution, batching, and feature-flag rollout.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (Download from [nodejs.org](https://nodejs.org))
- **pnpm 10+** (Install with: `npm install -g pnpm`)

### Get Running in 3 Steps (monorepo)

```bash
# 1. Clone and navigate to the project
git clone https://github.com/akram0zaki/repcue.git
cd repcue

# 2. Install dependencies at the repo root
pnpm install

# 3. Start the frontend dev server (Vite)
pnpm dev

# (Optional) start backend placeholder server on another terminal
pnpm dev:be
```

**🎉 That's it!**
- Frontend: http://localhost:5173
- Backend (placeholder): http://localhost:3001 (Express, serves FE build in prod)

---

## 📱 What is RepCue?

RepCue is your personal interval training companion that:

- ⏱️ **Interval Timer**: Configurable workout timers (15s, 30s, 60s)
- ⏳ **Pre-Timer Countdown**: Optional 0-10 second countdown before timer starts
- 💪 **87+ Built-in Exercises**: Across multiple catalogs (General Fitness, Pilates, Zumba, Aikido, Women's Health)
- 🏷️ **Multi-Catalog System**: Exercises organized into themed catalogs with smart filtering
- 🎥 **Exercise Demo Videos (Experimental)**: Inline circular instructional loop (feature & setting gated, reduced‑motion aware, fully optional)
- 🤖 **AI Coach**: Intelligent workout insights powered by Mistral AI
- 📊 **Smart Recommendations**: Advanced progression and recovery algorithms
- 📱 **Mobile-First**: Responsive design optimized for phones and tablets
- ♿ **Accessible**: WCAG 2.1 compliant for all users

---

## 🤖 AI Coach - Intelligent Workout Insights

RepCue's AI Coach combines rule-based algorithms with Mistral AI to provide personalized, data-driven coaching insights.

### Features

**📈 Progression Detection**
- Multi-factor analysis of your workout history
- Detects when you're ready for increased reps or sets
- Confidence-scored recommendations (conservative, injury-prevention focused)
- Analyzes: completion rates, plateaus, rest quality, volume trends

**💆 Recovery Recommendations**
- Fatigue scoring system (0-10 scale) based on training patterns
- Detects overtraining risks (consecutive days, volume spikes, muscle overuse)
- Smart rest day recommendations (1-4 days based on fatigue severity)
- Severity levels: Low (info), Medium (caution), High (critical)

**🧠 AI-Enhanced Insights**
- Combines rule-based + AI-powered analysis
- Natural language explanations for all recommendations
- Graceful fallback to rule-based when AI unavailable
- Rate limited (100 requests/day) with 5-minute caching

### How to Enable

1. **Sign In**: AI insights require authentication (Settings → Sign In)
2. **Enable Toggle**: Settings → AI Coach → "Enable AI-Powered Insights"
3. **View Insights**: Navigate to Coach page to see personalized recommendations

### Settings

- **Rate Limit**: 100 AI requests per day (resets at midnight UTC)
- **Caching**: Insights cached for 5 minutes for performance
- **Privacy**: Your data is processed securely and used only to generate insights
- **Fallback**: Always falls back to rule-based insights if AI fails
- **Default**: Opt-in (disabled by default, requires user activation)

### AI Insights vs Rule-Based

| Feature | AI Insights | Rule-Based |
|---------|-------------|------------|
| **Progression** | Context-aware, multi-factor | Volume-based |
| **Recovery** | Fatigue scoring with reasoning | Consecutive days |
| **Motivation** | Personalized messages | Generic encouragement |
| **Availability** | Requires auth + rate limits | Always available |
| **Speed** | ~1-2s (with cache: <100ms) | Instant |
| **Privacy** | Sent to Mistral AI | Local only |

### Technical Details

- **AI Model**: Mistral AI (via Supabase Edge Function)
- **Algorithms**: See `apps/frontend/src/utils/coachingAlgorithms.ts`
- **Service**: `apps/frontend/src/services/insightsService.ts` (452 lines)
- **Testing**: 95/95 tests passing (unit + integration)
- **i18n**: Fully translated across 8 languages

### Troubleshooting

**"Sign in to enable AI-powered insights"**
- You must be authenticated to use AI features
- Go to Settings → Sign In with your account

**"Rate limit exceeded"**
- You've reached the daily limit of 100 requests
- Try again after midnight UTC
- Rule-based insights are still available

**"AI insights unavailable"**
- Network connection issue or Edge Function down
- App automatically falls back to rule-based insights
- Your experience is not degraded

For more details, see [`docs/ai-coach-user-guide.md`](./docs/ai-coach-user-guide.md).

---
- **Disk Space**: ~200MB for dependencies + ~50MB for built app

#### 1. **Verify Node.js Installation**

---

## 🌍 Internationalization (i18n)

## 🌍 Internationalization (i18n)

RepCue supports 8 languages with full RTL support for Arabic:
- **LTR Languages**: English (en), Dutch (nl), German (de), Spanish (es), French (fr), Frisian (fy)
- **RTL Languages**: Arabic (ar), Arabic Egyptian (ar-EG)

### i18n Contributor & Dev Guide
- All UI strings use i18n keys (see `/docs/i18n/key-styleguide.md`).
- To add or update translations:
    1. Edit `public/locales/en/common.json` (or the correct namespace file).
    2. Run `pnpm i18n:scan` to check for missing keys in other locales.
    3. Add translations for all supported languages.
    4. Test in the UI and with `pnpm test`.
- For new languages, mirror the EN structure and add to `supportedLngs` in `src/i18n.ts`.
- See `/docs/i18n/contributing.md` for full process, key naming, and RTL tips.

### i18n Scripts
- `pnpm i18n:scan` — Fails if any EN keys are missing; warns for other locales.
- `pnpm i18n:report` — Reports missing keys but does not fail (for CI stats).

### Docs
- `/docs/i18n/README.md` — Overview
- `/docs/i18n/key-styleguide.md` — Key naming
- `/docs/i18n/contributing.md` — How to add/translate
- `/docs/i18n/rtl.md` — RTL/Arabic tips
- `/docs/i18n/string-inventory.md` — All keys
- `/docs/i18n/screenshots/` — Screenshots for review

---
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 8.x.x or higher
- **Raspberry Pi**: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`

#### 2. **Clone the Repository**
```bash
git clone https://github.com/akram0zaki/repcue.git
cd repcue
```

#### 3. **Install Dependencies**
```bash
pnpm install
```

This installs all required packages including:
- React 19 + React Router for the UI framework
- TypeScript for type safety
- Tailwind CSS for styling
- Vite for fast development and building
- Vitest for testing

## 🏃‍♂️ Running the Application

Frontend dev: `pnpm dev` → http://localhost:5173

Backend dev (optional placeholder): `pnpm dev:be` → http://localhost:3001

### Production Preview
```bash
# Build the frontend app
pnpm build

# Preview the built version (serves http://localhost:4173)
pnpm preview
```
- **URL**: http://localhost:4173
- **Features**: Optimized build, production-like environment
- **Performance**: Full optimization, smaller bundle size

### Available Scripts (root)

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `pnpm dev` | Start frontend dev (Vite) | Daily development |
| `pnpm dev:be` | Start backend dev (Express) | When testing API placeholder |
| `pnpm build` | Build frontend | CI/builds |
| `pnpm preview` | Preview built frontend (4173) | Verify production build |
| `pnpm start` | Start backend (serves FE in prod) | Production start |
| `pnpm pm2:start` | Start PM2 app | Deploy to Pi/server |
| `pnpm pm2:stop` | Stop PM2 app | Stop production app |
| `pnpm pm2:restart` | Restart PM2 app | Update production app |
| `pnpm pm2:logs` | View PM2 logs | Monitor production app |
| `pnpm lint` | Lint frontend | Before committing |
| `pnpm test` | Run unit/integration tests | Development/CI |
| `pnpm test:ui` | Vitest UI | Debugging tests |
| `pnpm test:coverage` | Coverage report | QA |
| `pnpm test:unit` | Unit/integration only | Fast testing |
| `pnpm test:stable` | Stable mode on Windows | Flake-free runs |
| `pnpm test:ci` | CI mode (stable, silent) | CI pipelines |


## 🧪 Testing

RepCue includes comprehensive test coverage across all components.

### Unit/Integration (frontend)
```bash
pnpm test
```

### Test with Coverage Report
```bash
pnpm test:coverage
```

### Interactive Test UI
```bash
pnpm test:ui
```
Opens a web interface for running and debugging tests.

### CI Mode (Stable, Silent)
```bash
pnpm test:ci
```
Runs tests in CI-friendly mode with stable configuration.

### End-to-End (Cypress)
Tests live under `tests/e2e`.

```bash
# Option A: Run Cypress in headless mode
pnpm cypress:run

# Option B: Open Cypress interactive UI
pnpm cypress:open

# Option C: Full E2E with dev server (start-server-and-test)
pnpm test:e2e

# Accessibility tests only
pnpm test:a11y
```

### Test Categories
- **✅ Unit Tests**: Individual components and utilities
- **✅ Integration Tests**: Service layer (StorageService, AudioService, SyncService, etc.)
- **✅ Accessibility Tests**: WCAG 2.1 compliance verification (via cypress-axe)
- **✅ Timer Logic Tests**: Precision timing and state management
- **✅ Video Demo Tests**: E2E coverage for render path, user toggle, reduced‑motion suppression
- **✅ Sync Tests**: Offline-first data synchronization with Supabase
- **✅ i18n Tests**: Translation coverage and RTL layout verification

Run `pnpm test:ci` to see current test results.

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### **Issue**: `pnpm install` fails with permission errors
**Solution**:
```bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $(whoami) ~/.npm

# Or reinstall pnpm
npm install -g pnpm
pnpm install
```

#### **Issue**: Port 5173 already in use
**Solution**:
```bash
# Kill existing process
pkill -f "vite"

# Or use different port
pnpm dev -- --port 3000
```

#### **Issue**: App loads but buttons don't work
**Solution**:
```bash
# Clear browser cache and storage
# In Chrome: F12 → Application → Clear Storage → Clear All

# Restart development server
pnpm dev
```

#### **Issue**: TypeScript errors during build
**Solution**:
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Fix common issues
pnpm lint
```

#### **Issue**: Tests failing
**Solution**:
```bash
# Run tests in verbose mode
pnpm test -- --reporter=verbose

# Clear test cache
pnpm test -- --clearCache
```

#### **Issue**: Audio not working
**Cause**: Browser autoplay policies
**Solution**: 
- Click anywhere on the page first to enable audio
- Check browser sound permissions
- Ensure system volume is up

#### **Issue**: Dark mode not working
**Solution**:
```bash
# Check if Tailwind classes are loading
# Inspect element and look for 'dark:' classes
# Rebuild if necessary
pnpm build
```

#### **Issue**: PM2 application not responding
**Solution**:
```bash
# Check health endpoint
curl http://localhost:3001/health

# Check PM2 status
pm2 status

# View detailed logs
pnpm pm2:logs

# Restart if needed
pnpm pm2:restart
```

### Getting Help

1. **Check Browser Console**: F12 → Console for JavaScript errors
2. **Check Network Tab**: F12 → Network for failed requests
3. **Verify Dependencies**: `npm list` to see installed packages
4. **Restart Everything**: 
   ```bash
   # Full reset
   rm -rf node_modules package-lock.json
   pnpm install
   pnpm dev
   ```

---

## 🚀 PM2 Deployment

RepCue includes full PM2 support for production deployment with an Express server. This is the recommended approach for Raspberry Pi and server deployments.

### Quick PM2 Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Build frontend and start backend via PM2 (serves FE dist)
pnpm pm2:start

# 3. Check status
pm2 status

# 4. View logs
pnpm pm2:logs
```

### Manual PM2 Setup

```bash
# 1. Build the application for production
pnpm build:prod

# 2. Start with PM2
pm2 start ecosystem.config.cjs

# 3. Save PM2 configuration
pm2 save

# 4. Setup auto-start on boot
pm2 startup
```

### PM2 Management Commands

| Command | Purpose |
|---------|---------|
| `pnpm pm2:start` | Build and start application |
| `pnpm pm2:stop` | Stop the application |
| `pnpm pm2:restart` | Restart the application |
| `pnpm pm2:logs` | View application logs |
| `pm2 status` | Check all PM2 processes |
| `pm2 monit` | Real-time monitoring |
| `pm2 save` | Save current configuration |

### PM2 Configuration

The included `apps/backend/ecosystem.config.cjs` is optimized for Raspberry Pi deployment:

- **Single instance** for Pi resource efficiency
- **512MB memory limit** with automatic restart
- **Health monitoring** at `/health` endpoint
- **Automatic daily restart** at 4 AM
- **Comprehensive logging** with timestamps

### Build for Production

```bash
# Build frontend
pnpm build

# Start backend via PM2 (serves apps/frontend/dist)
pnpm pm2:start
```

### Nginx + Cloudflare Tunnel Setup

For production deployment with custom domain:

#### 1. Nginx Configuration
Create `/etc/nginx/sites-available/repcue.conf`:
sudo nano /etc/nginx/sites-available/repcue.conf

```nginx
server {
    listen 80;
    server_name repcue.azprojects.net;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Proxy to PM2 Express server
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        proxy_pass http://localhost:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 2. Enable the Site
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/repcue.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

#### 3. Cloudflare Tunnel Configuration
Add to your `/etc/cloudflared/config.yml`:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/credentials.json

ingress:
  - hostname: repcue.azprojects.net
    service: http://localhost:80
  # Your other services...
  - service: http_status:404
```

Then:
sudo systemctl restart cloudflared

#### 4. Update Cloudflare DNS
Add DNS record in Cloudflare dashboard:
- **Type**: CNAME
- **Name**: repcue
- **Content**: YOUR_TUNNEL_ID.cfargotunnel.com
- **Proxy**: Enabled (Orange cloud)

---

## 🥧 Raspberry Pi Deployment

RepCue is optimized for Raspberry Pi self-hosting. Here's the complete deployment guide:

### Prerequisites
- **Raspberry Pi 4 or 5** (2GB RAM minimum, 4GB+ recommended)
- **Raspberry Pi OS Lite** or full version
- **16GB+ microSD card** (Class 10 or better)
- **Internet connection** for initial setup

### Step 1: Prepare Raspberry Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx for web server
sudo apt install nginx -y

# Install git
sudo apt install git -y
```

### Step 2: Clone and Build RepCue

```bash
# Create app directory
sudo mkdir -p /var/www/repcue
sudo chown pi:pi /var/www/repcue

# Clone repository
cd /var/www/repcue
git clone https://github.com/akram0zaki/repcue.git .

# Install dependencies (this may take 10-15 minutes on Pi)
pnpm install

# Build for production (optimized, skips test compilation)
pnpm build:prod
```

### Step 3: Configure Nginx

Create nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/repcue
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name localhost;
    
    root /var/www/repcue/dist;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_types text/css application/javascript application/json;
    
    # Main app route
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/repcue /etc/nginx/sites-enabled/

# Disable default site
sudo unlink /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 4: Set Up Auto-Start (Optional)

Create systemd service for automatic updates:
```bash
sudo nano /etc/systemd/system/repcue-update.service
```

```ini
[Unit]
Description=RepCue Auto Update
After=network.target

[Service]
Type=oneshot
User=pi
WorkingDirectory=/var/www/repcue
ExecStart=/bin/bash -c 'git pull && pnpm build:prod'

[Install]
WantedBy=multi-user.target
```

Create timer for weekly updates:
```bash
sudo nano /etc/systemd/system/repcue-update.timer
```

```ini
[Unit]
Description=Weekly RepCue Update
Requires=repcue-update.service

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
```

Enable auto-updates:
```bash
sudo systemctl enable repcue-update.timer
sudo systemctl start repcue-update.timer
```

### Step 5: Access Your App

1. **Find your Pi's IP address**:
   ```bash
   hostname -I
   ```

2. **Access RepCue**: Open `http://YOUR_PI_IP` in any browser on your network

3. **Optional - Set up local domain**:
   Add to your router's DNS or `/etc/hosts`:
   ```
   192.168.1.XXX    repcue.local
   ```

### Raspberry Pi Performance Optimization

#### Enable GPU Memory Split (for better performance)
```bash
sudo raspi-config
# Advanced Options → Memory Split → Set to 128
```

#### Monitor Performance
```bash
# Check CPU/Memory usage
htop

# Check nginx status
sudo systemctl status nginx

# Monitor nginx logs
sudo tail -f /var/log/nginx/access.log
```

#### Storage Optimization
```bash
# Check disk usage
df -h

# Clean npm cache if needed
npm cache clean --force

# Remove development dependencies after build
cd /var/www/repcue
npm prune --production
```

### Pi-Specific Features

- **Offline Operation**: RepCue works completely offline once loaded
- **Low Resource Usage**: ~50MB RAM, minimal CPU usage
- **Local Data**: All workout data stays on your Pi
- **Mobile Optimized**: Perfect for phones/tablets on your home network
- **No Internet Required**: After initial setup, works without internet

---

## 🏗️ Development Guide

### Project Structure (monorepo)
```
repcue/
├── apps/
│   ├── frontend/                 # Vite + React + Tailwind (UI)
│   │   ├── src/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── vitest*.config.ts
│   │   └── package.json
│   └── backend/                  # Express + PM2 (serves FE in prod)
│       ├── server.js
│       ├── ecosystem.config.cjs
│       └── package.json
├── packages/
│   └── shared/                   # Shared types/constants (placeholder)
│       ├── src/index.ts
│       └── package.json
├── tests/
│   └── e2e/                      # Cypress E2E workspace
│       ├── cypress/
│       ├── cypress.config.mjs
│       └── package.json
├── docs/
├── .github/
├── package.json                  # npm workspaces (root scripts)
└── CHANGELOG.md
```

### Key Technologies

- **Frontend**: React 19 + TypeScript + Vite 7
- **Styling**: Tailwind CSS v3 + Custom design tokens (`tokens.css`)
- **Routing**: React Router v7
- **Database (Local)**: Dexie.js (IndexedDB wrapper)
- **Database (Cloud)**: Supabase PostgreSQL with Row Level Security
- **Sync**: Custom offline-first sync engine with conflict resolution
- **Testing**: Vitest + React Testing Library + Cypress
- **Audio**: Web Audio API + Speech Synthesis
- **PWA**: VitePWA plugin with Workbox

### Core Components

#### ExerciseSelector
A unified, reusable component for selecting exercises with comprehensive filtering capabilities. Used across TimerPage, CreateWorkoutPage, and EditWorkoutPage.

**Features:**
- **Search**: Real-time exercise search by name and description
- **Catalog Filtering**: Filter by exercise catalogs (default, custom, etc.)
- **Category Filtering**: Filter by exercise categories (core, strength, cardio, etc.)
- **Type Filtering**: Toggle between All, Built-in, Custom, and Shared exercises
- **Favorites**: Quick filter to show only favorite exercises
- **Sorting**: Sort by name, type, or recently added
- **Exclusion**: Optionally exclude exercises (e.g., already added to workout)
- **Persistence**: Optional filter state persistence via localStorage

**Usage Example:**
```tsx
import { ExerciseSelectorModal } from '../components/ExerciseSelector/ExerciseSelectorModal';

<ExerciseSelectorModal
  exercises={exercises}
  selectedExercise={selectedExercise}
  excludeExercises={alreadyAdded}
  onSelectExercise={(exercise) => handleSelect(exercise)}
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Select Exercise"
  showCatalogSelector={true}
  showCategoryFilter={true}
  showTypeFilter={true}
  showFavoritesToggle={true}
  showSearch={true}
  showSort={true}
  persistFilters={true}
  filterStorageKey="my-selector-filters"
/>
```

**Related Files:**
- [ExerciseSelector.tsx](apps/frontend/src/components/ExerciseSelector/ExerciseSelector.tsx) - Main component
- [ExerciseSelectorModal.tsx](apps/frontend/src/components/ExerciseSelector/ExerciseSelectorModal.tsx) - Modal wrapper
- [useExerciseFilter.ts](apps/frontend/src/hooks/useExerciseFilter.ts) - Filtering logic hook

### Development Workflow

1. **Start Development**:
   - Frontend: `pnpm dev`
   - Backend (optional): `pnpm dev:be`

2. **Make Changes**: Edit files in `apps/frontend/src/`

3. **Test Changes**:
   ```bash
   pnpm test
   pnpm lint
   ```

4. **Build & Test**:
   ```bash
   pnpm build && pnpm preview
   ```

5. **Deploy**: Use PM2 (`pnpm pm2:start`) to serve `apps/frontend/dist` via backend

### Environment Variables

- Frontend `.env`: place under `apps/frontend/.env` (Vite reads it by default). Only variables prefixed with `VITE_` are exposed to the client.
- Backend `.env`: when backend features are added, use `apps/backend/.env` with `dotenv`.

### Migration from single‑package repo (checklist)

1) Create branch: `feat/workspaces-reorg`.

2) Move files:
- UI: move `src/`, `public/`, `index.html`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `vitest*.config.ts`, `tsconfig*.json` → `apps/frontend/`.
- Backend: move `server.js`, `ecosystem.config.cjs` → `apps/backend/`.
- Cypress: move `cypress/`, `cypress.config.mjs` → `tests/e2e/`.
- Env: move root `.env` → `apps/frontend/.env` (ensure `VITE_` prefixes).

3) Add workspaces: root `package.json` with `workspaces: ["apps/*","packages/*","tests/e2e"]` and scripts shown above.

4) Update helper scripts to new paths (already wired here): `apps/frontend/scripts/*`.

5) Install and validate:
```bash
pnpm install
pnpm build
pnpm dev          # FE at 5173
pnpm dev:be       # BE at 3001 (optional placeholder)
```

6) PM2 on Pi/server:
```bash
pnpm build
pnpm pm2:start
```

7) Cypress E2E (now at `tests/e2e`):
```bash
pnpm build && pnpm preview   # FE preview at 4173
pnpm cypress:run
```

8) CI (GitHub Actions): switch to workspace install (`pnpm install --frozen-lockfile` or cache), run `pnpm lint && pnpm test && pnpm build` from root.

### Sync architecture

For a deep dive into how data sync works (high‑level and inner workings), plus steps to add new entities to the sync scope, see:

- [Sync Architecture (v2)](docs/sync-system.md)

### Adding New Features

#### New Exercise
1. Edit `src/data/exercises.ts`
2. Add exercise object with required fields
3. Test in Timer page

#### New Page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/components/Navigation.tsx`
4. Write tests in `src/pages/__tests__/`

#### New Service
1. Create service in `src/services/`
2. Follow singleton pattern like existing services
3. Add comprehensive tests
4. Update type definitions if needed

---

## 🔒 Privacy & Security

RepCue is designed with privacy as the top priority:

- **Local-First Storage**: All data stored locally on your device first
- **Optional Cloud Sync**: Sync to Supabase only when signed in and consented
- **No Tracking**: Zero analytics, cookies, or external requests without consent
- **GDPR Compliant**: Full consent management system with versioning
- **Open Source**: Complete transparency in code
- **Self-Hosted Option**: Deploy to your own Raspberry Pi or server

### Robust Consent System
RepCue implements a comprehensive, regulation-compliant consent management system. For detailed information about our privacy implementation, see **[Consent System](docs/consent-system.md)** which covers:

- GDPR/CCPA compliance features
- Consent versioning and migration
- User control and transparency
- Technical implementation details
- Privacy-first design principles

### Data Stored Locally
- Exercise preferences and favorites
- Workout session logs and personal records
- App settings (sound, theme, language)
- User consent preferences
- Cached exercise videos (for offline use)

### Cloud Sync (Optional, Requires Sign-In)
- Exercises sync across devices
- Activity logs with owner validation
- Workouts and workout sessions
- User preferences and settings
- Row Level Security ensures data isolation

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Run the test suite**: `pnpm test`
5. **Check linting**: `pnpm lint`
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Create a Pull Request**

### Code Standards
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- 90%+ test coverage for new features
- Accessibility compliance (WCAG 2.1)
- Mobile-first responsive design

---

## 🎯 Roadmap

### Current Features
- ✅ Core interval timer functionality with configurable durations
- ✅ 87+ exercise library across multiple themed catalogs
- ✅ Multi-catalog system (General Fitness, Pilates, Zumba, Aikido, Women's Health)
- ✅ Exercise demo videos with reduced-motion support
- ✅ Audio feedback and voice announcements
- ✅ Activity logging and tracking with personal records
- ✅ GDPR-compliant privacy controls with consent versioning
- ✅ Mobile-responsive design with 8 languages (including RTL)
- ✅ Dark mode with smooth theme transitions
- ✅ PWA with install prompts and offline capability
- ✅ PM2 production deployment support
- ✅ Supabase backend with offline-first sync
- ✅ AI Coach with Mistral AI integration
- ✅ Workout builder and session management
- ✅ WebAuthn/passkey authentication support

### In Development
- 🔄 Advanced analytics and charts
- 🔄 Achievement and gamification system
- 🔄 AI-powered workout generation
- 🔄 Social features and exercise sharing

### Future Enhancements
- 📋 Workout scheduling with calendar integration
- 🏆 Achievement badges and workout streaks
- 🔊 Custom audio cues and sound packs
- 🔔 Push notifications for workout reminders
- 📊 Detailed progress analytics with charts
- 🤝 Community features and shared workouts

---

## 💡 Support

**RepCue** - Your data, your device, your fitness journey. 🏋️‍♀️💪

For questions, issues, or feature requests, please open an issue on GitHub or check our troubleshooting guide above.

**Built with ❤️ for the privacy-conscious fitness community.**
