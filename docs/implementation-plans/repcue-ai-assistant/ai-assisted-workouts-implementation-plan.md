# Implementation Plan: RepCue AI Assistant

**Feature Name:** RepCue AI Assistant
**PRD Reference:** `docs/implementation-plans/repcue-ai-assistant/ai-assisted-workouts-prd.md`
**Status:** Ready for Implementation
**Estimated Duration:** 4-5 weeks
**Last Updated:** 2025-10-02

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Phases](#implementation-phases)
4. [Detailed Tasks by Phase](#detailed-tasks-by-phase)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Plan](#deployment-plan)
7. [Rollback Strategy](#rollback-strategy)

---

## Overview

### Goals
Implement an AI-powered feature that generates personalized workout plans based on user preferences, fitness goals, and physical limitations. The feature includes:
- 3-screen onboarding questionnaire
- Integration with Anthropic Claude API via Supabase Edge Function
- Secure, privacy-first design (no PII sent to AI)
- Full localization support (8 locales)
- Mobile-first, accessible UI

### Success Criteria
- ✅ User can complete 3-screen flow in <3 minutes
- ✅ AI generates 1-3 valid workouts in <30 seconds
- ✅ Workouts are saved and accessible in Workouts page
- ✅ Feature works on all supported devices (mobile, tablet, desktop)
- ✅ All security measures implemented (rate limiting, input sanitization)
- ✅ Zero horizontal overflow on mobile (320px min width)
- ✅ WCAG 2.1 AA compliant
- ✅ Full localization support (8 locales with RTL)
- ✅ Adheres to RepCue UI specs and design system
- ✅ Compatible with offline-first architecture
- ✅ >90% test coverage for critical paths

---

## Non-Functional Requirements Summary

This implementation must adhere to RepCue's established standards and philosophies:

### Design & UX Standards
- **UI Specifications**: Follow `docs/ui-ux/ui-specs.md` for all styling, spacing, and component design
- **Mobile-First**: Primary target is 320-428px width; zero horizontal overflow
- **RTL Support**: Full support for Arabic locales per `docs/ui-ux/rtl-development-guide.md`
- **Design System**: Use centralized button classes (`.btn-primary`, etc.) and typography scale (`.text-h1`, etc.)
- **8pt Grid**: All spacing follows 8px increments
- **Dark Mode**: Proper contrast ratios and color hierarchy
- **Touch Targets**: Minimum 44x44px for all interactive elements

### Internationalization
- **Translation Guide**: Follow `docs/i18n-guide.md` for all i18n work
- **8 Locales**: en, ar, ar-EG, de, es, fr, fy, nl
- **Namespace**: Use `aiWorkout.json` for all AI Assistant strings
- **Key Naming**: Follow `docs/i18n/key-styleguide.md` conventions
- **No Hardcoded Strings**: All text must use `t()` or `<Trans>`
- **Workflow**: Run `pnpm i18n:scan` before committing locale changes
- **Fallback Strategy**: ar-EG → ar → en; others → en

### Architecture Alignment
- **Offline-First**: Online-only feature with clear offline messaging and graceful degradation
- **State Management**: Use singleton service pattern (`aiWorkoutService.getInstance()`)
- **Storage**: Workouts saved to IndexedDB via `StorageService`, synced like manual workouts
- **Logger**: Use `logger.ts` utility instead of `console.log()` (respects DEBUG flag)
- **Types**: All TypeScript with strict mode, no `any` without justification
- **Error Handling**: Centralized error handling with user-friendly messages

### Security & Privacy
- **OWASP Compliance**: Follow `.github/instructions/owasp.instructions.md`
- **Prompt Injection Protection**: Input sanitization, structured prompts, output validation
- **Rate Limiting**: 5 requests/hour per user
- **No PII to AI**: Only questionnaire responses and exercise catalog sent to AI
- **Consent-Aware**: Respect `ConsentService` settings
- **GDPR Compliant**: User responses not stored; only workouts persisted

### Accessibility
- **WCAG 2.1 AA**: Target AAA where feasible
- **Keyboard Navigation**: Tab, Enter, Esc, Arrow keys
- **Screen Readers**: Proper aria-labels, aria-live regions
- **Reduced Motion**: Respect `prefers-reduced-motion` preference
- **Color Contrast**: 4.5:1 for text, 3:1 for large text
- **Focus Management**: Clear focus indicators, focus traps in modals

### Testing & Quality
- **Unit Tests**: >90% coverage for utilities, hooks, services
- **Component Tests**: >80% coverage for UI components
- **Integration Tests**: E2E tests for critical user paths
- **Manual Testing**: Test at 320px, 375px, 428px widths; all 8 locales; RTL mode
- **Performance**: <500ms page load, <30s AI generation, 60fps animations
- **Browser Compatibility**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Code Quality
- **Documentation**: JSDoc comments for all public APIs
- **Naming Conventions**: Follow RepCue patterns (camelCase components, kebab-case files)
- **Linting**: Pass `pnpm lint` and `npx tsc --noEmit`
- **No Regression**: Maintain backward compatibility with existing features

---

## Architecture

### Frontend Components
```
apps/frontend/src/
├── pages/
│   └── AIWorkoutOnboardingPage.tsx         # Main onboarding flow (3 screens)
├── components/
│   ├── AIWorkoutButton.tsx                  # Entry point button
│   ├── AIWorkoutAuthGate.tsx                # Auth requirement modal
│   ├── AIWorkoutOfflineGate.tsx             # Offline detection
│   ├── AIWorkoutProgressIndicator.tsx       # Screen progress (1/3, 2/3, 3/3)
│   ├── AIWorkoutScreen1.tsx                 # Basic info form
│   ├── AIWorkoutScreen2.tsx                 # Goals & preferences form
│   ├── AIWorkoutScreen3.tsx                 # Health & training style form
│   ├── AIWorkoutLoadingState.tsx            # AI processing animation
│   └── AIWorkoutResultsModal.tsx            # Success screen with workouts
├── services/
│   └── aiWorkoutService.ts                  # API client for Edge Function
├── hooks/
│   └── useAIWorkoutFlow.ts                  # State management for flow
├── types/
│   └── aiWorkout.ts                         # TypeScript types
└── utils/
    └── aiWorkoutValidation.ts               # Form validation

apps/frontend/public/locales/[locale]/
└── aiWorkout.json                           # Translations for all 8 locales
```

### Backend Components
```
supabase/functions/
├── generate-ai-workout/
│   ├── index.ts                             # Main Edge Function handler
│   ├── prompt-builder.ts                    # Constructs AI prompt
│   ├── ai-client.ts                         # Anthropic API wrapper
│   ├── workout-generator.ts                 # Parses AI response to Workout objects
│   ├── security.ts                          # Input validation, rate limiting
│   ├── error-handler.ts                     # Centralized error handling
│   └── __tests__/
│       ├── index.test.ts                    # Integration tests
│       ├── prompt-builder.test.ts           # Unit tests
│       ├── workout-generator.test.ts        # Unit tests
│       └── security.test.ts                 # Security tests

supabase/migrations/
└── [timestamp]-add-ai-workout-metadata.sql  # Schema changes for AI metadata
```

### Data Flow
```
User Action → Frontend Validation → Auth Check → Online Check
→ Edge Function (with rate limiting) → AI API (Claude)
→ Response Validation → StorageService → Success Screen
```

---

## Implementation Phases

### Phase 1: Foundation & Types (Week 1)
**Goal:** Set up types, schemas, and basic infrastructure
**Duration:** 3-4 days

### Phase 2: Frontend UI Components (Week 1-2)
**Goal:** Build all UI components for the 3-screen flow
**Duration:** 5-6 days

### Phase 3: Backend Edge Function (Week 2-3)
**Goal:** Implement Supabase Edge Function with AI integration
**Duration:** 5-6 days

### Phase 4: Integration & Security (Week 3)
**Goal:** Connect frontend to backend, add security measures
**Duration:** 3-4 days

### Phase 5: Localization & Accessibility (Week 3-4)
**Goal:** Add translations, RTL support, and accessibility features
**Duration:** 3-4 days

### Phase 6: Testing & Polish (Week 4)
**Goal:** Comprehensive testing, bug fixes, UX refinements
**Duration:** 4-5 days

### Phase 7: Deployment & Monitoring (Week 5)
**Goal:** Deploy to production, monitor metrics
**Duration:** 2-3 days

---

## Detailed Tasks by Phase

### Phase 1: Foundation & Types

#### Task 1.1: TypeScript Types & Interfaces
**Related User Stories:** US-001, US-002, US-003
**File:** `apps/frontend/src/types/aiWorkout.ts`
```typescript
// Create types for:
// - AIWorkoutRequest
// - AIWorkoutResponse
// - OnboardingScreenData (Screen 1, 2, 3)
// - GeneratedWorkout
// - AIWorkoutMetadata
```

**Acceptance Criteria:**
- [ ] All types defined with JSDoc comments
- [ ] Types align with PRD requirements
- [ ] Export types for use across components

**Estimated Time:** 2 hours

---

#### Task 1.2: Database Schema Updates
**Related User Stories:** US-001, US-002
**File:** `supabase/migrations/[timestamp]-add-ai-workout-metadata.sql`

Add metadata fields to `workouts` table:
```sql
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS generation_params JSONB;
```

**Acceptance Criteria:**
- [ ] Migration runs successfully on dev environment
- [ ] Fields are nullable (backward compatible)
- [ ] Index added for `ai_generated` (for future filtering)

**Estimated Time:** 1 hour

---

#### Task 1.3: Feature Flag Setup
**Related User Stories:** US-001, US-002, US-004
**File:** `apps/frontend/src/config/features.ts`

Add feature flag:
```typescript
export const FEATURES = {
  AI_WORKOUT_BUILDER: true, // Enable/disable entire feature
  AI_WORKOUT_BETA: false,    // Beta testing mode (for limited rollout)
};
```

**Acceptance Criteria:**
- [ ] Feature flag controls button visibility
- [ ] Beta mode restricts access to specific users (optional)
- [ ] Flag can be toggled without code changes

**Estimated Time:** 30 minutes

---

#### Task 1.4: Validation Utilities
**Related User Stories:** US-001, US-003
**File:** `apps/frontend/src/utils/aiWorkoutValidation.ts`

Implement form validation:
```typescript
// validateScreen1(data: Screen1Data): ValidationResult
// validateScreen2(data: Screen2Data): ValidationResult
// validateScreen3(data: Screen3Data): ValidationResult
// sanitizeUserInput(text: string): string
```

**Acceptance Criteria:**
- [ ] All fields validated (required, type, range)
- [ ] Clear error messages for each field
- [ ] Sanitization removes dangerous characters
- [ ] Unit tests with 100% coverage

**Estimated Time:** 3 hours

---

### Phase 2: Frontend UI Components

#### Task 2.1: AIWorkoutButton Component
**Related User Stories:** US-004
**File:** `apps/frontend/src/components/AIWorkoutButton.tsx`

Entry point button with dynamic label.

**Features:**
- Shows on HomePage (above workouts section)
- Shows on SettingsPage (below profile section)
- Label changes: "Get Your Personalized Workout" vs "Create New Plan"
- Checks auth status, online status, feature flag

**Acceptance Criteria:**
- [ ] Button styled per UI specs (btn-primary)
- [ ] Touch target minimum 44x44px
- [ ] Disabled state when offline
- [ ] Accessible (aria-label, keyboard nav)
- [ ] Responsive (mobile-first)

**Estimated Time:** 2 hours

---

#### Task 2.2: AIWorkoutAuthGate Component
**Related User Stories:** US-005
**File:** `apps/frontend/src/components/AIWorkoutAuthGate.tsx`

Modal shown when unauthenticated user clicks button.

**Features:**
- Modal with title: "Sign In Required"
- Message explaining why auth is needed
- Buttons: "Sign In" and "Try Later"
- "Sign In" opens AuthModal
- "Try Later" closes modal

**Acceptance Criteria:**
- [ ] Modal accessible (focus trap, ESC to close)
- [ ] Properly styled (follows UI specs)
- [ ] Returns to onboarding after successful sign-in
- [ ] Mobile-friendly (no overflow)

**Estimated Time:** 2 hours

---

#### Task 2.3: AIWorkoutOfflineGate Component
**Related User Stories:** US-006
**File:** `apps/frontend/src/components/AIWorkoutOfflineGate.tsx`

Detects offline status and shows message.

**Features:**
- Checks `navigator.onLine`
- Listens to online/offline events
- Shows banner: "Internet connection required"
- Disables button when offline

**Acceptance Criteria:**
- [ ] Accurate detection (handles flaky connections)
- [ ] Real-time updates (no refresh needed)
- [ ] Clear messaging
- [ ] Accessible announcements (screen reader)

**Estimated Time:** 1.5 hours

---

#### Task 2.4: AIWorkoutProgressIndicator Component
**Related User Stories:** US-001
**File:** `apps/frontend/src/components/AIWorkoutProgressIndicator.tsx`

Visual progress indicator (1/3, 2/3, 3/3).

**Features:**
- Horizontal step indicator
- Current step highlighted
- Previous steps marked complete
- Future steps dimmed

**Acceptance Criteria:**
- [ ] Responsive (mobile-first)
- [ ] Accessible (aria-current, aria-label)
- [ ] Matches UI specs
- [ ] RTL support

**Estimated Time:** 2 hours

---

#### Task 2.5: AIWorkoutScreen1 Component
**Related User Stories:** US-001
**File:** `apps/frontend/src/components/AIWorkoutScreen1.tsx`

Basic information form (Gender, Age, Height, Weight).

**Form Fields:**
- Gender: Radio buttons (Male, Female, Other)
- Age: Number input (16-100)
- Height: Number input + unit selector (cm / ft+in)
- Weight: Number input + unit selector (kg / lbs)

**Acceptance Criteria:**
- [ ] All fields validated on blur and submit
- [ ] Error messages displayed inline
- [ ] Unit conversion works correctly
- [ ] Touch-optimized inputs
- [ ] Keyboard navigation support
- [ ] Mobile-friendly (no horizontal scroll)

**Estimated Time:** 4 hours

---

#### Task 2.6: AIWorkoutScreen2 Component
**Related User Stories:** US-001, US-002
**File:** `apps/frontend/src/components/AIWorkoutScreen2.tsx`

Goals & preferences form.

**Form Fields:**
- Primary Goal: Chip selector (Weight Loss, Muscle Building, Health Maintenance, Flexibility)
- Fitness Level: Chip selector (Beginner, Intermediate, Advanced)
- Preferred Training Time: Chip selector (Morning, Afternoon, Evening, Mixed)

**Acceptance Criteria:**
- [ ] Single-select chips (radio button behavior)
- [ ] Selected state visually distinct
- [ ] Touch targets 44x44px minimum
- [ ] Accessible (aria-checked, role="radio")
- [ ] Responsive layout (stacks on mobile)

**Estimated Time:** 4 hours

---

#### Task 2.7: AIWorkoutScreen3 Component
**Related User Stories:** US-001, US-003
**File:** `apps/frontend/src/components/AIWorkoutScreen3.tsx`

Health & training style form.

**Form Fields:**
- Injuries/Limitations: Textarea (optional, 500 char limit)
- Preferred Training Style: Chip selector (Strength, Cardio, Balanced)
- Time Availability: Dropdown (15-30min, 30-45min, 45-60min, 60+min)

**Acceptance Criteria:**
- [ ] Textarea auto-grows (up to max height)
- [ ] Character counter shown
- [ ] Dropdown accessible (keyboard nav)
- [ ] Clear placeholder text
- [ ] Validation on submit

**Estimated Time:** 3 hours

---

#### Task 2.8: AIWorkoutLoadingState Component
**Related User Stories:** US-001
**File:** `apps/frontend/src/components/AIWorkoutLoadingState.tsx`

Loading animation during AI processing.

**Features:**
- Animated spinner or skeleton
- Message: "Creating your personalized workouts..."
- Progress indicator (indeterminate)
- Timeout handling (60s max)

**Acceptance Criteria:**
- [ ] Smooth animation (no jank)
- [ ] Respects prefers-reduced-motion
- [ ] Accessible (aria-live, aria-busy)
- [ ] Mobile-optimized

**Estimated Time:** 2 hours

---

#### Task 2.9: AIWorkoutResultsModal Component
**Related User Stories:** US-001, US-002
**File:** `apps/frontend/src/components/AIWorkoutResultsModal.tsx`

Success screen showing generated workouts.

**Features:**
- List of workouts with:
  - Name, description
  - Exercise count, estimated duration
  - "AI-Generated" badge
- Action buttons:
  - "View Workouts" → navigates to /workouts
  - "Generate Again" → restarts flow
  - "Close" → returns to previous page

**Acceptance Criteria:**
- [ ] Modal accessible (focus trap)
- [ ] Workouts displayed clearly
- [ ] Badge styled per UI specs
- [ ] Buttons have clear hierarchy
- [ ] Mobile-friendly layout

**Estimated Time:** 3 hours

---

#### Task 2.10: AIWorkoutOnboardingPage
**Related User Stories:** US-001, US-002, US-003
**File:** `apps/frontend/src/pages/AIWorkoutOnboardingPage.tsx`

Main page orchestrating the 3-screen flow.

**Features:**
- State management for form data
- Navigation between screens (Back/Next)
- Form validation on each step
- Submit to backend on final screen
- Error handling and retry logic

**Acceptance Criteria:**
- [ ] State persists across screens
- [ ] Back button preserves data
- [ ] Exit confirmation on browser back
- [ ] Handles all error states
- [ ] Logs analytics events

**Estimated Time:** 5 hours

---

#### Task 2.11: useAIWorkoutFlow Hook
**Related User Stories:** US-001, US-002
**File:** `apps/frontend/src/hooks/useAIWorkoutFlow.ts`

Custom hook for state management.

**Features:**
- Manages form data (all 3 screens)
- Handles navigation (next, back, cancel)
- Validates data per screen
- Submits to backend
- Manages loading/error states

**Acceptance Criteria:**
- [ ] Hook is reusable
- [ ] State updates are immutable
- [ ] Validation logic centralized
- [ ] Unit tests with mock data

**Estimated Time:** 4 hours

---

### Phase 3: Backend Edge Function

#### Task 3.1: Edge Function Scaffolding
**Related User Stories:** US-001, US-002, US-003
**File:** `supabase/functions/generate-ai-workout/index.ts`

Set up basic Edge Function structure.

```typescript
serve(async (req) => {
  // CORS handling
  // JWT authentication
  // Request validation
  // Main handler
  // Error handling
});
```

**Acceptance Criteria:**
- [ ] Function deploys to Supabase
- [ ] CORS configured correctly
- [ ] JWT validation works
- [ ] Returns proper HTTP status codes

**Estimated Time:** 2 hours

---

#### Task 3.2: Security Module
**Related User Stories:** US-001
**File:** `supabase/functions/generate-ai-workout/security.ts`

Implement security measures.

**Features:**
- Input sanitization (strip HTML, special chars)
- Rate limiting (5 requests/hour per user)
- Request validation (schema check)
- API key validation

**Acceptance Criteria:**
- [ ] All inputs sanitized before use
- [ ] Rate limiting enforced (Redis or Supabase)
- [ ] Malformed requests rejected with 400
- [ ] Security headers set correctly
- [ ] Unit tests for edge cases

**Estimated Time:** 4 hours

---

#### Task 3.3: AI Client (Model-Agnostic)
**Related User Stories:** US-001, US-002, US-003
**File:** `supabase/functions/generate-ai-workout/ai-client.ts`

**Model-agnostic wrapper** for AI providers (Anthropic Claude, OpenAI GPT, etc.).

**Architecture:**
```typescript
// Provider interface for easy swapping
interface AIProvider {
  generateCompletion(prompt: string, options: AIOptions): Promise<string>;
}

class AnthropicProvider implements AIProvider {
  async generateCompletion(prompt: string, options: AIOptions): Promise<string> {
    // Anthropic-specific implementation
  }
}

class OpenAIProvider implements AIProvider {
  async generateCompletion(prompt: string, options: AIOptions): Promise<string> {
    // OpenAI-specific implementation
  }
}

// Factory pattern for provider selection
function getAIProvider(providerName: string): AIProvider {
  switch (providerName) {
    case 'anthropic': return new AnthropicProvider();
    case 'openai': return new OpenAIProvider();
    default: throw new Error(`Unknown provider: ${providerName}`);
  }
}
```

**Features:**
- **Provider abstraction layer** (interface-based design)
- **Multiple implementations**: Anthropic Claude (primary), OpenAI GPT (fallback)
- Environment-based provider selection (e.g., `AI_PROVIDER=anthropic`)
- Send prompt, receive response (provider-agnostic)
- Handle API errors (unified error handling)
- Timeout handling (60s)
- Retry logic (exponential backoff)
- Request/response logging

**Acceptance Criteria:**
- [ ] `AIProvider` interface defined with `generateCompletion()` method
- [ ] `AnthropicProvider` implementation complete
- [ ] `OpenAIProvider` implementation complete (or stub for future)
- [ ] Factory function to select provider based on env var `AI_PROVIDER`
- [ ] API keys loaded from Supabase secrets (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)
- [ ] Errors logged with correlation IDs and provider name
- [ ] Timeouts handled gracefully
- [ ] Can switch providers by changing env var (no code changes)
- [ ] Integration tests with mock API (both providers)
- [ ] Documentation: How to add new AI provider

**Environment Variables:**
- `AI_PROVIDER`: `anthropic` | `openai` (default: `anthropic`)
- `ANTHROPIC_API_KEY`: Anthropic API key
- `OPENAI_API_KEY`: OpenAI API key (optional)

**Benefits:**
- ✅ Easy to switch models for cost/performance optimization
- ✅ A/B test different providers
- ✅ Fallback to secondary provider if primary fails
- ✅ Future-proof for new AI models

**Estimated Time:** 4 hours

---

#### Task 3.4: Prompt Builder
**Related User Stories:** US-001, US-002, US-003
**File:** `supabase/functions/generate-ai-workout/prompt-builder.ts`

Constructs AI prompt from user data and exercises.

**Features:**
- System prompt (professional coach persona)
- User profile section (goal, fitness level, etc.)
- Exercise catalog with **all attributes** (description, category, exercise_type, catalogId, default_duration, tags, benefits, limitations, best_timing, suggested_combinations, notes)
- Output format specification (JSON schema)
- Prompt injection protection (structured XML tags)
- **Explicit injury filtering instructions** to AI

**Critical Requirements:**
- ✅ **ALL exercise attributes included** in prompt (not just id/name/description)
- ✅ AI instructed to exclude exercises with limitations matching user's injuries
- ✅ Example injury scenario in prompt (e.g., "shoulder injury" → exclude Plank)
- ✅ AI instructed to match exercise benefits to user goals
- ✅ AI instructed to respect fitness level when selecting exercises

**Acceptance Criteria:**
- [ ] Prompt follows PRD structure (Section 4.4)
- [ ] User inputs clearly separated from instructions
- [ ] Exercise catalog includes all attributes: description, category, exercise_type, catalogId, default_duration, default_sets, default_reps, tags, benefits, limitations, best_timing, suggested_combinations, notes
- [ ] Prompt explicitly instructs AI to exclude contraindicated exercises
- [ ] Injury filtering example included in system prompt
- [ ] JSON schema enforced
- [ ] Unit tests with sample data (including injury scenario)

**Estimated Time:** 5 hours

---

#### Task 3.5: Workout Generator
**Related User Stories:** US-001, US-002
**File:** `supabase/functions/generate-ai-workout/workout-generator.ts`

Parses AI response into Workout objects.

**Features:**
- Parse JSON from AI response
- Validate workout structure
- Generate UUIDs for workouts and exercises
- Add metadata (ai_generated, generated_at, etc.)
- Handle malformed responses

**Acceptance Criteria:**
- [ ] Valid workouts generated
- [ ] All required fields present
- [ ] Invalid responses rejected
- [ ] Logs parsing errors
- [ ] Unit tests with mock AI responses

**Estimated Time:** 3 hours

---

#### Task 3.6: Exercise Catalog Fetcher
**Related User Stories:** US-001, US-003
**File:** `supabase/functions/generate-ai-workout/index.ts` (inline)

Fetches built-in exercises from database with **all attributes**.

**Query:**
```sql
SELECT id, name, description, category, exercise_type, catalog_id,
       default_duration, default_sets, default_reps,
       tags, benefits, limitations, best_timing,
       suggested_combinations, notes
FROM exercises
WHERE owner_id IS NULL  -- Built-in exercises only
AND deleted = false
ORDER BY category, name;
```

**Critical:** All exercise attributes must be fetched and passed to AI for intelligent workout generation.

**Acceptance Criteria:**
- [ ] Only built-in exercises fetched
- [ ] **All attributes** selected: id, name, description, category, exercise_type, catalog_id, default_duration, default_sets, default_reps, tags, benefits, limitations, best_timing, suggested_combinations, notes
- [ ] Query is performant (<100ms)
- [ ] Results cached (per request)
- [ ] Handles empty catalog gracefully
- [ ] Handles null values in optional fields (tags, benefits, limitations, etc.)

**Estimated Time:** 1.5 hours

---

#### Task 3.7: Error Handler
**Related User Stories:** US-001
**File:** `supabase/functions/generate-ai-workout/error-handler.ts`

Centralized error handling.

**Error Types:**
- Authentication errors (401)
- Validation errors (400)
- Rate limit errors (429)
- AI API errors (502/503)
- Timeout errors (504)
- Unknown errors (500)

**Acceptance Criteria:**
- [ ] All errors logged with context
- [ ] User-friendly error messages
- [ ] HTTP status codes correct
- [ ] No sensitive data in error messages

**Estimated Time:** 2 hours

---

### Phase 4: Integration & Security

#### Task 4.1: Frontend Service Client
**Related User Stories:** US-001, US-002
**File:** `apps/frontend/src/services/aiWorkoutService.ts`

API client for calling Edge Function.

**Methods:**
- `generateWorkouts(data: AIWorkoutRequest): Promise<AIWorkoutResponse>`
- `checkRateLimit(): Promise<boolean>`

**Acceptance Criteria:**
- [ ] Handles all HTTP status codes
- [ ] Includes auth headers (JWT)
- [ ] Timeout configured (65s)
- [ ] Errors mapped to user messages
- [ ] Unit tests with mock fetch

**Estimated Time:** 2 hours

---

#### Task 4.2: StorageService Integration
**Related User Stories:** US-001, US-002
**File:** `apps/frontend/src/services/storageService.ts`

Add method to save AI-generated workouts.

**Method:**
```typescript
async saveAIWorkouts(workouts: Workout[]): Promise<boolean> {
  // Save workouts with ai_generated flag
  // Mark as dirty for sync
  // Return success/failure
}
```

**Acceptance Criteria:**
- [ ] Workouts saved to IndexedDB
- [ ] Metadata fields populated
- [ ] Sync triggered if online
- [ ] Handles conflicts gracefully

**Estimated Time:** 2 hours

---

#### Task 4.3: Rate Limiting Implementation
**Related User Stories:** US-001, US-002
**Approach:** Use Supabase Edge Function + KV store (Upstash Redis or Supabase)

**Logic:**
- Key: `ai_workout_rate_limit:{user_id}`
- Value: Request count
- TTL: 1 hour
- Limit: 5 requests

**Acceptance Criteria:**
- [ ] Rate limiting enforced
- [ ] Clear error message when exceeded
- [ ] Countdown shown in UI
- [ ] Limit resets after 1 hour

**Estimated Time:** 3 hours

---

#### Task 4.4: End-to-End Integration Test
**Related User Stories:** US-001, US-005, US-006
**File:** `apps/frontend/src/__tests__/ai-workout-flow.integration.test.tsx`

Test full flow from button click to workout saved.

**Test Cases:**
1. Unauthenticated user sees auth gate
2. Offline user sees offline message
3. Authenticated online user completes flow
4. Workouts saved correctly
5. Error handling works

**Acceptance Criteria:**
- [ ] All test cases pass
- [ ] Uses mock AI responses
- [ ] No actual API calls
- [ ] Coverage >90%

**Estimated Time:** 4 hours

---

### Phase 5: Localization & Accessibility

#### Task 5.1: Translation Keys
**Related User Stories:** US-001, US-004
**Files:** `apps/frontend/public/locales/[locale]/aiWorkout.json`

Create translation files for all 8 locales.

**Key Groups:**
- Button labels
- Screen titles and descriptions
- Form labels and placeholders
- Error messages
- Success messages
- Chip/option labels

**Acceptance Criteria:**
- [ ] All 8 locales have complete translations
- [ ] Keys follow RepCue naming conventions
- [ ] RTL translations verified (ar, ar-EG)
- [ ] No missing keys (run i18n:scan)

**Estimated Time:** 4 hours

---

#### Task 5.2: RTL Support
**Related User Stories:** US-001
**Files:** All component CSS

Ensure RTL layouts work correctly.

**Checklist:**
- [ ] Text alignment (text-start-rtl)
- [ ] Icon mirroring (if needed)
- [ ] Layout flow (flex-row-reverse)
- [ ] Progress indicator direction
- [ ] Modal positioning

**Testing:**
- Test in Arabic (ar) and Egyptian Arabic (ar-EG)
- Verify no overlap or cramping
- Check touch targets in RTL mode

**Estimated Time:** 3 hours

---

#### Task 5.3: Accessibility Audit
**Related User Stories:** US-001, US-004
**Tools:** axe DevTools, WAVE, screen reader testing

**Focus Areas:**
- Keyboard navigation (Tab, Enter, Esc)
- Screen reader announcements
- Focus management (modals, screens)
- ARIA attributes (labels, roles, states)
- Color contrast (WCAG AA)
- Touch targets (44x44px)

**Acceptance Criteria:**
- [ ] Zero axe violations
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader can complete flow
- [ ] Focus visible and logical
- [ ] Touch targets meet minimum size

**Estimated Time:** 4 hours

---

#### Task 5.4: Reduced Motion Support
**Related User Stories:** US-001
**File:** All animated components

Respect `prefers-reduced-motion`.

**Changes:**
- Disable spinner animations
- Use simple fade transitions
- No parallax or complex animations

**Acceptance Criteria:**
- [ ] All animations disabled with media query
- [ ] UX still clear without motion
- [ ] Tested with OS setting enabled

**Estimated Time:** 1 hour

---

### Phase 6: Testing & Polish

#### Task 6.1: Unit Tests
**Related User Stories:** US-001, US-002, US-003
**Coverage Target:** >90%

**Components to Test:**
- All form components (Screen 1, 2, 3)
- Validation utilities
- AI service client
- useAIWorkoutFlow hook

**Edge Cases:**
- Empty inputs
- Invalid data types
- Boundary values (age 16, 100)
- Special characters in text fields

**Estimated Time:** 6 hours

---

#### Task 6.2: Component Tests
**Related User Stories:** US-001, US-004, US-005, US-006
**Tool:** React Testing Library

**Test Scenarios:**
- Button renders and handles clicks
- Auth gate shows when unauthenticated
- Offline gate shows when offline
- Form validation shows errors
- Navigation between screens works
- Submit triggers API call

**Estimated Time:** 4 hours

---

#### Task 6.3: Edge Function Tests
**Related User Stories:** US-001, US-002, US-003
**Files:** `supabase/functions/generate-ai-workout/__tests__/`

**Test Scenarios:**
- Auth validation rejects invalid JWTs
- Rate limiting blocks excessive requests
- Input sanitization removes dangerous chars
- AI client handles API errors
- Workout generator validates responses
- E2E flow with mock AI
- **Injury-based exercise filtering works correctly**
- **All exercise attributes are included in AI prompt**

**Specific Test Cases for Exercise Attributes:**
1. **Test: All attributes passed to AI**
   - Mock exercise catalog with all fields
   - Verify prompt includes: description, category, exercise_type, catalogId, default_duration, tags, benefits, limitations, best_timing, suggested_combinations, notes
   - Assert: No attributes missing from prompt

2. **Test: Injury filtering**
   - User input: `{ injuries: 'shoulder injury' }`
   - Exercise catalog includes:
     - Plank (limitations: ['Not suitable for shoulder injuries'])
     - Squats (limitations: [])
   - Mock AI response includes only Squats (not Plank)
   - Assert: Validation passes (contraindicated exercise excluded)

3. **Test: Contraindication validation**
   - User input: `{ injuries: 'knee pain' }`
   - Mock AI response includes exercise with limitations: ['Avoid with knee injuries']
   - Assert: Validation **fails** with error "Contraindicated exercise detected"

**Acceptance Criteria:**
- [ ] All existing test scenarios pass
- [ ] New test: Verify all exercise attributes in prompt
- [ ] New test: Injury filtering by AI (positive case)
- [ ] New test: Contraindication validation (negative case)
- [ ] Edge cases: multiple injuries, no injuries, null limitations field
- [ ] >90% code coverage for Edge Function

**Estimated Time:** 6 hours

---

#### Task 6.4: Manual Testing Checklist
**Related User Stories:** US-001, US-002, US-003, US-004, US-005, US-006
**Devices:** iPhone SE, iPhone 14, iPad, Android (Chrome), Desktop

**Test Cases:**
1. ✅ Button visible on HomePage and SettingsPage
2. ✅ Auth gate works for unauthenticated users
3. ✅ Offline detection works
4. ✅ Form validation on all screens
5. ✅ Back button preserves data
6. ✅ Submit generates workouts
7. ✅ Workouts saved and visible in /workouts
8. ✅ AI badge shows on generated workouts
9. ✅ Error states display correctly
10. ✅ RTL mode works (Arabic)
11. ✅ Dark mode works
12. ✅ Reduced motion works
13. ✅ Screen reader can complete flow
14. ✅ Keyboard navigation works

**Estimated Time:** 4 hours

---

#### Task 6.5: Performance Testing
**Related User Stories:** US-001, US-004
**Tools:** Lighthouse, WebPageTest

**Metrics:**
- Page load time <500ms
- Time to Interactive <2s
- AI response time <30s (median)
- No memory leaks
- Bundle size impact <50KB

**Estimated Time:** 2 hours

---

#### Task 6.6: Security Testing
**Related User Stories:** US-001
**Focus Areas:**
- Prompt injection attempts
- XSS via form inputs
- Rate limit bypass attempts
- JWT tampering
- API key exposure

**Acceptance Criteria:**
- [ ] Prompt injection blocked
- [ ] XSS sanitized
- [ ] Rate limit enforced
- [ ] Invalid JWTs rejected
- [ ] No API keys in client code

**Estimated Time:** 3 hours

---

#### Task 6.7: UX Polish
**Related User Stories:** US-001, US-002, US-004
**Refinements:**
- Button copy optimization
- Error message clarity
- Loading state improvements
- Success message tweaks
- Smooth transitions

**User Feedback:**
- Test with 3-5 real users
- Collect feedback
- Iterate on pain points

**Estimated Time:** 3 hours

---

### Phase 7: Deployment & Monitoring

#### Task 7.1: Environment Setup
**Related User Stories:** US-001, US-002, US-003
**Steps:**
1. Add Anthropic API key to Supabase secrets (dev + prod)
2. Configure rate limiting (Upstash Redis or Supabase KV)
3. Set up error logging (Sentry or similar)
4. Enable feature flag in production

**Acceptance Criteria:**
- [ ] API key works in dev and prod
- [ ] Rate limiting functional
- [ ] Errors logged to monitoring service
- [ ] Feature flag controlled

**Estimated Time:** 2 hours

---

#### Task 7.2: Deploy to Development
**Related User Stories:** US-001, US-002, US-003, US-004
**Steps:**
1. Deploy Edge Function to dev Supabase project
2. Deploy frontend to dev environment
3. Run smoke tests
4. Fix any deployment issues

**Acceptance Criteria:**
- [ ] All components deployed
- [ ] Smoke tests pass
- [ ] No console errors
- [ ] Feature accessible

**Estimated Time:** 2 hours

---

#### Task 7.3: Internal Testing
**Related User Stories:** US-001, US-002, US-003
**Duration:** 3-5 days

**Participants:** 5-10 team members

**Process:**
1. Share dev link
2. Ask users to complete flow 2-3 times
3. Collect feedback (Google Form)
4. Review AI-generated workouts for quality
5. Fix bugs and iterate

**Success Criteria:**
- [ ] >80% completion rate
- [ ] >4/5 satisfaction rating
- [ ] AI workouts are reasonable and safe

**Estimated Time:** 1 day (async)

---

#### Task 7.4: Beta Testing
**Related User Stories:** US-001, US-002, US-003, US-004
**Duration:** 1 week

**Participants:** 10-20 real users (invite via email)

**Process:**
1. Deploy to production with beta flag
2. Invite beta users
3. Monitor usage (analytics)
4. Collect feedback (in-app survey)
5. Monitor error rates
6. Review AI costs

**Metrics:**
- Completion rate
- Workout acceptance rate
- Error rate
- AI cost per user

**Estimated Time:** 2 days (monitoring + fixes)

---

#### Task 7.5: Deploy to Production
**Related User Stories:** US-001, US-002, US-003, US-004, US-005, US-006
**Steps:**
1. Deploy Edge Function to prod Supabase
2. Deploy frontend to Cloudflare Pages
3. Enable feature flag for 20% of users (gradual rollout)
4. Monitor metrics for 24 hours
5. Increase to 50% if stable
6. Full rollout after 48 hours

**Rollback Plan:**
- Disable feature flag if error rate >5%
- Roll back Edge Function if critical bug
- Communicate downtime via status page

**Estimated Time:** 1 day (monitoring)

---

#### Task 7.6: Monitoring & Analytics
**Related User Stories:** US-001, US-002
**Metrics to Track:**
- Button click rate (Google Analytics)
- Flow start rate
- Completion rate (per screen)
- AI generation success rate
- Error rate (by type)
- AI response time (p50, p95, p99)
- API cost per request
- User satisfaction (post-flow survey)

**Dashboards:**
- Supabase Edge Function logs
- Google Analytics custom events
- Error monitoring (Sentry)
- Cost tracking (Anthropic dashboard)

**Alerts:**
- Error rate >5% → Slack alert
- AI cost >$100/day → Email alert
- Response time >60s → Investigation

**Estimated Time:** 2 hours (setup)

---

#### Task 7.7: Documentation
**Related User Stories:** US-001, US-004
**Files to Update:**
1. `README.md` - Add feature description
2. `CHANGELOG.md` - Document release
3. `docs/features/ai-workout-builder.md` - User guide
4. `.claude/CLAUDE.md` - Add architecture notes

**Content:**
- How to use the feature
- Technical architecture
- Troubleshooting guide
- Future enhancement ideas

**Estimated Time:** 2 hours

---

## Testing Strategy

### Unit Tests
- **Coverage:** >90%
- **Framework:** Vitest
- **Focus:** Validation, hooks, utilities

### Component Tests
- **Framework:** React Testing Library
- **Focus:** User interactions, form behavior

### Integration Tests
- **Framework:** Vitest + MSW (mock API)
- **Focus:** End-to-end flow, API integration

### E2E Tests (Optional)
- **Framework:** Cypress
- **Focus:** Critical user paths

### Manual Testing
- **Devices:** Mobile (iOS, Android), Tablet, Desktop
- **Browsers:** Chrome, Firefox, Safari
- **Locales:** Test all 8 languages
- **Accessibility:** Screen reader, keyboard-only

### AI Recommendation Testing
**Challenge:** Testing AI recommendations without direct visibility into decision-making

**Approach:**
1. **Automated Validation Rules**
   - Schema validation (Workout type structure)
   - Exercise existence check (all IDs in catalog)
   - Contraindication check (no exercises with limitations matching injuries)
   - Bounds check (sets/reps/duration within safe ranges)
   - Time check (total duration ≤ user's availability)

2. **Regression Test Data Sets**
   - Fixed input scenarios with expected characteristics
   - Examples: "Beginner + Weight Loss", "Shoulder Injury", "15-30 min availability"
   - Run weekly against AI API, log results for review

3. **Output Quality Metrics**
   - Exercise variety (no repetition >2 times)
   - Balance (multiple muscle groups)
   - Safety (100% compliance on contraindications)
   - Track metrics over time, alert on anomalies

4. **Manual Review Process**
   - Weekly sampling of 20-30 real AI-generated workouts
   - Fitness expert review (goal alignment, safety, quality)
   - User feedback (in-app 1-5 star rating)
   - Iterative prompt refinement

5. **A/B Testing**
   - Test different AI prompts
   - Compare: workout acceptance rate, user satisfaction, completion rate
   - Promote winning variant

**Acceptance Criteria for AI-Generated Workouts:**
- ✅ Valid JSON structure
- ✅ All exercise IDs exist in catalog
- ✅ Zero contraindicated exercises for reported injuries
- ✅ Total duration ≤ user's time availability + 10% buffer
- ✅ Sets/reps/duration within safe ranges
- ✅ >70% user rating 4+ stars
- ✅ >50% users start workout within 7 days

**See PRD Section 8 for detailed testing strategy.**

---

## Deployment Plan

### Phase 1: Development (Week 1-4)
- Implement all features
- Test in dev environment
- Internal team testing

### Phase 2: Beta (Week 5)
- Deploy to production with beta flag
- Invite 10-20 beta users
- Monitor and iterate

### Phase 3: Limited Release (Week 6)
- Roll out to 20% of users
- Monitor metrics closely
- A/B test button placement

### Phase 4: General Availability (Week 7)
- Roll out to 100% of users
- Announce in changelog
- Create help docs

---

## Rollback Strategy

### Feature Flag Disable
**Trigger:** Critical bug or >5% error rate
**Action:**
1. Set `FEATURES.AI_WORKOUT_BUILDER = false`
2. Deploy config change (no code deploy)
3. Button hidden from UI immediately

### Edge Function Rollback
**Trigger:** AI API issues or security breach
**Action:**
1. Revert Edge Function to previous version
2. Clear cache
3. Test with smoke tests

### Database Rollback
**Trigger:** Migration issues
**Action:**
1. Run reverse migration
2. Verify data integrity
3. Re-deploy fix

### Communication Plan
- **Internal:** Slack alert to #engineering
- **External:** Status page update (if user-facing impact)
- **Support:** Update help docs with known issues

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **AI API downtime** | Fallback error message, retry logic |
| **Cost overrun** | Rate limiting, usage alerts, budget cap |
| **Poor workout quality** | Prompt refinement, beta testing, user feedback |
| **Prompt injection** | Input sanitization, structured prompts, output validation |
| **Privacy concerns** | No PII sent to AI, clear privacy messaging |
| **User confusion** | Clear onboarding, help tooltips, tutorial |

---

## Success Metrics (Post-Launch)

### Week 1 Goals
- [ ] >50% of authenticated users click button
- [ ] >70% completion rate (start to finish)
- [ ] <2% error rate
- [ ] Average AI response time <25s
- [ ] >4/5 user satisfaction

### Month 1 Goals
- [ ] >30% of new users use AI workouts
- [ ] >50% of AI workouts are started
- [ ] <$0.50 cost per user
- [ ] >75% 7-day retention for AI users

---

## Future Enhancements

### Short-Term (3-6 months)
- User feedback on AI workouts (thumbs up/down)
- Workout regeneration (individual exercises)
- Multi-week progressive plans
- Export workouts to calendar

### Long-Term (6-12 months)
- Adaptive AI (learns from workout history)
- Wearable integration (heart rate, activity)
- Video form correction
- Community-voted workout templates

---

## Non-Functional Requirements Checklist

Use this checklist to verify each component/task meets RepCue's standards:

### Design & UX Compliance
- [ ] Follows `docs/ui-ux/ui-specs.md` for styling (colors, spacing, typography)
- [ ] Uses centralized button classes (`.btn-primary`, `.btn-secondary`, etc.)
- [ ] Uses semantic typography classes (`.text-h1`, `.text-h2`, `.text-body`, etc.)
- [ ] Follows 8pt grid system (4px, 8px, 16px, 24px, 32px, etc.)
- [ ] Zero horizontal overflow at 320px, 375px, 428px widths
- [ ] Touch targets are minimum 44x44px
- [ ] Spacing between interactive elements is at least 8px
- [ ] Dark mode properly implemented (contrast ratios, color hierarchy)
- [ ] Badge/tag styling follows dark mode guidelines

### Internationalization Compliance
- [ ] All user-facing text uses `t()` or `<Trans>` (no hardcoded strings)
- [ ] Translation keys added to `public/locales/[locale]/aiWorkout.json`
- [ ] Key naming follows `docs/i18n/key-styleguide.md` conventions
- [ ] All 8 locales have translation entries (en, ar, ar-EG, de, es, fr, fy, nl)
- [ ] RTL layout tested in Arabic (ar, ar-EG) - no overlap or cramping
- [ ] Pluralization uses `_one`/`_other` suffixes where applicable
- [ ] Number/unit formatting respects locale (dates, height, weight)
- [ ] Ran `pnpm i18n:scan` and resolved all issues

### Architecture Compliance
- [ ] Uses `logger.ts` utility instead of `console.log()`
- [ ] Logger calls respect DEBUG feature flag
- [ ] TypeScript strict mode enabled, no `any` without justification
- [ ] Follows singleton service pattern (`getInstance()`)
- [ ] Workouts saved via `StorageService` (IndexedDB)
- [ ] Respects `ConsentService` settings
- [ ] Error handling is centralized and user-friendly
- [ ] No regression in existing workout/exercise features

### Accessibility Compliance
- [ ] WCAG 2.1 AA compliant (tested with axe DevTools)
- [ ] Keyboard navigation works (Tab, Enter, Esc, Arrow keys)
- [ ] All interactive elements have aria-labels or accessible names
- [ ] Focus indicators are visible and clear
- [ ] Focus trap implemented in modals
- [ ] Screen reader announcements for state changes (aria-live)
- [ ] Color contrast ratios: 4.5:1 for text, 3:1 for large text
- [ ] Supports `prefers-reduced-motion` preference
- [ ] Form validation errors are descriptive and announced

### Security & Privacy Compliance
- [ ] Follows OWASP guidelines (`.github/instructions/owasp.instructions.md`)
- [ ] Input sanitization on client and server
- [ ] No PII sent to AI (email, name, user_id excluded)
- [ ] Rate limiting enforced (5 requests/hour)
- [ ] API keys stored in Supabase secrets (never in code)
- [ ] All network requests over HTTPS
- [ ] Prompt injection protection implemented
- [ ] Output validation before using AI responses

### Testing Compliance
- [ ] Unit tests written with >90% coverage (utilities, hooks, services)
- [ ] Component tests written with >80% coverage
- [ ] Integration tests for critical paths
- [ ] Manual testing at 320px, 375px, 428px widths
- [ ] Tested in all 8 locales
- [ ] RTL mode tested (ar, ar-EG)
- [ ] Dark mode tested
- [ ] Keyboard navigation tested
- [ ] Screen reader tested (NVDA/JAWS/VoiceOver)
- [ ] Performance: <500ms page load, <30s AI generation
- [ ] Browser compatibility: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Code Quality Compliance
- [ ] JSDoc comments for all public APIs
- [ ] Naming conventions followed (camelCase components, kebab-case files)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`npx tsc --noEmit`)
- [ ] No unused imports or variables
- [ ] Code is DRY (no duplication)
- [ ] Comments explain "why", not "what"
- [ ] Git commit messages are descriptive

---

## Appendix

### Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase Edge Functions (Deno runtime)
- **AI:** Anthropic Claude 3.5 Sonnet (via REST API)
- **Database:** Supabase PostgreSQL
- **Storage:** IndexedDB (via Dexie.js)
- **Localization:** i18next (8 locales with RTL support)
- **Testing:** Vitest, React Testing Library, Cypress (optional)
- **Accessibility:** axe DevTools, WAVE, screen reader testing

### Dependencies to Add
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",  // Edge Function - Anthropic provider
    "openai": "^4.20.0"               // Edge Function - OpenAI provider (optional)
  }
}
```

### Environment Variables
```bash
# Supabase Secrets (Edge Function)

# AI Provider Selection
AI_PROVIDER=anthropic  # Options: 'anthropic' | 'openai' (default: anthropic)

# API Keys (configure based on chosen provider)
ANTHROPIC_API_KEY=sk-ant-xxx  # Required if AI_PROVIDER=anthropic
OPENAI_API_KEY=sk-xxx          # Required if AI_PROVIDER=openai

# Rate Limiting (optional)
UPSTASH_REDIS_URL=https://xxx
UPSTASH_REDIS_TOKEN=xxx
```

### Useful Commands
```bash
# Run frontend dev server
pnpm dev

# Run tests
pnpm test

# Deploy Edge Function
npx supabase functions deploy generate-ai-workout --project-ref <ref>

# Test Edge Function locally
npx supabase functions serve generate-ai-workout --env-file .env.local

# Run i18n scan
pnpm i18n:scan
```

---

**Document Status:** Ready for Implementation
**Next Steps:**
1. Review PRD and implementation plan with team
2. Set up project board (GitHub Issues or Jira)
3. Assign tasks to developers
4. Schedule daily standups
5. Begin Phase 1: Foundation & Types

**Estimated Total Effort:** 120-150 hours (4-5 weeks for 1 developer)

---

**Questions or Concerns?**
- See PRD for detailed requirements
- Contact: RepCue team
- Document updates tracked in Git commits
