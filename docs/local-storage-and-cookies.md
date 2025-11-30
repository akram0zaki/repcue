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
| `repcue_consent` | Stores consent record (version, timestamps, flags for cookies/analytics/marketing, retention days, and legal document acceptances array). | On first run after you accept legal documents and choose consent options. | Until you revoke consent or clear browser storage. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `i18nextLng` | Your chosen language so the app opens in the same language next time. | When you pick a language (or detector caches it). | Until cleared by you/browser. | Clearing site storage. |
| `repcue_install_prompt_dismissed` | Timestamp to pause re‑showing the install prompt. | When you dismiss the PWA install prompt. | Install prompt is cooled down for 7 days; the key persists until replaced/cleared. | Clearing site storage. |
| `repcue_install_analytics` | Local, privacy‑preserving install analytics (last ~50 entries). Never sent to a server. | When install prompt is shown/accepted/dismissed. | Until you clear app data; bounded to last 50 entries. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue_last_prompt_date` | Internal timestamp used by the install flow. | During install flow when applicable. | Until cleared. | Clearing site storage. |
| `repcue-onboarding-state` | Tracks onboarding progress if you installed the PWA. | When onboarding starts. | Until cleared. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue-first-launch` | Marks that the app has been launched at least once. | After your first launch. | Until cleared. | Clearing site storage. |
| `repcue_video_errors_v1` | Local-only telemetry of exercise video load failures; written only when analytics consent is granted. | When a demo video fails to load and analytics consent is on. | Until cleared; bounded to last 50 records. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue_device_id` | Unique device identifier for sync correlation. | On first sync operation. | Until cleared. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue_update_state` | Tracks PWA update state (version, check time, etc.). | When app checks for updates. | Until cleared. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue_update_preferences` | User preferences for automatic updates. | When you change update settings. | Until cleared. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue_previous_version` | Stores previous version for rollback scenarios. | During update process. | Until cleared. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue_rollback_available` | Flag indicating a rollback is available. | When an update completes with rollback support. | Until cleared. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue_workout_recovery_data` | Temporarily stores workout state for force-update recovery. | During a force update while workout is active. | Until workout is recovered. | After successful recovery or browser storage clear. |
| `repcue_claim_ownership_done_{userId}` | Tracks whether ownership claim has been attempted for a user. | After first sync following authentication. | Until cleared. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `repcue_dismissed_insights` | Tracks which AI Coach insights have been dismissed. | When you dismiss a coaching insight. | Dismissed insights expire after 24 hours. | Settings → Clear All Data & Reset App, or browser storage clear. |
| `exercise-page-filters` | Persists exercise list filter state (catalog, search, badges). | When you apply filters on the Exercises page. | Until cleared. | Settings → Clear All Data & Reset App, or browser storage clear. |

Notes:
- All localStorage writes are client‑side only; the app does not send these values to any server.
- The consent record includes `dataRetentionDays` (default 365) as a policy field; current builds do not automatically purge data on that timer, but the value is kept to support future retention automation.

### IndexedDB databases (not cookies)

RepCue uses IndexedDB for your exercise data. All writes require storage consent.

- `RepCueDB`
  - `exercises`: built‑in and user‑modified exercise data
  - `catalog_memberships`: many-to-many relationships between exercises and catalogs
  - `activity_logs`: your activity/workout history
  - `user_preferences`: UI preferences (locale, units, etc.)
  - `app_settings`: timer, audio, appearance, and feature toggles
  - `user_favorites`: favorited exercises and workouts
  - `workouts`: saved workout definitions
  - `workout_sessions`: completed workout session summaries
  - `video_files`: locally cached video files for offline use
  - `exercise_catalogs`: exercise catalog metadata (seeded, not synced)
  - `personal_records`: personal achievement records (max reps, duration, etc.)
  - `user_profiles`: user fitness profiles for AI workout builder
  - `sync_state`: sync cursors and metadata per user
  - TTL: persists until you clear data (Settings → Clear All Data & Reset App) or clear site storage in your browser.

Note: For authenticated users with cloud sync enabled, legal document acceptances are also synced to Supabase (`legal_acceptances` table) to provide cross-device consistency. This sync is automatic and secure with Row Level Security policies.

- `RepCueQueue`
  - Offline operation queue for future sync features
  - TTL: persists until cleared; entries are automatically cleaned up over time by the app logic.

### PWA caches (not cookies)

Managed by the Service Worker for offline use. Examples: static assets and optional exercise videos. These are caches, not cookies.

- Static app assets: cached for offline; updated automatically on new versions.
- Exercise video runtime cache: up to ~60 entries, approximately 30 days retention with stale‑while‑revalidate strategy.

### What your first‑run choice means

Before using RepCue, you'll first see a **Legal Gate** that requires you to accept legal documents (Terms & Conditions, Privacy Policy, Cookie Policy, etc.). After accepting the legal documents, you'll see the consent banner.

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

- Go to `Settings` → `Clear All Data & Reset App` to delete IndexedDB tables and most localStorage keys while preserving just the minimal consent record needed for the reset; or clear site storage in your browser to remove everything, including consent and legal acceptances.

### Legal document acceptance

RepCue implements a comprehensive Legal Acceptance System V3 that tracks your acceptance of various legal documents:

- **Required Documents**: Terms & Conditions, Privacy Policy, Cookie Policy, Medical Disclaimer, Liability Waiver
- **Optional Documents**: Data Processing Agreement, Subscription Policy, Community Guidelines

**How it works:**
1. On first run, you'll see a **Legal Gate** modal requiring acceptance of all required documents before accessing the app
2. Your acceptance is recorded locally with document version, content hash, locale, and timestamp
3. For authenticated users, acceptances sync to the cloud for cross-device consistency
4. You can review all accepted documents and their versions in `Settings` → `Legal Center`

**Document updates:**
- When legal documents are updated, you'll be notified based on the update policy:
  - **Force policy**: Requires immediate acceptance (blocks app access until accepted)
  - **Deferred policy**: Allows you to continue using the app; acceptance required by the effective date

**Your rights:**
- View all legal documents at any time via `Settings` → `Legal Center`
- See which versions you've accepted and when
- Re-read documents before accepting updates
- Your acceptance history is maintained for audit purposes

All legal document acceptances are GDPR-compliant and include version tracking, content hashing for integrity, and timestamped acceptance records.


