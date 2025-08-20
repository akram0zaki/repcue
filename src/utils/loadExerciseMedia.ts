import type { ExerciseMediaIndex, ExerciseMedia } from '../types/media';

// In-memory cache for exercise media metadata
let cache: ExerciseMediaIndex | null = null;

export async function loadExerciseMedia(): Promise<ExerciseMediaIndex> {
  if (cache) return cache as ExerciseMediaIndex;
  try {
    const res = await fetch('/exercise_media.json', { cache: 'no-store' });
    const contentType = res.headers.get('content-type') || 'unknown';
    if (!res.ok) throw new Error(`HTTP ${res.status} (${res.statusText}) content-type=${contentType}`);
    let text: string | null = null;
  let list: ExerciseMedia[] = [];
    try {
      text = await res.text();
  list = JSON.parse(text) as ExerciseMedia[];
    } catch (parseErr) {
      const snippet = (text || '').slice(0, 120).replace(/\s+/g, ' ');
      throw new Error(`JSON parse failed for exercise_media.json (content-type=${contentType}) snippet='${snippet}' error=${(parseErr as Error).message}`);
    }
    cache = Object.fromEntries(
      list
        .filter(e => e && typeof e.id === 'string')
        .map(e => [e.id, e])
    );
    return cache as ExerciseMediaIndex;
  } catch (err) {
    console.warn('[exercise-media] loadExerciseMedia fallback to empty index:', err);
    cache = {};
    return cache as ExerciseMediaIndex;
  }
}

export function clearExerciseMediaCache() { cache = null; }
