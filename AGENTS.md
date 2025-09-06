# AGENTS.md - AI Agent Guide for RepCue

**Last Updated**: 2025-09-06  
**Version**: 2.0.0  
**For**: AI Agents working on the RepCue codebase

---

## 🏗️ Project Overview

**RepCue** is a privacy-first fitness tracking Progressive Web App (PWA) for interval training, built as a monorepo with React 19 + TypeScript + Vite + Tailwind CSS. It's optimized for mobile devices and designed for self-hosting on Raspberry Pi with production deployment to Amazon EC2.

### 🎯 Core Mission
- **UX First**: User experience is the primary directive - never regress timer feel/clarity
- **Privacy-First**: GDPR compliant with consent-aware data handling
- **Accessibility**: WCAG 2.1 AA compliant, respects reduced motion preferences
- **Mobile-Optimized**: PWA with native-like experience on phones/tablets

---

## 📁 Project Structure (Monorepo)

```
repcue/
├── apps/
│   ├── frontend/          # React PWA (primary app)
│   └── backend/           # Express server (serves built app in prod)
├── packages/
│   └── shared/            # Shared utilities and types
├── supabase/
│   ├── functions/         # Edge Functions
│   └── migrations/        # Database migrations
├── tests/
│   └── e2e/              # End-to-end tests
├── docs/                 # Comprehensive documentation
└── scripts/              # Build and utility scripts
```

### 🏷️ Package Names
- **Root**: `repcue`
- **Frontend**: `@repcue/frontend`
- **Backend**: `@repcue/backend`
- **Shared**: `@repcue/shared`

---

## 🛠️ Technology Stack

| **Category** | **Technology** | **Version** | **Purpose** |
|-------------|---------------|-------------|-------------|
| **Runtime** | Node.js | 18+ | Development & build environment |
| **Package Manager** | pnpm | 10.15.0 | Monorepo dependency management |
| **Frontend Framework** | React | 19+ | UI library |
| **Language** | TypeScript | Latest | Type safety |
| **Build Tool** | Vite | Latest | Fast development & bundling |
| **Styling** | Tailwind CSS | Latest | Utility-first CSS framework |
| **PWA** | VitePWA | Latest | Service worker & manifest generation |
| **Database** | Supabase PostgreSQL | - | User data, exercises, workouts |
| **Authentication** | Supabase Auth | - | User management |
| **Storage** | IndexedDB (Dexie) | - | Client-side data persistence |
| **Testing** | Vitest, Cypress | Latest | Unit & E2E testing |
| **Deployment** | PM2, nginx | - | Production process management |

---

## 🏗️ Architecture Principles

### 🔄 Data Flow
```
App.tsx → Services → IndexedDB (Dexie) ← ConsentService
         ↓
    Timer State Management
         ↓
    Component Updates
```

### 🎯 State Management
- **Location**: All state lives in `src/App.tsx` (no Redux/Zustand)
- **Services**: Business logic in singleton services under `src/services/` with `.getInstance()` pattern
- **Storage**: ConsentService guards all data persistence to IndexedDB
- **Returns**: Services return booleans/null; avoid throwing exceptions

### ⏱️ Timer Semantics (CRITICAL)
- **Rep-based exercises**: Use completed counts
  - `currentRep` = completed reps (0-based internally, 1-based for display)  
  - `currentSet` = 0-indexed set number
- **Preserve State**: Always preserve `timerState.workoutMode` on updates - never set to `undefined` mid-workout
- **Intervals**: Always `clearInterval()` before creating new ones
- **Duration Calculation**: `repDurationSeconds || BASE_REP_TIME` from constants, apply `settings.repSpeedFactor`

---

## 📝 Development Workflows

