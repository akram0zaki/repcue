import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createStorageServiceModuleMock } from '../../test/storageServiceMock';

// Mock consentService to allow storage
vi.mock('../../services/consentService', () => ({
  ConsentService: {
    getInstance: vi.fn(() => ({
      hasConsent: vi.fn().mockReturnValue(true),
      getConsentData: vi.fn().mockReturnValue({ hasConsented: true })
    }))
  },
  consentService: {
    hasConsent: vi.fn(() => true),
    getConsentStatus: vi.fn(() => ({ has_consented: true })),
    getConsentData: vi.fn().mockReturnValue({ hasConsented: true })
  }
}));

// Mock storageService with ensureExercisesSeeded and getExercises
const mockExercises = [
  {
    id: 'ex-1',
    name: 'Push-up',
    description: 'desc',
    category: 'strength',
    exercise_type: 'repetition_based',
    default_sets: 3,
    default_reps: 10,
    is_favorite: false,
    tags: [],
    idempotency_key: undefined,
    owner_id: null,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
  },
  {
    id: 'ex-2',
    name: 'Plank',
    description: 'desc',
    category: 'core',
    exercise_type: 'time_based',
    default_duration: 30,
    is_favorite: false,
    tags: [],
    idempotency_key: undefined,
    owner_id: null,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    dirty: 0,
  }
];

vi.mock('../../services/storageService', () => {
  const moduleMock = createStorageServiceModuleMock();
  // Override specific methods for this test
  moduleMock.storageService.ensureExercisesSeeded = vi.fn(async () => 2);
  moduleMock.storageService.getExercises = vi.fn(async () => mockExercises);
  return moduleMock;
});

// Mock useExerciseFilter hook
vi.mock('../../hooks/useExerciseFilter', () => ({
  useExerciseFilter: (exercises: any[]) => ({
    filteredExercises: exercises,
    filterState: {
      selectedCatalogId: 'default',
      selectedCategories: new Set(),
      searchTerm: '',
      showFavoritesOnly: false,
      exerciseFilter: 'all',
      sortBy: 'name'
    },
    updateFilter: vi.fn(),
    clearFilters: vi.fn(),
    setCatalog: vi.fn(),
    toggleCategory: vi.fn(),
    clearCategories: vi.fn()
  })
}));

// Import after mocks
import CreateWorkoutPage from '../CreateWorkoutPage';

// Get references to the mocked functions
const { storageService } = await import('../../services/storageService');

describe('CreateWorkoutPage - exercise catalog seeding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds exercises on fresh DB and lists them in the picker', async () => {
    render(
      <MemoryRouter>
        <CreateWorkoutPage />
      </MemoryRouter>
    );

    // Ensure seeding was attempted
    await waitFor(() => expect(storageService.ensureExercisesSeeded).toHaveBeenCalled());

    // Open the exercise picker modal
    const addFirstBtn = await screen.findByText(/Add First Exercise/i);
    fireEvent.click(addFirstBtn);

    // Expect exercises to appear
    await screen.findByText(/Push-up/i);
    await screen.findByText(/Plank/i);
  });
});
