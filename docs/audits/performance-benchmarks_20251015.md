# Performance Benchmarks & Monitoring (Module 2.8.2)

**Last Updated**: October 15, 2025  
**Purpose**: Track and optimize RepCue performance across all features

---

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **IndexedDB Queries** | <500ms | TBD | ⏳ Pending |
| **Page Load Time** | <2s | TBD | ⏳ Pending |
| **Timer Accuracy** | ±50ms | ✅ Pass | ✅ Good |
| **PR Detection** | <200ms | TBD | ⏳ Pending |
| **Sync Operations** | <1s | TBD | ⏳ Pending |
| **Edge Function Cold Start** | <3s | TBD | ⏳ Pending |
| **Edge Function Warm** | <500ms | TBD | ⏳ Pending |

---

## Test Scenarios

### 1. Large Dataset Testing

#### Test Configuration
- **Workout History**: 1,000 entries
- **Exercises**: 50 exercises with PRs
- **Activity Logs**: 500 log entries
- **Workouts**: 100 custom workouts

#### Key Metrics to Track
1. **IndexedDB Query Performance**
   ```javascript
   // Test in browser console
   const start = performance.now();
   const workouts = await db.workouts.toArray();
   console.log(`Query time: ${performance.now() - start}ms`);
   ```

2. **Chart Rendering Performance**
   ```javascript
   // Measure ProgressChart render time
   const start = performance.now();
   // Trigger chart render
   console.log(`Render time: ${performance.now() - start}ms`);
   ```

3. **Search Performance**
   ```javascript
   // Test exercise search with large catalog
   const start = performance.now();
   const results = exercises.filter(e => 
     e.name.toLowerCase().includes(searchTerm.toLowerCase())
   );
   console.log(`Search time: ${performance.now() - start}ms`);
   ```

### 2. Memory Profiling

#### Browser DevTools Steps
1. Open Chrome DevTools → Performance tab
2. Start recording
3. Perform actions:
   - Navigate between pages
   - Complete a workout
   - Trigger PR detection
   - Load PR history
4. Stop recording
5. Analyze:
   - JavaScript execution time
   - Layout/rendering time
   - Memory usage patterns

#### Expected Baseline
- **Heap Size**: <50 MB for typical session
- **DOM Nodes**: <1,500 nodes per page
- **Event Listeners**: <200 active listeners

### 3. Edge Function Performance

#### Cold Start Testing
```bash
# Test edge function cold start (first invocation)
time curl -X POST https://xwzrsfkzqxdybjrkkkvh.supabase.co/functions/v1/ai-coach-insights \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test"}'
```

Expected: <3 seconds

#### Warm Start Testing
```bash
# Test subsequent invocations (cached)
for i in {1..10}; do
  time curl -X POST https://xwzrsfkzqxdybjrkkkvh.supabase.co/functions/v1/ai-coach-insights \
    -H "Authorization: Bearer ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"user_id": "test"}'
done
```

Expected: <500ms average

### 4. PR Detection Performance

#### Test Script
```javascript
// Run in browser console on /timer page
async function testPRDetection() {
  const analytics = AnalyticsService.getInstance();
  
  const start = performance.now();
  const pr = await analytics.checkForNewPR(
    'exercise-id',
    10, // sets
    50, // reps
    300, // duration
    0, // weight
    'workout-id'
  );
  const duration = performance.now() - start;
  
  console.log(`PR detection time: ${duration}ms`);
  console.log(`PR found:`, pr);
  
  return duration;
}

// Run test 10 times and get average
const times = [];
for (let i = 0; i < 10; i++) {
  times.push(await testPRDetection());
}
const avg = times.reduce((a, b) => a + b, 0) / times.length;
console.log(`Average PR detection time: ${avg.toFixed(2)}ms`);
```

Expected: <200ms average

---

## Optimization Strategies

### 1. IndexedDB Query Optimization

**Current Issues** (if any):
- [ ] Full table scans for filtered queries
- [ ] Missing indexes on frequently queried fields
- [ ] Large result sets not paginated

**Optimizations to Implement**:
- ✅ Add indexes to `personal_records` table (owner_id, exercise_id, record_type)
- ✅ Use `where()` clauses instead of `toArray().filter()`
- ⏳ Implement pagination for large result sets
- ⏳ Use `limit()` when appropriate

**Example Optimization**:
```typescript
// BEFORE (slow)
const allRecords = await db.personal_records.toArray();
const filtered = allRecords.filter(r => r.exerciseId === exerciseId);

// AFTER (fast)
const filtered = await db.personal_records
  .where('exerciseId')
  .equals(exerciseId)
  .toArray();
```

### 2. React Component Optimization

**Techniques Applied**:
- ✅ `React.memo()` for expensive components (CoachingCard, PRCelebration)
- ✅ `useMemo()` for expensive computations (search/filter/sort in PRHistoryPage)
- ✅ `useCallback()` for event handlers to prevent re-renders
- ✅ Lazy loading for routes (React.lazy + Suspense)
- ⏳ Virtual scrolling for large lists (consider react-window)

