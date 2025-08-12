import { describe, it, expect } from 'vitest';
import { selectVideoVariant } from '../utils/selectVideoVariant';
import type { ExerciseMedia } from '../types/media';

const media: ExerciseMedia = { id: 'demo', repsPerLoop: 1, fps: 30, video: { square: '/videos/demo-square.mp4', portrait: '/videos/demo-portrait.mp4', landscape: '/videos/demo-landscape.mp4' } };

describe('selectVideoVariant', () => {
  it('prefers portrait for tall viewport', () => {
    expect(selectVideoVariant(media, 400, 800)).toBe('/videos/demo-portrait.mp4');
  });
  it('prefers landscape for wide viewport', () => {
    expect(selectVideoVariant(media, 800, 400)).toBe('/videos/demo-landscape.mp4');
  });
  it('falls back to square when aspect ambiguous', () => {
    expect(selectVideoVariant(media, 600, 600)).toBe('/videos/demo-square.mp4');
  });
  it('returns null when no variants', () => {
    expect(selectVideoVariant({ ...media, video: {} as any })).toBeNull();
  });
});
