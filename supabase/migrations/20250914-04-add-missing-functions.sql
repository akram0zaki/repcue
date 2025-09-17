-- Add missing functions that exist in dev but not in production
-- This ensures full parity between development and production databases

-- Function to cleanup expired WebAuthn challenges
CREATE OR REPLACE FUNCTION public.cleanup_expired_challenges()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    DELETE FROM public.webauthn_challenges
    WHERE expires_at < NOW();
END;
$function$;