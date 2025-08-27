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
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(body.email)
      
      let userID: string
      if (existingUser?.user) {
        userID = existingUser.user.id
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
        .eq('user_id', userID)

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

      const options: GenerateRegistrationOptionsOpts = {
        rpName,
        rpID,
        userID: new TextEncoder().encode(userID),
        userName: body.email,
        userDisplayName: body.email.split('@')[0],
        timeout: 60000,
        attestationType: 'none',
        excludeCredentials: existingAuthenticators?.map(auth => ({
          id: new Uint8Array(JSON.parse(auth.credential_id)),
          type: 'public-key',
          transports
        })) || [],
        authenticatorSelection
      }

      const registrationOptions = await generateRegistrationOptions(options)

      // Store challenge in database for verification
      await supabase
        .from('webauthn_challenges')
        .upsert({
          user_id: userID,
          challenge: registrationOptions.challenge,
          type: 'registration',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        })

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
      const { data: challengeRecord } = await supabase
        .from('webauthn_challenges')
        .select('challenge')
        .eq('user_id', userID)
        .eq('type', 'registration')
        .gt('expires_at', new Date().toISOString())
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

      const opts: VerifyRegistrationResponseOpts = {
        response: body.response.credential,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      }

      const verification = await verifyRegistrationResponse(opts)

      if (verification.verified && verification.registrationInfo) {
        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

        // Store authenticator
        await supabase
          .from('user_authenticators')
          .insert({
            user_id: userID,
            credential_id: JSON.stringify(Array.from(credentialID)),
            credential_public_key: JSON.stringify(Array.from(credentialPublicKey)),
            counter,
            created_at: new Date().toISOString()
          })

        // Clean up challenge
        await supabase
          .from('webauthn_challenges')
          .delete()
          .eq('user_id', userID)
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