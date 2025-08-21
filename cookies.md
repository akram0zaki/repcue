## RepCue Cookies and Storage Inventory

### Do we use cookies?

**No. RepCue does not set or read any browser cookies.**

- No `document.cookie` usage in the app.
- The server (`server.js`) sends no `Set-Cookie` headers.
- No third‑party scripts are loaded; there are no third‑party cookies.

Instead, RepCue stores data locally using `localStorage`, `IndexedDB` (via Dexie), and PWA caches managed by the Service Worker. The sections below list exactly what may be stored, why, and for how long.

### LocalStorage keys (not cookies)

| Key | Purpose | Created When | TTL / Expiry | Removed When |
| --- | --- | --- | --- | --- |
| `repcue_consent` | Stores consent record (version, timestamps, flags for cookies/analytics/marketing, retention days). | On first run after you choose an option in the consent banner. | Until you revoke consent or clear browser storage. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `i18nextLng` | Your chosen language so the app opens in the same language next time. | When you pick a language (or detector caches it). | Until cleared by you/browser. | Clearing site storage. |
| `repcue_install_prompt_dismissed` | Timestamp to pause re‑showing the install prompt. | When you dismiss the PWA install prompt. | Install prompt is cooled down for 7 days; the key persists until replaced/cleared. | Clearing site storage. |
| `repcue_install_analytics` | Local, privacy‑preserving install analytics (last ~50 entries). Never sent to a server. | When install prompt is shown/accepted/dismissed. | Until you clear app data; bounded to last 50 entries. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue_last_prompt_date` | Internal timestamp used by the install flow. | During install flow when applicable. | Until cleared. | Clearing site storage. |
| `repcue-onboarding-state` | Tracks onboarding progress if you installed the PWA. | When onboarding starts. | Until cleared. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue-first-launch` | Marks that the app has been launched at least once. | After your first launch. | Until cleared. | Clearing site storage. |
| `repcue_video_errors_v1` | Local-only telemetry of exercise video load failures; written only when analytics consent is granted. | When a demo video fails to load and analytics consent is on. | Until cleared; bounded to last 50 records. | Settings → Clear All Data & Reset App, or browser storage clear. |

Notes:
- All localStorage writes are client‑side only; the app does not send these values to any server.
- The consent record includes `dataRetentionDays` (default 365) as a policy field; current builds do not automatically purge data on that timer, but the value is kept to support future retention automation.

### IndexedDB databases (not cookies)

RepCue uses IndexedDB for your exercise data. All writes require storage consent.

- `RepCueDB`
  - `exercises`: built‑in and user‑modified exercise data
  - `activityLogs`: your activity/workout history
  - `userPreferences`: UI preferences
  - `appSettings`: timer, audio, appearance and feature toggles
  - `workouts`: saved workouts
  - `workoutSessions`: completed workout session summaries
  - TTL: persists until you clear data (Settings → Clear All Data & Reset App) or clear site storage in your browser.

- `RepCueQueue`
  - Offline operation queue for future sync features
  - TTL: persists until cleared; entries are automatically cleaned up over time by the app logic.

### PWA caches (not cookies)

Managed by the Service Worker for offline use. Examples: static assets and optional exercise videos. These are caches, not cookies.

- Static app assets: cached for offline; updated automatically on new versions.
- Exercise video runtime cache: up to ~60 entries, approximately 30 days retention with stale‑while‑revalidate strategy.

### What your first‑run choice means

When you see the consent banner:

- **Essential Only**
  - Grants storage consent for functional data (exercises, activity logs, settings, workouts, onboarding state, language, install prompt cooldown).
  - Declines analytics: the app will not record local video‑error telemetry and any future analytics‑gated features stay off.
  - No data is sent to any server.

- **Accept All & Continue**
  - Grants the same essential storage consent.
  - Also enables analytics: local, privacy‑preserving telemetry such as video‑error records may be written. These remain on your device and are never transmitted.
  - Marketing stays off by default (there is no marketing tracking in the app).

You can change or revoke your choice anytime in `Settings`.

### How to erase everything

- Go to `Settings` → `Clear All Data & Reset App` to delete IndexedDB tables and most localStorage keys while preserving just the minimal consent record needed for the reset; or clear site storage in your browser to remove everything, including consent.


