import type { Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import type { AuthState, AuthUserProfile } from '../types';
import { storageService } from './storageService';
import { webauthnService, type PasskeyRegistrationResult, type PasskeyAuthenticationResult } from './webauthnService';

/**
 * Authentication service using Supabase
 * Handles sign-in, sign-up, session management, and token persistence
 */
export class AuthService {
  private static instance: AuthService;
  private currentSession: Session | null = null;
  private authState: AuthState = {
    isAuthenticated: false,
    user: undefined,
    accessToken: undefined,
    refreshToken: undefined
  };
  private listeners: Array<(authState: AuthState) => void> = [];

  private constructor() {
    this.initializeAuth();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize authentication state and set up session listener
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Error getting initial session:', error.message);
      } else if (session) {
        await this.handleSessionChange(session);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id || 'no user');
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await this.handleSessionChange(session);
        } else if (event === 'SIGNED_OUT') {
          await this.handleSignOut();
        }
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  /**
   * Handle session changes (sign in, token refresh)
   */
  private async handleSessionChange(session: Session | null): Promise<void> {
    this.currentSession = session;

    if (session?.user) {
      const userProfile: AuthUserProfile = {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.user_metadata?.display_name || 
                    session.user.user_metadata?.full_name ||
                    session.user.email?.split('@')[0],
        avatarUrl: session.user.user_metadata?.avatar_url,
        createdAt: new Date(session.user.created_at),
        updatedAt: new Date(session.user.updated_at || session.user.created_at)
      };

      this.authState = {
        isAuthenticated: true,
        user: userProfile,
        accessToken: session.access_token,
        refreshToken: session.refresh_token
      };

      // Claim ownership of anonymous data on first sign-in
      await this.claimAnonymousData();

      // Trigger sync after successful sign-in with a small delay to ensure auth state is settled
      this.triggerDelayedSync();
    } else {
      this.authState = {
        isAuthenticated: false,
        user: undefined,
        accessToken: undefined,
        refreshToken: undefined
      };
    }

    this.notifyListeners();
  }

  /**
   * Handle sign out
   */
  private async handleSignOut(): Promise<void> {
    this.currentSession = null;
    this.authState = {
      isAuthenticated: false,
      user: undefined,
      accessToken: undefined,
      refreshToken: undefined
    };
    this.notifyListeners();
  }

  /**
   * Claim ownership of anonymous data when user signs in
   */
  private async claimAnonymousData(): Promise<void> {
    if (!this.authState.user?.id) return;

    try {
      console.log('🔄 Starting anonymous data migration...');
      const migrationResult = await storageService.claimOwnership(this.authState.user.id);
      
      if (migrationResult.success && migrationResult.recordsClaimed > 0) {
        console.log(`✅ Migration successful! Claimed ${migrationResult.recordsClaimed} records:`, migrationResult.tableStats);
        
        // Show migration success notification
        this.showMigrationSuccess(migrationResult);
      } else if (migrationResult.recordsClaimed === 0) {
        console.log('ℹ️ No anonymous data found to migrate (new user or already migrated)');
      } else {
        console.warn('⚠️ Migration encountered issues:', migrationResult.error);
      }
    } catch (error) {
      console.error('❌ Failed to claim ownership of anonymous data:', error);
    }
  }

  /**
   * Show migration success feedback to user
   */
  private showMigrationSuccess(migrationResult: { recordsClaimed: number; tableStats: Record<string, number> }): void {
    // Create a custom event to notify the UI about successful migration
    const migrationEvent = new CustomEvent('data-migration-success', {
      detail: {
        recordsClaimed: migrationResult.recordsClaimed,
        tableStats: migrationResult.tableStats,
        timestamp: new Date().toISOString()
      }
    });
    
    window.dispatchEvent(migrationEvent);
  }

  /**
   * Trigger sync after authentication changes with proper delay and error handling
   */
  private triggerDelayedSync(): void {
    try {
      // Add a delay to ensure auth state and tokens are fully settled
      setTimeout(() => {
        // Verify we still have a valid auth state before syncing
        if (!this.authState.isAuthenticated || !this.authState.accessToken) {
          console.log('⚠️ Skipping post-auth sync: user no longer authenticated');
          return;
        }

        // Dynamically import and trigger sync to avoid circular dependencies
        import('./syncService').then(({ syncService }) => {
          console.log('🔄 Starting post-authentication sync...');
          syncService.sync().then(result => {
            if (result.success) {
              console.log('✅ Post-authentication sync completed successfully');
            } else {
              console.warn('⚠️ Post-authentication sync completed with errors:', result.errors);
              // Don't show error toasts for initial sync issues to avoid overwhelming users
              // who just successfully signed in and saw migration success
            }
          }).catch(error => {
            console.warn('❌ Post-authentication sync failed:', error);
            // Silent failure - don't show error toast to avoid conflicting with migration success
          });
        }).catch(error => {
          console.warn('Failed to load sync service:', error);
        });
      }, 1000); // 1 second delay to ensure auth state is settled
    } catch (error) {
      console.warn('Failed to trigger delayed sync:', error);
    }
  }

  /**
   * Sign in with email and password
   */
  public async signInWithPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        await this.handleSessionChange(data.session);
      }

      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Sign up with email and password
   */
  public async signUpWithPassword(email: string, password: string, displayName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0]
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        await this.handleSessionChange(data.session);
      }

      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Sign in with magic link (passwordless)
   */
  public async signInWithMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            display_name: email.split('@')[0]
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Magic link error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Sign in with OAuth provider (Google, Apple, etc.)
   */
  public async signInWithOAuth(provider: 'google' | 'apple' | 'github'): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('OAuth error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Register a new passkey for the user
   */
  public async registerPasskey(email: string): Promise<PasskeyRegistrationResult> {
    const result = await webauthnService.registerPasskey(email);
    
    if (result.success && result.session) {
      // The session data from WebAuthn edge function contains the session info
      // We need to refresh the current session to get the latest auth state
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) {
        await this.handleSessionChange(data.session);
      }
    }
    
    return result;
  }

  /**
   * Sign in with passkey
   */
  public async signInWithPasskey(email?: string): Promise<PasskeyAuthenticationResult> {
    const result = await webauthnService.authenticateWithPasskey(email);
    
    if (result.success && result.session) {
      // The session data from WebAuthn edge function contains the session info
      // We need to refresh the current session to get the latest auth state
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) {
        await this.handleSessionChange(data.session);
      }
    }
    
    return result;
  }

  /**
   * Check if passkeys are supported in the current browser
   */
  public isPasskeySupported(): boolean {
    return webauthnService.isSupported();
  }

  /**
   * Check if platform authenticator (biometrics) is available
   */
  public async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    return await webauthnService.isPlatformAuthenticatorAvailable();
  }

  /**
   * Sign out
   */
  public async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      // Supabase may return 401/403/404 when token is already invalid/expired.
      // Treat these as non-fatal and still clear local session to ensure a reliable sign-out UX.
      const { error } = await supabase.auth.signOut();

      // Always clear local auth state regardless of remote revoke outcome
      await this.handleSignOut();

      // Proactively clear any sync errors so banners disappear immediately after sign-out
      try {
        const { SyncService } = await import('./syncService');
        SyncService.getInstance().clearErrors();
      } catch (e) {
        // Non-fatal: sync service may not be initialized in some environments
      }

      if (error && !/401|403|404/.test(String((error as { status?: number; message?: string }).status ?? ''))) {
        return { success: false, error: (error as { message?: string }).message || 'Failed to sign out' };
      }

      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      // Best-effort local sign-out
      await this.handleSignOut();
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Reset password
   */
  public async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update password
   */
  public async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update user profile
   */
  public async updateProfile(updates: { displayName?: string; avatarUrl?: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: updates.displayName,
          avatar_url: updates.avatarUrl
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get current authentication state
   */
  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Get current session
   */
  public getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): AuthUserProfile | null {
    return this.authState.user || null;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Subscribe to auth state changes
   */
  public onAuthStateChange(callback: (authState: AuthState) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of auth state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.authState);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  /**
   * Refresh session manually
   */
  public async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        await this.handleSessionChange(data.session);
      }

      return { success: true };
    } catch (error) {
      console.error('Refresh session error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

