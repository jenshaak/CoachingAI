-- SQL query to add metadata column to threads table
ALTER TABLE IF EXISTS threads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;
