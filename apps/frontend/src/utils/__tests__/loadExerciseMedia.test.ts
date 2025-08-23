import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadExerciseMedia, clearExerciseMediaCache } from '../loadExerciseMedia';

function mockResponse(body: string, init: Partial<Response> = {} as any): Response {
  return new Response(body, { status: init.status ?? 200, statusText: init.statusText ?? 'OK', headers: init.headers || { 'content-type': 'application/json' } });
}

describe('loadExerciseMedia', () => {
  beforeEach(() => { clearExerciseMediaCache(); });
  afterEach(() => { vi.restoreAllMocks(); clearExerciseMediaCache(); });

  it('loads and caches valid media index', async () => {
    const data = [ { id: 'jumping-jacks', repsPerLoop: 1, fps: 30, video: { square: '/videos/jj.mp4' } } ];
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(mockResponse(JSON.stringify(data)) as any);
    const first = await loadExerciseMedia();
    expect(first['jumping-jacks'].video.square).toBe('/videos/jj.mp4');
    const second = await loadExerciseMedia();
    expect(second).toBe(first);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns empty index on network error and caches empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(new Response('Not found', { status: 404, statusText: 'Not Found', headers: { 'content-type': 'text/plain' } }) as any);
    const idx = await loadExerciseMedia();
    expect(Object.keys(idx).length).toBe(0);
    await loadExerciseMedia();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns empty index on parse error (HTML instead of JSON)', async () => {
    const headers = new Headers({ 'content-type': 'text/html' });
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(mockResponse('<!doctype html><html><body>404</body></html>', { headers }) as any);
    const idx = await loadExerciseMedia();
    expect(idx).toEqual({});
  });

  it('clearExerciseMediaCache forces refetch', async () => {
    const data1 = [ { id: 'a', repsPerLoop: 1, fps: 30, video: {} } ];
    const data2 = [ { id: 'b', repsPerLoop: 1, fps: 30, video: {} } ];
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
      .mockResolvedValueOnce(mockResponse(JSON.stringify(data1)) as any)
      .mockResolvedValueOnce(mockResponse(JSON.stringify(data2)) as any);
    let idx = await loadExerciseMedia();
    expect(idx.a).toBeTruthy();
    clearExerciseMediaCache();
    idx = await loadExerciseMedia();
    expect(idx.b).toBeTruthy();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
