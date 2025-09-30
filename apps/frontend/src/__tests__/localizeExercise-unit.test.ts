import { describe, it, expect } from 'vitest';
import { localizeExercise, type BaseExerciseText } from '../utils/localizeExercise';

// Minimal mock t() that returns defaultValue when key isn't in mock map
function makeT(map: Record<string, string> = {}) {
  return (key: string, opts?: Record<string, unknown>) => {
    if (key in map) return map[key];
    // i18next returns defaultValue when key is missing
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
    const t = makeT({ 'exerciseDetails:plank.name': 'Planche', 'exerciseDetails:plank.description': 'Tenez le corps droit' });
    const loc = localizeExercise(ex, t as any);
    expect(loc.name).toBe('Planche');
    expect(loc.description).toBe('Tenez le corps droit');
  });

  it('handles missing description gracefully', () => {
    const t = makeT({ 'exerciseDetails:plank.name': 'Tabla' });
    const loc = localizeExercise({ ...ex, description: undefined }, t as any);
    expect(loc.name).toBe('Tabla');
    expect(loc.description).toBe('');
  });
});
