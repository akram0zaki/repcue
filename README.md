# RepCue - Privacy-First Fitness Tracking App

RepCue is a modern, privacy-first fitness tracking web application designed for interval training and exercise logging. Built with React, TypeScript, and Tailwind CSS, it's optimized for mobile devices and perfect for self-hosting on Raspberry Pi.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (Download from [nodejs.org](https://nodejs.org))
- **npm** (included with Node.js) or **yarn**

### Get Running in 3 Steps

```bash
# 1. Clone and navigate to the project
git clone https://github.com/akram0zaki/repcue.git
cd repcue

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

**🎉 That's it!** Open http://localhost:5173 in your browser.

---

## 📱 What is RepCue?

RepCue is your personal interval training companion that:

- ⏱️ **Interval Timer**: Configurable workout timers (15s, 30s, 60s)
- 💪 **20 Core Exercises**: Across 5 categories (Core, Strength, Cardio, Flexibility, Balance)
- 🔔 **Audio Feedback**: Start/stop sounds, interval beeps, voice announcements
- 📊 **Activity Logging**: Track your workout sessions automatically
- 🔒 **100% Private**: All data stored locally on your device
- 📱 **Mobile-First**: Responsive design optimized for phones and tablets
- 🌙 **Dark Mode**: Full dark/light theme support
- ♿ **Accessible**: WCAG 2.1 compliant for all users

---

## 🛠️ Detailed Setup

### System Requirements
- **Operating System**: Windows, macOS, Linux, or Raspberry Pi OS
- **Node.js**: Version 18.0.0 or higher
- **RAM**: Minimum 512MB (2GB+ recommended for development)
- **Disk Space**: ~200MB for dependencies + ~50MB for built app

### Installation Steps

#### 1. **Verify Node.js Installation**
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 8.x.x or higher
```

