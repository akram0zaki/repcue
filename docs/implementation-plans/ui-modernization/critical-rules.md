# CRITICAL Implementation Rules

- Use the existing design token system (tokens.css) and never hard-code colors: always prefer var(--color-*) over hex values.
- Prefer Tailwind utilities and existing custom classes (.exercise-card, .ai-insight-card, .btn-primary, etc.) instead of inventing new patterns.
- Keep border radii consistent with the design system (0.5rem, 0.75rem, 1rem, and full for pills).
- Default to lightweight cards (1px border, soft shadow) and minimalist buttons (one strong primary CTA per screen).
- Make all changes mobile-first, then adjust with responsive classes if needed.
- Do not change JSX structure unless necessary for layout; try to achieve visual changes in CSS first.
