# Built-in Exercise Catalog

This document explains the structure, relationships, and workflow for managing RepCue's built-in exercise catalog.

## Architecture Overview

The built-in exercise catalog is a multi-layered system consisting of:

1. **Exercise Definitions** (`apps/frontend/src/data/exercises.ts`) - TypeScript source of truth
2. **Localization Files** (`apps/frontend/public/locales/*/exercises.json`) - Translated names/descriptions
3. **Media Index** (`apps/frontend/public/exercise_media.json`) - Video metadata
4. **Video Assets** (`apps/frontend/public/videos/`) - Actual video files

## 1. Exercise Definitions (`exercises.ts`)

### Purpose
The TypeScript file serves as the **canonical source** for exercise structure and defaults, but **NOT** for display text.

### Key Points
- Contains literal English strings for `name` and `description` fields
- These literal strings are **fallbacks only** - the UI uses localized versions
- Defines exercise metadata: category, type, durations, reps, sets, tags
- Uses `createExercise()` helper for consistent sync metadata

### Structure
```typescript
createExercise({
  id: 'plank',                           // Unique identifier (slug)
  name: 'Plank',                         // Fallback English name
  description: 'Hold your body...',      // Fallback English description
  category: ExerciseCategory.CORE,       // Predefined category
  exercise_type: ExerciseType.TIME_BASED,// TIME_BASED or REPETITION_BASED
  default_duration: 30,                  // For time-based exercises (seconds)
  default_sets: 3,                       // For rep-based exercises
  default_reps: 15,                      // For rep-based exercises
  rep_duration_seconds: 1.1,            // Custom rep timing (optional)
  is_favorite: false,                    // Always false for built-ins
  has_video: true,                       // Indicates video availability
  tags: ['isometric', 'core', 'stability'] // Searchable tags
})
```

