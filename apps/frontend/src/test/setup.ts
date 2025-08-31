import '@testing-library/jest-dom'
// Provide a working IndexedDB implementation for Dexie in tests
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock localStorage with actual storage behavior (declare early for i18n detector)
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

// Enable test flags prior to importing i18n (affects detection behavior)
;(window as unknown as Window & { __AUTO_CONSENT__?: boolean }).__AUTO_CONSENT__ = true
;(window as unknown as Window & { __TEST__?: boolean }).__TEST__ = true
// Ensure video demos flag is enabled by default in tests
try { delete (window as unknown as Window & { __VIDEO_DEMOS_DISABLED__?: boolean }).__VIDEO_DEMOS_DISABLED__ } catch {}

// Early global chunk error capture to support boundaries regardless of import order
try {
  if (!(globalThis as unknown as { __REPCUE_EARLY_CHUNK_CAPTURE__?: boolean }).__REPCUE_EARLY_CHUNK_CAPTURE__) {
    (globalThis as unknown as { __REPCUE_EARLY_CHUNK_CAPTURE__?: boolean }).__REPCUE_EARLY_CHUNK_CAPTURE__ = true
    const earlyHandler = (event: ErrorEvent | PromiseRejectionEvent) => {
      const anyEvent = event as unknown as { message?: string; reason?: { message?: string; name?: string } }
      const message = (anyEvent?.message || anyEvent?.reason?.message || '').toString()
      const name = (anyEvent?.reason && typeof anyEvent.reason === 'object' && 'name' in anyEvent.reason)
        ? (anyEvent.reason as { name?: string }).name || ''
        : ''
      if (message.includes('Loading chunk') || message.includes('ChunkLoadError') || name === 'ChunkLoadError') {
        try { (globalThis as unknown as { __REPCUE_CHUNK_ERROR__?: boolean }).__REPCUE_CHUNK_ERROR__ = true } catch {}
        // Re-dispatch a deterministic custom event on next tick so boundaries can respond
        setTimeout(() => { try { window.dispatchEvent(new Event('repcue:chunk-error')) } catch {} }, 0)
      }
    }
    window.addEventListener('error', earlyHandler as EventListener, true)
    window.addEventListener('unhandledrejection', earlyHandler as EventListener)
  }
} catch {}

// Provide minimal i18n resources for tests (avoids backend fetch in JSDOM)
try {
  const { default: i18n } = await import('../i18n')
  const enBundle = {
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
      navigation: {
        home: 'Home',
        workouts: 'Workouts',
        exercises: 'Exercises',
        timer: 'Timer',
        activityLog: 'Activity Log',
        settings: 'Settings',
        more: 'More'
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
        timeBased: {
          name: 'Time-based'
        },
        repBased: {
          name: 'Rep-based'
        },
        defaultDuration: 'Default: {{duration}}',
        defaultSetsReps: 'Default: {{sets}} sets × {{reps}} reps',
        showFewerTags: 'Show fewer tags',
        showMoreTags_one: 'Show {{count}} more tag',
        showMoreTags_other: 'Show {{count}} more tags',
        showLess: 'Show less',
        previewVideo: 'Preview video',
        previewUnavailable: 'Video is not available at this time'
  }
  };
  // Reinitialize i18n for tests with in-memory resources to avoid async backend
  await i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    // Provide both flattened keys and nested compatibility under common.common, plus exercises namespace
    resources: { en: { 
      common: { ...enBundle, common: enBundle },
      exercises: {
        timeBased: { name: 'Time-based' },
        repBased: { name: 'Rep-based' }
      }
    } },
    ns: ['common', 'exercises'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    // Ensure synchronous init during tests to avoid race conditions on CI
    initImmediate: false,
  });
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
} as any

// Mock Vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
})

// (localStorageMock already defined above)

// fake-indexeddb provides a global indexedDB; no manual mock needed

// Make global.navigator writable to support tests that override it
try {
  Object.defineProperty(global, 'navigator', { value: window.navigator, writable: true, configurable: true })
} catch {}

// Preserve original window/document to guard against tests that replace them without restoring
const __ORIGINAL_WINDOW__ = window
const __ORIGINAL_DOCUMENT__ = document
const __ORIGINAL_ADD_EVENT_LISTENER__ = window.addEventListener
const __ORIGINAL_REMOVE_EVENT_LISTENER__ = window.removeEventListener
// Preserve original location (kept for parity and potential future use)
const __ORIGINAL_LOCATION__ = window.location as Location

