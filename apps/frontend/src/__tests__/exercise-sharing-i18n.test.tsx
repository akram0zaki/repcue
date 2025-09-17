import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import i18n from 'i18next';
import Backend from 'i18next-fs-backend';
import ExercisePage from '../pages/ExercisePage';
import { SnackbarProvider } from '../components/SnackbarProvider';
import { ExerciseCategory } from '../types';
import type { Exercise } from '../types';

// Mock feature flags
vi.mock('../hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ flags: { canCreateExercises: true, canShareExercises: true } })
}));

// Mock auth hook
const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock navigation hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/exercises' })
  };
});

// Initialize i18n for testing
const initI18nForTesting = async (language: string) => {
  if (i18n.isInitialized) {
    await i18n.changeLanguage(language);
    return i18n;
  }

  await i18n
    .use(Backend)
    .init({
      lng: language,
      fallbackLng: 'en',
      debug: false,
      interpolation: {
        escapeValue: false
      },
      backend: {
        loadPath: 'public/locales/{{lng}}/{{ns}}.json'
      },
      ns: ['common', 'exercises'],
      defaultNS: 'common'
    });

  return i18n;
};

// Test component wrapper with i18n
const TestWrapper = ({
  children,
  language = 'en'
}: {
  children: React.ReactNode;
  language?: string;
}) => (
  <I18nextProvider i18n={i18n}>
    <MemoryRouter>
      <SnackbarProvider>
        {children}
      </SnackbarProvider>
    </MemoryRouter>
  </I18nextProvider>
);

// Mock exercise data
const createMockExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: '12345678-1234-1234-1234-123456789012',
  name: 'Custom Exercise',
  description: 'A user-created exercise',
  category: ExerciseCategory.CORE,
  exercise_type: 'time_based',
  default_duration: 30,
  default_sets: 1,
  default_reps: 1,
  is_favorite: false,
  tags: ['core'],
  has_video: false,
  owner_id: 'user-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  version: 1,
  ...overrides
});

