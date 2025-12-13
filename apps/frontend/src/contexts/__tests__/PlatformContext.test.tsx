/**
 * Platform Context Tests
 * 
 * Tests for the platform detection context and hooks
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformProvider, usePlatform, usePlatformClasses } from '../PlatformContext';
import React from 'react';

// Mock nativeCapabilities
vi.mock('../../utils/nativeCapabilities', () => ({
  isNativePlatform: vi.fn(() => false),
  isIOS: vi.fn(() => false),
  isAndroid: vi.fn(() => false),
  isWeb: vi.fn(() => true),
  getPlatform: vi.fn(() => 'web'),
}));

// Get the mocked module
import * as nativeCapabilities from '../../utils/nativeCapabilities';

// Test component that uses the hook
const TestComponent: React.FC = () => {
  const { platform, isNative, isIOS, isAndroid, isWeb } = usePlatform();
  return (
    <div>
      <span data-testid="platform">{platform}</span>
      <span data-testid="isNative">{isNative ? 'true' : 'false'}</span>
      <span data-testid="isIOS">{isIOS ? 'true' : 'false'}</span>
      <span data-testid="isAndroid">{isAndroid ? 'true' : 'false'}</span>
      <span data-testid="isWeb">{isWeb ? 'true' : 'false'}</span>
    </div>
  );
};

// Test component for platform classes
const ClassTestComponent: React.FC = () => {
  const { platformClass, when } = usePlatformClasses();
  const classes = platformClass({
    base: 'base-class',
    ios: 'ios-class',
    android: 'android-class',
    web: 'web-class',
    native: 'native-class',
  });
  const whenNative = when('native', 'conditional-native');
  const whenWeb = when('web', 'conditional-web');
  
  return (
    <div>
      <span data-testid="classes">{classes}</span>
      <span data-testid="when-native">{whenNative}</span>
      <span data-testid="when-web">{whenWeb}</span>
    </div>
  );
};

describe('PlatformContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PlatformProvider', () => {
    it('provides platform context to children', () => {
      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('platform')).toHaveTextContent('web');
    });

    it('detects web platform correctly', () => {
      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('isWeb')).toHaveTextContent('true');
      expect(screen.getByTestId('isNative')).toHaveTextContent('false');
      expect(screen.getByTestId('isIOS')).toHaveTextContent('false');
      expect(screen.getByTestId('isAndroid')).toHaveTextContent('false');
    });

    it('detects iOS platform correctly', () => {
      vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(true);
      vi.mocked(nativeCapabilities.isIOS).mockReturnValue(true);
      vi.mocked(nativeCapabilities.isWeb).mockReturnValue(false);
      vi.mocked(nativeCapabilities.getPlatform).mockReturnValue('ios');

      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('platform')).toHaveTextContent('ios');
      expect(screen.getByTestId('isIOS')).toHaveTextContent('true');
      expect(screen.getByTestId('isNative')).toHaveTextContent('true');
      expect(screen.getByTestId('isWeb')).toHaveTextContent('false');
    });

    it('detects Android platform correctly', () => {
      vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(true);
      vi.mocked(nativeCapabilities.isAndroid).mockReturnValue(true);
      vi.mocked(nativeCapabilities.isWeb).mockReturnValue(false);
      vi.mocked(nativeCapabilities.getPlatform).mockReturnValue('android');

      render(
        <PlatformProvider>
          <TestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('platform')).toHaveTextContent('android');
      expect(screen.getByTestId('isAndroid')).toHaveTextContent('true');
      expect(screen.getByTestId('isNative')).toHaveTextContent('true');
    });
  });

  describe('usePlatform', () => {
    it('throws error when used outside PlatformProvider', () => {
      // Suppress React error logging for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('usePlatform must be used within a PlatformProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('usePlatformClasses', () => {
    it('applies web classes on web platform', () => {
      render(
        <PlatformProvider>
          <ClassTestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('classes')).toHaveTextContent('base-class web-class');
      expect(screen.getByTestId('when-web')).toHaveTextContent('conditional-web');
      expect(screen.getByTestId('when-native')).toHaveTextContent('');
    });

    it('applies iOS classes on iOS platform', () => {
      vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(true);
      vi.mocked(nativeCapabilities.isIOS).mockReturnValue(true);
      vi.mocked(nativeCapabilities.isWeb).mockReturnValue(false);
      vi.mocked(nativeCapabilities.getPlatform).mockReturnValue('ios');

      render(
        <PlatformProvider>
          <ClassTestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('classes')).toHaveTextContent('base-class ios-class native-class');
      expect(screen.getByTestId('when-native')).toHaveTextContent('conditional-native');
      expect(screen.getByTestId('when-web')).toHaveTextContent('');
    });

    it('applies Android classes on Android platform', () => {
      vi.mocked(nativeCapabilities.isNativePlatform).mockReturnValue(true);
      vi.mocked(nativeCapabilities.isAndroid).mockReturnValue(true);
      vi.mocked(nativeCapabilities.isWeb).mockReturnValue(false);
      vi.mocked(nativeCapabilities.getPlatform).mockReturnValue('android');

      render(
        <PlatformProvider>
          <ClassTestComponent />
        </PlatformProvider>
      );
      
      expect(screen.getByTestId('classes')).toHaveTextContent('base-class android-class native-class');
    });
  });
});
