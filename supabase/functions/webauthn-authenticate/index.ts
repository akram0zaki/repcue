// @ts-nocheck // Edge function executed in Deno runtime; Deno types provided at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateAuthenticationOptionsOpts,
  type VerifyAuthenticationResponseOpts
} from 'https://esm.sh/@simplewebauthn/server@12.0.0'

interface AuthenticationRequest {
  step: 'challenge' | 'verify';
  email?: string;
  response?: any; // WebAuthn credential response
  browserPreferences?: {
    userVerification: 'required' | 'preferred' | 'discouraged';
  };
}

/**
 * Extract the RP ID (Relying Party ID) from the origin URL
 * For WebAuthn, the RP ID must be the domain (without protocol, port, or path)
 * Examples:
 *   - https://repcue.me -> repcue.me
 *   - https://www.repcue.me -> www.repcue.me
 *   - http://localhost:5173 -> localhost
 */
function extractRpId(originUrl: string): string {
  try {
    const url = new URL(originUrl)
    return url.hostname
  } catch (error) {
    console.error('Failed to extract RP ID from origin:', originUrl, error)
    throw new Error('Invalid origin URL')
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract origin from request headers
    // The Origin header is sent with POST requests, Referer is a fallback
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer')
    if (!requestOrigin) {
      return new Response(
        JSON.stringify({ error: 'Missing origin header' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract RP ID and clean origin for WebAuthn
    const rpID = extractRpId(requestOrigin)
    // WebAuthn expects origin with protocol but without trailing slash
    const expectedOrigin = requestOrigin.replace(/\/$/, '')

    console.log('WebAuthn authentication request:', {
      rpID,
      expectedOrigin,
      step: 'initial'
    })

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse request body
    const body = await req.json() as AuthenticationRequest

    if (body.step === 'challenge') {
      // Generate authentication challenge
      let allowCredentials: any[] = []
      let userID: string | undefined

      if (body.email) {
        // Email provided - get specific user's credentials
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(user => user.email === body.email)

        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: 'No account found with this email' }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        userID = existingUser.id

        // Get user's authenticators
        const { data: userAuthenticators } = await supabase
          .from('user_authenticators')
          .select('credential_id')
          .eq('owner_id', userID)

        if (!userAuthenticators || userAuthenticators.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Authentication failed. Make sure you\'re signed up and have registered a passkey for this email address.' }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Helper function to convert bytes to base64url
        function uint8ArrayToBase64url(bytes: Uint8Array): string {
          const binaryString = String.fromCharCode(...bytes);
          const base64 = btoa(binaryString);
          // Convert base64 to base64url
          return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        }

        // Use conservative transport list for better cross-browser compatibility
        const transports: AuthenticatorTransport[] = ['internal', 'usb', 'ble', 'nfc'];

        allowCredentials = userAuthenticators.map(auth => {
          const credentialBytes = new Uint8Array(JSON.parse(auth.credential_id));
          return {
            id: uint8ArrayToBase64url(credentialBytes),
            type: 'public-key' as const,
            transports
          };
        })
      }
      // If no email provided, allow any credential (discoverable credentials)

      // Use browser preferences if provided
      const userVerification = body.browserPreferences?.userVerification || 'preferred';
      
      const options: GenerateAuthenticationOptionsOpts = {
        rpID,
        timeout: 60000,
        userVerification,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined
      }

      const authenticationOptions = await generateAuthenticationOptions(options)

      // Store challenge in database for verification
      if (userID) {
        await supabase
          .from('webauthn_challenges')
          .upsert({
            owner_id: userID,
            challenge: authenticationOptions.challenge,
            type: 'authentication',
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
          })
      } else {
        // For discoverable credentials, store challenge without owner_id
        await supabase
          .from('webauthn_challenges')
          .insert({
            owner_id: null,
            challenge: authenticationOptions.challenge,
            type: 'authentication',
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
          })
      }

      return new Response(
        JSON.stringify({
          options: authenticationOptions
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } else if (body.step === 'verify') {
      // Verify authentication response
      if (!body.response?.credential) {
        return new Response(
          JSON.stringify({ error: 'Invalid verification request' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const credentialID = body.response.credential.id

      // The credential.rawId from the response is base64url encoded
      // We need to decode it to bytes to match what's stored in the database
      const credentialRawId = body.response.credential.rawId

      // Helper function to decode base64url to bytes
      function base64urlToUint8Array(base64url: string): Uint8Array {
        // Convert base64url to base64
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        // Decode base64 to binary string
        const binaryString = atob(base64);
        // Convert binary string to Uint8Array
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }

      const credentialBytes = base64urlToUint8Array(credentialRawId);

      console.log('Looking up authenticator with credential_id:', JSON.stringify(Array.from(credentialBytes)))

      // Find authenticator by credential ID
      const { data: authenticator, error: authError } = await supabase
        .from('user_authenticators')
        .select('owner_id, credential_public_key, counter, credential_id')
        .eq('credential_id', JSON.stringify(Array.from(credentialBytes)))
        .single()

      if (authError) {
        console.error('Authenticator lookup error:', authError)
      }

      console.log('Found authenticator:', authenticator)

      if (!authenticator) {
        return new Response(
          JSON.stringify({ error: 'Passkey not recognized' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Get stored challenge
      const { data: challengeRecord } = await supabase
        .from('webauthn_challenges')
        .select('challenge')
        .or(`owner_id.eq.${authenticator.owner_id},owner_id.is.null`)
        .eq('type', 'authentication')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!challengeRecord) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired challenge' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Ensure counter is a number
      const counter = typeof authenticator.counter === 'number'
        ? authenticator.counter
        : (typeof authenticator.counter === 'string' ? parseInt(authenticator.counter, 10) : 0)

      console.log('Preparing verification with counter:', counter)

      // SimpleWebAuthn v12+ uses 'credential' instead of 'authenticator'
      // and the property names are different (id/publicKey instead of credentialID/credentialPublicKey)
      const opts: VerifyAuthenticationResponseOpts = {
        response: body.response.credential,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: new Uint8Array(JSON.parse(authenticator.credential_id || '[]')),
          publicKey: new Uint8Array(JSON.parse(authenticator.credential_public_key)),
          counter: counter,
          transports: ['internal'] // Default to internal for platform authenticators
        }
      }

      let verification
      try {
        verification = await verifyAuthenticationResponse(opts)
        console.log('Verification successful:', verification.verified)
      } catch (error) {
        console.error('Verification failed:', error)
        return new Response(
          JSON.stringify({
            error: 'Authentication verification failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      if (verification.verified) {
        // Update counter
        await supabase
          .from('user_authenticators')
          .update({
            counter: verification.authenticationInfo.newCounter,
            last_used_at: new Date().toISOString()
          })
          .eq('owner_id', authenticator.owner_id)
          .eq('credential_id', JSON.stringify(Array.from(credentialBytes)))

        // Clean up challenges
        await supabase
          .from('webauthn_challenges')
          .delete()
          .or(`owner_id.eq.${authenticator.owner_id},owner_id.is.null`)
          .eq('type', 'authentication')

        // Generate session token
        const { data: user } = await supabase.auth.admin.getUserById(authenticator.owner_id)
        
        if (!user?.user?.email) {
          return new Response(
            JSON.stringify({ error: 'User account not found' }), 
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: user.user.email,
        })

        if (sessionError || !sessionData) {
          return new Response(
            JSON.stringify({ error: 'Failed to create session' }), 
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        return new Response(
          JSON.stringify({
            verified: true,
            session: sessionData,
            user: {
              id: user.user.id,
              email: user.user.email
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Passkey authentication failed',
            verified: false 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }), 
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('WebAuthn authentication error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})