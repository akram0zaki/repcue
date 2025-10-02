import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Navigation from '../Navigation';

// Mock i18next completely including the i18n instance with event emitter
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'navigation.home': 'Home',
        'navigation.exercises': 'Exercises',
        'navigation.timer': 'Timer',
        'navigation.workouts': 'Workouts',
        'navigation.progress': 'Progress'
      };
      return translations[key] || key;
    },
    i18n: {
      resolvedLanguage: 'en',
      language: 'en',
      changeLanguage: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
  }),
}));

// This test asserts the visual order of main navigation items
// Expected: Home, Exercises, Timer, Workouts, Progress, then More button (no label)
describe('Navigation order', () => {
  const Wrapper: React.FC = () => (
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>
  );

  it('renders nav items in the UX-specified order', () => {
    render(<Wrapper />);

    // Grab the bottom nav bar
    const nav = screen.getByRole('navigation');
    const buttons = within(nav).getAllByRole('button');

    // First five are the labeled main items, sixth is the more button
    const labels = buttons.slice(0, 5).map((btn) => btn.textContent?.trim());

    expect(labels).toEqual([
      'Home',
      'Exercises',
      'Timer',
      'Workouts',
      'Progress', // Updated to match current navigation label
    ]);

    // Ensure the last button is the More options button without text label
    const more = buttons[5];
    expect(more).toHaveAttribute('aria-label', 'More options');
    expect(more.textContent).toBe('');
  });
});
