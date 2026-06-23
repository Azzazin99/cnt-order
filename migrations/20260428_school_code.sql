-- Optional manual migration (แอปจะรัน schema อัตโนมัติเมื่อเชื่อม DATABASE_URL แล้ว)
-- อ้างอิง logic ใน lib/db.ts runSchemaMigrations

ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_school_code_lower
  ON schools (lower(school_code)) WHERE school_code IS NOT NULL;