// Patch timers to ensure no leaks across sequential tests
try {
  if (!(global as unknown as { __REPCUE_TIMERS_PATCHED__?: boolean }).__REPCUE_TIMERS_PATCHED__) {
    (global as unknown as { __REPCUE_TIMERS_PATCHED__?: boolean }).__REPCUE_TIMERS_PATCHED__ = true
    const trackedTimeouts: Array<number | NodeJS.Timeout> = []
    const trackedIntervals: Array<number | NodeJS.Timeout> = []
    const _setTimeout = global.setTimeout
    const _clearTimeout = global.clearTimeout
    const _setInterval = global.setInterval
    const _clearInterval = global.clearInterval
    global.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      const id = _setTimeout(handler, timeout as number, ...(args as []))
      trackedTimeouts.push(id)
      return id
    }) as typeof setTimeout
    global.clearTimeout = ((id: number | NodeJS.Timeout) => {
      return _clearTimeout(id as any)
    }) as typeof clearTimeout
    global.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      const id = _setInterval(handler, timeout as number, ...(args as []))
      trackedIntervals.push(id)
      return id
    }) as typeof setInterval
    global.clearInterval = ((id: number | NodeJS.Timeout) => {
      return _clearInterval(id as any)
    }) as typeof clearInterval

    afterEach(() => {
      try { trackedTimeouts.splice(0).forEach(id => _clearTimeout(id as any)) } catch {}
      try { trackedIntervals.splice(0).forEach(id => _clearInterval(id as any)) } catch {}
    })
  }
} catch {}

