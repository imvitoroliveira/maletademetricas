/*
  # Add display_name column to profiles

  1. Modified Tables
    - `profiles`
      - Added `display_name` (text, nullable) column for user display names
  
  2. Security
    - No RLS changes needed; existing policies already cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN display_name text;
  END IF;
END $$;
