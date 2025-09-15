-- Create profiles for existing users who don't have them
-- This handles users who signed up before the profile creation trigger was in place

INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
SELECT
    u.id,
    u.email,
    u.email as display_name,
    u.created_at,
    NOW() as updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;