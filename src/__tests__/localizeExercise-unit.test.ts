import { describe, it, expect } from 'vitest';
import { localizeExercise, type BaseExerciseText } from '../utils/localizeExercise';

// Minimal mock t() that returns defaultValue when key isn't in mock map
function makeT(map: Record<string, string> = {}, ns?: string) {
  return (key: string, opts?: Record<string, unknown>) => {
    const fullKey = ns ? `${ns}:${key}` : key;
    if (fullKey in map) return map[fullKey];
    // i18next returns key when missing; our helper passes defaultValue
    return (opts?.defaultValue as string) ?? key;
  };
}

describe('localizeExercise', () => {
  const ex: BaseExerciseText = {
    id: 'plank',
    name: 'Plank',
    description: 'Hold your body straight'
  };

  it('falls back to canonical when translation missing', () => {
    const t = makeT({});
    const loc = localizeExercise(ex, t as any);
    expect(loc.name).toBe('Plank');
    expect(loc.description).toBe('Hold your body straight');
  });

  it('uses translations from exercises namespace when present', () => {
    const t = makeT({ 'exercises:plank.name': 'Planche', 'exercises:plank.description': 'Tenez le corps droit' }, 'exercises');
    const loc = localizeExercise(ex, t as any);
    expect(loc.name).toBe('Planche');
    expect(loc.description).toBe('Tenez le corps droit');
  });

  it('handles missing description gracefully', () => {
    const t = makeT({ 'exercises:plank.name': 'Tabla' }, 'exercises');
    const loc = localizeExercise({ ...ex, description: undefined }, t as any);
    expect(loc.name).toBe('Tabla');
    expect(loc.description).toBe('');
  });
});
