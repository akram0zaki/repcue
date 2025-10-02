# RepCue AI Assistant: User Story to Task Mapping

**Feature Name:** RepCue AI Assistant
**Document Version:** 1.0
**Last Updated:** 2025-10-02

---

## Overview

This document provides a comprehensive mapping between user stories (from the PRD) and implementation tasks (from the implementation plan). This helps track which tasks satisfy which user requirements and ensures complete coverage of all user needs.

---

## User Stories Summary

### Primary User Stories

- **US-001: New User Onboarding** - New users getting personalized AI workout suggestions
- **US-002: Goal Change** - Existing users regenerating workouts for new goals
- **US-003: Injury Accommodation** - Users with injuries getting safe workout recommendations

### Secondary User Stories

- **US-004: Entry Point Discovery** - Users discovering the AI Assistant feature
- **US-005: Authentication Flow** - Unauthenticated users being prompted to sign in
- **US-006: Offline Handling** - Users understanding offline limitations

---

## User Story → Tasks Mapping

### US-001: New User Onboarding
> As a new user who doesn't know how to create a workout plan, I want an AI to suggest personalized workouts based on my goals, so that I can start training immediately without fitness expertise.

**Phase 1: Foundation & Types**
- Task 1.1: TypeScript Types & Interfaces
- Task 1.2: Database Schema Updates
- Task 1.3: Feature Flag Setup
- Task 1.4: Validation Utilities

**Phase 2: Frontend UI Components**
- Task 2.4: AIWorkoutProgressIndicator Component
- Task 2.5: AIWorkoutScreen1 Component
- Task 2.6: AIWorkoutScreen2 Component
- Task 2.7: AIWorkoutScreen3 Component
- Task 2.8: AIWorkoutLoadingState Component
- Task 2.9: AIWorkoutResultsModal Component
- Task 2.10: AIWorkoutOnboardingPage
- Task 2.11: useAIWorkoutFlow Hook

**Phase 3: Backend Edge Function**
- Task 3.1: Edge Function Scaffolding
- Task 3.2: Security Module
- Task 3.3: Anthropic AI Client
- Task 3.4: Prompt Builder
- Task 3.5: Workout Generator
- Task 3.6: Exercise Catalog Fetcher
- Task 3.7: Error Handler

**Phase 4: Integration & Security**
- Task 4.1: Frontend Service Client
- Task 4.2: StorageService Integration
- Task 4.3: Rate Limiting Implementation
- Task 4.4: End-to-End Integration Test

**Phase 5: Localization & Accessibility**
- Task 5.1: Translation Keys
- Task 5.2: RTL Support
- Task 5.3: Accessibility Audit
- Task 5.4: Reduced Motion Support

**Phase 6: Testing & Polish**
- Task 6.1: Unit Tests
- Task 6.2: Component Tests
- Task 6.3: Edge Function Tests
- Task 6.4: Manual Testing Checklist
- Task 6.5: Performance Testing
- Task 6.6: Security Testing
- Task 6.7: UX Polish

**Phase 7: Deployment & Monitoring**
- Task 7.1: Environment Setup
- Task 7.2: Deploy to Development
- Task 7.3: Internal Testing
- Task 7.4: Beta Testing
- Task 7.5: Deploy to Production
- Task 7.6: Monitoring & Analytics
- Task 7.7: Documentation

**Total Tasks for US-001:** 43 tasks

---

### US-002: Goal Change
> As an existing user who has changed my fitness goals, I want to regenerate workout suggestions, so that my training aligns with my new objectives.

**Phase 1: Foundation & Types**
- Task 1.1: TypeScript Types & Interfaces
- Task 1.2: Database Schema Updates
- Task 1.3: Feature Flag Setup

**Phase 2: Frontend UI Components**
- Task 2.6: AIWorkoutScreen2 Component (goals selection)
- Task 2.9: AIWorkoutResultsModal Component
- Task 2.10: AIWorkoutOnboardingPage
- Task 2.11: useAIWorkoutFlow Hook

**Phase 3: Backend Edge Function**
- Task 3.1: Edge Function Scaffolding
- Task 3.3: Anthropic AI Client
- Task 3.4: Prompt Builder
- Task 3.5: Workout Generator

**Phase 4: Integration & Security**
- Task 4.1: Frontend Service Client
- Task 4.2: StorageService Integration
- Task 4.3: Rate Limiting Implementation

**Phase 6: Testing & Polish**
- Task 6.1: Unit Tests
- Task 6.3: Edge Function Tests
- Task 6.4: Manual Testing Checklist
- Task 6.7: UX Polish

**Phase 7: Deployment & Monitoring**
- Task 7.1: Environment Setup
- Task 7.2: Deploy to Development
- Task 7.3: Internal Testing
- Task 7.4: Beta Testing
- Task 7.5: Deploy to Production
- Task 7.6: Monitoring & Analytics

**Total Tasks for US-002:** 22 tasks

---

