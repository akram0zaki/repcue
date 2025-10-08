import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { 
  AuthenticationResponseJSON, 
  RegistrationResponseJSON,
  UserVerificationRequirement,
  AuthenticatorAttachment
} from '@simplewebauthn/types';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';

export interface WebAuthnSession {
  properties: {
    hashed_token: string;
    action_link: string;
    email_otp: string;
    redirect_to: string;
    verification_type: string;
  };
  user: {
    id: string;
    email: string;
    [key: string]: unknown;
  };
}

export interface PasskeyRegistrationResult {
  success: boolean;
  session?: WebAuthnSession;
  error?: string;
}

export interface PasskeyAuthenticationResult {
  success: boolean;
  session?: WebAuthnSession;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

export class WebAuthnService {
  private static instance: WebAuthnService;

  private constructor() {}

  public static getInstance(): WebAuthnService {
    if (!WebAuthnService.instance) {
      WebAuthnService.instance = new WebAuthnService();
    }
    return WebAuthnService.instance;
  }

  /**
   * Check if WebAuthn is supported in the current browser
   */
  isSupported(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      window.navigator.credentials &&
      typeof window.navigator.credentials.create === 'function' &&
      typeof window.navigator.credentials.get === 'function'
    );
  }

  /**
   * Get browser-specific WebAuthn preferences
   */
  private getBrowserPreferences(): {
    userVerification: UserVerificationRequirement;
    residentKey: 'required' | 'preferred' | 'discouraged';
    authenticatorAttachment?: AuthenticatorAttachment;
  } {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Firefox has issues with 'preferred' settings, use 'discouraged' for better compatibility
    if (userAgent.includes('firefox')) {
      return {
        userVerification: 'discouraged',
        residentKey: 'discouraged'
      };
    }
    
    // Edge (Chromium) works well with platform authenticators
    if (userAgent.includes('edg/')) {
      return {
        userVerification: 'preferred',
        residentKey: 'preferred',
        authenticatorAttachment: 'platform'
      };
    }
    
    // Chrome and other Chromium-based browsers
    if (userAgent.includes('chrome')) {
      return {
        userVerification: 'preferred',
        residentKey: 'preferred'
      };
    }
    
    // Safari and other browsers - conservative settings
    return {
      userVerification: 'discouraged',
      residentKey: 'discouraged'
    };
  }

  /**
   * Check if platform authenticator (Touch ID, Face ID, Windows Hello) is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      logger.warn('Error checking platform authenticator availability:', error);
      return false;
    }
  }

  /**
   * Register a new passkey for the user
   */
  async registerPasskey(email: string): Promise<PasskeyRegistrationResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Passkeys are not supported in this browser'
      };
    }

    try {
      // Get browser-specific preferences
      const browserPrefs = this.getBrowserPreferences();
      
      // Step 1: Get registration options from server
      const { data: challengeData, error: challengeError } = await supabase.functions.invoke('webauthn-register', {
        body: {
          step: 'challenge',
          email,
          browserPreferences: browserPrefs
        }
      });

      if (challengeError || !challengeData?.options) {
        return {
          success: false,
          error: challengeError?.message || 'Failed to start passkey registration'
        };
      }

      // Step 2: Start WebAuthn registration ceremony
      let registrationResponse: RegistrationResponseJSON;
      try {
        registrationResponse = await startRegistration(challengeData.options);
      } catch (error: unknown) {
        const err = error as { name?: string; message?: string };
        if (err.name === 'InvalidStateError') {
          return {
            success: false,
            error: 'A passkey already exists for this device. Try signing in instead.'
          };
        } else if (err.name === 'NotAllowedError') {
          return {
            success: false,
            error: 'Passkey registration was cancelled'
          };
        } else {
          return {
            success: false,
            error: 'Failed to create passkey. Please try again.'
          };
        }
      }

      // Step 3: Verify registration with server
      const { data: verificationData, error: verificationError } = await supabase.functions.invoke('webauthn-register', {
        body: {
          step: 'verify',
          response: {
            userID: challengeData.userID,
            credential: registrationResponse
          }
        }
      });

      if (verificationError || !verificationData?.verified) {
        return {
          success: false,
          error: verificationError?.message || 'Passkey verification failed'
        };
      }

      return {
        success: true,
        session: verificationData.session
      };

    } catch (error) {
      logger.error('Passkey registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Passkey registration failed'
      };
    }
  }

  /**
   * Authenticate using a passkey
   */
  async authenticateWithPasskey(email?: string): Promise<PasskeyAuthenticationResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Passkeys are not supported in this browser'
      };
    }

    try {
      // Get browser-specific preferences
      const browserPrefs = this.getBrowserPreferences();
      
      // Step 1: Get authentication options from server
      const { data: challengeData, error: challengeError } = await supabase.functions.invoke('webauthn-authenticate', {
        body: {
          step: 'challenge',
          email,
          browserPreferences: {
            userVerification: browserPrefs.userVerification
          }
        }
      });

      if (challengeError || !challengeData?.options) {
        return {
          success: false,
          error: challengeError?.message || 'Failed to start passkey authentication'
        };
      }

      // Step 2: Start WebAuthn authentication ceremony
      let authenticationResponse: AuthenticationResponseJSON;
      try {
        authenticationResponse = await startAuthentication(challengeData.options);
      } catch (error: unknown) {
        const err = error as { name?: string; message?: string };
        if (err.name === 'NotAllowedError') {
          return {
            success: false,
            error: 'Passkey authentication was cancelled'
          };
        } else if (err.name === 'InvalidStateError') {
          return {
            success: false,
            error: 'No passkey found for this account'
          };
        } else {
          return {
            success: false,
            error: 'Failed to authenticate with passkey. Please try again.'
          };
        }
      }

      // Step 3: Verify authentication with server
      const { data: verificationData, error: verificationError } = await supabase.functions.invoke('webauthn-authenticate', {
        body: {
          step: 'verify',
          response: {
            credential: authenticationResponse
          }
        }
      });

      if (verificationError || !verificationData?.verified) {
        return {
          success: false,
          error: verificationError?.message || 'Passkey authentication failed'
        };
      }

      return {
        success: true,
        session: verificationData.session,
        user: verificationData.user
      };

    } catch (error) {
      logger.error('Passkey authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Passkey authentication failed'
      };
    }
  }

  /**
   * Get user's registered passkeys
   */
  async getUserPasskeys(): Promise<{
    passkeys: Array<{
      id: string;
      deviceName: string | null;
      createdAt: string;
      lastUsedAt: string | null;
    }>;
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { passkeys: [], error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('user_authenticators')
        .select('id, device_name, created_at, last_used_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return { passkeys: [], error: error.message };
      }

      return {
        passkeys: (data || []).map(auth => ({
          id: auth.id,
          deviceName: auth.device_name,
          createdAt: auth.created_at || new Date().toISOString(),
          lastUsedAt: auth.last_used_at
        }))
      };
    } catch (error) {
      return {
        passkeys: [],
        error: error instanceof Error ? error.message : 'Failed to fetch passkeys'
      };
    }
  }

  /**
   * Delete a user's passkey
   */
  async deletePasskey(passkeyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('user_authenticators')
        .delete()
        .eq('id', passkeyId)
        .eq('owner_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete passkey'
      };
    }
  }

  /**
   * Update passkey device name
   */
  async updatePasskeyName(passkeyId: string, deviceName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('user_authenticators')
        .update({ device_name: deviceName })
        .eq('id', passkeyId)
        .eq('owner_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update passkey name'
      };
    }
  }
}

// Export singleton instance
export const webauthnService = WebAuthnService.getInstance();