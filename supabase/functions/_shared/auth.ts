import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function validateJWT(jwt: string): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data: { user }, error } = await supabase.auth.getUser(jwt)
    
    if (error || !user) {
      console.error('JWT validation error:', error)
      return null
    }
    
    return user.id
  } catch (error) {
    console.error('JWT validation failed:', error)
    return null
  }
}