### US-003: Injury Accommodation
> As a user recovering from an injury, I want the AI to avoid exercises that might aggravate my condition, so that I can train safely while healing.

**Phase 1: Foundation & Types**
- Task 1.1: TypeScript Types & Interfaces
- Task 1.4: Validation Utilities

**Phase 2: Frontend UI Components**
- Task 2.7: AIWorkoutScreen3 Component (injury input)
- Task 2.10: AIWorkoutOnboardingPage

**Phase 3: Backend Edge Function**
- Task 3.1: Edge Function Scaffolding
- Task 3.3: Anthropic AI Client
- Task 3.4: Prompt Builder
- Task 3.6: Exercise Catalog Fetcher

**Phase 6: Testing & Polish**
- Task 6.1: Unit Tests
- Task 6.3: Edge Function Tests
- Task 6.4: Manual Testing Checklist

**Phase 7: Deployment & Monitoring**
- Task 7.1: Environment Setup
- Task 7.2: Deploy to Development
- Task 7.3: Internal Testing
- Task 7.4: Beta Testing
- Task 7.5: Deploy to Production

**Total Tasks for US-003:** 14 tasks

---

### US-004: Entry Point Discovery
> As a user browsing the home page, I want a clear call-to-action to try the RepCue AI Assistant, so that I'm aware this feature exists.

**Phase 1: Foundation & Types**
- Task 1.3: Feature Flag Setup

**Phase 2: Frontend UI Components**
- Task 2.1: AIWorkoutButton Component

**Phase 5: Localization & Accessibility**
- Task 5.1: Translation Keys
- Task 5.3: Accessibility Audit

**Phase 6: Testing & Polish**
- Task 6.2: Component Tests
- Task 6.4: Manual Testing Checklist
- Task 6.5: Performance Testing
- Task 6.7: UX Polish

**Phase 7: Deployment & Monitoring**
- Task 7.2: Deploy to Development
- Task 7.4: Beta Testing
- Task 7.5: Deploy to Production
- Task 7.7: Documentation

**Total Tasks for US-004:** 11 tasks

---

### US-005: Authentication Flow
> As an unauthenticated user interested in AI workouts, I want to be prompted to sign in with options to proceed or defer, so that I can choose when to authenticate.

**Phase 2: Frontend UI Components**
- Task 2.2: AIWorkoutAuthGate Component

**Phase 4: Integration & Security**
- Task 4.4: End-to-End Integration Test

**Phase 6: Testing & Polish**
- Task 6.2: Component Tests
- Task 6.4: Manual Testing Checklist

**Phase 7: Deployment & Monitoring**
- Task 7.5: Deploy to Production

**Total Tasks for US-005:** 5 tasks

---

### US-006: Offline Handling
> As a user who is offline, I want clear messaging that this feature requires internet, so that I understand why it's unavailable.

**Phase 2: Frontend UI Components**
- Task 2.3: AIWorkoutOfflineGate Component

**Phase 4: Integration & Security**
- Task 4.4: End-to-End Integration Test

**Phase 6: Testing & Polish**
- Task 6.2: Component Tests
- Task 6.4: Manual Testing Checklist

**Phase 7: Deployment & Monitoring**
- Task 7.5: Deploy to Production

**Total Tasks for US-006:** 5 tasks

---

## Task → User Stories Reverse Mapping

### Phase 1: Foundation & Types (4 tasks)
- **Task 1.1** → US-001, US-002, US-003
- **Task 1.2** → US-001, US-002
- **Task 1.3** → US-001, US-002, US-004
- **Task 1.4** → US-001, US-003

### Phase 2: Frontend UI Components (11 tasks)
- **Task 2.1** → US-004
- **Task 2.2** → US-005
- **Task 2.3** → US-006
- **Task 2.4** → US-001
- **Task 2.5** → US-001
- **Task 2.6** → US-001, US-002
- **Task 2.7** → US-001, US-003
- **Task 2.8** → US-001
- **Task 2.9** → US-001, US-002
- **Task 2.10** → US-001, US-002, US-003
- **Task 2.11** → US-001, US-002

### Phase 3: Backend Edge Function (7 tasks)
- **Task 3.1** → US-001, US-002, US-003
- **Task 3.2** → US-001
- **Task 3.3** → US-001, US-002, US-003
- **Task 3.4** → US-001, US-002, US-003
- **Task 3.5** → US-001, US-002
- **Task 3.6** → US-001, US-003
- **Task 3.7** → US-001

### Phase 4: Integration & Security (4 tasks)
- **Task 4.1** → US-001, US-002
- **Task 4.2** → US-001, US-002
- **Task 4.3** → US-001, US-002
- **Task 4.4** → US-001, US-005, US-006

### Phase 5: Localization & Accessibility (4 tasks)
- **Task 5.1** → US-001, US-004
- **Task 5.2** → US-001
- **Task 5.3** → US-001, US-004
- **Task 5.4** → US-001

