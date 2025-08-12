# RepCue — Exercise Video Rendering Implementation Plan (develop branch)

Purpose: implement **optional exercise demo videos** in the timer UI when available, without breaking existing behavior. Videos are a **bonus** feature: if a clip isn’t present, keep today’s ring-only experience.

This plan assumes:
- `src/data/exercises.ts` now includes: `hasVideo: boolean` (default false) and `repDurationSeconds?: number` for repetition-based exercises.
- A separate `public/videos/**  (runtime assets, served to browser)` tree with assets.
- `exercise_media.json` (provided) lists video URLs per exercise (square/portrait/landscape), fps, and repsPerLoop.

We’ll add a thin integration layer that reads `exercise_media.json`, decides if/what to render, and syncs the loop boundary with your rep counter.

---

## High-level design

- **Source of truth**
  - `exercises.ts` remains the functional catalog (names, type, hasVideo, repDurationSeconds, …).
  - `exercise_media.json` supplies per-exercise **video URLs** + media metadata (`fps`, `repsPerLoop`, aspect variants).
  - We **gate** the UI by: `exercise.hasVideo === true` **AND** a matching entry exists in `exercise_media.json`. If either is missing → fallback to ring-only.

- **Playback**
  - `<video>` is **muted**, **autoplay**, **loop**, **playsInline**. It starts **only when the timer starts** and pauses/stops when the timer pauses/stops.
  - Repetition-based: loop contains **exactly one rep**; we **pulse/sync** the rep counter on each loop boundary.
  - Time-based holds (future): loop a **5–10s** silent clip continuously.

- **UI**
  - If the exercise has a video, keep the **progress ring(s)**. Enlarge the ring and render a **circular-cropped** video **inside** the ring area.
  - Respect **prefers-reduced-motion** and toggle video off for those users (fallback to ring-only).

- **Performance & cache**
  - Lazy-load the chosen variant (square/portrait/landscape) the moment the timer view mounts **but** delay `.play()` until the timer actually starts.
  - Extend the service worker to cache `/videos/**` (runtime caching, stale-while-revalidate).

- **Safety**
  - Ship behind a **feature flag**: `VIDEO_DEMOS_ENABLED` (env/config) and a per-device toggle in Settings.
  - Full test coverage (unit + e2e).

---

## Phases & tasks

### Phase 0 — Plumbing & flags (safe rollout)

Status: ✅ Completed 2025-08-12 (types, loader, feature flag, settings toggle). All existing 559 tests passing; no runtime video rendering yet.

**T-0.1 Add types and loader for `exercise_media.json`**
- **Files:** `src/types/media.ts`, `public/exercise_media.json (repo root public/)` (or `src/data/exercise_media.json` copied into `public` at build).  
- **Add types:**
  ```ts
  // src/types/media.ts
  export type ExerciseMedia = {
    id: string;
    repsPerLoop: 1 | 2;
    fps: 24 | 30;
    video: { square?: string; portrait?: string; landscape?: string };
  };
  export type ExerciseMediaIndex = Record<string, ExerciseMedia>;
  ```
- **Loader util:**
  ```ts
  // src/utils/loadExerciseMedia.ts
  import type { ExerciseMediaIndex } from '@/types/media';

  let cache: ExerciseMediaIndex | null = null;

  export async function loadExerciseMedia(): Promise<ExerciseMediaIndex> {
    if (cache) return cache;
    const res = await fetch('/exercise_media.json', { cache: 'no-store' });
    const list = (await res.json()) as Array<any>;
    cache = Object.fromEntries(list.map(e => [e.id, e]));
    return cache;
  }
  ```
- **Acceptance:** calling `loadExerciseMedia()` returns a map keyed by `exercise.id`.

**T-0.2 Feature flag + settings toggle**
- **Files:** `src/config/features.ts`, `src/state/settingsSlice.ts` (or context), `src/components/Settings/*`.
- Add `VIDEO_DEMOS_ENABLED` (default `true`) and a user setting: “Show demo videos when available” (default `true`).
- **Acceptance:** when either flag/setting is off, timer behaves exactly as today (no video elements rendered).

---

### Phase 1 — Video selection & hook
Status: ✅ Completed 2025-08-12 (selector util + useExerciseVideo hook + unit tests). No UI integration yet.

