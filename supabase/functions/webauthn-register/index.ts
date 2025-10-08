import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse,
  type GenerateRegistrationOptionsOpts,
  type VerifyRegistrationResponseOpts
} from 'https://esm.sh/@simplewebauthn/server@12.0.0'

const rpName = 'RepCue Fitness'
const rpID = 'localhost' // Change to actual domain in production
const origin = ['http://localhost:5173', 'http://localhost:5174'] // Add production URLs

interface RegistrationRequest {
  step: 'challenge' | 'verify';
  email?: string;
  response?: any; // WebAuthn credential response
  browserPreferences?: {
    userVerification: 'required' | 'preferred' | 'discouraged';
    residentKey: 'required' | 'preferred' | 'discouraged';
    authenticatorAttachment?: 'platform' | 'cross-platform';
  };
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
    const body = await req.json() as RegistrationRequest

    if (body.step === 'challenge') {
      // Generate registration challenge
      if (!body.email) {
        return new Response(
          JSON.stringify({ error: 'Email required for challenge generation' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(user => user.email === body.email)

      let userID: string
      if (existingUser) {
        userID = existingUser.id
      } else {
        // Create new user for passkey registration
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: body.email,
          email_confirm: true // Auto-confirm for passkey users
        })
        
        if (createError || !newUser?.user) {
          return new Response(
            JSON.stringify({ error: 'Failed to create user account' }), 
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        userID = newUser.user.id
      }

      // Get existing authenticators for this user
      const { data: existingAuthenticators } = await supabase
        .from('user_authenticators')
        .select('credential_id, credential_public_key, counter')
        .eq('owner_id', userID)

      console.log('Found existing authenticators:', existingAuthenticators?.length || 0)

      // Check if user already has a passkey registered
      if (existingAuthenticators && existingAuthenticators.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Passkey already registered',
            message: 'You already have a passkey registered for this account. Please sign in using your existing passkey.'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Use browser preferences if provided, otherwise use safe defaults
      const prefs = body.browserPreferences || {
        userVerification: 'preferred',
        residentKey: 'preferred'
      };

      // Build authenticator selection based on browser preferences
      const authenticatorSelection: {
        userVerification: 'required' | 'preferred' | 'discouraged';
        residentKey: 'required' | 'preferred' | 'discouraged';
        authenticatorAttachment?: 'platform' | 'cross-platform';
      } = {
        userVerification: prefs.userVerification,
        residentKey: prefs.residentKey
      };

      if (prefs.authenticatorAttachment) {
        authenticatorSelection.authenticatorAttachment = prefs.authenticatorAttachment;
      }

      // Use conservative transport list for better cross-browser compatibility
      const transports: AuthenticatorTransport[] = prefs.authenticatorAttachment === 'platform'
        ? ['internal']
        : ['usb', 'ble', 'nfc', 'internal'];

      // Helper function to convert byte array to base64url
      function arrayToBase64url(array: number[]): string {
        const bytes = new Uint8Array(array);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        // Convert base64 to base64url
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      }

      // Build excludeCredentials array safely
      // SimpleWebAuthn v12+ expects credential IDs as base64url strings, not Uint8Arrays
      const excludeCredentials = existingAuthenticators?.map((auth: { credential_id: string }) => {
        try {
          const credIdArray = JSON.parse(auth.credential_id);
          return {
            id: arrayToBase64url(credIdArray), // base64url string, not Uint8Array
            transports
          };
        } catch (error) {
          console.error('Failed to parse credential_id:', auth.credential_id, error);
          return null;
        }
      }).filter((cred: { id: string; transports: AuthenticatorTransport[] } | null): cred is { id: string; transports: AuthenticatorTransport[] } => cred !== null) || [];

      console.log('Exclude credentials count:', excludeCredentials.length)

      const options: GenerateRegistrationOptionsOpts = {
        rpName,
        rpID,
        userID: new TextEncoder().encode(userID),
        userName: body.email,
        userDisplayName: body.email.split('@')[0],
        timeout: 60000,
        attestationType: 'none',
        excludeCredentials,
        authenticatorSelection
      }

      const registrationOptions = await generateRegistrationOptions(options)

      // Store challenge in database for verification
      // First delete any existing registration challenges for this user
      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('owner_id', userID)
        .eq('type', 'registration')

      // Insert new challenge
      const { error: challengeError } = await supabase
        .from('webauthn_challenges')
        .insert({
          owner_id: userID,
          challenge: registrationOptions.challenge,
          type: 'registration',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        })

      if (challengeError) {
        console.error('Failed to store challenge:', challengeError)
        return new Response(
          JSON.stringify({ error: 'Failed to store challenge' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({
          options: registrationOptions,
          userID
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } else if (body.step === 'verify') {
      // Verify registration response
      const userID = body.response?.userID
      if (!userID || !body.response?.credential) {
        return new Response(
          JSON.stringify({ error: 'Invalid verification request' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get stored challenge
      const now = new Date().toISOString()
      console.log('Looking up challenge for userID:', userID, 'at time:', now)

      const { data: challengeRecord, error: lookupError } = await supabase
        .from('webauthn_challenges')
        .select('challenge, expires_at')
        .eq('owner_id', userID)
        .eq('type', 'registration')
        .gt('expires_at', now)
        .single()

      if (lookupError) {
        console.error('Challenge lookup error:', lookupError)
      }

      if (!challengeRecord) {
        // Try to see if there are any challenges at all for this user
        const { data: allChallenges } = await supabase
          .from('webauthn_challenges')
          .select('*')
          .eq('owner_id', userID)

        console.log('No valid challenge found. All challenges for user:', allChallenges)

        return new Response(
          JSON.stringify({
            error: 'Invalid or expired challenge',
            debug: { userID, allChallenges, lookupError: lookupError?.message }
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log('Challenge found, expires at:', challengeRecord.expires_at)

      // SimpleWebAuthn expects the credential response in RegistrationResponseJSON format
      // The client already sends it in the correct format from startRegistration()
      // We just need to pass it directly

      // Use the origin array directly - SimpleWebAuthn will validate against it
      const opts: VerifyRegistrationResponseOpts = {
        response: body.response.credential,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: origin, // Use origin array
        expectedRPID: rpID,
      }

      let verification
      try {
        console.log('Calling verifyRegistrationResponse with opts:', {
          hasResponse: !!opts.response,
          expectedChallenge: opts.expectedChallenge,
          expectedOrigin: opts.expectedOrigin,
          expectedRPID: opts.expectedRPID
        })
        verification = await verifyRegistrationResponse(opts)
        console.log('Verification result:', {
          verified: verification.verified,
          hasRegistrationInfo: !!verification.registrationInfo,
          registrationInfo: verification.registrationInfo
        })
      } catch (error) {
        console.error('Verification error:', error)
        console.error('Credential structure:', JSON.stringify(body.response.credential))
        return new Response(
          JSON.stringify({
            error: 'Passkey verification failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error instanceof Error ? error.stack : undefined
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      console.log('Verification completed. verified:', verification.verified, 'hasRegistrationInfo:', !!verification.registrationInfo)

      if (verification.verified && verification.registrationInfo) {
        // SimpleWebAuthn v12+ returns credential data in a nested structure
        const { credential } = verification.registrationInfo

        if (!credential?.publicKey) {
          console.error('Missing credential data:', verification.registrationInfo)
          return new Response(
            JSON.stringify({
              error: 'Invalid credential data',
              details: 'Missing credential.publicKey'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }

        // Decode the credential ID from base64url
        const credentialIdBase64url = credential.id
        // Convert base64url to base64
        const credentialIdBase64 = credentialIdBase64url.replace(/-/g, '+').replace(/_/g, '/')
        // Decode to binary string
        const credentialIdBinary = atob(credentialIdBase64)
        // Convert to byte array
        const credentialIdBytes = new Uint8Array(credentialIdBinary.length)
        for (let i = 0; i < credentialIdBinary.length; i++) {
          credentialIdBytes[i] = credentialIdBinary.charCodeAt(i)
        }

        // Store authenticator
        await supabase
          .from('user_authenticators')
          .insert({
            owner_id: userID,
            credential_id: JSON.stringify(Array.from(credentialIdBytes)),
            credential_public_key: JSON.stringify(Array.from(credential.publicKey)),
            counter: credential.counter,
            created_at: new Date().toISOString()
          })

        // Clean up challenge
        await supabase
          .from('webauthn_challenges')
          .delete()
          .eq('owner_id', userID)
          .eq('type', 'registration')

        // Generate session token
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: (await supabase.auth.admin.getUserById(userID)).data.user?.email || '',
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
            session: sessionData
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Passkey verification failed',
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
    console.error('WebAuthn registration error:', error)
    
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