-- Optional manual migration (แอปจะรัน schema อัตโนมัติเมื่อเชื่อม DATABASE_URL แล้ว)
-- อ้างอิง logic ใน lib/db.ts runSchemaMigrations

ALTER TABLE schools ADD COLUMN IF NOT EXISTS moe_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_moe_code
  ON schools (moe_code) WHERE moe_code IS NOT NULL;
