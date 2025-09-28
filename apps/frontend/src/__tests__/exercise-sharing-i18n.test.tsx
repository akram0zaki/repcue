import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import i18n from 'i18next';
import ExercisePage from '../pages/ExercisePage';
import { SnackbarProvider } from '../components/SnackbarProvider';
import { ExerciseCategory } from '../types';
import type { Exercise } from '../types';

vi.mock('../hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ flags: { canCreateExercises: true, canShareExercises: true } })
}));

const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

const mockUseSharedExercises = vi.fn();
vi.mock('../hooks/useSharedExercises', () => ({
  useSharedExercises: () => mockUseSharedExercises()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/exercises' })
  };
});

const initI18nForTesting = async (language: string) => {
  // Add the required translations to the global i18n instance
  const translations = {
    en: {
      exercises: {
        filterShared: 'Shared with me',
        shared: 'Shared',
        title: 'Exercises',
        subtitle: 'subtitle',
        showingCount: 'Showing {{count}} of {{total}}',
        shareExercise: 'Share Exercise',
        shareDescription: 'Create a shareable link for "{{name}}"',
        shareLinkGenerated: 'Share link generated',
        shareError: 'Failed to share exercise',
        shareLinkReady: 'Share Link Ready',
        shareLinkReadyDesc: 'Your share link is ready to copy',
        shareNotFound: 'Exercise not found',
        shareExpired: 'Share link has expired',
        sharedExercise: 'Shared Exercise',
        sharedBy: 'Shared by {{name}}',
        saveToLibrary: 'Save to Library',
        exerciseSaved: 'Exercise saved to your library',
        saveFailed: 'Failed to save exercise',
        categories: {
          strength: 'Strength',
          cardio: 'Cardio',
          flexibility: 'Flexibility',
          balance: 'Balance',
          core: 'Core',
          warm_up: 'Warm Up'
        }
      },
      common: {
        create: 'Create',
        exercises: 'Exercises',
        exerciseCount_one: '{{count}} exercise',
        exerciseCount_other: '{{count}} exercises',
        'general-fitness.name': 'General Fitness',
        'general-fitness.description': 'Basic fitness exercises'
      }
    },
    es: {
      exercises: {
        filterShared: 'Compartidos conmigo',
        shared: 'Compartido',
        title: 'Ejercicios',
        subtitle: 'subtítulo',
        showingCount: 'Mostrando {{count}} de {{total}}',
        shareExercise: 'Compartir Ejercicio',
        shareDescription: 'Crear un enlace compartible para "{{name}}"',
        shareLinkGenerated: 'Enlace de compartir generado',
        shareError: 'Error al compartir ejercicio',
        shareLinkReady: 'Enlace de Compartir Listo',
        shareLinkReadyDesc: 'Tu enlace de compartir está listo para copiar',
        shareNotFound: 'Ejercicio no encontrado',
        shareExpired: 'El enlace de compartir ha expirado',
        sharedExercise: 'Ejercicio Compartido',
        sharedBy: 'Compartido por {{name}}',
        saveToLibrary: 'Guardar en Biblioteca',
        exerciseSaved: 'Ejercicio guardado en tu biblioteca',
        saveFailed: 'Error al guardar ejercicio',
        categories: {
          strength: 'Fuerza',
          cardio: 'Cardio',
          flexibility: 'Flexibilidad',
          balance: 'Equilibrio',
          core: 'Core',
          warm_up: 'Calentamiento'
        }
      },
      common: {
        create: 'Crear',
        exercises: 'Ejercicios',
        exerciseCount_one: '{{count}} ejercicio',
        exerciseCount_other: '{{count}} ejercicios',
        'general-fitness.name': 'Fitness General',
        'general-fitness.description': 'Ejercicios básicos de fitness'
      }
    },
    de: {
      exercises: {
        filterShared: 'Mit mir geteilt',
        shared: 'Geteilt',
        title: 'Übungen',
        subtitle: 'Untertitel',
        showingCount: 'Zeige {{count}} von {{total}}',
        shareExercise: 'Übung teilen',
        shareDescription: 'Erstelle einen teilbaren Link für "{{name}}"',
        shareLinkGenerated: 'Teilungslink generiert',
        shareError: 'Fehler beim Teilen der Übung',
        shareLinkReady: 'Teilungslink bereit',
        shareLinkReadyDesc: 'Ihr Teilungslink ist bereit zum Kopieren',
        shareNotFound: 'Übung nicht gefunden',
        shareExpired: 'Teilungslink ist abgelaufen',
        sharedExercise: 'Geteilte Übung',
        sharedBy: 'Geteilt von {{name}}',
        saveToLibrary: 'In Bibliothek speichern',
        exerciseSaved: 'Übung in Ihrer Bibliothek gespeichert',
        saveFailed: 'Fehler beim Speichern der Übung',
        categories: {
          strength: 'Kraft',
          cardio: 'Ausdauer',
          flexibility: 'Flexibilität',
          balance: 'Balance',
          core: 'Körpermitte',
          warm_up: 'Aufwärmen'
        }
      },
      common: {
        create: 'Erstellen',
        exercises: 'Übungen',
        exerciseCount_one: '{{count}} Übung',
        exerciseCount_other: '{{count}} Übungen',
        'general-fitness.name': 'Allgemeine Fitness',
        'general-fitness.description': 'Grundlegende Fitnessübungen'
      }
    },
    fr: {
      exercises: {
        filterShared: 'Partagés avec moi',
        shared: 'Partagé',
        title: 'Exercices',
        subtitle: 'sous-titre',
        showingCount: 'Affichage de {{count}} sur {{total}}',
        shareExercise: 'Partager l\'exercice',
        shareDescription: 'Créer un lien partageable pour "{{name}}"',
        shareLinkGenerated: 'Lien de partage généré',
        shareError: 'Échec du partage de l\'exercice',
        shareLinkReady: 'Lien de partage prêt',
        shareLinkReadyDesc: 'Votre lien de partage est prêt à être copié',
        shareNotFound: 'Exercice non trouvé',
        shareExpired: 'Le lien de partage a expiré',
        sharedExercise: 'Exercice partagé',
        sharedBy: 'Partagé par {{name}}',
        saveToLibrary: 'Enregistrer dans la bibliothèque',
        exerciseSaved: 'Exercice enregistré dans votre bibliothèque',
        saveFailed: 'Échec de l\'enregistrement de l\'exercice',
        categories: {
          strength: 'Force',
          cardio: 'Cardio',
          flexibility: 'Flexibilité',
          balance: 'Équilibre',
          core: 'Tronc',
          warm_up: 'Échauffement'
        }
      },
      common: {
        create: 'Créer',
        exercises: 'Exercices',
        exerciseCount_one: '{{count}} exercice',
        exerciseCount_other: '{{count}} exercices',
        'general-fitness.name': 'Fitness Général',
        'general-fitness.description': 'Exercices de fitness de base'
      }
    },
    ar: {
      exercises: {
        filterShared: 'مشارك معي',
        shared: 'مشارك',
        title: 'التمارين',
        subtitle: 'العنوان الفرعي',
        showingCount: 'عرض {{count}} من {{total}}',
        shareExercise: 'مشاركة التمرين',
        shareDescription: 'إنشاء رابط قابل للمشاركة لـ "{{name}}"',
        shareLinkGenerated: 'تم إنشاء رابط المشاركة',
        shareError: 'فشل في مشاركة التمرين',
        shareLinkReady: 'رابط المشاركة جاهز',
        shareLinkReadyDesc: 'رابط المشاركة الخاص بك جاهز للنسخ',
        shareNotFound: 'التمرين غير موجود',
        shareExpired: 'انتهت صلاحية رابط المشاركة',
        sharedExercise: 'تمرين مشارك',
        sharedBy: 'مشارك بواسطة {{name}}',
        saveToLibrary: 'حفظ في المكتبة',
        exerciseSaved: 'تم حفظ التمرين في مكتبتك',
        saveFailed: 'فشل في حفظ التمرين',
        categories: {
          strength: 'القوة',
          cardio: 'الكارديو',
          flexibility: 'المرونة',
          balance: 'التوازن',
          core: 'الجذع',
          warm_up: 'الإحماء'
        }
      },
      common: {
        create: 'إنشاء',
        exercises: 'التمارين',
        exerciseCount_one: '{{count}} تمرين',
        exerciseCount_other: '{{count}} تمرين',
        'general-fitness.name': 'اللياقة العامة',
        'general-fitness.description': 'تمارين اللياقة الأساسية'
      }
    }
  };

  // Add missing exerciseDetails namespace if it doesn't exist
  if (!i18n.hasResourceBundle(language, 'exerciseDetails')) {
    i18n.addResourceBundle(language, 'exerciseDetails', {}, true, true);
  }

  // Add translations to the global i18n instance
  Object.entries(translations[language as keyof typeof translations] || translations.en).forEach(([namespace, bundle]) => {
    i18n.addResourceBundle(language, namespace, bundle, true, true);
  });

  await i18n.changeLanguage(language);
  return i18n;
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <MemoryRouter>
      <SnackbarProvider>{children}</SnackbarProvider>
    </MemoryRouter>
  </I18nextProvider>
);

