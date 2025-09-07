import type { 
  UserProfile, 
  Connection, 
  ConnectionRequest, 
  UserStats,
  UserPrivacySettings,
  ConnectionStatus 
} from '../types';
import { storageService } from './storageService';

// Simple UUID generator for testing
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
      const profiles = await storageService.getTable<UserProfile>('user_profiles');
      return profiles.find(p => p.user_id === userId) || null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Create or update user profile
   */
  async saveUserProfile(profile: Partial<UserProfile> & { user_id: string }): Promise<boolean> {
    try {
      const existingProfile = await this.getUserProfile(profile.user_id);
      
      const profileData: UserProfile = {
        id: existingProfile?.id || generateUUID(),
        owner_id: profile.user_id,
        updated_at: new Date().toISOString(),
        deleted: false,
        version: (existingProfile?.version || 0) + 1,
        created_at: existingProfile?.created_at || new Date().toISOString(),
        user_id: profile.user_id,
        display_name: profile.display_name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        privacy_settings: profile.privacy_settings || this.getDefaultPrivacySettings(),
        stats: profile.stats,
        badges: profile.badges || [],
        join_date: existingProfile?.join_date || new Date().toISOString(),
        last_active: new Date().toISOString()
      };

      return await storageService.saveToTable('user_profiles', profileData);
    } catch (error) {
      console.error('Failed to save user profile:', error);
      return false;
    }
  }

  /**
   * Get user's connections
   */
  async getUserConnections(userId: string): Promise<Connection[]> {
    try {
      const connections = await storageService.getTable<Connection>('connections');
      return connections.filter(c => 
        c.user_id === userId && 
        c.status === 'accepted' && 
        !c.deleted
      );
    } catch (error) {
      console.error('Failed to get user connections:', error);
      return [];
    }
  }

  /**
   * Get connection requests for a user
   */
  async getConnectionRequests(userId: string): Promise<ConnectionRequest[]> {
    try {
      const requests = await storageService.getTable<ConnectionRequest>('connection_requests');
      return requests.filter(r => 
        r.to_user_id === userId && 
        r.status === 'pending' && 
        !r.deleted
      );
    } catch (error) {
      console.error('Failed to get connection requests:', error);
      return [];
    }
  }

  /**
   * Send connection request
   */
  async sendConnectionRequest(fromUserId: string, toUserId: string, message?: string): Promise<boolean> {
    try {
      // Check if connection already exists
      const existingConnection = await this.getConnectionBetweenUsers(fromUserId, toUserId);
      if (existingConnection) {
        console.warn('Connection already exists between users');
        return false;
      }

      // Check if request already sent
      const existingRequests = await storageService.getTable<ConnectionRequest>('connection_requests');
      const existingRequest = existingRequests.find(r => 
        r.from_user_id === fromUserId && 
        r.to_user_id === toUserId && 
        r.status === 'pending' &&
        !r.deleted
      );
      
      if (existingRequest) {
        console.warn('Connection request already sent');
        return false;
      }

      const request: ConnectionRequest = {
        id: generateUUID(),
        owner_id: fromUserId,
        updated_at: new Date().toISOString(),
        deleted: false,
        version: 1,
        created_at: new Date().toISOString(),
        from_user_id: fromUserId,
        to_user_id: toUserId,
        message,
        requested_at: new Date().toISOString(),
        status: 'pending'
      };

      return await storageService.saveToTable('connection_requests', request);
    } catch (error) {
      console.error('Failed to send connection request:', error);
      return false;
    }
  }

  /**
   * Accept connection request
   */
  async acceptConnectionRequest(requestId: string): Promise<boolean> {
    try {
      const requests = await storageService.getTable<ConnectionRequest>('connection_requests');
      const request = requests.find(r => r.id === requestId);
      
      if (!request || request.status !== 'pending') {
        return false;
      }

      // Update request status
      const updatedRequest: ConnectionRequest = {
        ...request,
        status: 'accepted',
        updated_at: new Date().toISOString(),
        version: request.version + 1
      };

      // Create bidirectional connections
      const now = new Date().toISOString();
      const connection1: Connection = {
        id: generateUUID(),
        owner_id: request.from_user_id,
        updated_at: now,
        deleted: false,
        version: 1,
        created_at: now,
        user_id: request.from_user_id,
        connected_user_id: request.to_user_id,
        status: 'accepted',
        requested_at: request.requested_at,
        accepted_at: now
      };

      const connection2: Connection = {
        id: generateUUID(),
        owner_id: request.to_user_id,
        updated_at: now,
        deleted: false,
        version: 1,
        created_at: now,
        user_id: request.to_user_id,
        connected_user_id: request.from_user_id,
        status: 'accepted',
        requested_at: request.requested_at,
        accepted_at: now
      };

      // Save all changes
      const results = await Promise.all([
        storageService.saveToTable('connection_requests', updatedRequest),
        storageService.saveToTable('connections', connection1),
        storageService.saveToTable('connections', connection2)
      ]);

      return results.every(r => r);
    } catch (error) {
      console.error('Failed to accept connection request:', error);
      return false;
    }
  }

  /**
   * Reject connection request
   */
  async rejectConnectionRequest(requestId: string): Promise<boolean> {
    try {
      const requests = await storageService.getTable<ConnectionRequest>('connection_requests');
      const request = requests.find(r => r.id === requestId);
      
      if (!request || request.status !== 'pending') {
        return false;
      }

      const updatedRequest: ConnectionRequest = {
        ...request,
        status: 'rejected',
        updated_at: new Date().toISOString(),
        version: request.version + 1
      };

      return await storageService.saveToTable('connection_requests', updatedRequest);
    } catch (error) {
      console.error('Failed to reject connection request:', error);
      return false;
    }
  }

  /**
   * Remove connection (unfriend)
   */
  async removeConnection(connectionId: string): Promise<boolean> {
    try {
      const connections = await storageService.getTable<Connection>('connections');
      const connection = connections.find(c => c.id === connectionId);
      
      if (!connection) {
        return false;
      }

      // Soft delete the connection
      const updatedConnection: Connection = {
        ...connection,
        deleted: true,
        updated_at: new Date().toISOString(),
        version: connection.version + 1
      };

      // Also remove the reciprocal connection
      const reciprocalConnection = connections.find(c => 
        c.user_id === connection.connected_user_id && 
        c.connected_user_id === connection.user_id &&
        !c.deleted
      );

      const promises = [storageService.saveToTable('connections', updatedConnection)];
      
      if (reciprocalConnection) {
        const updatedReciprocal: Connection = {
          ...reciprocalConnection,
          deleted: true,
          updated_at: new Date().toISOString(),
          version: reciprocalConnection.version + 1
        };
        promises.push(storageService.saveToTable('connections', updatedReciprocal));
      }

      const results = await Promise.all(promises);
      return results.every(r => r);
    } catch (error) {
      console.error('Failed to remove connection:', error);
      return false;
    }
  }

  /**
   * Get connection between two users
   */
  async getConnectionBetweenUsers(userId1: string, userId2: string): Promise<Connection | null> {
    try {
      const connections = await storageService.getTable<Connection>('connections');
      return connections.find(c => 
        c.user_id === userId1 && 
        c.connected_user_id === userId2 && 
        c.status === 'accepted' &&
        !c.deleted
      ) || null;
    } catch (error) {
      console.error('Failed to get connection between users:', error);
      return null;
    }
  }

  /**
   * Update user stats
   */
  async updateUserStats(userId: string, stats: Partial<UserStats>): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      const updatedProfile: UserProfile = {
        ...profile,
        stats: {
          ...profile.stats,
          ...stats
        } as UserStats,
        updated_at: new Date().toISOString(),
        version: profile.version + 1
      };

      return await storageService.saveToTable('user_profiles', updatedProfile);
    } catch (error) {
      console.error('Failed to update user stats:', error);
      return false;
    }
  }

  /**
   * Search profiles by display name or email
   */
  async searchProfiles(query: string, limit: number = 10): Promise<UserProfile[]> {
    try {
      const profiles = await storageService.getTable<UserProfile>('user_profiles');
      const lowercaseQuery = query.toLowerCase();
      
      return profiles
        .filter(p => 
          !p.deleted &&
          p.privacy_settings.profile_visibility !== 'private' &&
          (p.display_name?.toLowerCase().includes(lowercaseQuery) ||
           p.bio?.toLowerCase().includes(lowercaseQuery))
        )
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to search profiles:', error);
      return [];
    }
  }

  /**
   * Get default privacy settings
   */
  private getDefaultPrivacySettings(): UserPrivacySettings {
    return {
      profile_visibility: 'connections',
      show_stats: true,
      show_activity: false,
      allow_connection_requests: true
    };
  }

  /**
   * Get default user stats
   */
  getDefaultUserStats(): UserStats {
    return {
      total_workouts: 0,
      total_exercises_created: 0,
      total_workouts_created: 0,
      streak_days: 0,
      longest_streak: 0
    };
  }

  /**
   * Create initial profile for new user
   */
  async createInitialProfile(userId: string, displayName?: string): Promise<boolean> {
    const initialProfile: Partial<UserProfile> = {
      user_id: userId,
      display_name: displayName,
      privacy_settings: this.getDefaultPrivacySettings(),
      stats: this.getDefaultUserStats(),
      badges: []
    };

    return await this.saveUserProfile(initialProfile as UserProfile);
  }
}

// Export singleton instance
export const profileService = ProfileService.getInstance();