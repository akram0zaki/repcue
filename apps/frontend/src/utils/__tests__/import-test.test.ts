// Simple test to check if the file can be loaded at all
import { describe, it, expect } from 'vitest';

describe('Platform Detection Import Test', () => {
  it('should be able to import the module', async () => {
    const platformDetection = await import('../platformDetection');
    console.log('Successfully imported:', Object.keys(platformDetection));
    console.log('isIOS type:', typeof platformDetection.isIOS);
    expect(typeof platformDetection.isIOS).toBe('function');
  });
});
