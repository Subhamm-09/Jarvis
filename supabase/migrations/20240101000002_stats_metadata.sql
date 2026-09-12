ALTER TABLE stats ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