### 3. Bundle Size Optimization

**Current Bundle Analysis** (from build output):
- **Total**: 1.84 MB (compressed: ~301 KB gzip)
- **Largest Chunks**:
  - `utils-JylrYq-0.js`: 330.15 KB (89.53 KB gzip)
  - `index-B-noFDWJ.js`: 235.75 KB (74.47 KB gzip)
  - `App-CDEiIWm_.js`: 201.85 KB (48.76 KB gzip)

**Optimization Opportunities**:
- ✅ Code splitting by route (already implemented)
- ⏳ Tree-shaking unused i18n locales
- ⏳ Lazy load chart libraries (recharts)
- ⏳ Consider lighter alternatives for heavy dependencies

### 4. Service Worker Cache Strategy

**Current Strategy**:
- Precache: 89 entries (1,840 KB)
- Runtime caching for videos and media

**Optimizations**:
- ✅ Cache exercise media index
- ✅ Cache translation files
- ⏳ Implement stale-while-revalidate for API calls
- ⏳ Add cache versioning for updates

---

## Monitoring Tools

### 1. Browser Performance API

**Key Metrics to Track**:
```javascript
// Navigation timing
const perfData = performance.getEntriesByType("navigation")[0];
console.log({
  domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
  loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
  domInteractive: perfData.domInteractive - perfData.fetchStart
});

// Resource timing
const resources = performance.getEntriesByType("resource");
const largeResources = resources
  .filter(r => r.transferSize > 100000)
  .sort((a, b) => b.transferSize - a.transferSize);
console.table(largeResources);
```

### 2. Lighthouse CI

**Configuration** (`.lighthouserc.json`):
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["http://localhost:5173/", "http://localhost:5173/timer", "http://localhost:5173/personal-records"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.95}],
        "categories:best-practices": ["error", {"minScore": 0.9}]
      }
    }
  }
}
```

### 3. Custom Performance Marks

**Implementation in Code**:
```typescript
// In analyticsService.ts
public async checkForNewPR(...): Promise<PersonalRecord | null> {
  performance.mark('pr-check-start');
  
  // ... PR detection logic ...
  
  performance.mark('pr-check-end');
  performance.measure('PR Detection', 'pr-check-start', 'pr-check-end');
  
  const measurement = performance.getEntriesByName('PR Detection')[0];
  logger.log(`PR detection took ${measurement.duration.toFixed(2)}ms`);
  
  return result;
}
```

---

## Performance Testing Checklist

### Before Each Release
- [ ] Run Lighthouse audit on key pages (Home, Timer, Exercises, PR History, Coach)
- [ ] Test with 1,000+ workout history entries
- [ ] Profile JavaScript execution with Chrome DevTools
- [ ] Check bundle size hasn't grown >10%
- [ ] Test edge function cold start performance
- [ ] Verify IndexedDB queries under target times
- [ ] Test on low-end devices (simulated throttling)
- [ ] Verify no memory leaks in long sessions

### Quarterly Review
- [ ] Analyze performance trends over time
- [ ] Identify and optimize slowest queries
- [ ] Review and update performance targets
- [ ] Consider new optimization techniques
- [ ] Benchmark against similar PWAs

---

## Known Performance Issues

### Current Issues
None identified (baseline testing pending)

### Historical Issues (Resolved)
1. **Video loading blocking UI** (Resolved 2025-09-15)
   - Issue: Videos loaded synchronously, blocking render
   - Fix: Implemented async loading with loadExerciseMedia utility

2. **Exercise search lag with 100+ exercises** (Resolved 2025-10-01)
   - Issue: Full array filter on every keystroke
   - Fix: Added debouncing and useMemo optimization

---

## Continuous Monitoring

### Metrics Dashboard (Future)
Consider implementing:
- Real User Monitoring (RUM) with Sentry Performance
- Core Web Vitals tracking (LCP, FID, CLS)
- Custom metrics via Analytics API
- Error rate monitoring
- API response time tracking

### Alerts
Set up alerts for:
- Bundle size increase >10%
- Page load time >3s
- Edge function errors >5% rate
- IndexedDB query time >1s

---

## Next Steps

1. **Baseline Testing** (Priority: High)
   - Run tests with current production data
   - Document baseline metrics
   - Identify bottlenecks

2. **Optimization Implementation** (Priority: Medium)
   - Address any queries >500ms
   - Implement virtual scrolling if needed
   - Optimize largest bundle chunks

3. **Monitoring Setup** (Priority: Low)
   - Consider Sentry Performance integration
   - Set up Lighthouse CI in GitHub Actions
   - Create performance dashboard

---

**Note**: This is a living document. Update benchmarks after each major release and optimization effort.
