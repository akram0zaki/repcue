export interface BaseExerciseText {
  id: string;
  name: string;
  description?: string;
}

/**
 * Resolve localized name/description for an exercise with safe fallbacks.
 * Uses i18n keys under exerciseDetails.{id} namespace. Falls back to canonical values.
 */
export function localizeExercise(
  ex: BaseExerciseText,
  t: (key: string, opts?: Record<string, unknown>) => string
) {
  // Keys live in the 'exerciseDetails' namespace with top-level IDs: `${id}.name` | `${id}.description`
  const base = `exerciseDetails:${ex.id}`;
  return {
    // Explicitly target the 'exerciseDetails' namespace to avoid collisions with exercises.* UI strings
  name: t(`${base}.name`, { defaultValue: ex.name }),
  description: t(`${base}.description`, { defaultValue: ex.description ?? '' })
  };
}
