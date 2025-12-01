# Exercise Page Performance Optimization Plan

**Date**: 2025-11-24  
**Issue**: Exercises page takes 3 seconds to load due to video thumbnail bottlenecks  
**Target**: Reduce load time to <500ms

## Root Cause Analysis

### Primary Bottlenecks (in order of impact):

1. **Network Probes for Every Video** (~1.5s impact)
   - `VideoThumbnail` component calls `probe(url)` to check video existence
   - 50+ exercises = 50+ network requests (20-50ms each)
   - Uses `cache: 'no-store'` - no browser caching benefit

2. **Fallback Variant Loop** (~1s impact)  
   - If probe fails, tries every video variant with additional probes
   - Can trigger 10+ additional network requests per failed video

3. **Repeated media.json Loading** (~0.5s impact)
   - `loadExerciseMedia()` called per exercise instead of once globally

## Solution Strategy

### 🎯 **Priority 1: Remove Network Probes (Immediate - 2 hours)**

**Problem**: Probing cached blob URLs is wasteful
- Cached videos (blob URLs) are **guaranteed to exist** in IndexedDB
- Network probes add latency without value

**Solution**: Skip probe for cached videos
```typescript
// In VideoThumbnail.tsx, line ~113
if (url) {
  // Skip probe for cached blob URLs - they're guaranteed valid
  let ok = url.startsWith('blob:') ? true : await probe(url);
  
  if (!ok && mediaMeta?.variants) {
    // Fallback logic only for non-cached videos
  }
}
```

**Expected Impact**: 
- Eliminate 1.5-2s for cached videos
- Load time: 3s → 1-1.5s

---

### 🎯 **Priority 2: Lazy Load Below Fold (High - 4 hours)**

**Problem**: All 50+ exercises render immediately, even those off-screen

**Solution**: Implement Intersection Observer for lazy rendering
```typescript
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

const ExerciseCard = ({ exercise }) => {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0,
    rootMargin: '200px' // Start loading 200px before visible
  });

  return (
    <div ref={ref}>
      {isIntersecting ? (
        <VideoThumbnail exercise={exercise} />
      ) : (
        <ExercisePlaceholder /> // Lightweight placeholder
      )}
    </div>
  );
};
```

**Expected Impact**:
- Only load ~12 visible exercises initially
- Load time: 1.5s → 300-500ms (10-15 video loads instead of 50)

---

### 🎯 **Priority 3: Global Media Index Cache (Medium - 2 hours)**

**Problem**: `loadExerciseMedia()` called repeatedly per exercise

**Solution**: Load once at app level, pass down via context
```typescript
// In App.tsx or ExercisePage.tsx
const [mediaIndex, setMediaIndex] = useState(null);

useEffect(() => {
  loadExerciseMedia().then(setMediaIndex);
}, []);

// Pass to VideoThumbnail as prop
<VideoThumbnail exercise={exercise} mediaIndex={mediaIndex} />
```

**Expected Impact**:
- Save 200-300ms on page load
- Reduce memory allocations

---

### 🎯 **Priority 4: Prefetch Strategy (Nice-to-have - 3 hours)**

**Problem**: First-time visitors wait for network fetches

**Solution**: Intelligent prefetching using idle time
```typescript
// Prefetch videos for visible exercises during idle time
requestIdleCallback(() => {
  visibleExercises.slice(0, 20).forEach(exercise => {
    videoCacheService.prefetchVideo(exercise.videoUrl);
  });
});
```

**Expected Impact**:
- Second page visit: near-instant (~50ms)
- Better perceived performance

---

## Implementation Order

### Phase 1: Quick Wins (Same Day - 2 hours)
✅ **Remove probe for blob URLs** (VideoThumbnail.tsx)
- Expected: 3s → 1.5s

### Phase 2: Lazy Loading (Next Day - 4 hours)
✅ **Create useIntersectionObserver hook**
✅ **Wrap ExerciseCard with lazy rendering**
- Expected: 1.5s → 500ms

### Phase 3: Caching Improvements (Following Week - 2 hours)
✅ **Global media index loading**
✅ **Pass mediaIndex as prop**
- Expected: 500ms → 300ms

### Phase 4: Advanced (Future)
🔲 Prefetch strategy during idle time
🔲 Virtual scrolling for 100+ exercises
🔲 Progressive image placeholders

---

## Testing Checklist

- [ ] Measure load time with Chrome DevTools Performance tab
- [ ] Test with 50+ exercises (typical catalog size)
- [ ] Verify videos still display correctly after optimizations
- [ ] Test offline behavior (cached videos)
- [ ] Test scrolling performance (lazy load trigger)
- [ ] Verify fallback logic still works for missing videos

---

## Success Metrics

| Metric | Before | Target | Achieved |
|--------|--------|--------|----------|
| Initial Load Time | 3000ms | <500ms | TBD |
| Time to First Video | 2500ms | <200ms | TBD |
| Network Requests | 50+ | 10-15 | TBD |
| Perceived Performance | Poor | Good | TBD |

---

## Risks & Mitigation

**Risk**: Blob URL probes removed, but video is actually broken
- **Mitigation**: Video element's `onerror` handler will catch and show placeholder

**Risk**: Lazy loading causes layout shift
- **Mitigation**: Use fixed height placeholders to reserve space

**Risk**: Media index loading fails
- **Mitigation**: Graceful fallback to per-component loading (current behavior)

---

## Notes

- Videos are already cached via VideoCacheService (blob URLs)
- Probe function is redundant for cached content
- Current implementation assumes network might fail, but cached blobs are reliable
- Lazy loading is standard practice for content-heavy pages
