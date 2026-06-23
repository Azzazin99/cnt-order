import { promises as fs } from "fs";
import path from "path";
import { dbQuery, isDatabaseEnabled } from "@/lib/db";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "AUTH_LOGIN_GOOGLE"
  | "AUTH_LOGIN_MICROSOFT"
  | "AUTH_LOGIN_LINE"
  | "AUTH_DENY_DOMAIN"
  | "AUTH_LINK_ACCOUNT";

export type AuditEntry = {
  id: string;
  action: AuditAction;
  detail: string;
  createdAt: string;
};

const auditFilePath = path.join(process.cwd(), "data", "audit-log.json");

function canWriteLocalFiles() {
  // Vercel serverless runtime has a read-only filesystem outside /tmp.
  return process.env.VERCEL !== "1";
}

async function ensureAuditFile() {
  const dir = path.dirname(auditFilePath);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(auditFilePath);
  } catch {
    await fs.writeFile(auditFilePath, "[]", "utf-8");
  }
}

export async function getAuditLogs(limit = 50) {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      id: string;
      action: AuditAction;
      detail: string;
      created_at: string;
    }>(
      `SELECT id, action, detail, created_at
       FROM audit_logs
       ORDER BY sort_id DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map((row: (typeof rows)[number]) => ({
      id: row.id,
      action: row.action,
      detail: row.detail,
      createdAt: row.created_at,
    }));
  }

  if (!canWriteLocalFiles()) {
    return [];
  }

  try {
    await ensureAuditFile();
    const raw = await fs.readFile(auditFilePath, "utf-8");
    const parsed = JSON.parse(raw) as AuditEntry[];
    return parsed.slice(0, limit);
  } catch {
    return [];
  }
}

export async function writeAuditLog(action: AuditAction, detail: string) {
  if (isDatabaseEnabled()) {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      action,
      detail,
      createdAt: new Date().toLocaleString("th-TH"),
    };
    await dbQuery(
      `INSERT INTO audit_logs (id, action, detail, created_at)
       VALUES ($1, $2, $3, $4)`,
      [entry.id, entry.action, entry.detail, entry.createdAt],
    );
    return entry;
  }

  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    action,
    detail,
    createdAt: new Date().toLocaleString("th-TH"),
  };

  if (!canWriteLocalFiles()) {
    return entry;
  }

  try {
    await ensureAuditFile();
    const raw = await fs.readFile(auditFilePath, "utf-8");
    const parsed = JSON.parse(raw) as AuditEntry[];
    parsed.unshift(entry);
    await fs.writeFile(auditFilePath, JSON.stringify(parsed, null, 2), "utf-8");
  } catch {
    // Keep auth/document actions working even if audit persistence fails.
  }

  return entry;
}
