# Testing Video Caching System

## Quick Test Instructions

### 1. Open Browser DevTools
- Press F12 to open DevTools
- Go to **Console** tab

### 2. Check Cache Initialization
Look for these log messages when the app loads:
```
[VideoCacheService] IndexedDB initialized
```

### 3. Test Video Loading
1. Navigate to an exercise with a video
2. Watch the console for cache messages:

**First Load (Cache MISS)**:
```
[resolveVideoUrl] Checking cache for: /videos/pushup.mp4
[VideoCacheService] Cache MISS: /videos/pushup.mp4
[resolveVideoUrl] Cache MISS, fetching and caching...
[VideoCacheService] Fetching video from network: /videos/pushup.mp4
[VideoCacheService] Video cached: /videos/pushup.mp4 (2.34 MB)
[resolveVideoUrl] ✅ Fetched and cached, returning blob URL
```

**Second Load (Cache HIT)**:
```
[resolveVideoUrl] Checking cache for: /videos/pushup.mp4
[VideoCacheService] IndexedDB cache HIT: /videos/pushup.mp4
[resolveVideoUrl] ✅ Cache HIT, returning blob URL
```

### 4. Check Network Tab
- Go to **Network** tab in DevTools
- Filter by "videos" or "media"
- **First load**: You should see the video download
- **Second load**: You should see "(from cache)" or no network request at all

### 5. Test Offline Playback
1. Load a video once (ensures it's cached)
2. Go to **Network** tab → Enable **Offline** mode
3. Navigate back to the same exercise
4. Video should play immediately from cache

### 6. Check IndexedDB
1. Go to **Application** tab in DevTools
2. Expand **IndexedDB** → **repcue-video-cache** → **videos**
3. You should see cached video entries with:
   - `url`: Original video URL
   - `blob`: Video binary data
   - `size`: Video size in bytes
   - `cachedAt`: Timestamp when cached
   - `expiresAt`: Expiration timestamp (90 days)

### 7. Check Storage Usage
1. In DevTools **Application** tab → **Storage**
2. Look at quota usage
3. Videos should be counted in storage usage

## Troubleshooting

### Videos Still Re-downloading?

**Check 1: Feature Flag**
- Open `apps/frontend/src/config/features.ts`
- Verify: `VIDEO_CACHING_ENABLED = true`

**Check 2: Console Logs**
- Are you seeing cache log messages?
- If not, check if DEBUG is enabled in features.ts

**Check 3: Consent**
- Video caching requires user consent
- Check console for: `[VideoCacheService] No consent, cache disabled`

**Check 4: Service Worker**
- Check if service worker is active
- In DevTools **Application** → **Service Workers**
- Should show "activated and is running"

**Check 5: Clear Old Cache**
- Run in Console:
```javascript
// Clear old service worker cache
caches.keys().then(keys => keys.forEach(key => caches.delete(key)))

// Clear IndexedDB
indexedDB.deleteDatabase('repcue-video-cache')

// Reload page
location.reload()
```

### Expected Performance

| Scenario | Load Time | Network Request |
|----------|-----------|-----------------|
| First load (cold) | ~2000ms | Yes (downloads video) |
| Second load (cached) | <50ms | No (from IndexedDB) |
| Offline load | <50ms | No (from IndexedDB) |

### Debug Mode

Enable extra logging:
```typescript
// In apps/frontend/src/config/features.ts
export const DEBUG = true;
```

This will show all cache operations in console.

## Manual Test Checklist

- [ ] Videos load on first visit (network request visible)
- [ ] Videos load instantly on second visit (<50ms)
- [ ] Console shows "Cache HIT" messages
- [ ] Network tab shows "(from cache)" or no request
- [ ] Videos work offline (airplane mode or DevTools offline)
- [ ] IndexedDB contains video blobs
- [ ] Storage usage increases after caching videos
- [ ] Navigating between exercises is instant (no loading)
- [ ] Video seeking (scrubbing) works smoothly

## Known Issues

1. **First visit after code update**: May need to clear cache and reload
2. **Private/Incognito mode**: IndexedDB may be restricted
3. **Low storage**: LRU eviction kicks in, may evict videos
4. **Safari private mode**: Storage APIs may be limited

## Success Criteria

✅ Videos never re-download unless cache is cleared
✅ Load time <50ms for cached videos
✅ Works perfectly offline
✅ No network requests for cached videos
✅ IndexedDB contains video data
