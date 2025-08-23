import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import '../i18n';
import AppShell from '../components/AppShell';
import { MemoryRouter } from 'react-router-dom';

describe('i18n initialization (Phase 2)', () => {
  it('renders AppShell with localized a11y strings', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Test</div>
        </AppShell>
      </MemoryRouter>
    );

    // Skip link text should come from i18n (fallback to defaultValue if not yet loaded)
    const skipLink = screen.getByText(/Skip to main content/i);
    expect(skipLink).toBeInTheDocument();

    const mainRegion = screen.getByRole('main');
    expect(mainRegion).toHaveAttribute('aria-label');
  });
});