### 🚀 Quick Start Commands
```bash
# Development
pnpm dev                    # Start frontend dev server (port 5173)
pnpm dev:be                 # Start backend dev server (port 3001)

# Testing
pnpm test                   # Run all tests
pnpm test:stable           # Windows-stable test mode
pnpm test:e2e              # End-to-end tests
pnpm test:a11y             # Accessibility tests

# Linting & Type Checking
pnpm lint                   # ESLint with auto-fix
pnpm exec tsc --noEmit      # TypeScript type checking

# Internationalization
pnpm i18n:scan             # Check for missing translation keys
pnpm i18n:report           # Generate i18n report

# Production
pnpm build                 # Build for production
pnpm start                 # Start production server
pnpm pm2:start            # Start with PM2 (Raspberry Pi)
```

---

## 🗂️ File Organization

### 📍 Key Files & Directories

| **Path** | **Purpose** | **Notes** |
|----------|-------------|-----------|
| `apps/frontend/src/App.tsx` | Main app component & state | All application state lives here |
| `apps/frontend/src/types/index.ts` | Core TypeScript types | Primary type definitions |
| `apps/frontend/src/types/media.ts` | Media-related types | Video demo types |
| `apps/frontend/src/constants/index.ts` | App constants | BASE_REP_TIME, categories, etc. |
| `apps/frontend/src/services/` | Business logic services | Singleton pattern with .getInstance() |
| `apps/frontend/src/data/exercises.ts` | Built-in exercise definitions | Static exercise catalog |
| `apps/frontend/src/config/features.ts` | Feature flags | Control experimental features |
| `apps/frontend/src/config/supabase.ts` | Supabase client config | Database connection |
| `apps/frontend/public/locales/` | i18n translation files | 8 languages supported |
| `apps/frontend/public/videos/` | Exercise demo videos | Feature-gated video content |

### 🧪 Testing Structure
```
src/
├── __tests__/                    # Global tests
├── components/__tests__/         # Component tests
├── pages/__tests__/              # Page-specific tests
├── services/__tests__/           # Service tests
└── utils/__tests__/              # Utility tests
```

---

## 🌍 Internationalization (i18n)

### 🗣️ Supported Languages (8 Total)
- **English** (en) - Canonical locale
- **French** (fr)
- **German** (de) 
- **Spanish** (es)
- **Dutch** (nl)
- **Arabic** (ar) - RTL support
- **Arabic Egyptian** (ar-EG) - RTL support
- **Frisian** (fy)

### 📋 i18n Workflow
1. **Add/Edit Keys**: Modify `public/locales/en/*.json` (canonical)
2. **Scan**: Run `pnpm i18n:scan` to detect missing keys
3. **Translate**: Add translations to all other language files
4. **Test**: Verify UI displays correctly in all languages

### 🔑 Translation Key Structure
```json
{
  "common": {           // Global UI elements
    "buttons": {...},   // Buttons, actions
    "navigation": {...} // Menu, navigation
  },
  "exercises": {...},   // Exercise-related strings
  "timer": {...},       // Timer interface
  "settings": {...}     // Settings page
}
```

---

## 🎥 Feature System

### 🏁 Feature Flags (`src/config/features.ts`)
```typescript
export const FEATURES = {
  DEBUG: false,                    // Debug logging
  VIDEO_DEMOS: true,              // Exercise demo videos
  CUSTOM_VIDEO_UPLOAD: true,      // User video uploads
  COMMUNITY_FEATURES: true,       // Social features
  ANALYTICS: false                // Usage analytics
};
```

### 🎬 Video Demo System
- **Feature-Gated**: Controlled by `VIDEO_DEMOS` flag + user setting
- **Accessibility**: Respects `prefers-reduced-motion`
- **Loader**: `src/utils/loadExerciseMedia.ts`
- **Variant Selection**: `src/utils/selectVideoVariant.ts`  
- **Hook**: `src/hooks/useExerciseVideo.ts`
- **UI Integration**: `src/pages/TimerPage.tsx`

---

## 🏪 Data & Storage

### 📊 Data Architecture
- **Client Storage**: IndexedDB via Dexie (consent-guarded)
- **Cloud Storage**: Supabase PostgreSQL (user-created content)
- **Media Storage**: Supabase Storage (user-uploaded videos)
- **Consent System**: All persistence gated by ConsentService

