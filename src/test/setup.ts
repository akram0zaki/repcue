import '@testing-library/jest-dom'
import { vi } from 'vitest'
import i18n from '../i18n'

// Provide minimal i18n resources for tests (avoids backend fetch in JSDOM)
try {
  const enBundle = {
    common: {
      start: 'Start',
      stop: 'Stop',
      cancel: 'Cancel',
      reset: 'Reset',
      choose: 'Choose',
      close: 'Close',
      loading: 'Loading...',
      on: 'On',
      off: 'Off',
      notSupported: 'Not Supported',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      secondsShortSuffix: 's',
      goToSettings: 'Go to Settings',
      settings: {
        audioSettings: 'Audio Settings',
        enableSound: 'Enable Sound',
        beepVolume: 'Beep Volume',
        enableVibration: 'Enable Vibration',
        timerSettings: '⏱️ Timer Settings',
        preTimerCountdown: 'Pre-Timer Countdown',
        preTimerCountdownHelp: 'Countdown before the timer starts to help you get into position',
        appearance: '🎨 Appearance',
        darkMode: 'Dark Mode',
        showExerciseVideos: 'Show Exercise Demo Videos',
        showExerciseVideosHelp: 'Experimental: loop silent demo videos inside timer when available.',
        data: '💾 Data',
        autoSave: 'Auto Save',
        dataStorageLabel: 'Data Storage:',
        enabled: 'Enabled',
        disabled: 'Disabled',
        dataStoredLocally: 'Your workout data is stored locally on this device.',
        pleaseAcceptConsent: 'Please accept data storage consent to enable export/clear features.',
        consentMigrationWarning: '⚠️ Consent data will be migrated to latest version on next app load.',
        exportData: 'Export Data',
        exportDataHelp: 'Download your workout data as a JSON file',
        refreshExercises: 'Refresh Exercises',
        refreshExercisesHelp: 'Force refresh exercises from server and reset all favorites',
        clearAllDataAndReset: 'Clear All Data & Reset App',
        clearAllDataHelp: 'Permanently delete all data, reset consent, and return to home screen',
        clearAllDataMessage: 'Are you sure you want to clear all data? This action cannot be undone. You will be redirected to the home screen and asked for consent again.',
        clearAllData: 'Clear All Data'
      },
      home: {
        upcomingWorkout: 'Upcoming Workout',
        startNow: 'Start Now',
        noScheduleTitle: 'No Schedule Set',
        noScheduleBody: 'Create a workout schedule to see your upcoming workouts here',
        addWorkout: 'Add Workout',
        startTimer: 'Start Timer',
        browseExercises: 'Browse Exercises',
        favoriteExercises: 'Favorite Exercises',
        removeFromFavoritesAria: 'Remove {{name}} from favorites',
        noFavorites: 'No favorite exercises yet. Mark some exercises as favorites to see them here!',
        availableExercises: 'Available Exercises'
      },
      timer: {
        restNext: 'Rest Period (Next: {{next}})',
        exerciseWithName: 'Exercise {{index}}: {{name}}',
        restPeriod: 'Rest Period',
        nextWithCategory: 'Next: {{next}} • {{category}}',
        currentWithCategory: 'Current Exercise • {{category}}',
        restHint: 'Take a break and prepare for the next exercise',
        exerciseLabel: 'Exercise',
        noExerciseSelected: 'No exercise selected',
        quickSelectFavorites: 'Quick Select (Favorites):',
        duration: 'Duration',
        repDuration: 'Rep Duration',
        setProgress: 'Set Progress',
        setsCompleted: '{{completed}} of {{total}} sets completed',
        repProgress: 'Rep Progress',
        getReadyStartsIn_one: 'Get Ready! Timer starts in {{count}} second',
        getReadyStartsIn_other: 'Get Ready! Timer starts in {{count}} seconds',
        getReadyEllipsis: 'Get ready...',
        exerciseComplete: 'Exercise {{total}}/{{total}} - Complete!',
        exerciseIndexOf: 'Exercise {{index}}/{{total}}',
        ofDuration: 'of {{duration}}',
        setDuration: 'Set duration',
        workoutControls: 'Workout Controls',
        exerciseControls: 'Exercise Controls',
        nextRep: 'Next Rep ({{current}}/{{total}})',
        nextSet: 'Next Set ({{current}}/{{total}})',
        completeExercise: 'Complete Exercise',
        exitWorkout: 'Exit Workout',
        beepInterval: 'Beep Interval',
        wakeLock: 'Wake Lock',
        selectExercise: 'Select Exercise'
      },
      workouts: {
        title: 'Workouts',
        createWorkout: 'Create Workout',
        createTitle: 'Create Workout',
        emptyTitle: 'No Workouts Yet',
        emptyBody: 'Create a workout to get started and schedule it for your week.',
        createFirstWorkout: 'Create Your First Workout',
        paused: 'Paused',
        startWorkout: 'Start workout',
        workoutPaused: 'Workout is paused',
        editWorkout: 'Edit workout',
        editTitle: 'Edit Workout',
        deleteWorkout: 'Delete workout',
        deleteConfirm: "Delete '{{name}}'? This can't be undone.",
        delete: 'Delete',
        notScheduled: 'Not scheduled',
        exerciseCount_one: '{{count}} exercise',
        exerciseCount_other: '{{count}} exercises',
        dataRequiredTitle: 'Data storage required',
        dataRequiredBody: 'You need to enable data storage to create and manage workouts.',
        loadExercisesError: 'Failed to load exercises',
        nameLabel: 'Workout Name',
        namePlaceholder: 'e.g., Morning Core Routine',
        descriptionLabel: 'Description (Optional)',
        descriptionPlaceholder: 'Brief description of the workout...',
        scheduleLabel: 'Schedule (Optional)',
        isActiveLabel: 'Active workout (can be scheduled for training)',
        scheduledDaysLabel: 'Scheduled Days',
        scheduledPerWeek_one: 'Scheduled for {{count}} day per week',
        scheduledPerWeek_other: 'Scheduled for {{count}} days per week',
        exercisesLabel: 'Exercises ({{count}})',
        estimatedAbbrev: 'Est.',
        noneSelectedTitle: 'No exercises added yet',
        addFirstExercise: 'Add First Exercise',
        moveUpAria: 'Move up',
        moveDownAria: 'Move down',
        removeExerciseAria: 'Remove exercise',
        durationSeconds: 'Duration (seconds)',
        sets: 'Sets',
        reps: 'Reps',
        restSeconds: 'Rest Time (seconds)',
        errors: {
          durationPositive: 'Duration must be greater than 0',
          setsPositive: 'Sets must be greater than 0',
          repsPositive: 'Reps must be greater than 0',
          restNonNegative: 'Rest time cannot be negative'
        },
        addAnotherExercise: 'Add Another Exercise',
        saving: 'Saving...',
        addExerciseTitle: 'Add Exercise',
        allExercisesAdded: 'All exercises have been added to this workout.',
        noExercisesSelected: 'No exercises selected',
        addExercise: 'Add Exercise',
        missingId: 'No workout ID provided',
        loadFailed: 'Failed to load workout data',
        updateFailed: 'Failed to update workout. Please try again.',
        errorLoadingTitle: 'Error Loading Workout',
        backToWorkouts: 'Back to Workouts',
        retry: 'Retry',
        saveWorkout: 'Save Workout'
      },
      activity: {
        title: 'Activity Log',
        subtitle: 'Track your fitness journey and progress',
        yourProgress: 'Your Progress',
        closeStatsAria: 'Close stats card',
        totalWorkouts: 'Total Workouts',
        totalTime: 'Total Time',
        dayStreak: 'Day Streak',
        thisWeek: 'This Week',
        favoriteExercise: 'Favorite Exercise',
        all: 'All',
        noWorkoutsYet: 'No workouts yet',
        noCategoryWorkoutsYet: 'No {{category}} workouts yet',
        emptySubtitle: 'Start your first workout to see your activity here',
        workoutBadge: 'Workout',
        exercisesHeading: 'Exercises:',
        exerciseCount_one: '{{count}} exercise',
        exerciseCount_other: '{{count}} exercises'
      },
      exercises: {
        title: 'Exercises',
        subtitle: 'Browse, filter, and start exercises. Mark favorites for quick access.',
        searchLabel: 'Search exercises',
        searchPlaceholder: 'Search by name, description, or tag...',
        allCategories: 'All categories',
        category: {
          core: 'Core',
          strength: 'Strength',
          cardio: 'Cardio',
          flexibility: 'Flexibility',
          balance: 'Balance',
          handWarmup: 'Hand Warmup'
        },
        favoritesOnly: 'Favorites Only',
        showingCount: 'Showing {{count}} of {{total}}',
        emptyTitle: 'No results',
        emptyBody: 'No exercises match your filters. Try clearing filters.',
        clearFilters: 'Clear Filters',
        removeFromFavorites: 'Remove from favorites',
        addToFavorites: 'Add to favorites',
        addToFavoritesAria: 'Add {{name}} to favorites',
        timeBased: 'Time-based',
        repBased: 'Rep-based',
        defaultDuration: 'Default: {{duration}}',
        defaultSetsReps: 'Default: {{sets}} sets × {{reps}} reps',
        showFewerTags: 'Show fewer tags',
        showMoreTags_one: 'Show {{count}} more tag',
        showMoreTags_other: 'Show {{count}} more tags',
        showLess: 'Show less'
      }
    }
  };
  if (!i18n.hasResourceBundle('en', 'common')) {
    i18n.addResourceBundle('en', 'common', enBundle, true, true);
  } else {
    // Merge to ensure new keys are present when bundle already exists
    i18n.addResourceBundle('en', 'common', enBundle, true, true);
  }
  if (!i18n.language || i18n.language.split('-')[0] !== 'en') {
    await i18n.changeLanguage('en');
  }
} catch {
  // Non-fatal in tests; keys will render if i18n import changes
}

// Mock Web Audio API
global.AudioContext = class MockAudioContext {
  currentTime = 0;
  destination = {};
  
  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: 'sine'
    }
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: { 
        value: 0,
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

// Mock Vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
})

// Mock localStorage with actual storage behavior
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock IndexedDB
global.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any 