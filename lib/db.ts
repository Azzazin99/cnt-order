import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";
import type { QueryResultRow } from "pg";

type DocumentSeed = {
  id: string;
  issuedAt: string;
  orderNo: string;
  title: string;
  department: string;
  orderDate: string;
  fileUrl: string;
  schoolId?: string | null;
};

type UserSeed = {
  username: string;
  passwordHash: string;
  role: "admin" | "editor" | "viewer";
};

type AuditSeed = {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
};

type SchoolSeed = {
  id: string;
  name: string;
  status?: "active" | "inactive";
};

type SchoolDomainSeed = {
  id: string;
  schoolId: string;
  domain: string;
  isVerified?: boolean;
  isPrimary?: boolean;
};

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
const shouldAutoSeed =
  process.env.DB_AUTO_SEED === "1" ||
  (!process.env.VERCEL && process.env.NODE_ENV !== "production");

let initialized = false;
let initializing: Promise<void> | null = null;
let migrationPromise: Promise<void> | null = null;

export function isDatabaseEnabled() {
  return Boolean(pool);
}

async function readJsonFile<T>(targetPath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(targetPath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function seedFromJsonFiles() {
  if (!pool) return;

  const base = process.cwd();
  const documentsPath = path.join(base, "data", "documents.json");
  const usersPath = path.join(base, "data", "users.json");
  const auditPath = path.join(base, "data", "audit-log.json");

  const [{ rows: documentRows }, { rows: userRows }, { rows: auditRows }] =
    await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM documents"),
      pool.query("SELECT COUNT(*)::int AS count FROM users"),
      pool.query("SELECT COUNT(*)::int AS count FROM audit_logs"),
    ]);

  if (documentRows[0].count === 0) {
    const docs = await readJsonFile<DocumentSeed[]>(documentsPath, []);
    for (const doc of docs) {
      await pool.query(
        `INSERT INTO documents
          (id, issued_at, order_no, title, department, order_date, file_url, school_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          doc.id,
          doc.issuedAt,
          doc.orderNo,
          doc.title,
          doc.department,
          doc.orderDate,
          doc.fileUrl,
          doc.schoolId ?? null,
        ],
      );
    }
  }

  if (userRows[0].count === 0) {
    const users = await readJsonFile<UserSeed[]>(usersPath, []);
    for (const user of users) {
      const normalizedRole = user.role === "admin" ? "admin" : "editor";
      await pool.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (username) DO NOTHING`,
        [user.username, user.passwordHash, normalizedRole],
      );
    }
  }

  if (auditRows[0].count === 0) {
    const logs = await readJsonFile<AuditSeed[]>(auditPath, []);
    for (const log of logs) {
      await pool.query(
        `INSERT INTO audit_logs (id, action, detail, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [log.id, log.action, log.detail, log.createdAt],
      );
    }
  }
}

async function seedSchoolsFromJsonIfEmpty(client: Pool) {
  const base = process.cwd();
  const schoolsPath = path.join(base, "data", "schools.json");
  const domainsPath = path.join(base, "data", "school_domains.json");

  const { rows: schoolRows } = await client.query(
    "SELECT COUNT(*)::int AS count FROM schools",
  );
  if (schoolRows[0].count > 0) return;

  const schoolSeeds = await readJsonFile<SchoolSeed[]>(schoolsPath, []);
  for (const s of schoolSeeds) {
    await client.query(
      `INSERT INTO schools (id, name, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.name, s.status === "inactive" ? "inactive" : "active"],
    );
  }
  const domainSeeds = await readJsonFile<SchoolDomainSeed[]>(domainsPath, []);
  for (const d of domainSeeds) {
    const domain = d.domain.trim().toLowerCase();
    if (!domain) continue;
    await client.query(
      `INSERT INTO school_domains (id, school_id, domain, is_verified, is_primary)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id,
        d.schoolId,
        domain,
        d.isVerified !== false,
        d.isPrimary === true,
      ],
    );
  }
}

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return code === "42P01";
}

async function runSchemaMigrations(client: Pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS school_domains (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      domain TEXT NOT NULL UNIQUE,
      is_verified BOOLEAN NOT NULL DEFAULT true,
      is_primary BOOLEAN NOT NULL DEFAULT false
    );
  `);

  await client.query(`
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS school_id TEXT
      REFERENCES schools(id) ON DELETE SET NULL;
  `);

  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
  `);
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local';
  `);
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_subject TEXT;
  `);
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id TEXT
      REFERENCES schools(id) ON DELETE SET NULL;
  `);
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
  `);

  await client
    .query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`)
    .catch(() => {
      /* already nullable */
    });

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
    ON users (lower(email)) WHERE email IS NOT NULL;
  `);
  await client.query(`DROP INDEX IF EXISTS idx_users_provider_subject`);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider_subject
    ON users (auth_provider, provider_subject)
    WHERE provider_subject IS NOT NULL;
  `);
}

async function ensureMigrationsOnce() {
  if (!pool) return;
  if (!migrationPromise) {
    migrationPromise = (async () => {
      await runSchemaMigrations(pool);
      if (shouldAutoSeed) {
        await seedSchoolsFromJsonIfEmpty(pool);
      }
    })();
  }
  await migrationPromise;
}

async function ensureInitialized() {
  if (!pool || initialized) return;
  if (initializing) {
    await initializing;
    return;
  }

  initializing = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        issued_at TEXT NOT NULL,
        order_no TEXT NOT NULL,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        order_date TEXT NOT NULL,
        file_url TEXT NOT NULL,
        sort_id BIGSERIAL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'editor'))
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        detail TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sort_id BIGSERIAL
      );
    `);

    await runSchemaMigrations(pool);
    if (shouldAutoSeed) {
      await seedSchoolsFromJsonIfEmpty(pool);
    }

    if (shouldAutoSeed) {
      await seedFromJsonFiles();
    }
    initialized = true;
  })();

  await initializing;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await ensureMigrationsOnce();

  // Fast path: run queries immediately to avoid heavy init on every cold start.
  // Only run schema initialization if a table is actually missing.
  try {
    return await pool.query<T>(text, params);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  await ensureInitialized();
  return pool.query<T>(text, params);
}
