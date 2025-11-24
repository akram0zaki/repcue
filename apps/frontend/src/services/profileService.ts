import type { 
  UserProfile, 
  Connection, 
  ConnectionRequest
} from '../types';
import logger from '../utils/logger';

// Simple UUID generator
const generateUUID = (): string => {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

class ProfileService {
  private static instance: ProfileService;

  static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // For now, return a mock profile - this will be replaced with actual database implementation
      const defaultProfile: UserProfile = {
        id: generateUUID(),
        owner_id: userId,
        updated_at: new Date().toISOString(),
        deleted: false,
        version: 1,
        created_at: new Date().toISOString(),
        user_id: userId,
        name: 'Test User',
        social: {
          bio: 'Fitness enthusiast and RepCue user',
          privacy_settings: this.getDefaultPrivacySettings(),
          stats: this.getDefaultUserStats()
        },
        join_date: new Date().toISOString()
      };
      return defaultProfile;
    } catch (error) {
      logger.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Create or update user profile
   */
  async saveUserProfile(profile: Partial<UserProfile> & { user_id: string }): Promise<boolean> {
    try {
      // Mock implementation - always return success
      logger.log('Saving user profile:', profile);
      return true;
    } catch (error) {
      logger.error('Failed to save user profile:', error);
      return false;
    }
  }

  /**
   * Get user's connections
   */
  async getUserConnections(userId: string): Promise<Connection[]> {
    try {
      // Mock connections data
      const mockConnections: Connection[] = [
        {
          id: generateUUID(),
          owner_id: userId,
          updated_at: new Date().toISOString(),
          deleted: false,
          version: 1,
          created_at: new Date().toISOString(),
          user_id: userId,
          connected_user_id: 'mock-user-1',
          status: 'accepted',
          requested_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
          nickname: 'Friend 1'
        },
        {
          id: generateUUID(),
          owner_id: userId,
          updated_at: new Date().toISOString(),
          deleted: false,
          version: 1,
          created_at: new Date().toISOString(),
          user_id: userId,
          connected_user_id: 'mock-user-2',
          status: 'accepted',
          requested_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
          nickname: 'Friend 2'
        }
      ];
      return mockConnections;
    } catch (error) {
      logger.error('Failed to get user connections:', error);
      return [];
    }
  }

  /**
   * Get connection requests for a user
   */
  async getConnectionRequests(_userId: string): Promise<ConnectionRequest[]> {
    try {
      // Mock implementation
      return [];
    } catch (error) {
      logger.error('Failed to get connection requests:', error);
      return [];
    }
  }

  /**
   * Send connection request
   */
  async sendConnectionRequest(fromUserId: string, toUserId: string, message?: string): Promise<boolean> {
    try {
      // Mock implementation
      logger.log('Sending connection request from', fromUserId, 'to', toUserId, 'with message:', message);
      return true;
    } catch (error) {
      logger.error('Failed to send connection request:', error);
      return false;
    }
  }

  /**
   * Accept connection request
   */
  async acceptConnectionRequest(requestId: string): Promise<boolean> {
    try {
      // Mock implementation
      logger.log('Accepting connection request:', requestId);
      return true;
    } catch (error) {
      logger.error('Failed to accept connection request:', error);
      return false;
    }
  }

  /**
   * Reject connection request
   */
  async rejectConnectionRequest(requestId: string): Promise<boolean> {
    try {
      // Mock implementation
      logger.log('Rejecting connection request:', requestId);
      return true;
    } catch (error) {
      logger.error('Failed to reject connection request:', error);
      return false;
    }
  }

  /**
   * Remove connection (unfriend)
   */
  async removeConnection(connectionId: string): Promise<boolean> {
    try {
      // Mock implementation
      logger.log('Removing connection:', connectionId);
      return true;
    } catch (error) {
      logger.error('Failed to remove connection:', error);
      return false;
    }
  }

  /**
   * Get connection between two users
   */
  async getConnectionBetweenUsers(_userId1: string, _userId2: string): Promise<Connection | null> {
    try {
      // Mock implementation
      return null;
    } catch (error) {
      logger.error('Failed to get connection between users:', error);
      return null;
    }
  }

  /**
   * Update user stats
   */
  async updateUserStats(userId: string, stats: Partial<{ total_workouts: number; total_exercises_created: number; total_workouts_created: number; streak_days: number; longest_streak: number }>): Promise<boolean> {
    try {
      // Mock implementation
      logger.log('Updating user stats for', userId, ':', stats);
      return true;
    } catch (error) {
      logger.error('Failed to update user stats:', error);
      return false;
    }
  }

  /**
   * Search profiles by display name or email
   */
  async searchProfiles(_query: string, _limit: number = 10): Promise<UserProfile[]> {
    try {
      // Mock implementation
      return [];
    } catch (error) {
      logger.error('Failed to search profiles:', error);
      return [];
    }
  }

  /**
   * Get default privacy settings
   */
  private getDefaultPrivacySettings() {
    return {
      profile_visibility: 'connections' as const,
      show_stats: true,
      show_activity: false,
      allow_connection_requests: true
    };
  }

  /**
   * Get default user stats
   */
  getDefaultUserStats() {
    return {
      total_workouts: 15,
      total_exercises_created: 3,
      total_workouts_created: 2,
      streak_days: 7,
      longest_streak: 21
    };
  }

  /**
   * Create initial profile for new user
   */
  async createInitialProfile(userId: string, displayName?: string): Promise<boolean> {
    const initialProfile: Partial<UserProfile> = {
      user_id: userId,
      name: displayName,
      social: {
        privacy_settings: this.getDefaultPrivacySettings(),
        stats: this.getDefaultUserStats()
      }
    };

    return await this.saveUserProfile(initialProfile as UserProfile);
  }
}

// Export singleton instance
export const profileService = ProfileService.getInstance();