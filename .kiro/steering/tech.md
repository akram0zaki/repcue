# RepCue Technology Stack

## Build System & Package Management

- **Package Manager**: pnpm (v10.15.0) - required for workspace management
- **Workspace Structure**: pnpm workspaces with monorepo architecture
- **Build Tool**: Vite (v7.0.0) for fast development and optimized builds
- **Node.js**: v18+ required

## Frontend Stack

- **Framework**: React 19 with TypeScript (strict mode)
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v3 with custom design system
- **State Management**: React hooks + local services pattern
- **Database**: Dexie.js (IndexedDB wrapper) for offline-first storage
- **PWA**: Vite PWA plugin with Workbox for service worker management
- **Internationalization**: i18next with react-i18next (6 languages, RTL support)

## Backend Stack

- **Server**: Express.js (minimal, serves frontend in production)
- **Database**: Supabase (PostgreSQL) for optional cloud sync
- **Authentication**: Supabase Auth with WebAuthn support
- **Process Management**: PM2 for production deployment
- **Edge Functions**: Supabase Edge Functions (Deno) for sync logic

## Testing & Quality

- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Cypress + Playwright
- **Accessibility**: cypress-axe for WCAG compliance
- **Linting**: ESLint v9 with TypeScript support
- **Type Checking**: TypeScript ~5.8.3

## Common Commands

### Development
```bash
# Start frontend dev server (port 5173)
pnpm dev

# Start backend dev server (port 3001) 
pnpm dev:be

# Run tests with UI
pnpm test:ui

# Run linting
pnpm lint
```

### Building
```bash
# Build for development
pnpm build

# Build for production (optimized)
pnpm build:prod

# Preview built app (port 4173)
pnpm preview
```

### Testing
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run accessibility tests
pnpm test:a11y
```

### Production Deployment
```bash
# Start with PM2
pnpm pm2:start

# View PM2 logs
pnpm pm2:logs

# Restart PM2 app
pnpm pm2:restart
```

### Internationalization
```bash
# Scan for missing i18n keys
pnpm i18n:scan

# Generate translation report
pnpm i18n:report
```

## Key Dependencies

- **React**: ^19.1.0
- **TypeScript**: ~5.8.3
- **Tailwind CSS**: ^3.4.17
- **Dexie**: ^4.0.11 (IndexedDB)
- **Supabase**: ^2.56.0
- **i18next**: ^25.3.6
- **Vite**: ^7.0.0
- **Vitest**: ^3.2.4

## Environment Configuration

- **Frontend**: `.env` files in `apps/frontend/` (VITE_ prefix for client-side)
- **Backend**: `.env` files in `apps/backend/` for server configuration
- **Supabase**: Configuration in `supabase/.env`