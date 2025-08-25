-- Seed data for RepCue
-- This includes default exercises available to all users

-- Insert default exercises (available to everyone with owner_id = NULL)
INSERT INTO exercises (
  id,
  name,
  category,
  exercise_type,
  description,
  rep_duration_seconds,
  is_favorite,
  owner_id,
  created_at,
  updated_at,
  deleted,
  version
) VALUES 
  (
    'ex_pushups_default',
    'Push-ups',
    'strength',
    'rep',
    'Classic upper body exercise targeting chest, shoulders, and triceps',
    2,
    false,
    NULL,
    NOW(),
    NOW(),
    false,
    1
  ),
  (
    'ex_plank_default',
    'Plank',
    'core',
    'duration',
    'Core strengthening exercise for stability and endurance',
    NULL,
    false,
    NULL,
    NOW(),
    NOW(),
    false,
    1
  ),
  (
    'ex_jumping_jacks_default',
    'Jumping Jacks',
    'cardio',
    'rep',
    'Full-body cardio exercise to get your heart rate up',
    1,
    false,
    NULL,
    NOW(),
    NOW(),
    false,
    1
  ),
  (
    'ex_burpees_default',
    'Burpees',
    'cardio',
    'rep',
    'High-intensity full-body exercise combining squat, plank, and jump',
    4,
    false,
    NULL,
    NOW(),
    NOW(),
    false,
    1
  ),
  (
    'ex_bicycle_crunches_default',
    'Bicycle Crunches',
    'core',
    'rep',
    'Core exercise targeting obliques and rectus abdominis',
    2,
    false,
    NULL,
    NOW(),
    NOW(),
    false,
    1
  );

-- You can add more default exercises here as needed