import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Note: Keep this list in sync with i18n supported languages
const LOCALES = ['en', 'ar', 'ar-EG', 'de', 'es', 'fr', 'nl'] as const;

// Exercise IDs: derive from English file which is canonical for keys
function readJson(file: string) {
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw) as Record<string, any>;
}

function getLocaleFile(lng: string) {
  return path.resolve(process.cwd(), 'public', 'locales', lng, 'exercises.json');
}

describe('exercise locales coverage', () => {
  it('every locale contains all exercise keys from EN and a "variable" label', () => {
    const en = readJson(getLocaleFile('en'));
    // Only treat object entries as exercises (exclude helper strings/meta)
    // Exercise entries have both 'name' and 'description' properties, unlike utility keys
    const exerciseIds = Object.keys(en).filter(k => {
      if (k.startsWith('_') || k === 'variable' || k === 'tags') return false;
      const entry = (en as any)[k];
      // Must be an object with both 'name' and 'description' to be considered an exercise
      return typeof entry === 'object' && entry.name && entry.description;
    });
    // sanity: name/description exist for at least one sample
    expect(en['plank']?.name).toBeTruthy();

    for (const lng of LOCALES) {
      const json = readJson(getLocaleFile(lng));
      expect(typeof json.variable, `Missing 'variable' key in ${lng}`).toBe('string');
      for (const id of exerciseIds) {
        const entry = (json as any)[id];
        expect(entry, `Missing '${id}' in ${lng}`).toBeTruthy();
        expect(typeof entry.name, `Missing name for '${id}' in ${lng}`).toBe('string');
      }
    }
  });
});
