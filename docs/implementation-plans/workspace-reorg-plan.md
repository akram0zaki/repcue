
# RepCue Workspace Reorganization Proposal — Split Frontend & Backend

**Date:** 2025‑08‑23  
**Repo:** `github.com/akram0zaki/repcue`  
**Author:** ChatGPT (proposal)

---

## 1) Why reorganize? (Goals)

- Clean separation of concerns: UI (React/Vite) vs API/server (Express/PM2).
- Easier local dev (Vite + API proxy), CI, testing, and Raspberry Pi deployment.
- Enable shared types/utilities without leaking build tooling between app layers.
- Keep **all current folders and critical framework files** accounted for.

---

## 2) Current layout (as of main branch)

Top‑level (abridged to key items):

```
/.cursor/
/.github/
/cypress/
/docs/
/public/
/scripts/
/src/                 # React app source
.eslint-output.txt
.gitignore
CHANGELOG.md
LICENSE
README.md
consent.md
cookies.md
cypress.config.mjs
ecosystem.config.cjs  # PM2
eslint.config.js
index.html            # Vite entry
package-lock.json
package.json
postcss.config.js
server.js             # Express server
start.bat
start.sh
tailwind.config.js
tsconfig*.json
vite.config.ts
vitest*.config.ts
```
This is a **single‑package** repo containing both the Vite/React frontend and the Express server.

---

## 3) Target layout (apps + packages mono‑repo)

We’ll convert to a light mono‑repo with **2 apps** and **1 shared package**. This keeps your Pi deployment simple while allowing modular growth.

```
repcue/
├─ apps/
│  ├─ frontend/                        # Vite + React + Tailwind (current UI)
│  │  ├─ public/                       # moved from repo /public
│  │  ├─ src/                          # moved from repo /src
│  │  ├─ index.html                    # moved from root
│  │  ├─ vite.config.ts                # moved from root (updated proxy)
│  │  ├─ tailwind.config.ts|js         # moved from root (paths updated)
│  │  ├─ postcss.config.js             # moved from root
│  │  ├─ tsconfig.app.json             # moved from root (optional keep)
│  │  ├─ vitest.config.ts              # moved from root (frontend tests)
│  │  ├─ package.json                  # new (frontend scripts only)
│  │  └─ ... (any UI‑only configs)
│  └─ backend/                         # Express + PM2 (+ static serve in prod)
│     ├─ src/                          # (optional) if we TS‑ify backend later
│     ├─ server.js                     # moved from root
│     ├─ ecosystem.config.cjs          # moved from root
│     ├─ pm2.config.cjs                # (alias; optional)
│     ├─ package.json                  # new (backend scripts only)
│     ├─ tsconfig.json                 # (if TypeScript added later)
│     └─ Dockerfile                    # (optional future)
├─ packages/
│  └─ shared/                          # Shared types/constants/utils
│     ├─ src/
│     │  ├─ types.d.ts / types.ts
│     │  ├─ constants.ts
│     │  └─ env.ts (runtime schema, zod optional)
│     └─ package.json
├─ tests/
│  ├─ e2e/                             # Cypress root
│  └─ ui/                              # Vitest UI integration (optional)
├─ .github/                            # stays (workflows updated to workspaces)
├─ .cursor/                            # stays (optionally scoped to sub‑paths)
├─ docs/                               # stays (i18n docs etc.)
├─ scripts/                            # stays (update paths inside scripts)
├─ package.json                        # workspaces + root scripts
├─ pnpm-lock.yaml|yarn.lock            # recommend pnpm or yarn workspaces
├─ turbo.json                          # (optional) Turborepo for caching/pipelines
├─ README.md                           # updated root docs
└─ CHANGELOG.md                        # stays
```

> **Why not put Cypress under `apps/frontend`?**  
> We keep end‑to‑end tests in `/tests/e2e` so they can exercise both apps (frontend + backend) from one neutral root. UI‑only component tests remain in `apps/frontend` with Vitest.

---

## 4) Workspaces & package manifests

### 4.1 Root `package.json` (workspaces)

```jsonc
{
  "name": "repcue",
  "private": true,
  "packageManager": "pnpm@9.7.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "pnpm -C apps/backend dev & pnpm -C apps/frontend dev",
    "dev:fe": "pnpm -C apps/frontend dev",
    "dev:be": "pnpm -C apps/backend dev",
    "build": "pnpm -C apps/frontend build && pnpm -C apps/backend build",
    "test": "pnpm -C apps/frontend test && pnpm -C apps/backend test",
    "e2e": "pnpm -C tests/e2e cypress:run",
    "lint": "pnpm -C apps/frontend lint && pnpm -C apps/backend lint",
    "pm2:start": "pnpm -C apps/backend pm2:start",
    "pm2:stop": "pnpm -C apps/backend pm2:stop",
    "pm2:logs": "pnpm -C apps/backend pm2:logs"
  }
}
```

