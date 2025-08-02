# Rep Logic Debug Analysis

## Current State (from user image):
- Set Progress: 2/2 (should be 2/2 only when ALL reps in final set are done)
- Rep Progress: 7/8 (should advance to 8/8 after completing 8th rep)
- Exercise: Cat-Cow Stretch with 2 sets × 8 reps

## Expected Behavior:
```
Initial: currentSet=0, currentRep=0 → Display: Set 1/2, Rep 0/8
After 1st rep: currentSet=0, currentRep=1 → Display: Set 1/2, Rep 1/8
...
After 7th rep: currentSet=0, currentRep=7 → Display: Set 1/2, Rep 7/8
After 8th rep: currentSet=0, currentRep=8 → Display: Set 1/2, Rep 8/8 → START REST
During rest: currentSet=0, isResting=true → Display: Set 1/2, Rep 8/8
After rest: currentSet=1, currentRep=0 → Display: Set 2/2, Rep 0/8
...
After 15th rep: currentSet=1, currentRep=7 → Display: Set 2/2, Rep 7/8
After 16th rep: currentSet=1, currentRep=8 → Display: Set 2/2, Rep 8/8 → EXERCISE COMPLETE
```

## Issues Identified:

1. **Set Progress Calculation**: 
   - Current logic: `(currentSet / totalSets) * 100` shows 50% when currentSet=1
   - Set progress bar should only show 100% when ALL sets are complete
   - Set text shows 2/2 incorrectly when on last set but not done

2. **Rep Progress Calculation**:
   - Current logic: `(currentRep / totalReps) * 100` shows 87.5% when currentRep=7  
   - Rep text should show completed reps, so 7 completed when working on 8th

3. **Rep Advancement Logic**:
   - Condition: `currentRep < totalReps - 1` allows advancement up to rep 7 only
   - Should allow advancement up to rep 8, then trigger rest/completion

## Root Cause:
The semantic inconsistency between 0-indexed state and 1-indexed display is causing off-by-one errors in completion detection.