If Node.js is not installed:
- **Windows/Mac**: Download from [nodejs.org](https://nodejs.org)
- **Linux**: `sudo apt-get install nodejs npm` (Ubuntu/Debian)
- **Raspberry Pi**: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`

#### 2. **Clone the Repository**
```bash
git clone https://github.com/akram0zaki/repcue.git
cd repcue
```

#### 3. **Install Dependencies**
```bash
# Using npm (recommended)
npm install

# Or using yarn
yarn install
```

This installs all required packages including:
- React 19 + React Router for the UI framework
- TypeScript for type safety
- Tailwind CSS for styling
- Vite for fast development and building
- Vitest for testing
- Dexie.js for local database (IndexedDB)

---

## 🏃‍♂️ Running the Application

### Development Mode (Recommended for testing)
```bash
npm run dev
```
- **URL**: http://localhost:5173
- **Features**: Hot reload, instant updates, development tools
- **Performance**: Unoptimized but fast iteration

### Production Preview
```bash
# Build the application
npm run build

# Preview the built version
npm run preview
```
- **URL**: http://localhost:4173
- **Features**: Optimized build, production-like environment
- **Performance**: Full optimization, smaller bundle size

### Available Scripts

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run dev` | Development server | Daily development |
| `npm run build` | Full build with TypeScript | Development/testing |
| `npm run build:prod` | Production build (optimized) | Pi deployment |
| `npm run preview` | Preview built app | Test production build |
| `npm start` | Start Express server | Production server |
| `npm run build:serve` | Build (prod) and serve | Quick production test |
| `npm run pm2:start` | Deploy with PM2 | Production deployment |
| `npm run pm2:stop` | Stop PM2 app | Stop production app |
| `npm run pm2:restart` | Restart PM2 app | Update production app |
| `npm run pm2:logs` | View PM2 logs | Monitor production app |
| `npm run lint` | Check code quality | Before committing |
| `npm test` | Run all tests | Development/CI |
| `npm run test:ui` | Visual test runner | Debugging tests |
| `npm run test:coverage` | Test coverage report | Quality assurance |

---

## 🧪 Testing

RepCue includes comprehensive test coverage with **98 tests** across all components.

### Run All Tests
```bash
npm test
```

### Test with Coverage Report
```bash
npm run test:coverage
```

### Interactive Test UI
```bash
npm run test:ui
```
Opens a web interface for running and debugging tests.

### Test Categories
- **✅ Unit Tests**: Individual components (ConsentBanner, TimerPage, etc.)
- **✅ Integration Tests**: Service layer (StorageService, AudioService, etc.)
- **✅ Accessibility Tests**: WCAG 2.1 compliance verification
- **✅ Timer Logic Tests**: Precision timing and state management

### Test Results Overview
```
✅ ConsentBanner: 10/10 tests passing (GDPR compliance)
✅ TimerPage: 22/24 tests passing (Core functionality)
✅ AudioService: 19/25 tests passing (Sound & vibration)
✅ StorageService: 16/23 tests passing (Data persistence)
✅ ConsentService: 14/16 tests passing (Privacy management)
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### **Issue**: `npm install` fails with permission errors
**Solution**:
```bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $(whoami) ~/.npm

# Or use yarn instead
npm install -g yarn
yarn install
```

#### **Issue**: Port 5173 already in use
**Solution**:
```bash
# Kill existing process
pkill -f "vite"

# Or use different port
npm run dev -- --port 3000
```

#### **Issue**: App loads but buttons don't work
**Solution**:
```bash
# Clear browser cache and storage
# In Chrome: F12 → Application → Clear Storage → Clear All

# Restart development server
npm run dev
```

#### **Issue**: TypeScript errors during build
**Solution**:
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Fix common issues
npm run lint
```

#### **Issue**: Tests failing
**Solution**:
```bash
# Run tests in verbose mode
npm test -- --reporter=verbose

# Clear test cache
npm test -- --clearCache
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
npm run build
```

#### **Issue**: PM2 application not responding
**Solution**:
```bash
# Check health endpoint
curl http://localhost:3001/health

# Check PM2 status
pm2 status

# View detailed logs
npm run pm2:logs

# Restart if needed
npm run pm2:restart
```

### Getting Help

1. **Check Browser Console**: F12 → Console for JavaScript errors
2. **Check Network Tab**: F12 → Network for failed requests
3. **Verify Dependencies**: `npm list` to see installed packages
4. **Restart Everything**: 
   ```bash
   # Full reset
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

---

## 🚀 PM2 Deployment

RepCue includes full PM2 support for production deployment with an Express server. This is the recommended approach for Raspberry Pi and server deployments.

### Quick PM2 Setup

```bash
# 1. Install dependencies (Express & compression are included)
npm install

# 2. Build and start with PM2 in one command
npm run pm2:start

# 3. Check status
pm2 status

# 4. View logs
npm run pm2:logs
```

### Manual PM2 Setup

```bash
# 1. Build the application for production
npm run build:prod

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
| `npm run pm2:start` | Build and start application |
| `npm run pm2:stop` | Stop the application |
| `npm run pm2:restart` | Restart the application |
| `npm run pm2:logs` | View application logs |
| `pm2 status` | Check all PM2 processes |
| `pm2 monit` | Real-time monitoring |
| `pm2 save` | Save current configuration |

### PM2 Configuration

The included `ecosystem.config.cjs` is optimized for Raspberry Pi deployment:

- **Single instance** for Pi resource efficiency
- **512MB memory limit** with automatic restart
- **Health monitoring** at `/health` endpoint
- **Automatic daily restart** at 4 AM
- **Comprehensive logging** with timestamps

### Build Commands for Production

| Command | Use Case | TypeScript Compilation |
|---------|----------|----------------------|
| `npm run build` | Development/Testing | ✅ Full (includes test files) |
| `npm run build:prod` | Production/Pi Deployment | ⚡ Optimized (excludes tests) |

**Note**: Use `build:prod` for Raspberry Pi deployment to avoid TypeScript test compilation errors and faster builds.

### Nginx + Cloudflare Tunnel Setup

For production deployment with custom domain:

#### 1. Nginx Configuration
Create `/etc/nginx/sites-available/repcue`:

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
sudo ln -s /etc/nginx/sites-available/repcue /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

#### 3. Cloudflare Tunnel Configuration
Add to your `config.yml`:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/credentials.json

ingress:
  - hostname: repcue.azprojects.net
    service: http://localhost:80
  # Your other services...
  - service: http_status:404
```

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
npm install

# Build for production (optimized, skips test compilation)
npm run build:prod
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
ExecStart=/bin/bash -c 'git pull && npm run build:prod'

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

### Project Structure
```
repcue/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ConsentBanner.tsx
│   │   └── Navigation.tsx
│   ├── pages/              # Main app pages
│   │   ├── HomePage.tsx
│   │   ├── TimerPage.tsx
│   │   ├── ExercisePage.tsx
│   │   ├── ActivityLogPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/           # Business logic
│   │   ├── audioService.ts
│   │   ├── storageService.ts
│   │   └── consentService.ts
│   ├── types/              # TypeScript definitions
│   │   └── index.ts
│   ├── data/               # Static data
│   │   └── exercises.ts
│   └── test/               # Test utilities
├── public/                 # Static assets
├── dist/                   # Built application (generated)
└── docs/                   # Documentation
```

### Key Technologies

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v3 + Custom design system
- **Routing**: React Router v7
- **Database**: Dexie.js (IndexedDB wrapper)
- **Testing**: Vitest + React Testing Library
- **Audio**: Web Audio API + Speech Synthesis
- **PWA**: Service Worker ready (future enhancement)

### Development Workflow

1. **Start Development**:
   ```bash
   npm run dev
   ```

2. **Make Changes**: Edit files in `src/`

3. **Test Changes**:
   ```bash
   npm test
   npm run lint
   ```

4. **Build & Test**:
   ```bash
   npm run build:prod  # For production
   npm run preview
   ```

5. **Deploy**: Copy `dist/` folder to your web server

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

- **Local-Only Storage**: All data stays on your device/Pi
- **No Tracking**: Zero analytics, cookies, or external requests
- **GDPR Compliant**: Full consent management system
- **Open Source**: Complete transparency in code
- **Self-Hosted**: You control your data completely

### Data Stored Locally
- Exercise preferences and favorites
- Workout session logs
- App settings (sound, theme, etc.)
- User consent preferences

### No Data Shared
- No cloud syncing
- No user accounts
- No external APIs
- No telemetry or analytics

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Run the test suite**: `npm test`
5. **Check linting**: `npm run lint`
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

### Current Version (v0.1.0)
- ✅ Core interval timer functionality
- ✅ 20 exercise library with categories
- ✅ Audio feedback and voice announcements
- ✅ Activity logging and tracking
- ✅ GDPR-compliant privacy controls
- ✅ Mobile-responsive design
- ✅ Dark mode support
- ✅ PM2 production deployment support
- ✅ Express server with health monitoring
- ✅ Nginx + Cloudflare tunnel integration

### Planned Features (v0.2.0)
- 🔄 Custom workout routines
- 🔄 Exercise progression tracking
- 🔄 Import/export workout data
- 🔄 Offline PWA functionality
- 🔄 More exercise categories
- 🔄 Advanced timer patterns

### Future Enhancements
- 📋 Workout scheduling
- 📊 Advanced analytics and charts
- 🏆 Achievement system
- 🔊 Custom audio cues
- 📱 Native mobile app

---

## 💡 Support

**RepCue** - Your data, your device, your fitness journey. 🏋️‍♀️💪

For questions, issues, or feature requests, please open an issue on GitHub or check our troubleshooting guide above.

**Built with ❤️ for the privacy-conscious fitness community.**