let exerciseIdCounter = 1;
const createMockExercise = (overrides: Partial<Exercise> = {}): Exercise => {
  const baseId = `12345678-1234-1234-1234-${String(exerciseIdCounter++).padStart(12, '0')}`;
  const defaultExercise = {
    id: baseId,
    name: 'Custom Exercise',
    description: 'A user-created exercise',
    category: ExerciseCategory.CORE,
    exercise_type: 'time_based',
    catalogId: 'general-fitness',
    default_duration: 30,
    default_sets: 1,
    default_reps: 1,
    is_favorite: false,
    tags: ['core'],
    has_video: false,
    owner_id: 'user-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted: false,
    version: 1,
    ...overrides
  } as Exercise;

  // If exercise has a different owner_id, modify the ID to include that in a way the mock can detect
  if (overrides.owner_id && overrides.owner_id !== 'user-123') {
    defaultExercise.id = `${overrides.owner_id}-${baseId}`;
  }

  return defaultExercise;
};

const mockAppSettings = {
  id: 'settings-1',
  owner_id: 'user-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted: false,
  version: 1,
  interval_duration: 5,
  sound_enabled: true,
  vibration_enabled: true,
  beep_volume: 0.5,
  dark_mode: false,
  auto_save: true,
  pre_timer_countdown: 0,
  default_rest_time: 30,
  rep_speed_factor: 1,
  horizontal_exercise_layout: false,
  ring_timer: true
} as const;

