-- Function to automatically create a profile when a user signs up
-- This is triggered by auth.users events

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, 'Anonymous User'),
    NOW(),
    NOW()
  );
  
  -- Also create an initial sync cursor
  INSERT INTO public.sync_cursors (user_id, last_ack_cursor, created_at, updated_at)
  VALUES (
    NEW.id,
    NULL,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();