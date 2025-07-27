# RepCue: Exercise Tracker App - Full Implementation Plan (For AI Coding Assistant)

## Overview

This document defines the complete implementation roadmap for building a web-based exercise tracker compliant with EU regulations and designed for high usability and future mobile readiness.

---

## 1. Architecture & Design

### System Architecture Diagram

```
[ Browser UI ] <---> [ React + Tailwind + Accessibility Layer ]
      |                          |
      |                   [ IndexedDB / localStorage ]
      |                          |
[ Firebase/Supabase Backend ] <==> [ Auth (OTP) + Firestore DB ]
```

### Design Principles

* **Usability**: Big buttons, minimal steps, mobile-first layout
* **Compliance**: GDPR (consent + deletion), European Accessibility Act (WCAG 2.1)
* **Extensibility**: Modular logic for timer, logging, auth, sync
* **Portability**: Web-first, React Native-ready

### Tech Stack

| Component       | Technology                                     |
| --------------- | ---------------------------------------------- |
| Frontend        | React + TypeScript + Tailwind CSS              |
| Accessibility   | ARIA + Axe-core + keyboard nav support         |
| Storage (local) | IndexedDB (Dexie.js) or localStorage           |
| Backend         | Firebase or Supabase (EU-compliant)            |
| Auth            | Firebase OTP (email)                           |
| Mobile App      | React Native (shared logic)                    |
| Notifications   | Web Audio API, Vibration API                   |
| Testing         | Jest (unit), Cypress (integration), Axe (a11y) |

---

## 2. Wireframes (Key Screens)

1. **Home Screen**

   * Start/Stop button
   * Current timer display
   * Sound toggle
2. **Exercise Picker**

   * Grid of exercises (searchable + favorites)
3. **Activity Log**

   * Grouped by date
   * Exercise type, duration, timestamp
4. **Profile Settings**

   * User ID (cookie/OTP)
   * Data export/delete options
5. **Cookie Consent Banner**

   * Prompt on first visit (GDPR)

---

## 3. Implementation Phases

### Phase 1: Local MVP (with Consent)

#### Features

* Interval timer with sound/vibration
* Exercise selection & favorites
* Activity log stored locally
* Responsive UI + Accessibility
* Cookie consent before data is stored

#### Tasks

* `T1.1`: Set up React app with routing and layout
* `T1.2`: Implement Timer logic with beeps & vibration
* `T1.3`: Build Exercise Picker UI (grid + tags + fav toggle)
* `T1.4`: Build Activity Logger (localStorage or IndexedDB)
* `T1.5`: Build Consent Manager (cookie + tracking opt-in)
* `T1.6`: Apply WCAG accessibility best practices
* `T1.7`: Add unit and integration tests

#### Acceptance Criteria

* ✅ Timer functions with 15s/30s/60s options
* ✅ Consent must be granted before any data storage
* ✅ Exercises can be selected and marked as favorite
* ✅ Logs are created with date/time/exercise info
* ✅ All UI accessible by keyboard with contrast-friendly design

#### Tests

* **Unit**: `timer.test.ts`, `log.test.ts`, `consent.test.ts`
* **Integration**: `exerciseFlow.cy.ts`, `timerLogFlow.cy.ts`
* **Accessibility**: `axe.cy.ts`, manual keyboard test

---

### Phase 2: Profile Sync & GDPR

#### Features

* Cookie-based anonymous ID
* OTP email auth (optional login)
* Cloud log sync (Firestore/Supabase)
* Data export + deletion option

#### Tasks

* `T2.1`: Generate unique ID and store in cookie
* `T2.2`: Add Firebase/Supabase OTP email login
* `T2.3`: Sync local logs to cloud when logged in
* `T2.4`: Implement export to JSON (per GDPR)
* `T2.5`: Implement deletion logic and confirmation
* `T2.6`: Integrate unit/integration tests

#### Acceptance Criteria

* ✅ Profile is persisted via cookie with consent
* ✅ Users can log in via OTP and sync logs
* ✅ Logs are available across devices
* ✅ Export and deletion functions comply with GDPR

#### Tests

* **Unit**: `auth.test.ts`, `sync.test.ts`, `gdprExport.test.ts`
* **Integration**: `authSync.cy.ts`, `dataRemoval.cy.ts`

---

### Phase 3: Mobile Port (PWA + React Native)

#### Features

* PWA support with offline logging
* React Native build with shared business logic
* Installable on iOS/Android

#### Tasks

* `T3.1`: Add PWA manifest & service worker
* `T3.2`: Enable offline fallback + sync queue
* `T3.3`: Scaffold React Native app
* `T3.4`: Share timer/logging logic via library or monorepo
* `T3.5`: Test mobile installs + offline logs

#### Acceptance Criteria

* ✅ App is installable from browser
* ✅ React Native app has full parity with web
* ✅ Offline logs are synced when online

#### Tests

* **Unit**: `offlineLog.test.ts`, `pwaSync.test.ts`
* **Integration**: `installability.cy.ts`, `nativeLogFlow.cy.ts`

---

## Final Note

This implementation plan ensures:

* Compliance with EU regulations (GDPR, Accessibility Act)
* Seamless user experience across devices
* Strong test coverage and future extensibility

You can now feed this plan into an AI coding assistant to scaffold the project. Let me know if you need mockups, component specs, or code templates next.
