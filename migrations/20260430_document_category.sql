ALTER TABLE documents ADD COLUMN IF NOT EXISTS category TEXT;
UPDATE documents SET category = 'others' WHERE category IS NULL;
ALTER TABLE documents ALTER COLUMN category SET NOT NULL;
ALTER TABLE documents DROP COLUMN IF EXISTS department;