### 🗄️ Database Schema (Supabase)
```sql
-- Core Tables
exercises           -- User-created exercises
workouts           -- User-created workouts  
exercise_videos    -- Video attachments
profiles           -- User profiles
community_ratings  -- Exercise ratings
community_reports  -- Content moderation

-- Example Exercise Structure
CREATE TABLE exercises (
  id uuid PRIMARY KEY,
  owner_id uuid REFERENCES profiles(id),
  name text NOT NULL,
  description text,
  instructions jsonb,
  category text,
  difficulty text,
  equipment text[],
  muscle_groups text[],
  tags text[],
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### 🔐 Row Level Security (RLS)
- **All tables**: RLS policies enforce data privacy
- **Public Content**: `is_public = true` exercises visible to all
- **Private Content**: Only owner can read/write
- **Community Features**: Rating/reporting with proper access control

---

## 🧩 Service Layer

### 🔧 Core Services (Singleton Pattern)

| **Service** | **Purpose** | **Key Methods** |
|-------------|-------------|-----------------|
| `storageService.ts` | IndexedDB operations | `getExercises()`, `saveWorkout()` |
| `consentService.ts` | GDPR compliance | `hasConsent()`, `clearAllData()` |
| `audioService.ts` | Timer sounds | `playBeep()`, `playCompletionSound()` |
| `syncService.ts` | Cloud sync | `syncExercises()`, `uploadWorkout()` |
| `authService.ts` | User authentication | `signIn()`, `signOut()`, `getUser()` |
| `featureFlagService.ts` | Feature management | `isEnabled()`, `getAllFlags()` |
| `securityService.ts` | Security hardening | `sanitizeInput()`, `validateCSP()` |

### 🎯 Usage Pattern
```typescript
// Always use getInstance() pattern
const storageService = StorageService.getInstance();
const exercises = await storageService.getExercises();

// Services return boolean/null, avoid throws
const success = await storageService.saveExercise(exercise);
if (!success) {
  // Handle error gracefully
  console.warn('Failed to save exercise');
}
```

---

## ⚡ Performance & PWA

### 📱 PWA Features
- **Manifest**: Auto-generated via VitePWA
- **Service Worker**: Automatic caching strategy
- **Install Prompts**: Native app-like installation
- **Offline Support**: Core functionality works offline
- **Splash Screens**: iOS/Android optimized

### 🏎️ Performance Optimizations
- **Code Splitting**: Manual chunks for vendor/utils/components
- **Asset Caching**: Videos, images, locales cached appropriately
- **Bundle Analysis**: Rollup optimization with manual chunks
- **Lazy Loading**: Components loaded on demand

---

## 🔒 Security & Privacy

### 🛡️ Security Measures
- **Content Security Policy**: Strict CSP headers
- **HTTPS Enforcement**: All network calls over HTTPS
- **Input Sanitization**: DOMPurify for HTML content
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **Same-Origin Policy**: Media served from same origin only

### 🔐 Privacy Implementation
- **Consent-First**: No data stored without user consent
- **Data Erasure**: Complete data deletion capabilities
- **Minimal Data**: Only collect what's necessary
- **Local-First**: Core functionality works without cloud
- **GDPR Compliance**: Full right to erasure implementation

### 📋 OWASP Implementation
See `docs/implementation-plans/owasp-implementation-plan.md` for comprehensive security hardening plan covering:
- Authentication & Session Management
- Input Validation & Output Encoding  
- Access Control & Authorization
- Data Protection & Cryptography
- Security Configuration & Monitoring

---

## 🧪 Testing Strategy

### 🔬 Test Types
- **Unit Tests**: Vitest for components/services/utilities
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Cypress for full user workflows
- **Accessibility Tests**: Automated a11y validation
- **Performance Tests**: Lighthouse CI integration

### 🏃 Test Execution
```bash
# Unit Tests
pnpm test                  # All tests with watch mode
pnpm test:stable          # Windows-stable mode (no watch)
pnpm test:ci              # CI mode with coverage

