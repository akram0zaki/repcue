# RepCue AI Coach - Testing Guide

**Version**: 1.1
**Date**: 2025-01-15
**Status**: Complete
**Related Documents**:
- [AI Coach PRD](ai-coach-prd.md)
- [Implementation Plan](ai-coach-implementation-plan.md)
- [Enhancements Addendum](enhancements-addendum.md)
- [Technical Requirements](technical-requirements-addendum.md)

---

## Overview

This guide provides comprehensive testing instructions for all completed AI Coach features across Phase 1, Phase 2, and Phase 1 Enhancements. The AI Coach transforms RepCue from a simple workout timer into an intelligent fitness companion that provides personalized insights, celebrates progress, and guides users toward their goals.

**Total Tests**: 53 numbered tests for easy progress tracking

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Phase 1: Core Features (Tests 1-14)](#phase-1-core-features)
3. [Phase 1 Enhancements (Tests 15-28)](#phase-1-enhancements)
4. [Phase 2: AI-Powered Features (Tests 29-41)](#phase-2-ai-powered-features)
5. [Testing Checklist](#testing-checklist)
6. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
7. [Test Data Setup](#test-data-setup)

---

## Feature Overview

### Completed Modules

#### Phase 1: Foundation (✅ Complete)
- **Module 1.1**: Analytics Service & Data Models
- **Module 1.2**: Coaching Service & Recommendation Engine
- **Module 1.3**: UI Components
- **Module 1.4**: Integration & Settings
- **Module 1.5**: Localization & Polish

#### Phase 1 Enhancements (✅ Complete)
- **E1.1**: Micro-Interaction Library (confetti, sounds, animations)
- **E1.2**: Coach Persona Customization (Zen, Energy, Logic)
- **E1.3**: Insights Carousel on HomePage
- **E3.1**: ActivityLog Schema Extension (metadata)
- **E3.2**: Post-Workout Survey
- **E6.1**: Extended coaching.json Namespace

#### Phase 2: AI-Enhanced (✅ Complete)
- **Module 2.1**: Edge Function Infrastructure
- **Module 2.2**: Frontend AI Integration
- **Module 2.3**: Progressive Overload & Recovery
- **Module 2.4**: Internationalization (i18n)
- **Module 2.5**: Integration Testing
- **Module 2.6**: Documentation & Finalization
- **Module 2.7**: Personal Records & Milestones
- **Module 2.8**: Performance Testing & Optimization

---

## Phase 1: Core Features

### 1.1 Coach Page Dashboard

**Location**: Navigate to "Coach" tab in bottom navigation

#### **Test 1**: Basic Layout
**Status**: [ ] Pass / [ ] Fail

1. Open the app
2. Tap the "Coach" navigation icon (graduation cap/star)
3. Verify the page displays:
   - ✅ Header: "Your AI Coach"
   - ✅ Streak calendar widget
   - ✅ Insights feed section
   - ✅ Progress chart
   - ✅ Muscle group balance section

**Expected Result**: Clean, responsive layout with all sections visible

---

#### **Test 2**: Empty State
**Status**: [ ] Pass / [ ] Fail

1. Clear all workout data (or use fresh account)
2. Navigate to Coach page
3. Verify empty state message:
   - ✅ "Complete a workout to unlock insights"
   - ✅ Friendly icon/illustration
   - ✅ Call-to-action button

**Expected Result**: Encouraging message prompting user to start training

---

### 1.2 Workout Streak Tracking

**Component**: [WeeklyStreakCalendar.tsx](../../../apps/frontend/src/components/WeeklyStreakCalendar.tsx)

#### **Test 3**: Streak Display
**Status**: [ ] Pass / [ ] Fail

1. Complete workouts on consecutive days:
   - Day 1: Complete 1 workout
   - Day 2: Complete 1 workout
   - Day 3: Complete 1 workout
2. Navigate to Coach page
3. Verify streak display shows:
   - ✅ Current streak: "3 days"
   - ✅ Flame icon with animation
   - ✅ Longest streak (if different)
   - ✅ Calendar grid showing completed days

**Expected Result**: Current streak accurately reflects consecutive workout days

---

#### **Test 4**: Streak Break
**Status**: [ ] Pass / [ ] Fail

1. With an active 3-day streak
2. Skip 1 day (no workout)
3. Navigate to Coach page
4. Verify:
   - ✅ Current streak resets to 0
   - ✅ Longest streak preserved: "3 days"
   - ✅ Encouraging message: "Every day is a fresh start!"

**Expected Result**: Streak resets gracefully with motivational messaging

---

#### **Test 5**: Week Navigation
**Status**: [ ] Pass / [ ] Fail

1. On streak calendar widget
2. Tap previous/next week arrows
3. Verify:
   - ✅ Calendar updates to show different week
   - ✅ ISO week number updates
   - ✅ Completed days highlighted for that week

**Expected Result**: Calendar navigates smoothly between weeks

---

### 1.3 Coaching Insights Feed

**Component**: [CoachingCard.tsx](../../../apps/frontend/src/components/coaching/CoachingCard.tsx)

#### **Test 6**: Streak Insight
**Status**: [ ] Pass / [ ] Fail

1. Build a 5-day streak
2. Navigate to Coach page
3. Verify insight card displays:
   - ✅ Title: "You're on a 5-day streak!"
   - ✅ Encouraging message
   - ✅ Flame icon
   - ✅ Priority: High

**Expected Result**: Streak insight appears prominently in feed

---

#### **Test 7**: Muscle Balance Insight
**Status**: [ ] Pass / [ ] Fail

1. Complete workouts focusing only on upper body for 7 days
2. Navigate to Coach page
3. Verify insight card displays:
   - ✅ Title: "You haven't trained legs in 7 days"
   - ✅ Suggested exercises (leg-focused)
   - ✅ Action button: "View Exercises"
   - ✅ Warning icon

**Expected Result**: Muscle imbalance detected and suggested

---

#### **Test 8**: Progression Insight
**Status**: [ ] Pass / [ ] Fail

1. Complete same exercise with same reps/sets 3+ times
2. Navigate to Coach page
3. Verify insight card displays:
   - ✅ Title: "Ready to level up?"
   - ✅ Suggested progression (e.g., "Try 2 more reps")
   - ✅ Action button: "Accept Challenge"
   - ✅ Chart/trophy icon

**Expected Result**: Progressive overload recommendation appears

---

#### **Test 9**: Dismissing Insights
**Status**: [ ] Pass / [ ] Fail

1. On any insight card
2. Tap dismiss button (X icon)
3. Verify:
   - ✅ Card fades out smoothly
   - ✅ Card removed from feed
   - ✅ Remaining insights shift up
   - ✅ Dismissed insight doesn't reappear on refresh

**Expected Result**: Insights can be dismissed persistently

---

### 1.4 Progress Chart

**Component**: [ProgressChart.tsx](../../../apps/frontend/src/components/ProgressChart.tsx)

#### **Test 10**: Time Range Selector
**Status**: [ ] Pass / [ ] Fail

1. Navigate to Coach page → Progress Chart section
2. Tap time range dropdown
3. Select different ranges:
   - ✅ "Current Month"
   - ✅ "Last 3 Months"
   - ✅ "Since Start"
4. Verify chart updates with correct data for each range

**Expected Result**: Chart dynamically updates based on selected time range

---

#### **Test 11**: Chart Interaction
**Status**: [ ] Pass / [ ] Fail

1. Hover over (desktop) or tap (mobile) chart bars
2. Verify tooltip displays:
   - ✅ Period label (e.g., "Week 1")
   - ✅ Workout count
   - ✅ Total time
   - ✅ Average per week

**Expected Result**: Interactive tooltips provide detailed information

---

#### **Test 12**: Summary Statistics
**Status**: [ ] Pass / [ ] Fail

1. Complete 10 workouts over 2 weeks
2. Navigate to Coach page
3. Verify summary shows:
   - ✅ Total workouts: 10
   - ✅ Average per week: 5
   - ✅ Total time: Accurate sum

**Expected Result**: Summary statistics accurately reflect workout history

---

### 1.5 Settings Integration

**Location**: Settings page → AI Coach section

#### **Test 13**: AI Coach Toggle
**Status**: [ ] Pass / [ ] Fail

1. Navigate to Settings
2. Find "AI Coach" section
3. Toggle "Enable AI Coach" switch
4. Verify:
   - ✅ OFF: Coach page shows disabled state
   - ✅ ON: Coach page shows full functionality
   - ✅ Setting persists after app restart

**Expected Result**: AI Coach can be fully enabled/disabled

---

#### **Test 14**: Insight Frequency Control
**Status**: [ ] Pass / [ ] Fail

1. In Settings → AI Coach
2. Adjust "Insight Frequency" slider:
   - ✅ Low: Fewer insights shown
   - ✅ Medium: Default
   - ✅ High: More insights shown
3. Navigate to Coach page and verify frequency changes

**Expected Result**: User controls how often insights appear

---

### 1.6 Localization Support

#### **Test 15**: Language Switching
**Status**: [ ] Pass / [ ] Fail

1. Navigate to Settings → Language
2. Switch between supported languages:
   - ✅ English (en)
   - ✅ Arabic (ar, ar-EG)
   - ✅ Dutch (nl)
   - ✅ German (de)
   - ✅ Spanish (es)
   - ✅ French (fr)
   - ✅ Frisian (fy)
3. Verify Coach page content translates correctly:
   - ✅ Page title
   - ✅ Insight messages
   - ✅ Button labels
   - ✅ Chart labels

**Expected Result**: All coaching content properly localized

---

#### **Test 16**: RTL Support (Arabic)
**Status**: [ ] Pass / [ ] Fail

1. Switch language to Arabic (ar)
2. Navigate to Coach page
3. Verify:
   - ✅ Text flows right-to-left
   - ✅ Icons positioned correctly
   - ✅ Charts mirror horizontally
   - ✅ Navigation remains functional

**Expected Result**: Full RTL layout support

---

## Phase 1 Enhancements

### 2.1 Micro-Interactions & Celebrations

**Utility**: [microInteractions.ts](../../../apps/frontend/src/utils/microInteractions.ts)

#### **Test 17**: Confetti Animation
**Status**: [ ] Pass / [ ] Fail

1. Complete a workout that triggers a personal record (PR)
2. Verify confetti animation:
   - ✅ Canvas-based particles fall from top
   - ✅ Colorful, celebratory effect
   - ✅ Lasts ~3 seconds
   - ✅ Respects `prefers-reduced-motion` (no animation if enabled)

**Expected Result**: Delightful celebration without motion sickness

---

#### **Test 18**: Confetti Intensity Levels
**Status**: [ ] Pass / [ ] Fail

1. Trigger different achievement types:
   - **Subtle**: Small milestone (e.g., 10th workout)
   - **Medium**: Streak milestone (e.g., 7-day streak)
   - **Full**: Major PR or badge unlock
2. Verify intensity matches achievement importance

**Expected Result**: Confetti intensity scales with achievement significance

---

#### **Test 19**: Sound Cues (Optional)
**Status**: [ ] Pass / [ ] Fail

1. Enable "Celebration Sounds" in Settings
2. Trigger achievement (PR, badge, milestone)
3. Verify:
   - ✅ Achievement sound plays
   - ✅ Volume appropriate
   - ✅ Can be disabled in Settings

**Expected Result**: Optional audio feedback enhances celebration

---

#### **Test 20**: Pulsing Animations
**Status**: [ ] Pass / [ ] Fail

1. Navigate to Coach page with new unread insight
2. Verify insight card has subtle pulse animation:
   - ✅ Gentle scale/opacity change
   - ✅ Draws attention without being intrusive
   - ✅ Stops after first view

**Expected Result**: Subtle animation highlights new content

---

#### **Test 21**: Reduced Motion Compliance
**Status**: [ ] Pass / [ ] Fail

1. Enable OS-level "Reduce Motion" setting
2. Trigger achievements and navigate Coach page
3. Verify:
   - ✅ No confetti animation
   - ✅ No pulsing animations
   - ✅ No auto-rotating carousel (see next section)
   - ✅ Functionality intact (static celebrations)

**Expected Result**: All animations respect accessibility preferences

---

### 2.2 Coach Persona Customization

**Utility**: [coachPersona.ts](../../../apps/frontend/src/utils/coachPersona.ts)

#### **Test 22**: Persona Selection
**Status**: [ ] Pass / [ ] Fail

1. Navigate to Settings → Coach Personality
2. View available personas:
   - ✅ **Coach Zen**: Calm, mindful, balanced
   - ✅ **Coach Energy**: Enthusiastic, motivating, high-energy
   - ✅ **Coach Logic**: Data-driven, analytical, precise
3. Select each persona and save

**Expected Result**: Three distinct coaching personalities available

---

#### **Test 23**: Zen Persona Messaging
**Status**: [ ] Pass / [ ] Fail

1. Select "Coach Zen" persona
2. Navigate to Coach page
3. Verify insight messages use calm tone:
   - ✅ "You're building momentum. 5 days strong."
   - ✅ "You're ready. Try 10 reps when it feels right."
   - ✅ Mindful, balanced language

**Expected Result**: Zen persona messages are calm and encouraging

---

#### **Test 24**: Energy Persona Messaging
**Status**: [ ] Pass / [ ] Fail

1. Select "Coach Energy" persona
2. Navigate to Coach page
3. Verify insight messages use enthusiastic tone:
   - ✅ "You're on FIRE! 5 days in a row!"
   - ✅ "You're crushing it! GO FOR 10 reps!"
   - ✅ High-energy, motivating language

**Expected Result**: Energy persona messages are enthusiastic and bold

---

#### **Test 25**: Logic Persona Messaging
**Status**: [ ] Pass / [ ] Fail

1. Select "Coach Logic" persona
2. Navigate to Coach page
3. Verify insight messages use analytical tone:
   - ✅ "Current streak: 5 consecutive days."
   - ✅ "Performance data suggests 10 reps is achievable."
   - ✅ Data-forward, precise language

**Expected Result**: Logic persona messages are analytical and factual

---

#### **Test 26**: Persona Persistence
**Status**: [ ] Pass / [ ] Fail

1. Select a persona in Settings
2. Close and reopen app
3. Verify selected persona persists

**Expected Result**: Persona choice saved across sessions

---

### 2.3 Insights Carousel on HomePage

**Component**: [InsightsCarousel.tsx](../../../apps/frontend/src/components/InsightsCarousel.tsx)

#### **Test 27**: Carousel Display
**Status**: [ ] Pass / [ ] Fail

1. Complete workouts to generate 3+ insights
2. Navigate to HomePage (not Coach page)
3. Verify carousel appears:
   - ✅ Shows top 1-3 insights
   - ✅ Horizontal swipeable layout
   - ✅ Navigation dots indicator
   - ✅ "View All" CTA button

**Expected Result**: Insights preview visible on home screen

---

#### **Test 28**: Swipe Interaction (Mobile)
**Status**: [ ] Pass / [ ] Fail

1. On HomePage insights carousel
2. Swipe left/right
3. Verify:
   - ✅ Smooth horizontal scroll
   - ✅ Snap to each insight card
   - ✅ Dots indicator updates

**Expected Result**: Touch gestures work smoothly

---

#### **Test 29**: Keyboard Navigation (Desktop)
**Status**: [ ] Pass / [ ] Fail

1. On HomePage insights carousel
2. Press arrow keys (left/right)
3. Verify:
   - ✅ Carousel navigates between insights
   - ✅ Focus indicator visible
   - ✅ Screen reader announces changes

**Expected Result**: Keyboard accessible

---

#### **Test 30**: Auto-Rotation
**Status**: [ ] Pass / [ ] Fail

1. View HomePage carousel
2. Wait 8 seconds without interaction
3. Verify:
   - ✅ Carousel auto-rotates to next insight
   - ✅ Pauses on hover (desktop)
   - ✅ Pauses on focus (keyboard navigation)

**Expected Result**: Auto-rotation enhances discoverability, pauses on interaction

---

#### **Test 31**: "View All" Navigation
**Status**: [ ] Pass / [ ] Fail

1. On HomePage carousel
2. Tap "View All" button
3. Verify:
   - ✅ Navigates to Coach page
   - ✅ Shows full insights feed

**Expected Result**: Quick access to full Coach experience

---

#### **Test 32**: Settings Control
**Status**: [ ] Pass / [ ] Fail

1. Navigate to Settings → AI Coach
2. Toggle "Show insights on home page"
3. Verify:
   - ✅ OFF: Carousel hidden on HomePage
   - ✅ ON: Carousel visible on HomePage

**Expected Result**: User controls carousel visibility

---

### 2.4 Post-Workout Survey

**Component**: [PostWorkoutSurvey.tsx](../../../apps/frontend/src/components/PostWorkoutSurvey.tsx)

#### **Test 33**: Survey Trigger
**Status**: [ ] Pass / [ ] Fail

1. Complete a full workout
2. After completion screen
3. Verify survey modal appears:
   - ✅ "How was your workout?" title
   - ✅ 4 quick-tap options
   - ✅ "Skip" button
   - ✅ Optional detailed feedback section

**Expected Result**: Survey shown immediately after workout

---

#### **Test 34**: Quick 1-Tap Response
**Status**: [ ] Pass / [ ] Fail

1. On post-workout survey
2. Tap one of 4 quick options:
   - ✅ **Great 😊**: "Strong energy, good form"
   - ✅ **Good 🙂**: "Solid workout, no issues"
   - ✅ **Okay 😐**: "Got through it"
   - ✅ **Tired 😓**: "Low energy, challenging"
3. Verify:
   - ✅ Thank you screen shows
   - ✅ Data saved to ActivityLog.metadata
   - ✅ Survey dismisses automatically

**Expected Result**: One-tap feedback is fast and frictionless

---

#### **Test 35**: Detailed Feedback (Optional)
**Status**: [ ] Pass / [ ] Fail

1. On post-workout survey
2. Tap "More Details" (if available)
3. Verify detailed form shows:
   - ✅ Difficulty rating (1-5 scale)
   - ✅ Energy level (1-5 scale)
   - ✅ Text notes field
4. Submit form
5. Verify all data saved to ActivityLog.metadata

**Expected Result**: Users can provide rich feedback optionally

---

#### **Test 36**: Skipping Survey
**Status**: [ ] Pass / [ ] Fail

1. On post-workout survey
2. Tap "Skip" button
3. Verify:
   - ✅ Survey dismisses immediately
   - ✅ No data saved
   - ✅ Returns to normal flow

**Expected Result**: Survey is easily dismissible

---

#### **Test 37**: Survey Frequency Control
**Status**: [ ] Pass / [ ] Fail

1. Navigate to Settings → AI Coach
2. Find "Post-Workout Survey" setting
3. Options:
   - ✅ Always
   - ✅ Sometimes (50% of workouts)
   - ✅ Never
4. Verify frequency respects setting

**Expected Result**: User controls survey frequency

---

#### **Test 38**: Metadata Storage
**Status**: [ ] Pass / [ ] Fail

1. Complete survey with detailed feedback
2. Open browser DevTools → IndexedDB
3. Navigate to `activity_logs` table
4. Find latest workout entry
5. Verify `metadata` field contains:
   - ✅ `perceived_difficulty`
   - ✅ `perceived_energy`
   - ✅ `mood`
   - ✅ `quality`
   - ✅ `notes_from_survey`

**Expected Result**: Survey data persisted for future AI personalization

---

## Phase 2: AI-Powered Features

### 3.1 AI-Powered Weekly Analysis

**Service**: [insightsService.ts](../../../apps/frontend/src/services/insightsService.ts)

#### **Test 39**: AI Insights Toggle
**Status**: [ ] Pass / [ ] Fail

1. Navigate to Settings → AI Coach
2. Find "AI-Powered Insights" toggle
3. Enable AI insights
4. Navigate to Coach page
5. Verify:
   - ✅ AI badge appears on some insights
   - ✅ Loading indicator shows while fetching
   - ✅ AI-generated insights appear in feed

**Expected Result**: AI insights can be enabled/disabled separately

---

#### **Test 40**: AI Loading State
**Status**: [ ] Pass / [ ] Fail

1. With AI insights enabled
2. Navigate to Coach page (or pull to refresh)
3. Verify loading indicator:
   - ✅ "Your AI coach is analyzing your progress..."
   - ✅ Animated brain/sparkle icon
   - ✅ Progress dots
   - ✅ Accessible (aria-live, aria-busy)

**Expected Result**: Clear feedback during AI processing

---

#### **Test 41**: AI Insight Content
**Status**: [ ] Pass / [ ] Fail

1. Complete 7+ days of varied workouts
2. Navigate to Coach page with AI enabled
3. Verify AI insights include:
   - ✅ 3-5 key takeaways
   - ✅ Specific exercise recommendations
   - ✅ Actionable next steps
   - ✅ Contextual to recent training
   - ✅ Different from rule-based insights

**Expected Result**: AI insights are personalized and actionable

---

#### **Test 42**: AI Badge Indicator
**Status**: [ ] Pass / [ ] Fail

1. On Coach page with AI insights
2. Verify AI-generated insights have badge:
   - ✅ "AI" or sparkle icon
   - ✅ Distinct visual treatment
   - ✅ Tooltip: "Generated by AI"

**Expected Result**: Users can distinguish AI vs. rule-based insights

---

#### **Test 43**: Graceful Degradation
**Status**: [ ] Pass / [ ] Fail

1. Enable AI insights
2. Disconnect internet (offline mode)
3. Navigate to Coach page
4. Verify:
   - ✅ Rule-based insights still work
   - ✅ Message: "AI insights unavailable offline"
   - ✅ No errors or crashes

**Expected Result**: Offline-first principles maintained

---

#### **Test 44**: Caching (24-hour TTL)
**Status**: [ ] Pass / [ ] Fail

1. Load AI insights with internet
2. Navigate away and return to Coach page
3. Verify:
   - ✅ Insights load instantly (from cache)
   - ✅ No new API call (check network tab)
4. Wait 24+ hours, return to Coach page
5. Verify:
   - ✅ New API call triggered
   - ✅ Fresh insights fetched

**Expected Result**: Insights cached to minimize API costs

---

### 3.2 Progressive Overload Recommendations

**Algorithm**: [coachingAlgorithms.ts](../../../apps/frontend/src/utils/coachingAlgorithms.ts) - `detectProgressionOpportunities()`

#### **Test 45**: Progression Detection
**Status**: [ ] Pass / [ ] Fail

1. Complete same exercise 3+ times with 100% completion:
   - Workout 1: 3 sets × 10 reps (completed all)
   - Workout 2: 3 sets × 10 reps (completed all)
   - Workout 3: 3 sets × 10 reps (completed all)
2. Navigate to Coach page
3. Verify insight appears:
   - ✅ Title: "Ready to level up [Exercise]?"
   - ✅ Message: "Try 2 more reps next time" (or +1 set)
   - ✅ Action button: "Accept Challenge"

**Expected Result**: Progression suggested after consistent completion

---

#### **Test 46**: Progression Threshold (80% rule)
**Status**: [ ] Pass / [ ] Fail

1. Complete exercise with 80%+ completion rate:
   - Workout 1: 3 sets × 10 reps (completed 8/10 reps)
   - Workout 2: 3 sets × 10 reps (completed 9/10 reps)
   - Workout 3: 3 sets × 10 reps (completed 10/10 reps)
2. Verify progression insight appears

3. Complete with <80%:
   - Workout 1: 3 sets × 10 reps (completed 5/10 reps)
4. Verify NO progression insight

**Expected Result**: Only suggests progression when user is ready

---

#### **Test 47**: Conservative Increases
**Status**: [ ] Pass / [ ] Fail

1. Receive progression recommendation
2. Verify suggested increase is conservative:
   - ✅ Reps: +1 to +2 (5-10% increase)
   - ✅ Sets: +1 set (conservative)
   - ✅ Duration: +5-10 seconds

**Expected Result**: Gradual, safe progression to avoid injury

---

#### **Test 48**: Accepting Progression
**Status**: [ ] Pass / [ ] Fail

1. View progression insight
2. Tap "Accept Challenge" button
3. Verify:
   - ✅ Navigates to exercise selection
   - ✅ Exercise pre-selected with new target
   - ✅ User can start workout immediately

**Expected Result**: Seamless transition to recommended workout

---

### 3.3 Recovery Time Recommendations

**Algorithm**: [coachingAlgorithms.ts](../../../apps/frontend/src/utils/coachingAlgorithms.ts) - `calculateRecoveryRecommendations()`

#### **Test 49**: Overtraining Detection
**Status**: [ ] Pass / [ ] Fail

1. Complete workouts on 5+ consecutive days
2. Navigate to Coach page
3. Verify recovery insight appears:
   - ✅ Title: "Consider a rest day"
   - ✅ Message: "You've trained 5 days in a row. Recovery is important."
   - ✅ Warning icon
   - ✅ Educational content about recovery

**Expected Result**: Warning shown after 5+ consecutive days

---

#### **Test 50**: Muscle Group Recovery
**Status**: [ ] Pass / [ ] Fail

1. Complete same muscle group workouts on consecutive days:
   - Day 1: Chest exercises
   - Day 2: Chest exercises (again)
   - Day 3: Chest exercises (again)
2. Verify insight:
   - ✅ "Give your chest a rest"
   - ✅ Suggests alternative muscle groups

**Expected Result**: Muscle-group-specific recovery guidance

---

#### **Test 51**: User Override
**Status**: [ ] Pass / [ ] Fail

1. View recovery recommendation
2. Tap "I understand" or dismiss
3. Verify:
   - ✅ Can still start workout (no hard block)
   - ✅ Acknowledgment logged
   - ✅ Insight dismissed

**Expected Result**: Recommendations are suggestions, not restrictions

---

### 3.4 Personal Records (PRs) & Milestones

**Service**: [prService.ts](../../../apps/frontend/src/services/prService.ts)

#### **Test 52**: PR Detection (Max Reps)
**Status**: [ ] Pass / [ ] Fail

1. Complete exercise:
   - Workout 1: Push-ups → 3 sets × 15 reps
2. Later, complete:
   - Workout 2: Push-ups → 3 sets × 20 reps (NEW PR)
3. Verify celebration:
   - ✅ "New Personal Record!" banner
   - ✅ Confetti animation (if enabled)
   - ✅ Sound cue (if enabled)
   - ✅ Details: "20 reps (previous: 15)"

**Expected Result**: PR detected and celebrated immediately

---

#### **Test 53**: PR Detection (Max Sets)
**Status**: [ ] Pass / [ ] Fail

1. Complete exercise:
   - Workout 1: Squats → 3 sets × 10 reps
2. Later, complete:
   - Workout 2: Squats → 5 sets × 10 reps (NEW PR)
3. Verify celebration for max sets

**Expected Result**: Set-based PRs also tracked

---

#### **Test 54**: PR Detection (Max Duration)
**Status**: [ ] Pass / [ ] Fail

1. Complete timed exercise:
   - Workout 1: Plank → 60 seconds
2. Later, complete:
   - Workout 2: Plank → 90 seconds (NEW PR)
3. Verify celebration for max duration

**Expected Result**: Duration-based PRs tracked for timed exercises

---

#### **Test 55**: PR History Page
**Status**: [ ] Pass / [ ] Fail

1. Navigate to Coach page
2. Tap "Personal Records" section
3. Verify PR history page shows:
   - ✅ List of all PRs grouped by exercise
   - ✅ Exercise name, record value, date achieved
   - ✅ "New!" badge on recent PRs
   - ✅ Filter by exercise or muscle group
   - ✅ Sortable by date or exercise name

**Expected Result**: Complete PR history accessible

---

#### **Test 56**: PR Celebration Component
**Status**: [ ] Pass / [ ] Fail

1. Trigger new PR
2. Verify celebration modal:
   - ✅ Large trophy/star icon
   - ✅ "New Personal Record!" title
   - ✅ Exercise name and new record value
   - ✅ Previous record comparison
   - ✅ Confetti animation
   - ✅ "Share" button (future feature)
   - ✅ "Continue" button to dismiss

**Expected Result**: Celebratory modal enhances achievement

---

#### **Test 57**: Milestone Achievements
**Status**: [ ] Pass / [ ] Fail

1. Complete specific workout counts:
   - 10th workout
   - 50th workout
   - 100th workout
2. Verify milestone celebration:
   - ✅ "Milestone Reached!" message
   - ✅ Badge icon
   - ✅ Confetti animation
   - ✅ Insight card on Coach page

**Expected Result**: Milestones celebrated like PRs

---

#### **Test 58**: Cross-Device PR Sync
**Status**: [ ] Pass / [ ] Fail

1. Complete workout with PR on Device A
2. Sign in on Device B
3. Verify:
   - ✅ PR synced via Supabase
   - ✅ PR appears in history on Device B
   - ✅ Sync metadata timestamps correct

**Expected Result**: PRs sync across devices for signed-in users

---

### 3.5 AI Error Handling & Resilience

#### **Test 59**: AI Service Unavailable
**Status**: [ ] Pass / [ ] Fail

1. Enable AI insights
2. Simulate AI service failure (block network to edge function)
3. Navigate to Coach page
4. Verify:
   - ✅ Error toast: "AI service temporarily unavailable"
   - ✅ Falls back to rule-based insights
   - ✅ No crash or blank screen
   - ✅ Retry button available

**Expected Result**: Graceful degradation to rule-based insights

---

#### **Test 60**: AI Timeout
**Status**: [ ] Pass / [ ] Fail

1. Simulate slow AI response (>10 seconds)
2. Navigate to Coach page
3. Verify:
   - ✅ Timeout error message
   - ✅ "Retry" button
   - ✅ Fallback to local insights

**Expected Result**: Timeouts handled gracefully

---

#### **Test 61**: Rate Limiting
**Status**: [ ] Pass / [ ] Fail

1. Trigger AI insights 10+ times in quick succession
2. Verify:
   - ✅ Rate limit message: "Too many requests. Try again later."
   - ✅ Shows cooldown timer
   - ✅ Cached insights still available

**Expected Result**: Rate limits prevent abuse, user informed

---

## Testing Checklist

### Quick Progress Tracker

**Phase 1 Core (Tests 1-16)**: [ ] 0/16 Complete
**Phase 1 Enhancements (Tests 17-38)**: [ ] 0/22 Complete
**Phase 2 AI Features (Tests 39-61)**: [ ] 0/23 Complete

**Total Progress**: [ ] 0/61 Tests Complete

---

### Functional Testing

#### Core Features (Phase 1)
- [ ] **Test 1**: Coach page renders correctly
- [ ] **Test 2**: Empty state displays
- [ ] **Test 3**: Streak tracking accurate
- [ ] **Test 4**: Streak break handled
- [ ] **Test 5**: Week navigation works
- [ ] **Test 6**: Streak insights generated
- [ ] **Test 7**: Muscle balance insights work
- [ ] **Test 8**: Progression insights shown
- [ ] **Test 9**: Insights dismissible
- [ ] **Test 10**: Time range selector works
- [ ] **Test 11**: Chart interaction works
- [ ] **Test 12**: Progress chart displays data
- [ ] **Test 13**: AI Coach toggle functional
- [ ] **Test 14**: Settings integration functional
- [ ] **Test 15**: Localization (7 languages)
- [ ] **Test 16**: RTL support (Arabic)

#### Enhancements (Tests 17-38)
- [ ] **Test 17**: Confetti animations trigger
- [ ] **Test 18**: Confetti intensity levels
- [ ] **Test 19**: Sound cues play (if enabled)
- [ ] **Test 20**: Pulsing animations
- [ ] **Test 21**: Reduced motion respected
- [ ] **Test 22**: Persona selection works
- [ ] **Test 23**: Zen persona messaging
- [ ] **Test 24**: Energy persona messaging
- [ ] **Test 25**: Logic persona messaging
- [ ] **Test 26**: Persona persistence
- [ ] **Test 27**: Insights carousel displays
- [ ] **Test 28**: Carousel swipe works
- [ ] **Test 29**: Carousel keyboard navigation
- [ ] **Test 30**: Auto-rotation pauses on interaction
- [ ] **Test 31**: View All navigation
- [ ] **Test 32**: Carousel settings control
- [ ] **Test 33**: Post-workout survey triggers
- [ ] **Test 34**: Quick 1-tap responses work
- [ ] **Test 35**: Detailed survey fields work
- [ ] **Test 36**: Survey skip works
- [ ] **Test 37**: Survey frequency control
- [ ] **Test 38**: Metadata saved to ActivityLog

#### AI Features (Phase 2) (Tests 39-61)
- [ ] **Test 39**: AI insights toggle works
- [ ] **Test 40**: AI loading state shows
- [ ] **Test 41**: AI insights generated correctly
- [ ] **Test 42**: AI badge distinguishes insights
- [ ] **Test 43**: Graceful degradation (offline)
- [ ] **Test 44**: 24-hour caching works
- [ ] **Test 45**: Progression detection
- [ ] **Test 46**: Progression threshold (80% rule)
- [ ] **Test 47**: Conservative increases
- [ ] **Test 48**: Accepting progression
- [ ] **Test 49**: Overtraining detection
- [ ] **Test 50**: Muscle group recovery
- [ ] **Test 51**: User override allowed
- [ ] **Test 52**: PR detection (reps)
- [ ] **Test 53**: PR detection (sets)
- [ ] **Test 54**: PR detection (duration)
- [ ] **Test 55**: PR history page displays
- [ ] **Test 56**: PR celebration triggers
- [ ] **Test 57**: Milestone achievements
- [ ] **Test 58**: Cross-device PR sync
- [ ] **Test 59**: AI service unavailable handling
- [ ] **Test 60**: AI timeout handling
- [ ] **Test 61**: AI rate limiting

---

### Accessibility Testing

#### WCAG 2.1 AA Compliance
- [ ] Keyboard navigation (all interactive elements)
- [ ] Screen reader support (NVDA/JAWS/VoiceOver)
- [ ] ARIA labels present and accurate
- [ ] Focus indicators visible
- [ ] Color contrast ratios pass (4.5:1 for text)
- [ ] Reduced motion preference respected
- [ ] Touch targets ≥44×44px (mobile)
- [ ] Forms have proper labels
- [ ] Error messages accessible

---

### Performance Testing

#### Load Times
- [ ] Coach page loads <1s (offline data)
- [ ] AI insights return <3s
- [ ] Chart rendering <100ms
- [ ] Carousel smooth 60fps

#### Rendering Performance
- [ ] No jank during scrolling
- [ ] Confetti doesn't block UI
- [ ] Hook re-executions minimal (80% reduction achieved)
- [ ] Memory usage stable

---

### Cross-Browser Testing

#### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

#### Mobile Browsers
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Samsung Internet

---

### Cross-Device Testing

#### Screen Sizes
- [ ] Mobile (320px - 480px)
- [ ] Tablet (481px - 768px)
- [ ] Desktop (769px+)

#### Orientations
- [ ] Portrait
- [ ] Landscape

---

## Common Issues & Troubleshooting

### Issue: Insights Not Appearing

**Symptoms**: Coach page shows empty insights feed

**Possible Causes**:
1. Insufficient workout history (need 7+ days)
2. AI Coach disabled in Settings
3. All insights dismissed

**Solutions**:
1. Complete more workouts to generate insights
2. Check Settings → AI Coach → Enable
3. Clear dismissed insights cache (Developer Console):
   ```javascript
   localStorage.removeItem('dismissed_insights');
   ```

---

### Issue: Confetti Not Showing

**Symptoms**: No animation on PR/milestone achievements

**Possible Causes**:
1. Reduced motion enabled
2. Canvas not supported
3. Browser blocking animations

**Solutions**:
1. Check OS settings → Disable "Reduce Motion"
2. Update browser to latest version
3. Verify `microInteractions.ts` loaded correctly

---

### Issue: AI Insights Always Loading

**Symptoms**: Infinite loading spinner, no AI insights

**Possible Causes**:
1. Edge function not deployed
2. Network connectivity issues
3. API key missing/invalid
4. CORS errors

**Solutions**:
1. Verify edge function deployed: `npx supabase functions list`
2. Check network tab for errors
3. Verify `MISTRAL_API_KEY` in edge function environment
4. Check browser console for CORS errors

---

### Issue: Post-Workout Survey Not Appearing

**Symptoms**: Survey doesn't show after completing workout

**Possible Causes**:
1. Survey disabled in Settings
2. Survey frequency set to "Never"
3. Component not integrated into TimerPage

**Solutions**:
1. Check Settings → AI Coach → Post-Workout Survey → Always
2. Verify integration in [TimerPage.tsx](../../../apps/frontend/src/pages/TimerPage.tsx)
3. Check browser console for errors

---

### Issue: Persona Not Changing Messages

**Symptoms**: Insights use same tone regardless of persona selection

**Possible Causes**:
1. Persona service not integrated
2. Cache not cleared after persona change
3. Localization keys missing persona variants

**Solutions**:
1. Verify `coachingService.ts` uses `getPersonaGreeting()` etc.
2. Clear insights cache after persona change
3. Check `coaching.json` has `*_zen`, `*_energy`, `*_logic` keys

---

## Test Data Setup

### Generating Test Workout History

Use this script in browser console to generate diverse test data:

```javascript
// Helper: Generate test workouts for last N days
async function generateTestWorkouts(days = 14) {
  const StorageService = (await import('./src/services/storageService.ts')).default;
  const storage = StorageService.getInstance();

  const exercises = ['push-ups', 'squats', 'plank', 'lunges', 'sit-ups'];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Random 1-2 workouts per day
    const workoutsToday = Math.random() > 0.3 ? Math.floor(Math.random() * 2) + 1 : 0;

    for (let j = 0; j < workoutsToday; j++) {
      const exercise = exercises[Math.floor(Math.random() * exercises.length)];
      const sets = Math.floor(Math.random() * 3) + 2; // 2-4 sets
      const reps = Math.floor(Math.random() * 10) + 10; // 10-19 reps

      await storage.addActivityLog({
        id: `test-${date.toISOString()}-${j}`,
        exerciseId: exercise,
        exerciseName: exercise,
        completed: true,
        completedAt: date.toISOString(),
        duration: sets * reps * 3, // Rough estimate
        sets,
        reps,
        metadata: {
          mood: ['great', 'good', 'okay', 'tired'][Math.floor(Math.random() * 4)],
          perceived_difficulty: Math.floor(Math.random() * 5) + 1,
        },
      });
    }
  }

  console.log(`✅ Generated ${days} days of test workouts`);
}

// Run it:
generateTestWorkouts(30); // 30 days of history
```

### Generating Specific Test Scenarios

#### Scenario 1: Long Streak
```javascript
// Generate 10-day streak
async function generateStreak(days = 10) {
  const storage = StorageService.getInstance();
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    await storage.addActivityLog({
      id: `streak-${i}`,
      exerciseId: 'push-ups',
      exerciseName: 'Push-ups',
      completed: true,
      completedAt: date.toISOString(),
      duration: 300,
      sets: 3,
      reps: 15,
    });
  }
}

generateStreak(10);
```

#### Scenario 2: Muscle Imbalance
```javascript
// Only upper body for 7 days (to trigger leg suggestion)
async function generateUpperBodyOnly(days = 7) {
  const upperExercises = ['push-ups', 'pull-ups', 'dips'];
  const storage = StorageService.getInstance();
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const exercise = upperExercises[i % upperExercises.length];

    await storage.addActivityLog({
      id: `upper-${i}`,
      exerciseId: exercise,
      exerciseName: exercise,
      completed: true,
      completedAt: date.toISOString(),
      duration: 300,
      sets: 3,
      reps: 12,
    });
  }
}

generateUpperBodyOnly(7);
```

#### Scenario 3: Progression Opportunity
```javascript
// Same exercise 3 times with 100% completion
async function generateProgressionOpportunity() {
  const storage = StorageService.getInstance();
  const today = new Date();

  for (let i = 0; i < 3; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 2)); // Every 2 days

    await storage.addActivityLog({
      id: `prog-${i}`,
      exerciseId: 'squats',
      exerciseName: 'Squats',
      completed: true,
      completedAt: date.toISOString(),
      duration: 360,
      sets: 3,
      reps: 12, // Same reps each time
      metadata: {
        quality: 'excellent', // Consistently good quality
      },
    });
  }
}

generateProgressionOpportunity();
```

---

## Next Steps

### Pending Integration Tasks
1. **TimerPage**: Integrate `PostWorkoutSurvey` after workout completion
2. **HomePage**: Add `InsightsCarousel` when `coach_show_on_home` enabled
3. **SettingsPage**: Add persona dropdown + celebration sounds toggle
4. **Unit Tests**: Write tests for new components/utilities
5. **i18n**: Translate 35 new coaching keys to all 7 languages

### Future Enhancements (Phase 3+)
- **Chat Mode**: Conversational AI interaction (Enhancement E2)
- **Progress Feed**: Unified timeline for all achievements (Enhancement E4)
- **Cultural Adaptation**: Locale-aware coaching tone (Enhancement E6.2)
- **Monitoring**: Edge function warm-up, latency tracking (Enhancement E5)

---

## Appendix: Key Files Reference

### Phase 1 Core Files
- `apps/frontend/src/services/coachingService.ts`
- `apps/frontend/src/services/analyticsService.ts`
- `apps/frontend/src/components/coaching/CoachingCard.tsx`
- `apps/frontend/src/pages/CoachPage.tsx`
- `apps/frontend/src/hooks/useCoachingInsights.ts`
- `apps/frontend/src/utils/coachingAlgorithms.ts`
- `apps/frontend/src/types/coaching.ts`

### Phase 1 Enhancement Files
- `apps/frontend/src/utils/microInteractions.ts`
- `apps/frontend/src/utils/coachPersona.ts`
- `apps/frontend/src/components/InsightsCarousel.tsx`
- `apps/frontend/src/components/PostWorkoutSurvey.tsx`

### Phase 2 AI Files
- `apps/frontend/src/services/insightsService.ts`
- `apps/frontend/src/services/prService.ts`
- `supabase/functions/analyze-progress/index.ts`
- `apps/frontend/src/components/coaching/PRCelebration.tsx`
- `apps/frontend/src/pages/PersonalRecordsPage.tsx`

### Localization Files
- `apps/frontend/public/locales/en/coaching.json`
- `apps/frontend/public/locales/en/common.json` (AI Coach section)

---

**End of Testing Guide**

For questions or issues, refer to:
- [AI Coach PRD](ai-coach-prd.md)
- [Implementation Plan](ai-coach-implementation-plan.md)
- [Enhancements Addendum](enhancements-addendum.md)
- [Technical Requirements](technical-requirements-addendum.md)
