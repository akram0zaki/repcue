# Branch Naming Convention

A clear naming convention keeps the history clean, improves searchability, and makes automation (CI/CD, release notes) easier.

## Goals
- Be human-readable and predictable.
- Encode branch purpose (feature, fix, release, etc.).
- Optionally include an issue/ticket ID for traceability.

## Mainline Branches
- `main` → stable, production-ready code.
- `develop` → (optional, Git Flow-style) integration branch for features before merging to `main`.

> If you prefer **Trunk-Based Development**, skip `develop` and branch off `main` for short-lived work.

## Branch Types & Patterns
Use lowercase and hyphens. Avoid spaces and special characters.

- **Features**
  - Pattern: `feature/<short-summary>` or `feature/<issue-id>-<short-summary>`
  - Examples: `feature/login-page`, `feature/123-add-workout-timer`

- **Bug fixes**
  - Pattern: `fix/<short-summary>` or `fix/<issue-id>-<short-summary>`
  - Examples: `fix/typo-on-home`, `fix/342-api-500-on-start`

- **Chores / Maintenance**
  - Pattern: `chore/<short-summary>`
  - Examples: `chore/update-deps`, `chore/refactor-timer-service`

- **Hotfixes (urgent prod issues)**
  - Pattern: `hotfix/<short-summary>` or `hotfix/<issue-id>-<short-summary>`
  - Examples: `hotfix/security-patch`, `hotfix/501-crash-on-start`

- **Releases**
  - Pattern: `release/<version>`
  - Examples: `release/1.2.0`, `release/2025-08-rolling`

- **Experiments / Spikes**
  - Pattern: `experiment/<short-summary>` or `spike/<short-summary>`
  - Examples: `experiment/new-player-logic`, `spike/test-pnpm-workspaces`

## Naming Rules
- Use **lowercase** with **hyphens**: `feature/add-settings-page`
- Keep it **concise and descriptive**: what it changes, not how.
- Optional: **prefix with ticket ID** if you use GitHub Issues or a tracker: `feature/42-settings-localization`
- Avoid long names; target **≤ 50 characters** after the prefix.

## Examples (Good vs. Bad)
- ✅ `feature/i18n-settings-page`
- ❌ `feature/AddNewInternationalizationSettingsForm` (too long, camel-cased)
- ✅ `fix/381-broken-image-paths`
- ❌ `fix/bugs` (too vague)

## Branch Lifecycle
1. **Create** from `develop` (Git Flow) or `main` (Trunk-Based).
2. **Commit** small, focused changes with clear messages.
3. **Open PR** into the target branch (e.g., `develop` or `main`).
4. **Squash-merge** (recommended) to keep history tidy.
5. **Delete** the branch after merge.

## Commit & PR Guidelines (Quick)
- Commit messages: `type(scope): short description` (e.g., `feat(timer): add 30s cue`).
- Link issues: “Closes #123” in the PR description.
- Keep PRs small; target reviewable diffs (< 300 lines when possible).
- CI must pass before merge.

## Optional Enforcement
- Protect `main` (and `develop` if used) via GitHub **Branch protection rules**.
- Add a GitHub Actions check that validates branch names via regex (e.g., `^(feature|fix|chore|hotfix|release|experiment|spike)\/[a-z0-9][a-z0-9\-]{2,}$`).

---

**Tip for RepCue:** If you keep `develop`, branch from `develop` for features and fixes, reserve `main` for tagged releases; otherwise skip `develop` and use short-lived branches off `main`.