# E2E Tests  
pnpm test:e2e             # Full E2E test suite
pnpm cypress:open         # Interactive E2E development

# Accessibility
pnpm test:a11y            # Automated accessibility testing
```

### 📊 Test Coverage
- **Target**: 80%+ code coverage
- **Critical Paths**: 100% coverage for timer logic
- **UI Components**: Focus on user interaction flows
- **Services**: Mock external dependencies appropriately

---

## 🚀 Deployment & DevOps

### 🏗️ Build Process
```bash
# Development
pnpm dev                  # Vite dev server (port 5173)

# Production Build
pnpm build               # Optimized production build
pnpm build:serve         # Build + serve locally

# Production Deployment (Raspberry Pi)
pnpm build:prod         # Production build with optimizations
pnpm pm2:start          # Start with PM2 process manager
```

### 🌐 Deployment Targets

| **Environment** | **Platform** | **Process Manager** | **Notes** |
|----------------|-------------|-------------------|-----------|
| **Development** | Windows 11 | N/A | PowerShell, local development |
| **Production** | Raspberry Pi 5 | PM2 + nginx | Self-hosted, Cloudflare tunnel |
| **Future** | Amazon EC2 | PM2 + nginx | Scalable cloud deployment |

### 🔧 Production Configuration
- **PM2**: `ecosystem.config.cjs` for process management  
- **nginx**: Reverse proxy with gzip compression
- **Cloudflare**: CDN + SSL termination
- **Environment**: `.env.production` with production Supabase

---

## 🔍 Debugging & Development

### 🐛 Debug Features
- **Feature Flag**: `DEBUG: true` in `src/config/features.ts`
- **Console Logging**: Conditional debug statements
- **React DevTools**: Component state inspection
- **Network Tab**: API call monitoring
- **Storage Inspector**: IndexedDB/LocalStorage examination

### 📊 Development Tools
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting (via ESLint config)
- **TypeScript**: Strict type checking
- **Husky**: Pre-commit hooks
- **lint-staged**: Staged file linting

### 🔄 Common Development Tasks

| **Task** | **Command** | **Notes** |
|----------|-------------|-----------|
| Start development | `pnpm dev` | Frontend + hot reload |
| Type checking | `pnpm exec tsc --noEmit` | TypeScript validation |
| Run tests | `pnpm test` | Unit + integration tests |
| Lint code | `pnpm lint` | ESLint with auto-fix |
| Check i18n | `pnpm i18n:scan` | Translation completeness |
| Build production | `pnpm build` | Optimized build |
| Analyze bundle | Check rollup output | Manual chunk analysis |

---

## ❗ Critical Guidelines for AI Agents

### 🚨 Never Do This
1. **Timer State**: Never set `timerState.workoutMode` to `undefined` during active workout
2. **Intervals**: Never create new intervals without clearing existing ones first
3. **State Mutations**: Never directly mutate state - always use proper setState patterns
4. **Feature Flags**: Don't hardcode feature availability - always check feature flags
5. **Accessibility**: Don't remove accessibility attributes or ignore reduced motion
6. **i18n**: Never hardcode strings - always use translation keys
7. **Types**: Don't use `any` type - maintain strict TypeScript typing
8. **Console**: Don't leave debugging console.log in production code

### ✅ Always Do This
1. **Read CLAUDE.md**: Check `.claude/CLAUDE.md` for latest project instructions
2. **Follow Conventions**: Match existing code style and patterns
3. **Test Changes**: Run tests after making modifications
4. **Check i18n**: Run `pnpm i18n:scan` after text changes
5. **Preserve UX**: Maintain timer feel and user experience quality
6. **Update Documentation**: Keep CHANGELOG.md current with changes
7. **Security First**: Follow security best practices for user data
8. **Mobile First**: Test changes on mobile viewport sizes

### 🎯 Timer Logic Validation Example
```typescript
// CORRECT: Rep progression for 2×8 exercise
// Start: set=0, rep=0 → display "Set 1/2, Rep 0/8"
// After 8th rep: rep=8 → trigger rest (isResting=true)  
// After rest: set=1, rep=0 → continue Set 2
// Complete: after final set completion

