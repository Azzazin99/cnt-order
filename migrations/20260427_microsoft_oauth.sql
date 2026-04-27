-- Optional manual migration (แอปจะรัน schema อัตโนมัติเมื่อเชื่อม DATABASE_URL แล้ว)
-- อ้างอิง logic ใน lib/db.ts runSchemaMigrations
-- Microsoft OAuth: auth_provider รองรับค่า 'microsoft'; ดัชนี unique ต่อคู่ (provider, subject)

DROP INDEX IF EXISTS idx_users_provider_subject;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider_subject
  ON users (auth_provider, provider_subject)
  WHERE provider_subject IS NOT NULL;
