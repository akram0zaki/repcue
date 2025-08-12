import type { ExerciseMediaIndex } from '../types/media';

// In-memory cache for exercise media metadata
let cache: ExerciseMediaIndex | null = null;

export async function loadExerciseMedia(): Promise<ExerciseMediaIndex> {
  if (cache) return cache as ExerciseMediaIndex;
  try {
    const res = await fetch('/exercise_media.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch exercise_media.json: ${res.status}`);
    const list = (await res.json()) as Array<any>;
    cache = Object.fromEntries(
      list
        .filter(e => e && typeof e.id === 'string')
        .map(e => [e.id, e])
    );
  return cache as ExerciseMediaIndex;
  } catch (err) {
    console.warn('loadExerciseMedia: falling back to empty index', err);
    cache = {};
  return cache as ExerciseMediaIndex;
  }
}

export function clearExerciseMediaCache() { cache = null; }
