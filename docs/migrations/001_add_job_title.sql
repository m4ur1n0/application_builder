-- Migration: Add job_title column to contributions table
-- Execute this in the D1 console for your database

-- Add job_title column (nullable for backward compatibility with existing data)
ALTER TABLE contributions ADD COLUMN job_title TEXT;

-- Optionally update existing rows with a default value
-- UPDATE contributions SET job_title = 'Uncategorized' WHERE job_title IS NULL;

-- Future contributions should always include job_title
-- The API should validate this field is provided on creation
