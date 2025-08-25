import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse,
  type GenerateAuthenticationOptionsOpts,
  type VerifyAuthenticationResponseOpts
} from 'https://esm.sh/@simplewebauthn/server@12.0.0'

const rpID = 'localhost' // Change to actual domain in production
const origin = ['http://localhost:5173', 'http://localhost:5174'] // Add production URLs

interface AuthenticationRequest {
  step: 'challenge' | 'verify';
  email?: string;
  response?: any; // WebAuthn credential response
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
    const body = await req.json() as AuthenticationRequest

    if (body.step === 'challenge') {
      // Generate authentication challenge
      let allowCredentials: any[] = []
      let userID: string | undefined

      if (body.email) {
        // Email provided - get specific user's credentials
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(body.email)
        
        if (!existingUser?.user) {
          return new Response(
            JSON.stringify({ error: 'No account found with this email' }), 
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        userID = existingUser.user.id

        // Get user's authenticators
        const { data: userAuthenticators } = await supabase
          .from('user_authenticators')
          .select('credential_id')
          .eq('user_id', userID)

        if (!userAuthenticators || userAuthenticators.length === 0) {
          return new Response(
            JSON.stringify({ error: 'No passkeys found for this account' }), 
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        allowCredentials = userAuthenticators.map(auth => ({
          id: new Uint8Array(JSON.parse(auth.credential_id)),
          type: 'public-key',
          transports: ['usb', 'ble', 'nfc', 'internal'] as AuthenticatorTransport[]
        }))
      }
      // If no email provided, allow any credential (discoverable credentials)

      const options: GenerateAuthenticationOptionsOpts = {
        rpID,
        timeout: 60000,
        userVerification: 'preferred',
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined
      }

      const authenticationOptions = await generateAuthenticationOptions(options)

      // Store challenge in database for verification
      if (userID) {
        await supabase
          .from('webauthn_challenges')
          .upsert({
            user_id: userID,
            challenge: authenticationOptions.challenge,
            type: 'authentication',
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
          })
      } else {
        // For discoverable credentials, store challenge without user_id
        await supabase
          .from('webauthn_challenges')
          .insert({
            user_id: null,
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
      
      // Find authenticator by credential ID
      const { data: authenticator } = await supabase
        .from('user_authenticators')
        .select('user_id, credential_public_key, counter')
        .eq('credential_id', JSON.stringify(Array.from(new Uint8Array(credentialID))))
        .single()

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
        .or(`user_id.eq.${authenticator.user_id},user_id.is.null`)
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

      const opts: VerifyAuthenticationResponseOpts = {
        response: body.response.credential,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: new Uint8Array(JSON.parse(authenticator.credential_id || '[]')),
          credentialPublicKey: new Uint8Array(JSON.parse(authenticator.credential_public_key)),
          counter: authenticator.counter || 0
        }
      }

      const verification = await verifyAuthenticationResponse(opts)

      if (verification.verified) {
        // Update counter
        await supabase
          .from('user_authenticators')
          .update({ 
            counter: verification.authenticationInfo.newCounter,
            last_used_at: new Date().toISOString()
          })
          .eq('user_id', authenticator.user_id)
          .eq('credential_id', JSON.stringify(Array.from(new Uint8Array(credentialID))))

        // Clean up challenges
        await supabase
          .from('webauthn_challenges')
          .delete()
          .or(`user_id.eq.${authenticator.user_id},user_id.is.null`)
          .eq('type', 'authentication')

        // Generate session token
        const { data: user } = await supabase.auth.admin.getUserById(authenticator.user_id)
        
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