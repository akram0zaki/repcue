# ADR-001: Eliminate Schedule Entity and Merge with Workouts

**Status**: Accepted  
**Date**: 2025-07-31  
**Deciders**: Development Team, Product Owner  

## Context

The current application architecture includes two separate entities:
- `Schedule`: Maps weekdays to workouts with complex many-to-many relationships
- `Workout`: Contains exercises with sets/reps/duration data

This creates unnecessary complexity in the user experience:
- Users must navigate through multiple levels: Schedule → Add Schedule → Create Workout
- Cognitive overhead of managing two separate concepts
- Complex data relationships requiring separate CRUD operations
- Confusing mental model that doesn't match user expectations

## Decision

We will **eliminate the `Schedule` entity** and merge scheduling functionality directly into the `Workout` entity by:

1. **Adding `scheduledDays: Weekday[]` property to Workout interface**
2. **Renaming "Schedule" tab to "Workouts" tab in navigation**
3. **Moving workout management from Exercises page to Workouts tab**
4. **Removing all Schedule-related CRUD operations and UI components**

## Rationale

### User Experience Benefits
- **Simplified Mental Model**: Users think "I want my Upper Body workout on Mondays" not "I want to create a schedule that maps workouts to days"
- **Reduced Navigation Complexity**: Direct workout management instead of 3-level deep navigation
- **Industry Alignment**: Standard fitness apps use "Workouts" not "Schedules" as primary navigation

### Technical Benefits
- **Data Minimization**: Fewer entities reduce attack surface (OWASP security principle)
- **Reduced Complexity**: Single entity lifecycle instead of managing relationships
- **Simplified GDPR Compliance**: Fewer data structures to audit and export
- **Testing Efficiency**: Fewer integration points and edge cases

### Security Considerations (OWASP Compliance)
- **A08 - Data Integrity**: Simpler data model reduces serialization/deserialization risks
- **A05 - Security Misconfiguration**: Fewer entities mean fewer potential misconfiguration points
- **Principle of Least Privilege**: Consolidated permissions model with single workout entity

## Consequences

### Positive
- ✅ Cleaner user experience aligned with mental models
- ✅ Reduced development complexity and maintenance burden
- ✅ Better security posture through data minimization
- ✅ Improved testability with fewer integration points
- ✅ Simplified data export/import for GDPR compliance

### Negative
- ⚠️ **Data Migration Required**: Existing users need seamless migration from Schedule → Workout.scheduledDays
- ⚠️ **Breaking Change**: Complete UI restructure required
- ⚠️ **Testing Overhead**: All schedule-related tests need updating

### Neutral
- 🔄 **Calendar View**: Can still be provided as computed view from workout data
- 🔄 **Advanced Scheduling**: Future features (multiple workouts per day) still possible with array extensions

## Implementation Plan

### Phase 1: Data Model Changes
```typescript
// New simplified Workout interface
interface Workout {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  scheduledDays: Weekday[];  // Replaces Schedule entity entirely
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Phase 2: Navigation Updates
- Rename "Schedule" tab → "Workouts" tab
- Update routing: `/schedule` → `/workouts`
- Move workout management from Exercises page to Workouts page

### Phase 3: Data Migration
```typescript
// Secure migration preserving user data
const schedules = await storageService.getSchedules();
for (const schedule of schedules) {
  for (const [weekday, workoutId] of Object.entries(schedule.weeklyWorkouts)) {
    const workout = await storageService.getWorkout(workoutId);
    if (workout && !workout.scheduledDays?.includes(weekday)) {
      workout.scheduledDays = [...(workout.scheduledDays || []), weekday];
      await storageService.saveWorkout(workout);
    }
  }
}
```

### Phase 4: Cleanup
- Remove Schedule interface, service methods, and UI components
- Update all tests to reflect new architecture
- Remove schedule-related routes and navigation

## Alternatives Considered

### Alternative 1: Keep Both Entities
**Rejected**: Maintains unnecessary complexity and doesn't address user experience issues

### Alternative 2: Schedule as Pure View Layer
**Considered**: Schedule page as computed view only, but still requires maintaining UI complexity

### Alternative 3: Multiple Scheduling Abstractions
**Rejected**: Would increase rather than decrease complexity

## Security & Privacy Impact Assessment

### Data Protection (GDPR)
- **Reduced Data**: Fewer entities stored = smaller compliance footprint
- **Simplified Export**: Single workout entity easier to export for data portability
- **Cleaner Deletion**: Easier to implement "right to erasure" with fewer relationships

### Security Posture
- **Attack Surface**: Reduced from managing two entities to one
- **Input Validation**: Fewer data input points to secure
- **Access Control**: Simplified permission model

## Success Metrics

- ✅ **User Experience**: Reduced navigation clicks from 3 levels to 2
- ✅ **Code Quality**: Elimination of Schedule CRUD operations (estimated 30% code reduction)
- ✅ **Security**: Passing OWASP security scan with simplified data model
- ✅ **Performance**: Faster data operations with fewer entity relationships
- ✅ **Testing**: Reduced test complexity and faster test execution

## References

- [OWASP Top 10 - A08 Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)
- [GDPR Data Minimization Principle](https://gdpr-info.eu/art-5-gdpr/)
- [Nielsen Norman Group: Mental Models in User Experience](https://www.nngroup.com/articles/mental-models/)
