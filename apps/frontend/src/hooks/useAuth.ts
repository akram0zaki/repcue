import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import type { AuthState, AuthUserProfile } from '../types';

/**
 * React hook for authentication state management
 * Provides auth state and methods for sign in/out
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => authService.getAuthState());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((newAuthState) => {
      setAuthState(newAuthState);
      setLoading(false);
    });

    // Initial auth state
    setAuthState(authService.getAuthState());
    setLoading(false);

    return unsubscribe;
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signInWithPassword(email, password);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithPassword = async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    try {
      const result = await authService.signUpWithPassword(email, password, displayName);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signInWithMagicLink = async (email: string) => {
    setLoading(true);
    try {
      const result = await authService.signInWithMagicLink(email);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'apple' | 'github') => {
    setLoading(true);
    try {
      const result = await authService.signInWithOAuth(provider);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await authService.signOut();
      return result;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    return authService.resetPassword(email);
  };

  const updatePassword = async (newPassword: string) => {
    return authService.updatePassword(newPassword);
  };

  const updateProfile = async (updates: { displayName?: string; avatarUrl?: string }) => {
    return authService.updateProfile(updates);
  };

  const refreshSession = async () => {
    return authService.refreshSession();
  };

  return {
    // State
    ...authState,
    loading,
    
    // User info
    user: authState.user,
    session: authService.getCurrentSession(),
    
    // Methods
    signInWithPassword,
    signUpWithPassword,
    signInWithMagicLink,
    signInWithOAuth,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshSession,
  };
}

/**
 * Hook to get current user information
 */
export function useUser(): AuthUserProfile | null {
  const { user } = useAuth();
  return user ?? null;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

