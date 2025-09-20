# Update System Test Suite

This directory contains comprehensive tests for the PWA Update System, covering all requirements specified in Task 13.

## Test Files Overview

### Core Service Tests
- **`updateService.test.ts`** - Basic unit tests for the UpdateService class
- **`updateService.workout.test.ts`** - Workout-aware update handling tests
- **`updateService.integration.test.ts`** - Integration tests for complete update flows
- **`updateService.offline.test.ts`** - Offline fallback mechanism tests
- **`updateSystem.comprehensive.test.ts`** - Comprehensive test suite covering all requirements

### UI Component Tests
- **`../components/__tests__/UpdateNotificationBanner.test.tsx`** - Update notification UI tests
- **`../components/__tests__/ForceUpdateModal.test.tsx`** - Force update modal tests
- **`../components/__tests__/UpdatePreferencesPanel.test.tsx`** - User preferences UI tests
- **`../components/__tests__/WhatsNewOverlay.test.tsx`** - Changelog display tests
- **`../components/__tests__/UpdateSystem.accessibility.test.tsx`** - Accessibility compliance tests

### Edge Function Tests
- **`../../../supabase/functions/check-version/__tests__/index.test.ts`** - Edge function unit tests

### End-to-End Tests
- **`../../../../tests/e2e/cypress/e2e/update-system.cy.ts`** - Complete user journey tests

## Requirements Coverage

### Requirement 6.1: Cross-browser Compatibility
- ✅ Service worker availability detection
- ✅ Connection API variations (navigator.connection, navigator.mozConnection)
- ✅ Storage API fallbacks (localStorage → sessionStorage)
- ✅ Feature detection and graceful degradation

### Requirement 6.2: Edge Function Integration
- ✅ All response scenarios (update available, no update, force update)
- ✅ Error handling (4xx, 5xx responses)
- ✅ Request format validation
- ✅ Privacy-respecting data transmission

### Requirement 6.3: Storage and Connection Handling
- ✅ Limited storage scenarios (quota exceeded)
- ✅ Metered connection detection and warnings
- ✅ Storage corruption recovery
- ✅ Offline state management

### Requirement 6.4: Multi-tab Coordination
- ✅ BroadcastChannel communication
- ✅ Update synchronization across tabs
- ✅ Conflict resolution
- ✅ State consistency

### Requirement 6.5: Error Recovery Mechanisms
- ✅ Retry logic with exponential backoff
- ✅ Rollback capabilities
- ✅ Recovery action recommendations
- ✅ Critical error handling

## Test Categories

### Unit Tests
Focus on individual functions and methods in isolation:
- Version comparison logic
- Update policy evaluation
- Preference management
- State transitions

### Integration Tests
Test complete workflows and service interactions:
- Full update flow (check → notify → apply)
- Service integration (consent, storage, timer)
- Error recovery scenarios
- Privacy compliance flows

### Accessibility Tests
Ensure WCAG 2.1 compliance:
- Screen reader compatibility
- Keyboard navigation
- Color contrast requirements
- Focus management
- ARIA attributes

### Performance Tests
Validate system performance:
- Update check frequency throttling
- Memory usage management
- Resource cleanup
- Startup impact measurement

### End-to-End Tests
Complete user journey validation:
- Real browser environment testing
- User interaction simulation
- Cross-device compatibility
- Network condition variations

## Running Tests

### All Update System Tests
```bash
# Run all update-related tests
pnpm test --run --reporter=verbose updateService updateSystem UpdateNotification ForceUpdate UpdatePreferences WhatsNew

# Run with coverage
pnpm test:coverage --run updateService updateSystem
```

### Specific Test Categories
```bash
# Unit tests only
pnpm test --run updateService.test.ts

# Integration tests
pnpm test --run updateService.integration.test.ts

# Offline scenarios
pnpm test --run updateService.offline.test.ts

# Accessibility tests
pnpm test --run UpdateSystem.accessibility.test.tsx

# Comprehensive suite
pnpm test --run updateSystem.comprehensive.test.ts
```

### Edge Function Tests
```bash
# Run Deno tests for edge function
cd supabase/functions/check-version
deno test --allow-env __tests__/index.test.ts
```

### End-to-End Tests
```bash
# Run Cypress E2E tests
pnpm test:e2e --spec "cypress/e2e/update-system.cy.ts"

# Run with specific browser
pnpm cypress:run --browser chrome --spec "cypress/e2e/update-system.cy.ts"
```

## Test Data and Mocks

### Mock Responses
The tests use realistic mock data that matches the actual API responses:
- Version check responses with all policy types
- Error responses for various failure scenarios
- Service worker events and states
- Timer/workout state objects

### Test Utilities
Common test utilities are available in `src/test/testUtils.ts`:
- Mock service worker setup
- Fake timer management
- Storage mocking helpers
- Event simulation utilities

## Continuous Integration

### GitHub Actions
The test suite is integrated with CI/CD:
```yaml
- name: Run Update System Tests
  run: |
    pnpm test:unit --run updateService updateSystem
    pnpm test:e2e --spec "cypress/e2e/update-system.cy.ts"
```

### Coverage Requirements
- Minimum 90% line coverage for update service
- 100% coverage for critical update paths
- Accessibility tests must pass without violations

## Debugging Tests

### Common Issues
1. **Service Worker Mocking**: Ensure proper SW mock setup in beforeEach
2. **Async Operations**: Use proper async/await patterns and timeouts
3. **Storage Mocking**: Clear storage between tests to avoid state leakage
4. **Timer Mocking**: Use vi.useFakeTimers() for time-dependent tests

### Debug Commands
```bash
# Run tests with debug output
DEBUG=1 pnpm test --run updateService.test.ts

# Run single test with UI
pnpm test:ui --run updateService.test.ts

# Run with coverage and open report
pnpm test:coverage --run updateService && open coverage/index.html
```

## Contributing

When adding new update system features:

1. **Add Unit Tests**: Test individual functions in isolation
2. **Add Integration Tests**: Test feature within complete flows
3. **Add Accessibility Tests**: Ensure WCAG compliance for UI changes
4. **Add E2E Tests**: Test complete user journeys
5. **Update Documentation**: Keep this README current

### Test Naming Convention
- `should [expected behavior] when [condition]`
- `should handle [scenario] gracefully`
- `should [action] for [user type/situation]`

### Mock Strategy
- Mock external dependencies (APIs, services)
- Use real implementations for internal logic
- Provide realistic test data
- Test both success and failure scenarios

## Performance Benchmarks

The test suite includes performance benchmarks:
- Update check response time: < 500ms
- UI rendering time: < 100ms
- Memory usage: < 10MB additional
- Storage operations: < 50ms

These benchmarks ensure the update system doesn't negatively impact app performance.