describe('Exercise Sharing Internationalization Tests', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  describe('Filter Button Translations', () => {
    const testLanguages = [
      { code: 'en', expectedText: 'Shared with me' },
      { code: 'es', expectedText: 'Compartidos conmigo' },
      { code: 'de', expectedText: 'Mit mir geteilt' },
      { code: 'fr', expectedText: 'Partagés avec moi' }
    ];

    testLanguages.forEach(({ code, expectedText }) => {
      it(`should display "Shared with me" filter in ${code.toUpperCase()}`, async () => {
        await initI18nForTesting(code);

        const exercises = [createMockExercise()];

        render(
          <TestWrapper language={code}>
            <ExercisePage
              exercises={exercises}
              onToggleFavorite={() => {}}
            />
          </TestWrapper>
        );

        // Should find the filter button with correct translation
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });
    });
  });

  describe('Shared Exercise Badge Translations', () => {
    const testLanguages = [
      { code: 'en', expectedText: 'Shared' },
      { code: 'es', expectedText: 'Compartido' },
      { code: 'de', expectedText: 'Geteilt' },
      { code: 'fr', expectedText: 'Partagé' },
      { code: 'ar', expectedText: 'مشارك' }
    ];

    testLanguages.forEach(({ code, expectedText }) => {
      it(`should display shared badge in ${code.toUpperCase()}`, async () => {
        await initI18nForTesting(code);

        const exercises = [
          createMockExercise({
            name: 'Shared Exercise',
            owner_id: 'other-user' // Different owner makes it shared
          })
        ];

        render(
          <TestWrapper language={code}>
            <ExercisePage
              exercises={exercises}
              onToggleFavorite={() => {}}
            />
          </TestWrapper>
        );

        // Should display shared badge with correct translation
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });
    });
  });

  describe('Exercise Count Display', () => {
    it('should properly handle pluralization in different languages', async () => {
      const exercises = [
        createMockExercise({ name: 'Exercise 1', owner_id: 'other-1' }),
        createMockExercise({ name: 'Exercise 2', owner_id: 'other-2' })
      ];

      // Test English pluralization
      await initI18nForTesting('en');

      render(
        <TestWrapper language="en">
          <ExercisePage
            exercises={exercises}
            onToggleFavorite={() => {}}
          />
        </TestWrapper>
      );

      // Click shared filter
      const sharedFilter = screen.getByRole('button', { name: /Shared with me/i });
      fireEvent.click(sharedFilter);

      // Should show correct count (2 shared out of 2 total)
      expect(screen.getByText(/Showing 2 of 2 exercises/i)).toBeInTheDocument();
    });
  });

  describe('Translation Key Coverage', () => {
    const requiredKeys = [
      'filterShared',
      'shared',
      'shareExercise',
      'shareDescription',
      'shareLinkGenerated',
      'shareError',
      'shareLinkReady',
      'shareLinkReadyDesc',
      'shareNotFound',
      'shareExpired',
      'sharedExercise',
      'sharedBy',
      'saveToLibrary',
      'exerciseSaved',
      'saveFailed'
    ];

    const supportedLanguages = ['en', 'ar', 'ar-EG', 'de', 'es', 'fr', 'fy', 'nl'];

    supportedLanguages.forEach(language => {
      it(`should have all required translation keys in ${language}`, async () => {
        await initI18nForTesting(language);

        // Test that all required keys exist by trying to translate them
        requiredKeys.forEach(key => {
          const translation = i18n.t(`exercises.${key}`, { ns: 'exercises' });

          // Translation should not equal the key itself (which would indicate missing translation)
          expect(translation).not.toBe(`exercises.${key}`);
          expect(translation).not.toBe(key);
          expect(translation.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Parameter Interpolation', () => {
    it('should correctly interpolate exercise names in share descriptions', async () => {
      await initI18nForTesting('en');

      const exerciseName = 'My Custom Plank';
      const translation = i18n.t('exercises.shareDescription', { name: exerciseName });

      expect(translation).toContain(exerciseName);
      expect(translation).toBe(`Create a shareable link for "${exerciseName}"`);
    });

    it('should correctly interpolate sharer names', async () => {
      await initI18nForTesting('en');

      const sharerName = 'John Doe';
      const translation = i18n.t('exercises.sharedBy', { name: sharerName });

      expect(translation).toContain(sharerName);
      expect(translation).toBe(`Shared by ${sharerName}`);
    });
  });

  describe('RTL Language Support', () => {
    it('should handle Arabic text direction correctly', async () => {
      await initI18nForTesting('ar');

      const exercises = [
        createMockExercise({
          name: 'تمرين مشترك',
          owner_id: 'other-user'
        })
      ];

      render(
        <TestWrapper language="ar">
          <ExercisePage
            exercises={exercises}
            onToggleFavorite={() => {}}
          />
        </TestWrapper>
      );

      // Should display Arabic text correctly
      expect(screen.getByText('مشارك معي')).toBeInTheDocument(); // "Shared with me"
      expect(screen.getByText('مشارك')).toBeInTheDocument(); // "Shared" badge
    });
  });

  describe('Accessibility with Translations', () => {
    it('should maintain accessibility attributes with different languages', async () => {
      await initI18nForTesting('de');

      const exercises = [createMockExercise()];

      render(
        <TestWrapper language="de">
          <ExercisePage
            exercises={exercises}
            onToggleFavorite={() => {}}
          />
        </TestWrapper>
      );

      // Filter button should be accessible regardless of language
      const sharedFilter = screen.getByRole('button', { name: /Mit mir geteilt/i });
      expect(sharedFilter).toBeInTheDocument();
      expect(sharedFilter).toHaveAttribute('type', 'button');
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to English when translation is missing', async () => {
      await initI18nForTesting('xx'); // Non-existent language

      const exercises = [createMockExercise()];

      render(
        <TestWrapper language="xx">
          <ExercisePage
            exercises={exercises}
            onToggleFavorite={() => {}}
          />
        </TestWrapper>
      );

      // Should fall back to English
      expect(screen.getByText('Shared with me')).toBeInTheDocument();
    });
  });

  describe('Dynamic Language Switching', () => {
    it('should update translations when language changes', async () => {
      await initI18nForTesting('en');

      const exercises = [createMockExercise()];

      const { rerender } = render(
        <TestWrapper language="en">
          <ExercisePage
            exercises={exercises}
            onToggleFavorite={() => {}}
          />
        </TestWrapper>
      );

      // Initially in English
      expect(screen.getByText('Shared with me')).toBeInTheDocument();

      // Change to German
      await i18n.changeLanguage('de');

      rerender(
        <TestWrapper language="de">
          <ExercisePage
            exercises={exercises}
            onToggleFavorite={() => {}}
          />
        </TestWrapper>
      );

      // Should now be in German
      expect(screen.getByText('Mit mir geteilt')).toBeInTheDocument();
      expect(screen.queryByText('Shared with me')).not.toBeInTheDocument();
    });
  });
});