> You can keep `npm` if you prefer, but **pnpm** or **yarn** simplifies workspaces and reduces install time.


### 4.2 `apps/frontend/package.json`

```jsonc
{
  "name": "@repcue/frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:ui": "vitest --ui",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.27.0",
    "@repcue/shared": "workspace:*"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "eslint": "^9.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### 4.3 `apps/backend/package.json`

```jsonc
{
  "name": "@repcue/backend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "node server.js",
    "build": "echo "(optional) compile TS if added"",
    "start": "node server.js",
    "pm2:start": "pm2 start ecosystem.config.cjs --env production",
    "pm2:stop": "pm2 delete repcue || true",
    "pm2:logs": "pm2 logs repcue"
  },
  "dependencies": {
    "express": "^4.19.2",
    "@repcue/shared": "workspace:*"
  },
  "devDependencies": {
    "pm2": "^5.3.0",
    "typescript": "^5.5.0"
  }
}
```

### 4.4 `packages/shared/package.json`

```jsonc
{
  "name": "@repcue/shared",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

---

## 5) File‑by‑file migration map

| Current | New | Notes |
|---|---|---|
| `/src/**` | `/apps/frontend/src/**` | Pure UI code moves here (components, pages, services used by UI). |
| `/public/**` | `/apps/frontend/public/**` | i18n locales under `public/locales` move intact. |
| `/index.html` | `/apps/frontend/index.html` | Update asset paths if any absolute. |
| `/vite.config.ts` | `/apps/frontend/vite.config.ts` | Add **dev proxy** to backend (`/api` to `http://localhost:3001`). |
| `/tailwind.config.js` | `/apps/frontend/tailwind.config.js` | Update `content` globs to new paths. |
| `/postcss.config.js` | `/apps/frontend/postcss.config.js` | As‑is. |
| `/vitest*.config.ts` | `/apps/frontend/vitest*.config.ts` | Keep UI tests with FE. |
| `/cypress/**` | `/tests/e2e/**` | Update `cypress.config.mjs` baseUrl and paths. |
| `/cypress.config.mjs` | `/tests/e2e/cypress.config.mjs` | Point to frontend preview port; use API via `/api`. |
| `/server.js` | `/apps/backend/server.js` | Keep health route; serve static build in prod from FE `dist/`. |
| `/ecosystem.config.cjs` | `/apps/backend/ecosystem.config.cjs` | Update working directory and script path. |
| `/eslint.config.js` | `apps/frontend/eslint.config.js` + `apps/backend/.eslintrc.cjs` | Split if rules differ; or keep one root with overrides. |
| `/tsconfig*.json` | `apps/frontend/*` (+ optionally backend) | Frontend keeps `tsconfig.*`. Backend TS is optional now. |
| `/scripts/**` | `/scripts/**` (root) | Adjust paths inside scripts to new locations. |
| `.github/**` | `.github/**` | Update CI to use workspaces and per‑app jobs. |
| `start.sh` / `start.bat` | `/apps/backend/start.*` (or delete) | Prefer `pm2`/`npm` scripts instead. |
| `README.md`, `consent.md`, `cookies.md`, `docs/**` | (root, unchanged) | Update docs to new paths (screenshots, commands). |
| `.cursor/` | (root) | Optionally add ignore patterns for moved files. |

---

## 6) Dev experience: Vite proxy & API routing

**Vite (frontend) dev proxy** in `apps/frontend/vite.config.ts`:
```ts
export default {
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001"
    }
  }
};
```

**Express (backend)** keeps the same API shape, adds static in production:
```js
// apps/backend/server.js
import express from "express";
import path from "path";
const app = express();

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// API routes under /api/*
app.get("/api/version", (_req, res) => res.json({ name: "RepCue", version: "1.0" }));

// Serve built frontend in production
if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(process.cwd(), "../frontend/dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(process.env.PORT || 3001, () => {
  console.log("Backend listening on", process.env.PORT || 3001);
});
```

---

## 7) PM2 on Raspberry Pi (no behavioral change)

`apps/backend/ecosystem.config.cjs`:
```js
module.exports = {
  apps: [{
    name: "repcue",
    cwd: __dirname,
    script: "server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3001
    }
  }]
};
```

**Build & deploy:**
```bash
pnpm -w i
pnpm -w build
pnpm -C apps/backend pm2:start   # uses ecosystem.config.cjs
```

> This continues to serve the built frontend from `apps/frontend/dist/` in production.

---

## 8) Testing layout

- **Unit/Integration (UI):** `apps/frontend` with Vitest (unchanged behavior).
- **E2E (full stack):** `tests/e2e` with Cypress hitting `http://localhost:4173` (preview) or your deployed Pi URL.
- **Backend tests (optional):** add `apps/backend/test/**` with your preferred runner (Vitest/Jest).

`tests/e2e/cypress.config.mjs` (example):
```js
export default {
  e2e: {
    baseUrl: "http://localhost:4173", // vite preview
    specPattern: "tests/e2e/**/*.cy.{js,ts}"
  }
}
```

---

## 9) CI (GitHub Actions) sketch

- **Install:** use `pnpm/action-setup`, enable workspace caching.
- **Jobs:** `lint`, `test`, `build` (frontend & backend).  
- **Artifacts:** upload `apps/frontend/dist/` for preview deploys; backend not required unless Dockerizing.

Example matrix (abridged):
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm -w i
      - run: pnpm -w lint && pnpm -w test && pnpm -w build
      - uses: actions/upload-artifact@v4
        with:
          name: repcue-frontend-dist
          path: apps/frontend/dist
```

---

## 10) Environment & shared code

- Put **runtime env parsing** in `packages/shared/src/env.ts` (e.g., using `zod`), and import from both apps.
- Shared **types/constants** (e.g., exercise categories, i18n enums) live in `@repcue/shared`.
- Avoid FE bundling server‑only deps by keeping shared strictly isomorphic or split into `shared/node` vs `shared/web` subpaths if needed.

---

## 11) Migration checklist (do this in a feature branch)

1. Create branch `feat/workspaces-reorg`.
2. Add root workspaces `package.json` and choose `pnpm` (or keep npm + `workspaces`).
3. Create `apps/frontend` and **move**: `/src`, `/public`, `index.html`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `vitest*.config.ts`, `tsconfig*.json` (frontend ones).
4. Create `apps/backend` and **move**: `server.js`, `ecosystem.config.cjs`, (optionally) `start.*` or delete.
5. Create `packages/shared` and move/promote shared types/constants from FE as needed.
6. Move `/cypress` to `/tests/e2e` and update `cypress.config.mjs` paths.
7. Update all **import paths** in FE (if any rely on old relative depth).
8. Update `scripts/**` and `.github/workflows/**` to new paths.
9. Update docs (`README.md`, i18n docs) with new commands and locations.
10. Run: `pnpm -w i && pnpm -w build && pnpm -w test`.
11. On Pi: `git pull`, `pnpm -w i`, `pnpm -w build`, `pnpm -C apps/backend pm2:restart`.
12. Merge via PR; tag release (e.g., `v0.3.0`), update `CHANGELOG.md`.

---

## 12) Acceptance criteria

- `pnpm -w dev` starts FE (5173) and BE (3001) with working proxy to `/api`.
- `pnpm -w build` emits `apps/frontend/dist/` and backend remains startable (`pm2:start`) and serves FE statically in prod.
- Cypress E2E can run from `/tests/e2e` against preview build.
- Docs updated; i18n assets intact; GDPR consent pages unaffected.
- Raspberry Pi deployment via PM2 works exactly as before (same URL behavior).

---

## 13) Notes specific to your repo

- **i18n:** Your `public/locales/**` remains under `apps/frontend/public/locales/**`. No runtime change.
- **Privacy docs:** `consent.md`, `cookies.md` stay at root; linked from app as before (update paths if imported).
- **PM2 & health:** Keep `/health` route in backend; consider moving feature flags to env + shared constants.
- **`index.html`:** Verify any absolute paths. Vite prefers relative by default.
- **Testing counts in README:** After moves, re‑run coverage and update figures.
- **`ecosystem.config.cjs`:** Ensure `cwd` points to `apps/backend` or use absolute paths.

---

## 14) Optional next steps

- Add **Turborepo** to speed builds/tests across workspaces.
- Convert backend to **TypeScript** gradually (drop‑in `ts-node` for dev or build to `dist`).
- Add **Dockerfiles** per app for alternative deployments.
- Introduce **OpenAPI** for typed API contracts and `@repcue/shared` client generation.

---

### Appendix A — Minimal backend `server.js` (current parity)

```js
import express from "express";
const app = express();
app.get("/health", (_req, res) => res.json({ status: "ok" }));
// mount future API endpoints under /api
app.listen(process.env.PORT || 3001);
```

### Appendix B — Tailwind content globs after move

```js
// apps/frontend/tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  theme: { extend: {} },
  plugins: []
}
```

---

**End of proposal.**
