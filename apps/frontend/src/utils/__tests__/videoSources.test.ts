import { describe, it, expect } from 'vitest';
import getVideoSources from '../../utils/videoSources';

describe('getVideoSources', () => {
  it('returns empty array for null/undefined', () => {
    expect(getVideoSources(null)).toEqual([]);
    expect(getVideoSources(undefined)).toEqual([]);
  });

  it('emits a single webm source with correct type', () => {
    const srcs = getVideoSources('/videos/plank_v1_1080x1080.webm');
    expect(srcs).toEqual([{ src: '/videos/plank_v1_1080x1080.webm', type: 'video/webm' }]);
  });

  it('emits a single mp4 source with correct type', () => {
    const srcs = getVideoSources('/videos/plank_v1_1080x1080.mp4');
    expect(srcs).toEqual([{ src: '/videos/plank_v1_1080x1080.mp4', type: 'video/mp4' }]);
  });
});
