import { describe, it, expect } from 'vitest';
import { isBuiltin, isCustom, isSharedWithMe } from '../syncFilters';

describe('syncFilters', () => {
  const slugId = 'arm-circles';
  const uuidId = '550e8400-e29b-41d4-a716-446655440000';

  it('detects built-in (slug) exercises correctly', () => {
    expect(isBuiltin(slugId)).toBe(true);
    expect(isCustom(slugId)).toBe(false);
  });

  it('detects custom (UUID) exercises correctly', () => {
    expect(isBuiltin(uuidId)).toBe(false);
    expect(isCustom(uuidId)).toBe(true);
  });

  it('treats only UUIDs present in shared set as shared', () => {
    const sharedSet = new Set<string>([uuidId]);
    expect(isSharedWithMe(uuidId, sharedSet)).toBe(true);
    expect(isSharedWithMe(slugId, sharedSet)).toBe(false); // slug can never be shared
  });

  it('returns false for empty/invalid IDs', () => {
    // @ts-expect-error testing defensive path
    expect(isBuiltin(undefined)).toBe(false);
    // @ts-expect-error testing defensive path
    expect(isCustom(undefined)).toBe(false);
  });
});
