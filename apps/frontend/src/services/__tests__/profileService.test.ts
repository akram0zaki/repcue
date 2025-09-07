import { describe, it, expect, beforeEach, vi } from 'vitest';
import { profileService } from '../profileService';
import { storageService } from '../storageService';
import type { UserProfile, Connection } from '../../types';

// Mock the storage service
vi.mock('../storageService', () => ({
  storageService: {
    getTable: vi.fn(),
    saveToTable: vi.fn()
  }
}));

const mockStorageService = storageService as {
  getTable: ReturnType<typeof vi.fn>;
  saveToTable: ReturnType<typeof vi.fn>;
};

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('returns user profile when found', async () => {
      const mockProfiles: UserProfile[] = [
        {
          id: 'profile-1',
          owner_id: 'user-1',
          updated_at: '2024-01-01T00:00:00.000Z',
          deleted: false,
          version: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          user_id: 'user-1',
          display_name: 'Test User',
          privacy_settings: {
            profile_visibility: 'connections',
            show_stats: true,
            show_activity: false,
            allow_connection_requests: true
          },
          join_date: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockStorageService.getTable.mockResolvedValue(mockProfiles);

      const result = await profileService.getUserProfile('user-1');

      expect(result).toEqual(mockProfiles[0]);
      expect(mockStorageService.getTable).toHaveBeenCalledWith('user_profiles');
    });

    it('returns null when profile not found', async () => {
      mockStorageService.getTable.mockResolvedValue([]);

      const result = await profileService.getUserProfile('nonexistent-user');

      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockStorageService.getTable.mockRejectedValue(new Error('Database error'));

      const result = await profileService.getUserProfile('user-1');

      expect(result).toBeNull();
    });
  });

  describe('saveUserProfile', () => {
    it('creates new profile when none exists', async () => {
      mockStorageService.getTable.mockResolvedValue([]);
      mockStorageService.saveToTable.mockResolvedValue(true);

      const profileData = {
        user_id: 'user-1',
        display_name: 'Test User'
      };

      const result = await profileService.saveUserProfile(profileData);

      expect(result).toBe(true);
      expect(mockStorageService.saveToTable).toHaveBeenCalledWith(
        'user_profiles',
        expect.objectContaining({
          user_id: 'user-1',
          display_name: 'Test User',
          privacy_settings: expect.any(Object),
          version: 1
        })
      );
    });

    it('updates existing profile', async () => {
      const existingProfile: UserProfile = {
        id: 'profile-1',
        owner_id: 'user-1',
        updated_at: '2024-01-01T00:00:00.000Z',
        deleted: false,
        version: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        user_id: 'user-1',
        display_name: 'Old Name',
        privacy_settings: {
          profile_visibility: 'connections',
          show_stats: true,
          show_activity: false,
          allow_connection_requests: true
        },
        join_date: '2024-01-01T00:00:00.000Z'
      };

      mockStorageService.getTable.mockResolvedValue([existingProfile]);
      mockStorageService.saveToTable.mockResolvedValue(true);

      const profileData = {
        user_id: 'user-1',
        display_name: 'New Name'
      };

      const result = await profileService.saveUserProfile(profileData);

      expect(result).toBe(true);
      expect(mockStorageService.saveToTable).toHaveBeenCalledWith(
        'user_profiles',
        expect.objectContaining({
          id: 'profile-1',
          user_id: 'user-1',
          display_name: 'New Name',
          version: 2 // Version should increment
        })
      );
    });

    it('returns false on error', async () => {
      mockStorageService.getTable.mockRejectedValue(new Error('Database error'));

      const result = await profileService.saveUserProfile({ user_id: 'user-1' });

      expect(result).toBe(false);
    });
  });

  describe('getUserConnections', () => {
    it('returns user connections', async () => {
      const mockConnections: Connection[] = [
        {
          id: 'connection-1',
          owner_id: 'user-1',
          updated_at: '2024-01-01T00:00:00.000Z',
          deleted: false,
          version: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          user_id: 'user-1',
          connected_user_id: 'user-2',
          status: 'accepted',
          requested_at: '2024-01-01T00:00:00.000Z',
          accepted_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockStorageService.getTable.mockResolvedValue(mockConnections);

      const result = await profileService.getUserConnections('user-1');

      expect(result).toEqual([mockConnections[0]]);
      expect(mockStorageService.getTable).toHaveBeenCalledWith('connections');
    });

    it('filters out deleted and pending connections', async () => {
      const mockConnections: Connection[] = [
        {
          id: 'connection-1',
          owner_id: 'user-1',
          updated_at: '2024-01-01T00:00:00.000Z',
          deleted: false,
          version: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          user_id: 'user-1',
          connected_user_id: 'user-2',
          status: 'accepted',
          requested_at: '2024-01-01T00:00:00.000Z',
          accepted_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'connection-2',
          owner_id: 'user-1',
          updated_at: '2024-01-01T00:00:00.000Z',
          deleted: true, // Deleted
          version: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          user_id: 'user-1',
          connected_user_id: 'user-3',
          status: 'accepted',
          requested_at: '2024-01-01T00:00:00.000Z',
          accepted_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'connection-3',
          owner_id: 'user-1',
          updated_at: '2024-01-01T00:00:00.000Z',
          deleted: false,
          version: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          user_id: 'user-1',
          connected_user_id: 'user-4',
          status: 'pending', // Pending
          requested_at: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockStorageService.getTable.mockResolvedValue(mockConnections);

      const result = await profileService.getUserConnections('user-1');

      // Should only return the accepted, non-deleted connection
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockConnections[0]);
    });

    it('returns empty array on error', async () => {
      mockStorageService.getTable.mockRejectedValue(new Error('Database error'));

      const result = await profileService.getUserConnections('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('createInitialProfile', () => {
    it('creates initial profile with default settings', async () => {
      mockStorageService.getTable.mockResolvedValue([]);
      mockStorageService.saveToTable.mockResolvedValue(true);

      const result = await profileService.createInitialProfile('user-1', 'Test User');

      expect(result).toBe(true);
      expect(mockStorageService.saveToTable).toHaveBeenCalledWith(
        'user_profiles',
        expect.objectContaining({
          user_id: 'user-1',
          display_name: 'Test User',
          privacy_settings: {
            profile_visibility: 'connections',
            show_stats: true,
            show_activity: false,
            allow_connection_requests: true
          },
          stats: {
            total_workouts: 0,
            total_exercises_created: 0,
            total_workouts_created: 0,
            streak_days: 0,
            longest_streak: 0
          },
          badges: []
        })
      );
    });
  });

  describe('getDefaultUserStats', () => {
    it('returns default stats object', () => {
      const stats = profileService.getDefaultUserStats();

      expect(stats).toEqual({
        total_workouts: 0,
        total_exercises_created: 0,
        total_workouts_created: 0,
        streak_days: 0,
        longest_streak: 0
      });
    });
  });
});