### Phase 6: Testing & Polish (7 tasks)
- **Task 6.1** → US-001, US-002, US-003
- **Task 6.2** → US-001, US-004, US-005, US-006
- **Task 6.3** → US-001, US-002, US-003
- **Task 6.4** → US-001, US-002, US-003, US-004, US-005, US-006
- **Task 6.5** → US-001, US-004
- **Task 6.6** → US-001
- **Task 6.7** → US-001, US-002, US-004

### Phase 7: Deployment & Monitoring (7 tasks)
- **Task 7.1** → US-001, US-002, US-003
- **Task 7.2** → US-001, US-002, US-003, US-004
- **Task 7.3** → US-001, US-002, US-003
- **Task 7.4** → US-001, US-002, US-003, US-004
- **Task 7.5** → US-001, US-002, US-003, US-004, US-005, US-006
- **Task 7.6** → US-001, US-002
- **Task 7.7** → US-001, US-004

---

## Coverage Analysis

### User Story Coverage
- **US-001**: Covered by 43 tasks (100% of implementation)
- **US-002**: Covered by 22 tasks (51% of tasks)
- **US-003**: Covered by 14 tasks (33% of tasks)
- **US-004**: Covered by 11 tasks (26% of tasks)
- **US-005**: Covered by 5 tasks (12% of tasks)
- **US-006**: Covered by 5 tasks (12% of tasks)

### Task Distribution by User Story
```
US-001 (New User Onboarding)        ████████████████████████████████████████████ 43 tasks
US-002 (Goal Change)                ██████████████████████ 22 tasks
US-003 (Injury Accommodation)       ██████████████ 14 tasks
US-004 (Entry Point Discovery)      ███████████ 11 tasks
US-005 (Authentication Flow)        █████ 5 tasks
US-006 (Offline Handling)           █████ 5 tasks
```

---

## Implementation Priority

### Critical Path (Must Complete for MVP)
All tasks related to:
- **US-001** (New User Onboarding) - Core feature
- **US-005** (Authentication Flow) - Required for saving workouts
- **US-006** (Offline Handling) - Prevents confusion

### High Priority (Should Complete for MVP)
All tasks related to:
- **US-002** (Goal Change) - Key differentiator
- **US-004** (Entry Point Discovery) - Discoverability

### Medium Priority (Can be Post-MVP)
All tasks related to:
- **US-003** (Injury Accommodation) - Important but not blocking

---

## Testing Coverage by User Story

### US-001 Testing Tasks
- Task 6.1: Unit Tests
- Task 6.2: Component Tests
- Task 6.3: Edge Function Tests
- Task 6.4: Manual Testing Checklist
- Task 6.5: Performance Testing
- Task 6.6: Security Testing
- Task 6.7: UX Polish
- Task 7.3: Internal Testing
- Task 7.4: Beta Testing

### US-002 Testing Tasks
- Task 6.1: Unit Tests
- Task 6.3: Edge Function Tests
- Task 6.4: Manual Testing Checklist
- Task 6.7: UX Polish
- Task 7.3: Internal Testing
- Task 7.4: Beta Testing

### US-003 Testing Tasks
- Task 6.1: Unit Tests
- Task 6.3: Edge Function Tests
- Task 6.4: Manual Testing Checklist
- Task 7.3: Internal Testing
- Task 7.4: Beta Testing

### US-004 Testing Tasks
- Task 6.2: Component Tests
- Task 6.4: Manual Testing Checklist
- Task 6.5: Performance Testing
- Task 6.7: UX Polish
- Task 7.4: Beta Testing

### US-005 Testing Tasks
- Task 4.4: End-to-End Integration Test
- Task 6.2: Component Tests
- Task 6.4: Manual Testing Checklist

### US-006 Testing Tasks
- Task 4.4: End-to-End Integration Test
- Task 6.2: Component Tests
- Task 6.4: Manual Testing Checklist

---

## Acceptance Criteria Coverage

Each task includes specific acceptance criteria that map to user story requirements:

### Example: US-003 (Injury Accommodation)
- **Task 2.7** ensures injury input is properly captured (500 char limit, optional)
- **Task 3.4** ensures prompt builder includes injury data in AI prompt
- **Task 3.6** ensures exercise catalog is filtered appropriately
- **Task 6.3** tests that AI avoids contraindicated exercises
- **Task 7.3** validates real-world injury scenarios

---

## Next Steps

1. **Review Mapping**: Ensure all stakeholders agree with task-to-story mapping
2. **Prioritize**: Confirm critical path tasks for MVP
3. **Resource Allocation**: Assign developers to high-priority tasks
4. **Track Progress**: Use this mapping to monitor feature completion
5. **Validate Coverage**: Ensure no user story is left without implementation

---

## Document Maintenance

This document should be updated when:
- New user stories are added
- Tasks are added, removed, or modified
- User story priorities change
- Acceptance criteria are refined

**Last Reviewed:** 2025-10-02
**Next Review:** Weekly during implementation