**T-1.1 Video selector util**
- **Files:** `src/utils/selectVideoVariant.ts`
- **Logic:**
  ```ts
  import type { ExerciseMedia } from '@/types/media';

  export function selectVideoUrl(m: ExerciseMedia, vw = window.innerWidth, vh = window.innerHeight) {
    // Prefer portrait if taller than wide; landscape if wider; else square.
    if (!m?.video) return null;
    if (vh > vw && m.video.portrait) return m.video.portrait;
    if (vw > vh && m.video.landscape) return m.video.landscape;
    return m.video.square ?? m.video.portrait ?? m.video.landscape ?? null;
  }
  ```
- **Acceptance:** returns best-fit URL for current viewport; null if none.

**T-1.2 `useExerciseVideo` hook**
- **Files:** `src/hooks/useExerciseVideo.ts`
- **Inputs:** `exercise` (from catalog), `mediaIndex` (from loader), `enabled` (feature+settings), `startSignal` (timer state), `repDurationSeconds?`.
- **Responsibilities:**
  - Resolve `mediaIndex[exercise.id]` (only if `exercise.hasVideo === true`).
  - Compute loop pulse timing: if `repsPerLoop===1`, emit a **loop boundary** event when the video wraps. Use `onTimeUpdate` and detect wrap by `currentTime < lastTime` (robust across browsers), or listen to `onEnded` if not looping then call `.play()`.
  - Expose a ref and controls: `{ videoRef, onLoopBoundary, ready, error }`.
- **Acceptance:** hook emits loop boundary reliably at each loop.

**T-1.3 Accessibility & reduced motion**
- In hook or parent, respect `window.matchMedia('(prefers-reduced-motion: reduce)')`. If true, **disable video** and fall back.

---

### Phase 2 — TimerPage integration (UI/UX)
Status: ✅ Completed 2025-08-12 (T-2.1, T-2.2, T-2.3)

**T-2.1 Inject circular video inside progress ring** ✅ Completed 2025-08-12
- **Files:** `src/pages/TimerPage.tsx` (and any ring subcomponents).
- **CSS:** Tailwind + mask/clip-path for circular crop.
  ```tsx
  <div className="relative mx-auto aspect-square w-full max-w-[min(90vw,540px)]">
    {/* Video container */}
    {showVideo && (
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          loop
          playsInline
          preload="metadata"      // no data until play
          className="h-full w-full object-cover"
          // Start only when timer starts:
          onLoadedData={() => started && videoRef.current?.play()}
        />
      </div>
    )}

    {/* Progress ring(s) overlay as today */}
    <svg className="absolute inset-0">{/* existing ring logic */}</svg>

    {/* Center labels: exercise name, reps/sets */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="sr-only md:not-sr-only md:text-white/90 text-center">
        <div className="text-sm font-medium">{exercise.displayName}</div>
        {isRepBased && showVideo && <div className="text-xs opacity-80">Loop of 1 rep</div>}
      </div>
    </div>
  </div>
  ```
- **Acceptance:** When `hasVideo` + media exists + flags on, the video appears inside the ring; otherwise ring-only.

**T-2.2 Sync rep counter on loop boundary (rep-based only)** ✅ Visual pulse implemented; authoritative rep logic unchanged; drift tests deferred (optional enhancement Phase 5 tests).
- Hook callback increments the **visual rep pulse** in lockstep with the video loop.
- **Acceptance:** rep counter pulse matches each video loop with ≤50ms drift across 2 minutes of repeats.

**T-2.3 Start/stop policy** ✅ Added `isActiveMovement` gating (excludes rest & countdown), pause during rest, seek/reset on stop; covered by updated unit tests.
- Only call `.play()` when the timer transitions to **running**. Pause on **pause**, stop on **reset/complete**.  
- **Acceptance:** Autoplay never starts before timer run; iOS works (muted + playsInline).

---

### Phase 3 — Fallbacks, errors, and caching

Status: In Progress (T-3.1 ✅ implemented in hook, T-3.2 ✅ caching rule added, T-3.3 pending)

**T-3.1 Graceful fallback** ✅ 2025-08-12
- If `hasVideo=true` but the file 404s, **hide the video container** and revert to ring-only (no toast/hint). Log to console for dev.
- **Acceptance:** broken link does not break the workout; no layout shift.