### Video Availability Flag
- `has_video: true` - Exercise has demonstration videos
- `has_video: false` - Exercise has no videos (won't show preview button)

## 2. Localization System

### How Text Localization Works
The actual display text comes from i18n files, **not** the TypeScript literals.

#### Process Flow
1. UI components call `localizeExercise(exercise, t)` utility
2. Utility looks up `exercises.{id}.name` and `exercises.{id}.description` in current locale
3. Falls back to TypeScript literals if translation missing
4. Returns localized object: `{ name: string, description: string }`

#### Translation Keys Structure
```json
{
  "plank": {
    "name": "Plank",
    "description": "Hold your body in a straight line, supported by forearms and toes"
  },
  "tags": {
    "isometric": "Isometric",
    "core": "Core"
  }
}
```

#### Supported Locales
- `en` (English) - Base/fallback language
- `de` (German)
- `es` (Spanish)
- `fr` (French)
- `nl` (Dutch)
- `ar` (Arabic)
- `ar-EG` (Egyptian Arabic)
- `fy` (Frisian)

## 3. Video System

### Media Index (`exercise_media.json`)
Defines video metadata for exercises with `has_video: true`.

#### Structure
```json
{
  "id": "plank",
  "repsPerLoop": 1,                    // How many reps shown per video loop
  "fps": 30,                           // Video frame rate
  "video": {
    "square": "/videos/plank_v1_1080x1080.webm",      // 1:1 aspect ratio
    "portrait": "/videos/plank_v1_1080x1920.webm",    // 9:16 aspect ratio
    "landscape": "/videos/plank_v1_1920x1080.webm"    // 16:9 aspect ratio
  }
}
```

### Video File Requirements

#### **MANDATORY: All 3 Variants Required**
Every exercise with `has_video: true` **MUST** have all three video variants:

1. **Square (1080x1080)** - Mobile apps, social sharing
2. **Portrait (1080x1920)** - Mobile phones in portrait mode
3. **Landscape (1920x1080)** - Tablets, desktop, TV displays

#### File Naming Convention
```
/videos/{exercise-id}_v1_{width}x{height}.webm
```

Examples:
- `/videos/plank_v1_1080x1080.webm`
- `/videos/plank_v1_1080x1920.webm`
- `/videos/plank_v1_1920x1080.webm`

#### Technical Specifications
- **Format**: WebM (VP9 codec recommended)
- **Quality**: High quality for demonstration purposes
- **Duration**: 3-10 seconds showing 1 complete rep cycle
- **Loop**: Videos should loop seamlessly
- **Content**: Clear demonstration of proper form
- **Background**: Clean, minimal background
- **Person**: Diverse representation preferred

### Video Selection Logic
The `selectVideoVariant()` function automatically chooses the best video:

1. **Portrait screens** (height > width): Uses `portrait` variant
2. **Landscape screens** (width > height): Uses `landscape` variant
3. **Square/default**: Uses `square` variant
4. **Fallback order**: square → portrait → landscape → null

## 4. Workflow: Adding a New Exercise

### Step 1: Define Exercise Structure
Add exercise to `apps/frontend/src/data/exercises.ts`:

```typescript
createExercise({
  id: 'new-exercise',                    // Kebab-case unique ID
  name: 'New Exercise',                  // English fallback name
  description: 'Description here...',    // English fallback description
  category: ExerciseCategory.STRENGTH,   // Choose appropriate category
  exercise_type: ExerciseType.REPETITION_BASED,
  default_sets: 3,
  default_reps: 12,
  rep_duration_seconds: 2,               // Optional custom timing
  is_favorite: false,
  has_video: true,                       // Set to true if adding videos
  tags: ['tag1', 'tag2', 'tag3']        // Searchable tags
})
```

### Step 2: Add Translations
Update **ALL** locale files in `apps/frontend/public/locales/*/exercises.json`:

```json
{
  "new-exercise": {
    "name": "[Translated Name]",
    "description": "[Translated Description]"
  }
}
```

**Required locales**: `en`, `de`, `es`, `fr`, `nl`, `ar`, `ar-EG`, `fy`

### Step 3: Add Tag Translations (if new tags)
If introducing new tags, add them to the `tags` section in all locale files:

```json
{
  "tags": {
    "new-tag": "[Translated Tag]"
  }
}
```

### Step 4: Create Videos (if has_video: true)
Produce all 3 required video variants:

1. Record exercise demonstration
2. Edit into 3-10 second loops
3. Export in all 3 aspect ratios:
   - `new-exercise_v1_1080x1080.webm`
   - `new-exercise_v1_1080x1920.webm`
   - `new-exercise_v1_1920x1080.webm`
4. Place files in `apps/frontend/public/videos/`

### Step 5: Update Media Index
Add entry to `apps/frontend/public/exercise_media.json`:

```json
{
  "id": "new-exercise",
  "repsPerLoop": 1,
  "fps": 30,
  "video": {
    "square": "/videos/new-exercise_v1_1080x1080.webm",
    "portrait": "/videos/new-exercise_v1_1080x1920.webm",
    "landscape": "/videos/new-exercise_v1_1920x1080.webm"
  }
}
```

### Step 6: Verify Translations
Run translation scanner to ensure all keys are properly mapped:

```bash
pnpm i18n:scan
```

Fix any missing or misaligned translation keys.

### Step 7: Test Exercise
1. **Build verification**: `pnpm build` (includes media verification)
2. **UI testing**: Verify exercise appears correctly in all locales
3. **Video testing**: Test video playback in different viewport sizes
4. **Search testing**: Ensure tags and text are searchable

## 5. Categories and Types

### Exercise Categories
- `CORE` - Core strengthening exercises
- `STRENGTH` - Resistance and strength training
- `CARDIO` - Cardiovascular exercises
- `FLEXIBILITY` - Stretching and flexibility
- `BALANCE` - Balance and stability training
- `HAND_WARMUP` - Hand and finger mobility

### Exercise Types
- `TIME_BASED` - Hold for duration (uses `default_duration`)
- `REPETITION_BASED` - Count-based (uses `default_sets`, `default_reps`)

## 6. Build System Integration

### Media Verification
The build process includes automatic media verification:
- **Pre-build**: Verifies `exercise_media.json` exists
- **Post-build**: Verifies all referenced video files exist in build output
- **Failure behavior**: Build fails if videos missing for `has_video: true` exercises

### Translation Validation
- `pnpm i18n:scan` validates translation completeness
- Detects missing keys across all locales
- Ensures translation key consistency

## 7. Best Practices

### Exercise Design
- **Research-based defaults**: Use fitness industry standards for reps/duration
- **Beginner-friendly**: Default to accessible difficulty levels
- **Clear descriptions**: Concise, actionable instructions
- **Comprehensive tagging**: Include relevant searchable terms

### Video Production
- **Consistent quality**: Maintain visual consistency across exercises
- **Proper form**: Demonstrate correct technique clearly
- **Seamless loops**: Ensure videos loop naturally
- **Universal design**: Content accessible to diverse users

### Localization
- **Cultural sensitivity**: Ensure translations are culturally appropriate
- **Consistency**: Maintain consistent terminology across exercises
- **Professional quality**: Use native speakers for translations
- **Context awareness**: Consider exercise context in translations

## 8. Technical Implementation Details

### Exercise Resolution Flow
1. Component requests exercise data
2. `localizeExercise()` called with TypeScript exercise and `t` function
3. i18n system looks up `exercises.{id}.name` and `exercises.{id}.description`
4. Returns localized text with TypeScript fallbacks
5. Video system loads media index and selects appropriate variant

### Media Loading
- Media index cached in memory after first load
- Video URLs resolved based on viewport dimensions
- Graceful fallback for missing videos or network issues
- Security: Only serves predefined static asset paths

### Performance Considerations
- Exercise metadata loaded synchronously (small TypeScript bundle)
- Media index fetched asynchronously as needed
- Video files loaded on-demand for preview/playback
- Translation files loaded per locale as needed

---

## Quick Reference: File Checklist

When adding a new exercise with ID `exercise-id`:

### Required Files
- [ ] `apps/frontend/src/data/exercises.ts` - Exercise definition
- [ ] `apps/frontend/public/locales/en/exerciseDetails.json` - English translation
- [ ] `apps/frontend/public/locales/de/exerciseDetails.json` - German translation
- [ ] `apps/frontend/public/locales/es/exerciseDetails.json` - Spanish translation
- [ ] `apps/frontend/public/locales/fr/exerciseDetails.json` - French translation
- [ ] `apps/frontend/public/locales/nl/exerciseDetails.json` - Dutch translation
- [ ] `apps/frontend/public/locales/ar/exerciseDetails.json` - Arabic translation
- [ ] `apps/frontend/public/locales/ar-EG/exerciseDetails.json` - Egyptian Arabic translation
- [ ] `apps/frontend/public/locales/fy/exerciseDetails.json` - Frisian translation

### Optional Files (if has_video: true)
- [ ] `apps/frontend/public/exercise_media.json` - Media index entry
- [ ] `apps/frontend/public/videos/exercise-id_v1_1080x1080.webm` - Square video
- [ ] `apps/frontend/public/videos/exercise-id_v1_1080x1920.webm` - Portrait video
- [ ] `apps/frontend/public/videos/exercise-id_v1_1920x1080.webm` - Landscape video

### Verification Commands
- [ ] `pnpm i18n:scan` - Check translations
- [ ] `pnpm build` - Verify media files and build
- [ ] Manual testing in dev environment