-- Add columns to track shared exercises
-- This allows us to identify exercises that were copied from shares
-- and maintain the relationship to the original creator

ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS shared_from_exercise_id uuid REFERENCES exercises(id),
ADD COLUMN IF NOT EXISTS shared_from_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_shared_copy boolean DEFAULT false;

-- Add index for efficient querying of shared exercises
CREATE INDEX IF NOT EXISTS idx_exercises_shared_from_exercise_id ON exercises(shared_from_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercises_shared_from_user_id ON exercises(shared_from_user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_is_shared_copy ON exercises(is_shared_copy);

-- Add comment to document the purpose
COMMENT ON COLUMN exercises.shared_from_exercise_id IS 'Reference to the original exercise this was copied from via sharing';
COMMENT ON COLUMN exercises.shared_from_user_id IS 'ID of the user who originally created the shared exercise';
COMMENT ON COLUMN exercises.is_shared_copy IS 'Flag indicating this exercise was copied from a share';