**T-3.2 Service worker cache rules** ✅ 2025-08-12
- Add runtime caching for `/videos/**` with **stale-while-revalidate**.
- Optional: set max entries (~60) and purge LRU.
- **Acceptance:** First play fetches from network; later replays are instant offline.

**T-3.3 Preload hint (optional)** ⏳ Pending
- Add `<link rel="prefetch">` for the chosen video URL when a set/exercise is about to start (if you have a pre-timer or upcoming preview).  
- **Acceptance:** Switch to next exercise starts within 100–200ms media delay on decent connections.

---

### Phase 4 — Settings, feature flag & analytics (optional but recommended)

**T-4.1 Settings UI**
- Add a toggle under Settings: “Show exercise demo videos (if available)”. Default `on`.
- **Acceptance:** Toggling off hides videos immediately; persists per device (local storage/state).

**T-4.2 Feature flag**
- Read `VIDEO_DEMOS_ENABLED` from `src/config/features.ts` or env.  
- **Acceptance:** Setting flag to `false` hides all videos regardless of per-user toggle.

**T-4.3 Minimal telemetry (optional)**
- Track which video URLs 404 (dev console or lightweight log). Helps keep `exercise_media.json` clean.

---

### Phase 5 — Tests

**Unit (Jest + React Testing Library)**
- **U-1 `selectVideoVariant`**: viewport permutations return expected URL (portrait/landscape/square); null safety.
- **U-2 `useExerciseVideo`**: emits loop boundary when `currentTime` wraps; respects disabled flags; pauses/plays with timer signals.
- **U-3 TimerPage**: renders circular video only when `hasVideo && mediaExists` and flags on.

**E2E (Cypress)**
- **E-1**: “With video” exercise starts timer → video plays; pausing timer pauses video; resuming resumes; completing stops.
- **E-2**: Rep-based: counter pulses exactly at loop boundary for ≥30 loops (tolerate small drift).
- **E-3**: Fallback when URL 404 → ring UI only, no errors visible.
- **E-4**: Settings toggle hides/shows videos dynamically.
- **E-5**: `prefers-reduced-motion` spoofed → video disabled.

---

## Task breakdown with estimates

| ID | Task | Est. |
|----|------|------|
| T-0.1 | Types + loader for `exercise_media.json` | 0.5 d |
| T-0.2 | Feature flag + settings toggle | 0.5 d |
| T-1.1 | Video variant selector util | 0.25 d |
| T-1.2 | `useExerciseVideo` hook (playback + loop sync) | 1.0 d |
| T-1.3 | Reduced-motion handling | 0.25 d |
| T-2.1 | TimerPage circular video integration | 0.75 d |
| T-2.2 | Rep counter sync on loop boundary | 0.5 d |
| T-2.3 | Start/stop policy wiring to timer state | 0.25 d |
| T-3.1 | Fallbacks on error/404 | 0.25 d |
| T-3.2 | Service worker runtime caching for `/videos/**` | 0.5 d |
| T-3.3 | Prefetch for “up next” exercise (optional) | 0.25 d |
| T-4.* | Settings UI + feature flag plumbing | 0.5 d |
| T-5.* | Unit + E2E tests | 1.0–1.5 d |

---

## Implementation details (copy-ready snippets)

### 1) Feature flag
```ts
// src/config/features.ts
export const VIDEO_DEMOS_ENABLED = true;
```

### 2) Settings (example with Zustand/Context)
```ts
// src/state/settings.ts
import { create } from 'zustand';

type SettingsState = {
  showVideos: boolean;
  setShowVideos: (v: boolean) => void;
};

export const useSettings = create<SettingsState>((set) => ({
  showVideos: true,
  setShowVideos: (v) => set({ showVideos: v }),
}));
```

### 3) Load media + select variant
```ts
// src/pages/TimerPage.tsx (excerpt)
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadExerciseMedia } from '@/utils/loadExerciseMedia';
import { selectVideoUrl } from '@/utils/selectVideoVariant';
import { useSettings } from '@/state/settings';
import { VIDEO_DEMOS_ENABLED } from '@/config/features';

// ...
const [mediaIndex, setMediaIndex] = useState<Record<string, any> | null>(null);
useEffect(() => { loadExerciseMedia().then(setMediaIndex).catch(() => setMediaIndex({})); }, []);

// decide
const showVideosSetting = useSettings(s => s.showVideos);
const enableVideos = VIDEO_DEMOS_ENABLED && showVideosSetting && !prefersReducedMotion;

const media = exercise.hasVideo && mediaIndex ? mediaIndex[exercise.id] : null;
const videoUrl = useMemo(() => media ? selectVideoUrl(media) : null, [media]);

```

