# RepCue Project Structure

## Monorepo Organization

RepCue uses a pnpm workspace monorepo structure with clear separation of concerns:

```
repcue/
├── apps/
│   ├── frontend/          # React + Vite PWA application
│   └── backend/           # Express server (serves frontend in production)
├── packages/
│   └── shared/            # Shared types and utilities
├── tests/
│   └── e2e/              # Cypress E2E test workspace
├── supabase/             # Database, migrations, edge functions
├── docs/                 # Comprehensive project documentation
└── scripts/              # Build and utility scripts
```

## Frontend Structure (`apps/frontend/`)

```
apps/frontend/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Route-level page components
│   ├── services/        # Business logic services (singleton pattern)
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Pure utility functions
│   ├── types/           # TypeScript type definitions
│   ├── data/            # Static data (exercises, constants)
│   ├── config/          # Configuration files
│   └── router/          # Route definitions and lazy loading
├── public/
│   ├── locales/         # i18n translation files
│   ├── videos/          # Exercise demo videos
│   └── splash/          # PWA splash screens
├── scripts/             # Build-time scripts
└── tests/               # Component tests
```

## Backend Structure (`apps/backend/`)

```
apps/backend/
├── server.js            # Express server entry point
├── ecosystem.config.cjs # PM2 configuration
└── package.json         # Backend dependencies
```

## Supabase Structure

```
supabase/
├── migrations/          # Database schema migrations
├── functions/           # Edge functions (Deno)
├── schemas/            # Schema definitions and backups
├── config.toml         # Supabase configuration
└── seed.sql            # Initial data seeding
```

## Key Architectural Patterns

### Service Layer Pattern
- **Location**: `apps/frontend/src/services/`
- **Pattern**: Singleton services with consistent interfaces
- **Examples**: `storageService`, `audioService`, `syncService`, `consentService`
- **Purpose**: Centralized business logic, state management, and external integrations

### Component Organization
- **Pages**: Route-level components in `src/pages/`
- **Components**: Reusable UI components in `src/components/`
- **Lazy Loading**: Route-based code splitting via `src/router/LazyRoutes.ts`

### Data Layer
- **Primary**: IndexedDB via Dexie.js (offline-first)
- **Sync**: Optional Supabase sync with conflict resolution
- **Types**: Centralized in `src/types/` with strict TypeScript

### Testing Structure
- **Unit/Integration**: Co-located with components (`__tests__/` folders)
- **E2E**: Separate workspace in `tests/e2e/`
- **Coverage**: Comprehensive testing with 98+ tests

## Documentation Organization

```
docs/
├── concept/             # Product concept and vision
├── i18n/               # Internationalization guides
├── implementation-plans/ # Feature implementation plans
├── testing/            # Testing strategies and findings
├── sync.md             # Sync architecture (v2)
├── consent.md          # Privacy and consent system
└── *.md                # Feature-specific documentation
```

## Configuration Files

- **Root**: `package.json` (workspace scripts), `pnpm-workspace.yaml`
- **Frontend**: `vite.config.ts`, `tailwind.config.js`, `vitest.config.ts`
- **TypeScript**: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- **Linting**: `eslint.config.js`
- **PWA**: Manifest and service worker config in `vite.config.ts`

## Naming Conventions

### Files and Folders
- **Components**: PascalCase (`TimerPage.tsx`, `ConsentBanner.tsx`)
- **Services**: camelCase (`storageService.ts`, `audioService.ts`)
- **Utilities**: camelCase (`platformDetection.ts`, `workoutDuration.ts`)
- **Types**: camelCase files, PascalCase exports (`types/index.ts`)

### Code Conventions
- **React Components**: PascalCase with descriptive names
- **Hooks**: `use` prefix (`useAuth`, `useWakeLock`)
- **Services**: Singleton pattern with consistent interfaces
- **Constants**: UPPER_SNAKE_CASE in dedicated files

## Import Organization
- **Absolute imports**: Configured via TypeScript paths
- **Service imports**: Always use singleton instances
- **Type imports**: Use `import type` for type-only imports
- **Component imports**: Lazy loading for routes, direct imports for shared components