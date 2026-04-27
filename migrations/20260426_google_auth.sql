-- Optional manual migration (แอปจะรัน schema อัตโนมัติเมื่อเชื่อม DATABASE_URL แล้ว)
-- อ้างอิง logic ใน lib/db.ts runSchemaMigrations

CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS school_domains (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS school_id TEXT
  REFERENCES schools(id) ON DELETE SET NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_subject TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id TEXT
  REFERENCES schools(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
  ON users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_subject
  ON users (provider_subject) WHERE provider_subject IS NOT NULL;