### 4) Sync to timer (rep-based)
```ts
// inside TimerPage component
const videoRef = useRef<HTMLVideoElement | null>(null);
const lastTimeRef = useRef(0);

useEffect(() => {
  const v = videoRef.current;
  if (!v) return;
  const onTimeUpdate = () => {
    const t = v.currentTime;
    if (t < lastTimeRef.current - 0.05) {
      // wrapped to 0 => loop boundary
      if (isRepBased) pulseRepCounter(); // existing UI method
    }
    lastTimeRef.current = t;
  };
  v.addEventListener('timeupdate', onTimeUpdate);
  return () => v.removeEventListener('timeupdate', onTimeUpdate);
}, [isRepBased]);

// start/stop with timer
useEffect(() => {
  const v = videoRef.current;
  if (!v) return;
  if (!enableVideos || !videoUrl) { v.pause(); return; }
  if (timerState === 'running') v.play().catch(()=>{});
  else v.pause();
}, [timerState, enableVideos, videoUrl]);
```

### 5) Circular crop with Tailwind
```tsx
{enableVideos && videoUrl && (
  <div className="absolute inset-0 rounded-full overflow-hidden will-change-transform">
    <video
      ref={videoRef}
      src={videoUrl}
      muted
      loop
      playsInline
      preload="metadata"
      className="h-full w-full object-cover"
      aria-label={`${exercise.displayName} demo video, loop of 1 rep`}
    />
  </div>
)}
```

### 6) Service worker (workbox-like pseudo)
```js
// sw.js (or service-worker.ts)
workbox.routing.registerRoute(
  ({url}) => url.pathname.startsWith('/videos/'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'videos',
    plugins: [
      new workbox.expiration.ExpirationPlugin({ maxEntries: 60, purgeOnQuotaError: true }),
    ],
  }),
);
```

---

## Data: mapping & consistency

- Keep `exercise_media.json` in repo (root `public/`), so fetch is `/exercise_media.json`.  
- Filenames should follow the convention used in the JSON (already provided).  
- For **rep-based** exercises, prefer `exercise.repDurationSeconds` for pacing the **ring**; the **video loop** is self-timed (1 loop = 1 rep). We do **not** stretch video; we sync the rep pulse to the loop boundary.

---

## Acceptance criteria (end-to-end)

- ✅ With flags on and a valid `exercise_media.json`, **exercises with `hasVideo=true`** render a circular video inside the ring; others look unchanged.
- ✅ Video **starts only** when the timer starts; pauses on pause; stops on reset/complete.
- ✅ Rep-based: rep counter **pulses** exactly on loop boundary for each repetition.
- ✅ If a video URL 404s or fails, UI falls back quietly to ring-only.
- ✅ `prefers-reduced-motion` disables videos automatically.
- ✅ Service worker caches video responses and replays them offline later.
- ✅ Unit + e2e tests pass.

---

## Open questions (set defaults if not answered)
- Do you want portrait variant on phones **always**, or still choose by viewport (default: by viewport)?
- For TIME_BASED holds, choose **5s** or **10s** loop as standard? (default: 5s for better divisibility of 15/25s)
- Any need for **global volume** (currently all videos are muted; audio cues remain as-is)?
- Do we want to surface a **tiny “HD”/“SD” selector** for slow devices (default: no; rely on caching + smaller encodes)?

---

## How to ship safely
1) Merge Phase 0 → deploy to a staging build with the feature flag **off**.  
2) Enable the flag and test on iOS Safari + Android Chrome.  
3) Roll out gradually; keep the Settings toggle visible for quick disable.  
4) Monitor for errors (404s, play() rejection).

---

## Files to add
- `src/types/media.ts`
- `src/utils/loadExerciseMedia.ts`
- `src/utils/selectVideoVariant.ts`
- (Optionally) `src/hooks/useExerciseVideo.ts` (or keep logic in TimerPage)
- Service worker change (if applicable)

---

## Ready-to-import assets
- Place the generated videos under `public/videos/**  (runtime assets, served to browser)`.  
- Ensure `public/exercise_media.json (repo root public/)` matches the actual filenames. (A sample file has already been provided.)