// Common pitfalls to avoid:
// ❌ Off-by-one errors on reps/sets
// ❌ Premature set increment 
// ❌ Missing rest trigger
// ❌ Not clearing intervals
// ❌ Clearing workoutMode mid-workout
```

---

## 📚 Essential Documentation

### 📖 Primary References
- **Project Instructions**: `.claude/CLAUDE.md` - **READ FIRST**
- **Implementation Plans**: `docs/implementation-plans/` - Feature roadmaps
- **API Documentation**: `docs/` - Comprehensive guides
- **Change History**: `CHANGELOG.md` - Recent behavior changes

### 🎯 Topic-Specific Guides
- **Timer Logic**: `src/pages/__tests__/TimerPage.rep-edge-cases.test.tsx`
- **i18n Workflow**: `docs/i18n/contributing.md`
- **Video Demos**: `cypress/e2e/videoDemos.cy.ts`  
- **Security**: `docs/implementation-plans/owasp-implementation-plan.md`
- **PWA Features**: `docs/pwa.md`
- **Deployment**: `docs/hosting.md`

### 🔗 External Resources
- **React 19**: Latest React features and patterns
- **TypeScript Handbook**: Type system best practices
- **Tailwind CSS**: Utility-first styling approach
- **Vite Guide**: Build tool configuration
- **Supabase Docs**: Database and authentication
- **WCAG Guidelines**: Accessibility compliance

---

## 🆘 Troubleshooting

### 🔧 Common Issues

| **Problem** | **Solution** | **Prevention** |
|-------------|-------------|----------------|
| Timer not advancing | Check interval clearing | Always clear before creating |
| Form data lost on tab switch | Implement localStorage persistence | Add form draft management |
| TypeScript errors | Check type definitions in `src/types/` | Run `tsc --noEmit` regularly |
| Missing translations | Run `pnpm i18n:scan` | Check after text changes |
| PWA not updating | Clear service worker cache | Test in incognito mode |
| Tests failing | Check mock configurations | Run tests before committing |

### 📞 Getting Help
1. **Check CLAUDE.md**: Project-specific instructions
2. **Review Tests**: Look at test cases for expected behavior  
3. **Check Issues**: Existing GitHub issues for known problems
4. **Documentation**: Comprehensive docs in `docs/` directory
5. **Code Comments**: Critical sections have detailed comments

---

## 🔄 Contribution Workflow

### 📋 Standard Process
1. **Read Instructions**: Check `.claude/CLAUDE.md` for latest guidance
2. **Create Feature Branch**: Use descriptive branch names
3. **Follow Conventions**: Match existing code patterns
4. **Add Tests**: Include tests for new functionality
5. **Update i18n**: Add translation keys for new text
6. **Run Quality Checks**: Lint, typecheck, test
7. **Update Docs**: Modify CHANGELOG.md and relevant docs
8. **Commit & Push**: Use conventional commit messages

### 🏷️ Branch Naming
```bash
feature/user-created-content    # New features
fix/timer-interval-clearing     # Bug fixes  
docs/update-api-documentation   # Documentation
chore/upgrade-dependencies      # Maintenance
```

### ✅ Pre-Commit Checklist
- [ ] Code follows existing patterns
- [ ] TypeScript types are properly defined  
- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] i18n keys validated (`pnpm i18n:scan`)
- [ ] Timer functionality tested manually
- [ ] Mobile viewport tested
- [ ] Accessibility not regressed
- [ ] CHANGELOG.md updated

---

**End of AGENTS.md**  
*This document is maintained as the single source of truth for AI agents working on RepCue. Keep it updated as the project evolves.*