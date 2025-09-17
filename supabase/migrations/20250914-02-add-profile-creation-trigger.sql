-- Add missing profile creation function and trigger
-- This ensures profiles are automatically created when users sign up

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NEW.email, NOW(), NOW());

    RETURN NEW;
END;
$function$;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();