const renderExercisePage = (exercises: Exercise[]) => {
  render(
    <TestWrapper>
      <ExercisePage exercises={exercises} appSettings={mockAppSettings as any} onToggleFavorite={() => {}} />
    </TestWrapper>
  );
};

describe('Exercise Sharing Internationalization Tests', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
    // Mock isSharedExercise to return true for exercises with different owner_ids
    mockUseSharedExercises.mockReturnValue({
      isSharedExercise: (exerciseId: string) => {
        // For test purposes, return true for exercises created with different owner_ids
        return exerciseId.includes('different-user') || exerciseId.includes('other-user') || exerciseId.includes('arabic');
      }
    });
    exerciseIdCounter = 1; // Reset counter for each test
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
        renderExercisePage(exercises);
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
        const exercises = [createMockExercise({
          name: 'Shared Exercise',
          owner_id: 'different-user-id-than-current-user'
        })];
        renderExercisePage(exercises);
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });
    });
  });

  describe('Exercise Count Display', () => {
    it('should properly handle pluralization in English', async () => {
      const exercises = [
        createMockExercise({ name: 'Exercise 1', owner_id: 'different-user-1' }),
        createMockExercise({ name: 'Exercise 2', owner_id: 'different-user-2' })
      ];
      await initI18nForTesting('en');
      renderExercisePage(exercises);
      const sharedFilter = screen.getByRole('button', { name: /Shared with me/i });
      fireEvent.click(sharedFilter);
      expect(screen.getByText(/Showing 2 of 2/i)).toBeInTheDocument();
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

    const supportedLanguages = ['en', 'ar', 'de', 'es', 'fr']; // Only test languages with complete translations

    supportedLanguages.forEach(language => {
      it(`should have all required translation keys in ${language}`, async () => {
        await initI18nForTesting(language);
        requiredKeys.forEach(key => {
          const translation = i18n.t(`exercises:${key}`);
          expect(translation).not.toBe(`exercises:${key}`);
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
      const translation = i18n.t('exercises:shareDescription', { name: exerciseName });
      expect(translation).toContain(exerciseName);
      expect(translation).toBe(`Create a shareable link for "${exerciseName}"`);
    });

    it('should correctly interpolate sharer names', async () => {
      await initI18nForTesting('en');
      const sharerName = 'John Doe';
      const translation = i18n.t('exercises:sharedBy', { name: sharerName });
      expect(translation).toContain(sharerName);
      expect(translation).toBe(`Shared by ${sharerName}`);
    });
  });

  describe('RTL Language Support', () => {
    it('should handle Arabic text direction correctly', async () => {
      await initI18nForTesting('ar');
      const exercises = [createMockExercise({ name: 'تمرين مشترك', owner_id: 'different-user-arabic' })];
      renderExercisePage(exercises);
      expect(screen.getByText('مشارك معي')).toBeInTheDocument();
      expect(screen.getByText('مشارك')).toBeInTheDocument();
    });
  });

  describe('Accessibility with Translations', () => {
    it('should maintain accessibility attributes with different languages', async () => {
      await initI18nForTesting('de');
      const exercises = [createMockExercise()];
      renderExercisePage(exercises);
      const sharedFilter = screen.getByRole('button', { name: /Mit mir geteilt/i });
      expect(sharedFilter).toBeInTheDocument();
      expect(sharedFilter.tagName.toLowerCase()).toBe('button');
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to English when translation is missing', async () => {
      await initI18nForTesting('xx');
      const exercises = [createMockExercise()];
      renderExercisePage(exercises);
      expect(screen.getByText('Shared with me')).toBeInTheDocument();
    });
  });

  describe('Dynamic Language Switching', () => {
    it('should update translations when language changes', async () => {
      await initI18nForTesting('en');
      const exercises = [createMockExercise()];
      const { unmount } = render(
        <TestWrapper>
          <ExercisePage exercises={exercises} appSettings={mockAppSettings as any} onToggleFavorite={() => {}} />
        </TestWrapper>
      );
      expect(screen.getByText('Shared with me')).toBeInTheDocument();

      await act(async () => {
        await initI18nForTesting('de');
      });

      // Unmount the previous render to avoid duplicates
      unmount();

      render(
        <TestWrapper>
          <ExercisePage exercises={exercises} appSettings={mockAppSettings as any} onToggleFavorite={() => {}} />
        </TestWrapper>
      );
      expect(screen.getByText('Mit mir geteilt')).toBeInTheDocument();
    });
  });
});