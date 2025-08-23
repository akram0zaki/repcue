export interface BaseExerciseText {
  id: string;
  name: string;
  description?: string;
}

/**
 * Resolve localized name/description for an exercise with safe fallbacks.
 * Uses i18n keys under exercises.{id} namespace. Falls back to canonical values.
 */
export function localizeExercise(
  ex: BaseExerciseText,
  t: (key: string, opts?: Record<string, unknown>) => string
) {
  // Keys live in the 'exercises' namespace with top-level IDs: `${id}.name` | `${id}.description`
  const base = `${ex.id}`;
  return {
    // Explicitly target the 'exercises' namespace to avoid collisions with common.exercises.* UI strings
    name: t(`${base}.name`, { ns: 'exercises', defaultValue: ex.name }),
    description: t(`${base}.description`, { ns: 'exercises', defaultValue: ex.description ?? '' })
  };
}
