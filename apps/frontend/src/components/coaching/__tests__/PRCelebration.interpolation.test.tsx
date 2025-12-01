import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { PRCelebration } from '../PRCelebration';
import type { PersonalRecord } from '../../../types/coaching';

// Provide a temporary translation key variant that still uses {{param0}} to ensure backward compatibility
const originalResources = i18n.getResourceBundle('en', 'coaching');
if (originalResources) {
  i18n.addResource('en', 'coaching', 'pr.autoDismiss', 'Auto-dismiss in {{param0}}s');
}

const mockRecord: PersonalRecord = {
  exerciseId: 'ex-burpees',
  exerciseName: 'Burpees',
  recordType: 'max-reps',
  value: 5,
  previousRecord: 4,
  improvementPercentage: 25,
  timestamp: new Date().toISOString(),
};

describe('PRCelebration interpolation', () => {
  it('renders auto-dismiss text resolving legacy {{param0}} placeholder', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <PRCelebration record={mockRecord} onDismiss={() => {}} autoDismiss dismissDelay={5000} />
      </I18nextProvider>
    );

    // Be flexible on exact phrasing; assert interpolation value rendered
    const el = screen.getByText((content) => /5/.test(content) && /Auto/i.test(content));
    expect(el).toBeInTheDocument();
  });
});
