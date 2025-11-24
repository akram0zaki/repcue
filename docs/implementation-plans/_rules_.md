1. **Supabase Migrations & Functions**

   * All Supabase schema migrations and Edge Function changes **must be created and saved locally in the workspace** before deployment.
   * This ensures proper **version control and reproducibility**.

2. **Migration Tracking**

   * Record every Supabase change in a new file under `docs/migration-tracking/`.
   * Use the filename format: `supabase-changes_YYYYMMDD.md`.

3. **Styling Rules**

   * **No inline styles.**
   * Use **global or shared style definitions** only (e.g., Tailwind classes, shared CSS/TS files).

4. **Commit Policy**

   * **Do not auto-commit.**
   * Commit only when explicitly instructed.

5. **Progress Tracking**

   * Continuously **update the project plan** by marking completed tasks, modules, or phases as done.
   * This ensures sessions can resume without confusion or redundant work.
   * Do NOT create external files to track progress, always update the progress inline in this plan.

6. **Localization Workflow**

   * Always update and test the **`en` locale** first (it is the canonical source).
   * Only after `en` is verified, proceed with translations to other locales—either automated or manual.

7. **Development Workstation**

  * The development workstation is VSCode set up on a Windows 11 PC.
  * Use Powershell syntax for all terminal commands.
  * There are two MCP servers configured: `supabase` points to the dev supabase project ref xwzrsfkzqxdybjrkkkvh, and `supabase-prod` points to the prod supabase project ref zumzzuvfsuzvvymhpymk.

8. **Style Guide**

  * Make sure any screen changes adhere to the style guide docs\ui-ux\ui-specs.md

9. **Offline-First**

  * Implementation of any new feature must respect and comply with the offline-first architecture of the app.
