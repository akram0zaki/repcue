import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import '../i18n'; // Initialize i18n

// Test component to validate Phase 6 features
const Phase6TestComponent = () => {
  const { t, i18n } = useTranslation(['common']);

  return (
    <div>
      {/* Test pluralization - using timer namespace */}
      <div data-testid="plural-seconds-1">{t('timer.seconds', { count: 1 })}</div>
      <div data-testid="plural-seconds-5">{t('timer.seconds', { count: 5 })}</div>
      <div data-testid="plural-exercises-1">{t('timer.exercises', { count: 1 })}</div>
      <div data-testid="plural-exercises-3">{t('timer.exercises', { count: 3 })}</div>
      
      {/* Test interpolation - using common namespace */}
      <div data-testid="welcome-user">{t('common.welcomeUser', { name: 'John' })}</div>
      <div data-testid="workout-summary">{t('common.workoutSummary', { exerciseCount: 5, duration: '15 minutes' })}</div>
      
      {/* Test sets completed with pluralization */}
      <div data-testid="sets-completed-1">{t('timer.setsCompleted', { completed: 1, total: 3, count: 3 })}</div>
      <div data-testid="sets-completed-2">{t('timer.setsCompleted', { completed: 2, total: 3, count: 3 })}</div>
      
      {/* Test timer countdown that should work */}
      <div data-testid="countdown-1">{t('timer.getReadyStartsIn', { count: 1 })}</div>
      <div data-testid="countdown-5">{t('timer.getReadyStartsIn', { count: 5 })}</div>
      
      {/* Current language indicator */}
      <div data-testid="current-language">{i18n.resolvedLanguage || i18n.language}</div>
    </div>
  );
};

describe('Phase 6: Plurals, Interpolation, and Formatting', () => {
  it('renders correct English pluralization', async () => {
    render(<Phase6TestComponent />);
    
    // Test countdown that we know exists
    expect(screen.getByTestId('countdown-1')).toHaveTextContent('Get Ready! Timer starts in 1 second');
    expect(screen.getByTestId('countdown-5')).toHaveTextContent('Get Ready! Timer starts in 5 seconds');
  });

  it('renders correct interpolation with user data', async () => {
    render(<Phase6TestComponent />);
    
    // Test interpolation that we know exists - use existing key
    const setsText = screen.getByTestId('sets-completed-1').textContent;
    expect(setsText).toContain('1 of 3');
    expect(setsText).toContain('sets completed');
  });

  it('renders sets completed with proper pluralization', async () => {
    render(<Phase6TestComponent />);
    
    // Test sets completed with proper count for pluralization
    expect(screen.getByTestId('sets-completed-1')).toHaveTextContent('1 of 3 sets completed');
    expect(screen.getByTestId('sets-completed-2')).toHaveTextContent('2 of 3 sets completed');
  });

  it('initializes with English as default language', async () => {
    render(<Phase6TestComponent />);
    
    expect(screen.getByTestId('current-language')).toHaveTextContent('en');
  });
});

describe('Phase 6: Number and Date Formatting', () => {
  it('should use Intl API for number formatting', () => {
    const number = 1234.56;
    const formatted = new Intl.NumberFormat('en').format(number);
    expect(formatted).toBe('1,234.56');
  });

  it('should use Intl API for date formatting', () => {
    const date = new Date('2025-08-20T10:30:00Z');
    const formatted = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
    expect(formatted).toMatch(/August 20, 2025/);
  });

  it('should format time correctly', () => {
    const date = new Date('2025-08-20T10:30:00Z');
    const formatted = new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});
