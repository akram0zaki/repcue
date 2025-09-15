-- Fix handle_new_user function to match production profiles schema
-- Production has 'id' primary key, not 'owner_id' and different column structure

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Insert into production profiles schema (id, email, display_name, etc.)
    INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NEW.email, NOW(), NOW());

    RETURN NEW;
END;
$function$;