// Ensure isolation and cleanup between tests (especially important for sequential runs)
beforeEach(() => {
  // Use real timers by default to avoid lingering fake timers across files
  vi.useRealTimers()

  // Restore window/document if a test replaced them
  try {
    if (global.window !== __ORIGINAL_WINDOW__) {
      Object.defineProperty(global, 'window', { value: __ORIGINAL_WINDOW__, writable: true, configurable: true })
    }
  } catch {}
  try {
    if (global.document !== __ORIGINAL_DOCUMENT__) {
      Object.defineProperty(global, 'document', { value: __ORIGINAL_DOCUMENT__, writable: true, configurable: true })
    }
  } catch {}

  // Restore core event APIs in case a previous test stubbed them without cleanup
  try {
    if (window.addEventListener !== __ORIGINAL_ADD_EVENT_LISTENER__) {
      window.addEventListener = __ORIGINAL_ADD_EVENT_LISTENER__
    }
    if (window.removeEventListener !== __ORIGINAL_REMOVE_EVENT_LISTENER__) {
      window.removeEventListener = __ORIGINAL_REMOVE_EVENT_LISTENER__
    }
  } catch {}

  // Ensure global chunk error handler is attached for this test run
  try {
    const h = (globalThis as unknown as { __REPCUE_CHUNK_HANDLER__?: EventListener }).__REPCUE_CHUNK_HANDLER__ as EventListener | undefined
    if (h) {
      window.addEventListener('error', h as EventListener)
      window.addEventListener('unhandledrejection', h as EventListener)
    }
  } catch {}

  // Wrap dispatchEvent once to mirror chunk errors and connectivity without recursive wrapping
  try {
    const g = globalThis as unknown as { __REPCUE_DISPATCH_WRAPPED__?: boolean; __REPCUE_DISPATCH_NATIVE__?: (evt: Event) => boolean; __REPCUE_CHUNK_ERROR__?: boolean }
    if (!g.__REPCUE_DISPATCH_WRAPPED__) {
      const nativeDispatch = window.dispatchEvent.bind(window)
      g.__REPCUE_DISPATCH_NATIVE__ = nativeDispatch
      g.__REPCUE_DISPATCH_WRAPPED__ = true
      window.dispatchEvent = (evt: Event) => {
        try {
          const isErrorEvent = evt instanceof ErrorEvent
          const isRejection = typeof PromiseRejectionEvent !== 'undefined' && evt instanceof PromiseRejectionEvent
          const anyEvt = evt as unknown as { message?: string; reason?: { message?: string; name?: string } }
          const message = (anyEvt?.message || anyEvt?.reason?.message || '').toString()
          const name = (anyEvt?.reason && typeof anyEvt.reason === 'object' && 'name' in anyEvt.reason)
            ? (anyEvt.reason as { name?: string }).name || ''
            : ''
          if ((isErrorEvent || isRejection) && (message.includes('Loading chunk') || message.includes('ChunkLoadError') || name === 'ChunkLoadError')) {
            try { g.__REPCUE_CHUNK_ERROR__ = true } catch {}
            try { nativeDispatch(new Event('repcue:chunk-error')) } catch {}
          }
          // Mirror connectivity events to document and normalize navigator.onLine
          if (evt.type === 'offline') {
            try { Object.defineProperty(window.navigator, 'onLine', { value: false, writable: true, configurable: true }) } catch {}
            try { document.dispatchEvent(new Event('offline')) } catch {}
          } else if (evt.type === 'online') {
            try { Object.defineProperty(window.navigator, 'onLine', { value: true, writable: true, configurable: true }) } catch {}
            try { document.dispatchEvent(new Event('online')) } catch {}
          }
        } catch {}
        return nativeDispatch(evt)
      }
    }
  } catch {}

  // Ensure a valid location object is present for BrowserRouter
  try {
    if (!window.location || !(window.location as unknown as { href?: string }).href) {
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/', origin: 'http://localhost', assign: vi.fn(), replace: vi.fn(), pathname: '/' },
        configurable: true,
      })
    }
  } catch {}

  // Normalize navigator.onLine for each test and keep it writable
  try {
    const nav = window.navigator
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(nav), 'onLine')
    if (!descriptor || !descriptor.configurable) {
      // Fallback: redefine on window.navigator directly if allowed
      Object.defineProperty(window, 'navigator', {
        value: { ...nav, onLine: true },
        configurable: true
      })
    } else {
      Object.defineProperty(nav, 'onLine', { value: true, writable: true, configurable: true })
    }
  } catch {}

  // Provide a basic fetch polyfill for same-origin JSON files (e.g., exercise_media.json)
  try {
    const originalFetch = global.fetch;
    // Only wrap once
    if (!(globalThis as unknown as { __REPCUE_FETCH_WRAPPED__?: boolean }).__REPCUE_FETCH_WRAPPED__) {
      (globalThis as unknown as { __REPCUE_FETCH_WRAPPED__?: boolean }).__REPCUE_FETCH_WRAPPED__ = true;
      global.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        try {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
          if (url === '/exercise_media.json') {
            // Serve an empty JSON array to satisfy tests expecting empty index
            const body = '[]';
            return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }));
          }
        } catch {}
        return originalFetch(input as any, init as any);
      };
    }
  } catch {}

  // Ensure localStorage mock is present and seeded with consent by default
  if (!('localStorage' in window) || typeof window.localStorage?.setItem !== 'function') {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  }

  try {
    // Enable auto-consent path in App to bypass banner in tests
    ;(window as unknown as Window & { __AUTO_CONSENT__?: boolean }).__AUTO_CONSENT__ = true
    ;(window as unknown as Window & { __TEST__?: boolean }).__TEST__ = true
    // Clear any global video demo disable override from previous tests
    try { delete (window as unknown as Window & { __VIDEO_DEMOS_DISABLED__?: boolean }).__VIDEO_DEMOS_DISABLED__ } catch {}
    // Reset global chunk error sticky flag before each test
    try { (globalThis as any).__REPCUE_CHUNK_ERROR__ = false } catch {}
    window.localStorage.setItem(
      'repcue_consent',
      JSON.stringify({
        version: 2,
        timestamp: new Date().toISOString(),
        hasConsented: true,
        cookiesAccepted: true,
        analyticsAccepted: false,
        marketingAccepted: false,
        dataRetentionDays: 365
      })
    )
  } catch {
    // ignore
  }

  // Augment HTMLButtonElement.click to also emit mousedown for environments that don't
  try {
    const proto = HTMLButtonElement.prototype as unknown as { __repcueClickPatched__?: boolean; click: () => void };
    if (!proto.__repcueClickPatched__) {
      const originalClick = proto.click;
      proto.click = function patchedClick(this: HTMLButtonElement) {
        this.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        this.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return originalClick?.call(this);
      };
      proto.__repcueClickPatched__ = true;
    }
  } catch {}
})

afterEach(async () => {
  // Unmount any mounted React trees and clear JSDOM body
  cleanup()

  // Reset timers and mocks
  vi.clearAllMocks()
  vi.resetModules()

  // Clear storage
  try {
    if (window.localStorage && typeof window.localStorage.clear === 'function') {
      window.localStorage.clear()
    }
  } catch {
    // ignore
  }
  try {
    // Clear our IndexedDB database between tests
    if ('indexedDB' in window) {
      indexedDB.deleteDatabase('RepCueDB')
    }
  } catch {
    // ignore in JSDOM
  }

  // Ensure window/document restored after each test
  try {
    if (global.window !== __ORIGINAL_WINDOW__) {
      Object.defineProperty(global, 'window', { value: __ORIGINAL_WINDOW__, writable: true, configurable: true })
    }
  } catch {}
  try {
    if (global.document !== __ORIGINAL_DOCUMENT__) {
      Object.defineProperty(global, 'document', { value: __ORIGINAL_DOCUMENT__, writable: true, configurable: true })
    }
  } catch {}

  // Intentionally do not restore window.location here to allow suite-level mocks to persist
})