# Migrating RepCue from npm → pnpm

**Date:** 2025‑08‑23  
**Project:** RepCue (https://github.com/akram0zaki/repcue)

---

## Why switch to pnpm?
- Faster installs and **much lower disk usage** (shared content-addressable store + hard links).
- Great **workspaces** support for future split into `apps/frontend`, `apps/backend`, and `packages/shared`.
- Stricter dependency resolution catches undeclared deps early.

---

## 1) Install pnpm

### Windows
- **Chocolatey**:
  ```powershell
  choco install pnpm -y
  ```
- **Scoop**:
  ```powershell
  scoop install nodejs-lts pnpm
  ```
- **Via npm** (works anywhere):
  ```bash
  npm install -g pnpm
  ```

### Linux / Raspberry Pi
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
# then reload your shell:
exec $SHELL -l
```

Verify:
```bash
pnpm --version
```

---

## 2) Convert the repo to pnpm

From the repo root:
```bash
# 1) Remove npm artifacts (safe to delete; git-tracked)
rm -rf node_modules package-lock.json

# 2) Install with pnpm (creates pnpm-lock.yaml)
pnpm install
```

> **Note:** You do **not** need to rename any scripts. You’ll just run them with `pnpm`:
> ```bash
> pnpm dev
> pnpm build
> pnpm test
> pnpm run pm2:start
> ```

---

## 3) Minimal change to `package.json`
Add a single field at the root of `package.json`:
```json
{
  "packageManager": "pnpm@9.7.0"
}
```
This tells tooling/CI which package manager + version to use.
I’ve included a merge‑friendly file: `package.json.additions.json` that contains **only** this field.

---

## 4) GitHub Actions (CI) with pnpm
Use the workflow in `.github/workflows/ci.yml` (included here) which:
1. Checks out the repo
2. Sets up **pnpm** and **Node 18**
3. Installs deps with `pnpm install --frozen-lockfile`
4. Runs `pnpm lint`, `pnpm test`, `pnpm build`
5. Uploads the built `dist/` as an artifact (Vite default)

If/when you split the workspace (frontend/backend), this same CI keeps working; you can later expand it to build per‑package.

---

## 5) Raspberry Pi / PM2 (production)

```bash
# on the Pi, from the project root
pnpm install --prod
pnpm build
pnpm run pm2:start   # uses ecosystem.config.cjs
```

If you serve the Vite build via Express in `server.js`, ensure it points to `dist/` in production.

---

## 6) Optional: enable Workspaces later
When you’re ready to split FE/BE:
1. Add to **root** `package.json`:
   ```json
   {
     "private": true,
     "workspaces": ["apps/*", "packages/*"]
   }
   ```
2. Move your frontend code to `apps/frontend` and backend to `apps/backend`.
3. Run `pnpm -w install` and use `pnpm -C apps/frontend dev`, etc.

The provided CI will still install and build at the root; expand it into per‑workspace jobs when needed.

---

## 7) Sanity checklist
- `pnpm-lock.yaml` is committed to git.
- `package-lock.json` is removed.
- `pnpm install` works locally and on the Pi.
- `pnpm build` creates `dist/` and your Express/PM2 flow still runs.
- GitHub Actions green on `ci.yml`.

---

**Done!** You’re now on pnpm with minimal changes and CI support.