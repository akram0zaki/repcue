# RepCue – Home Page Modernisation Plan (Electric Blue + Mint)

This plan focuses **only on the Home page** and assumes the global theming work (tokens + index overrides) is already in place.
Use it as a step‑by‑step checklist to make the Home screen feel more modern, cohesive, and less "boxy".

---

## 1. Design Intent for Home

**What this screen should feel like**

* A **dashboard for today**: one glance shows hero motivation, today’s workout, and 1–2 key AI insights.
* Clean, airy, and not dominated by boxes.
* Clear hierarchy:

  1. Hero banner (identity + motivation)
  2. Primary CTA (personalised plan / start today’s workout)
  3. Upcoming workout
  4. Coach insights
  5. Popular & Favorite exercises
  6. Stats + settings/footer

Keep this hierarchy in mind when adjusting spacing, card treatments, and typography.

---

## 2. Hero Section

### 2.1. Visual styling

**Current:**

* Nice photo, but text sits directly on the image, making it feel slightly older.

**Goals:**

* Make it feel like a **premium hero** from a 2024 fitness app.

**Tasks:**

1. Add a subtle **bottom gradient overlay** on the hero image so white headline is always legible:

   * Use a pseudo element or wrapped overlay:

     * from `transparent` at top → `rgba(15,23,42,0.7)` at bottom.
2. Tighten typography:

   * Headline: apply `.text-h1` (32px) and maybe `font-semibold`.
   * Subheadline: `.text-body` in `var(--color-text-secondary)` with a tiny shadow for readability.
3. Corner radii:

   * Keep the current large radius on the top container but align with your standard (e.g. `rounded-3xl`).
4. Add a **very subtle shadow** under the entire hero block to separate it from the sheet below.

### 2.2. Relationship to sheet below

**Tasks:**

1. Make the white “sheet” below (where "RepCue" title and insights sit) visually connected:

   * Slight **overlap**: hero sits behind, sheet card slides up with a soft rounded top.
   * Ensure the top edge of the sheet uses the same radius system (`rounded-t-3xl`).
2. Introduce a tiny **handle bar** at the top of the sheet (you already have one) but:

   * Make it smaller and lighter (more like iOS bottom sheet handle).

---

## 3. Top Sheet: RepCue Title & Coach Insights Block

### 3.1. RepCue identity block

**Current:**

* "RepCue" title and subtitle look okay but a bit generic.

**Tasks:**

1. Typography:

   * Title `RepCue` → `.text-h2` with `tracking-tight` to look more modern.
   * Subtitle → `.text-small` with `var(--color-text-tertiary)`.
2. Spacing:

   * Reduce vertical whitespace between title/subtitle.
   * Add consistent horizontal padding (`px-4`) and top padding (`pt-4`) to the sheet.

### 3.2. "Coach Insights" section header

**Current:**

* "Coach Insights" and "View All" on a bare white background.

**Tasks:**

1. Use a **section label style**:

   * Apply `.section-label-modern` (from the global plan) or equivalent:

     * Uppercase, 0.7rem, `var(--color-text-tertiary)`.
   * Or keep "Coach Insights" as `.text-h3` but add a small label above: `Insights`.
2. Align "View All" as a subtle link:

   * Style with `class="view-all-btn text-sm"` and use `var(--color-primary)`.
   * Remove heavy bolding; let the blue color be the emphasis.
3. Add bottom margin (`mb-2` or `mb-3`) before the carousel card.

---

## 4. Coach Insight Card Carousel

### 4.1. Card visual refresh

**Current:**

* Rectangular card with dark border all around → looks more like a form or alert than a modern card.

**Goals:**

* Card that feels lightweight, AI‑powered, and part of a carousel.

**Tasks:**

1. Update the `.ai-insight-card` class:

   * Border: 1px only, not 2px.
   * Border color: `var(--color-border-primary)`.
   * Radius: `1rem`.
   * Background: light surface with a **soft tint** of the primary color (use `color-mix`).
   * Remove full outline style; keep it subtle.
2. Icon treatment:

   * Put the `i` icon in a small circle using primary blue border or fill.
   * Use consistent size (e.g. `h-5 w-5`).
3. Typography inside card:

   * Title ("Watch for Overtraining Signs") → `.text-h3`.
   * Body → `.text-small` with `var(--color-text-secondary)`.
4. AI badge:

   * Replace the current square "AI" chip with a small pill badge:

     * `badge-primary` or a dedicated `.ai-badge` with primary background + white text.
   * Place it inline near the title or in the top-right of the card.

### 4.2. Carousel indicators

**Current:**

* Simple dots with a heavy blue pill.

**Tasks:**

1. Reduce vertical space between the card and dots.
2. Style active dot using `.carousel-indicator-active`:

   * Small pill but slimmer height.
   * Use primary with soft outer ring.
3. Inactive dots:

   * Soft neutral, e.g. `var(--color-border-secondary)`.

---

## 5. Primary CTA – "Get Your Personalized Workout Plan"

**Current:**

* Big rectangular button, flat solid blue.

**Goals:**

* Make this the **hero action** of the screen; it should feel like a modern, premium CTA.

**Tasks:**

1. Apply `.btn-exercise` or `.btn-primary` variant with gradient:

   * Wide, pill shaped: `rounded-2xl` or `rounded-full`.
   * Gradient background: primary → primary+mint.
   * Icon on the left (sparkles) with consistent size.
