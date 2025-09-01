import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navigation from '../Navigation';

// This test asserts the visual order of main navigation items
// Expected: Home, Exercises, Timer, Workouts, Activity Log, then More button (no label)
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
      'Activity Log',
    ]);

    // Ensure the last button is the More options button without text label
    const more = buttons[5];
    expect(more).toHaveAttribute('aria-label', 'More options');
    expect(more.textContent).toBe('');
  });
});
