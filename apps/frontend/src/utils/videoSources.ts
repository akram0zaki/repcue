export type VideoSource = { src: string; type: 'video/mp4' | 'video/webm' };

// Build a single <source> entry for the provided URL. We avoid inventing
// alternate extensions unless the asset actually exists to prevent 404 loops
// on some mobile browsers that don't gracefully fall back after errors.
export function getVideoSources(url: string | null | undefined): VideoSource[] {
  if (!url) return [];
  const u = String(url);
  const type: VideoSource['type'] = /\.mp4$/i.test(u) ? 'video/mp4' : 'video/webm';
  return [{ src: u, type }];
}

export default getVideoSources;