2. Reduce top margin so it visually belongs to the insights carousel.
3. Add a **short secondary line** under the text in smaller font (optional):

   * e.g. `text-xs text-white/80` → "Takes less than 1 minute".
4. Ensure this button doesn’t compete visually with the "Start Now" in Upcoming Workout:

   * Primary CTA uses gradient + pill.
   * "Start Now" uses simpler filled primary button.

---

## 6. Upcoming Workout Card

**Current:**

* Big white card with heavy border and strong blue text/button.

**Goals:**

* Keep it prominent but make it **lighter and more integrated**.

**Tasks:**

1. Card styling:

   * Use the standard `exercise-card` or an `upcoming-workout-card` variant:

     * `border: 1px`.
     * `border-radius: 1rem`.
     * Background: a **very soft blue surface** using `color-mix` with `--color-primary`.
2. Typography:

   * Section label: small "Upcoming" label above, or keep "Upcoming Workout" as `.text-h3`.
   * Date ("Thursday") in primary blue, but less big; not competing with hero text.
   * Subtext (type, exercise count) in `text-sm text-text-tertiary`.
3. Button:

   * Use `.btn-primary` but slightly smaller (`text-sm`, `px-4 py-2`).
   * Place aligned to the right bottom, with consistent spacing.
4. Vertical spacing:

   * Add `mt-4` from CTA, `mb-4` before "Popular Exercises".

---

## 7. Popular & Favorite Exercises Sections

These sections are currently the most "boxy" and old‑school.

### 7.1. Section headings

**Tasks:**

1. Use consistent typography:

   * "Popular Exercises" and "Favorite Exercises" → `.text-h2` or `.text-h3` with `mt-6 mb-3`.
2. Optionally add a tiny section label above (e.g. `text-xs tracking-wide uppercase`).

### 7.2. Card density & layout

**Current:**

* Large vertical cards with big blue "Start" buttons on the right.

**Goals:**

* Make cards **leaner** and feel like part of a modern feed.

**Tasks (styling + some JSX tweaks):

1. Card container:

   * Use `exercise-card` base but:

     * Reduce padding: `p-3` or `p-4`.
     * Remove heavy shadow in lists (keep subtle shadow or none; rely on border).
2. Layout inside card:

   * Use 2‑column layout on mobile:

     * Left: thumbnail + text.
     * Right: subtle chevron or small pill, not a big filled button.
3. Start action:

   * Replace giant blue "Start" button with:

     * Either a **chevron icon** (tap card to open), or
     * A smaller pill `Start` with outline or ghost style.
   * This will dramatically reduce visual noise.
4. Imagery:

   * Thumbnails: `w-16 h-16` or `w-20 h-20`, `rounded-lg`, `object-cover`.
5. Text:

   * Title: `.text-h3` or `font-semibold text-base`.
   * Description: `text-sm text-text-secondary`, 1–2 lines max (truncate if needed).

### 7.3. Optional: horizontal carousels

If you want a more modern, app‑like feel without rethinking backend:

**Tasks:**

1. Make "Popular Exercises" a **horizontal scroll** on mobile:

   * Use `flex gap-3 overflow-x-auto scrollbar-hide` container.
   * Each exercise as a smaller card (`w-64` or similar).
2. Keep "Favorite Exercises" as a vertical list (fewer items), but with the leaner card design above.

---

## 8. Bottom Info Block (Stats, Language, Footer)

### 8.1. Available Exercises card

**Current:**

* Simple card with "124 Available Exercises".

**Tasks:**

1. Treat this as a small info tile:

   * Centered text, use `.text-h3` for the number, `.text-caption` for label.
   * Use a **soft surface** (`bg-surface-0` with subtle shadow).
   * Add a small icon (e.g. dumbbell) to left or above.

### 8.2. Language selector

**Tasks:**

1. Reduce the visual weight of the language block:

   * Remove heavy border around the select; use iOS/neutral style from `tokens.css` (ios-input or neutral button).
2. Section title "Change language" → `text-sm text-text-tertiary`.

### 8.3. Legal footer

**Tasks:**

1. Reduce vertical padding.
2. Use `text-xs text-text-tertiary text-center`.
3. Consider putting the whole legal block into a low‑contrast area (slightly darker surface) to visually separate it.

---

## 9. Interaction & Micro‑details

**Tasks:**

1. Apply `hover`/`active` states only on pointer devices:

   * Use the `@media (hover: hover) and (pointer: fine)` pattern already present.
2. Use `pulse-animation` very sparingly:

   * If you keep it, consider applying only to the primary CTA when there is no upcoming workout.
3. Confirm that all new focus outlines are visible on the hero, CTA, insights card, and upcoming workout card.

---

## 10. Final Home Page Checklist

Use this to validate when you’re done:

* [ ] Hero feels premium, with gradient overlay and clear, modern type.
* [ ] The top sheet (RepCue + Coach Insights) feels like a single, cohesive surface.
* [ ] Coach insights card looks lightweight, AI‑driven, not like a warning box.
* [ ] The **personalised plan CTA** is the most visually striking button on the page.
* [ ] Upcoming Workout is clearly visible but lighter than the hero CTA.
* [ ] Popular / Favorite exercise cards are lean, less boxy, and don’t spam large blue buttons.
* [ ] Bottom stats, language selector, and footer feel secondary and unobtrusive.
* [ ] Everything still works and looks good in **dark mode**.
