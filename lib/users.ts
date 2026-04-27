import { promises as fs } from "fs";
import path from "path";
import { dbQuery, isDatabaseEnabled } from "@/lib/db";

export type UserRole = "admin" | "editor";
export type AuthProvider = "local" | "google" | "microsoft";
export type UserStatus = "active" | "inactive";

export type UserRecord = {
  username: string;
  passwordHash: string | null;
  role: UserRole;
  email: string | null;
  authProvider: AuthProvider;
  providerSubject: string | null;
  schoolId: string | null;
  status: UserStatus;
};

function normalizeRole(role: string): UserRole {
  if (role === "admin") return "admin";
  return "editor";
}

function normalizeAuthProvider(v: string | null | undefined): AuthProvider {
  if (v === "google") return "google";
  if (v === "microsoft") return "microsoft";
  return "local";
}

function normalizeStatus(v: string | null | undefined): UserStatus {
  return v === "inactive" ? "inactive" : "active";
}

const usersFilePath = path.join(process.cwd(), "data", "users.json");

function canWriteLocalFiles() {
  return process.env.VERCEL !== "1";
}

async function ensureUsersFile() {
  if (!canWriteLocalFiles()) {
    return;
  }
  const dir = path.dirname(usersFilePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(usersFilePath);
  } catch {
    await fs.writeFile(usersFilePath, "[]", "utf-8");
  }
}

type JsonUserRow = {
  username: string;
  passwordHash?: string | null;
  role: string;
  email?: string | null;
  authProvider?: string;
  providerSubject?: string | null;
  schoolId?: string | null;
  status?: string;
};

function mapJsonUser(user: JsonUserRow): UserRecord {
  return {
    username: user.username,
    passwordHash: user.passwordHash ?? null,
    role: normalizeRole(user.role),
    email: user.email ?? null,
    authProvider: normalizeAuthProvider(user.authProvider),
    providerSubject: user.providerSubject ?? null,
    schoolId: user.schoolId ?? null,
    status: normalizeStatus(user.status),
  };
}

function mapDbUser(row: {
  username: string;
  password_hash: string | null;
  role: string;
  email: string | null;
  auth_provider: string;
  provider_subject: string | null;
  school_id: string | null;
  status: string;
}): UserRecord {
  return {
    username: row.username,
    passwordHash: row.password_hash,
    role: normalizeRole(row.role),
    email: row.email,
    authProvider: normalizeAuthProvider(row.auth_provider),
    providerSubject: row.provider_subject,
    schoolId: row.school_id,
    status: normalizeStatus(row.status),
  };
}

export async function getUsers(): Promise<UserRecord[]> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      username: string;
      password_hash: string | null;
      role: string;
      email: string | null;
      auth_provider: string;
      provider_subject: string | null;
      school_id: string | null;
      status: string;
    }>(
      `SELECT username, password_hash, role, email, auth_provider, provider_subject, school_id, status
       FROM users ORDER BY username ASC`,
    );
    return rows.map((row) => mapDbUser(row));
  }

  try {
    await ensureUsersFile();
    const raw = await fs.readFile(usersFilePath, "utf-8");
    const parsed = JSON.parse(raw) as JsonUserRow[];
    return parsed.map((user) => mapJsonUser(user));
  } catch {
    return [];
  }
}

export async function getUsersBySchoolId(schoolId: string): Promise<UserRecord[]> {
  const users = await getUsers();
  return users.filter((u) => u.schoolId === schoolId);
}

export async function findUserByUsername(username: string) {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      username: string;
      password_hash: string | null;
      role: string;
      email: string | null;
      auth_provider: string;
      provider_subject: string | null;
      school_id: string | null;
      status: string;
    }>(
      `SELECT username, password_hash, role, email, auth_provider, provider_subject, school_id, status
       FROM users WHERE username = $1`,
      [username],
    );
    const row = rows[0];
    if (!row) return null;
    return mapDbUser(row);
  }

  const users = await getUsers();
  return users.find((user) => user.username === username) ?? null;
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      username: string;
      password_hash: string | null;
      role: string;
      email: string | null;
      auth_provider: string;
      provider_subject: string | null;
      school_id: string | null;
      status: string;
    }>(
      `SELECT username, password_hash, role, email, auth_provider, provider_subject, school_id, status
       FROM users WHERE lower(email) = lower($1)`,
      [normalized],
    );
    const row = rows[0];
    if (!row) return null;
    return mapDbUser(row);
  }

  const users = await getUsers();
  return (
    users.find((u) => (u.email || "").toLowerCase() === normalized) ?? null
  );
}

export async function findUserByProviderAndSubject(
  provider: AuthProvider,
  sub: string,
) {
  if (!sub || provider === "local") return null;
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      username: string;
      password_hash: string | null;
      role: string;
      email: string | null;
      auth_provider: string;
      provider_subject: string | null;
      school_id: string | null;
      status: string;
    }>(
      `SELECT username, password_hash, role, email, auth_provider, provider_subject, school_id, status
       FROM users WHERE provider_subject = $1 AND auth_provider = $2`,
      [sub, provider],
    );
    const row = rows[0];
    if (!row) return null;
    return mapDbUser(row);
  }

  const users = await getUsers();
  return (
    users.find(
      (u) => u.providerSubject === sub && u.authProvider === provider,
    ) ?? null
  );
}

async function saveUsers(users: UserRecord[]) {
  if (!canWriteLocalFiles()) {
    throw new Error("USER_STORAGE_UNAVAILABLE");
  }
  await ensureUsersFile();
  const serial = users.map((u) => ({
    username: u.username,
    passwordHash: u.passwordHash,
    role: u.role,
    email: u.email,
    authProvider: u.authProvider,
    providerSubject: u.providerSubject,
    schoolId: u.schoolId,
    status: u.status,
  }));
  await fs.writeFile(usersFilePath, JSON.stringify(serial, null, 2), "utf-8");
}

export async function addUser(user: UserRecord) {
  if (isDatabaseEnabled()) {
    try {
      await dbQuery(
        `INSERT INTO users (
          username, password_hash, role, email, auth_provider, provider_subject, school_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.username,
          user.passwordHash,
          user.role,
          user.email,
          user.authProvider,
          user.providerSubject,
          user.schoolId,
          user.status,
        ],
      );
      return { ok: true as const };
    } catch {
      return { ok: false as const, reason: "exists" as const };
    }
  }

  const users = await getUsers();
  const exists = users.some((item) => item.username === user.username);
  if (exists) {
    return { ok: false as const, reason: "exists" as const };
  }
  users.push(user);
  await saveUsers(users);
  return { ok: true as const };
}

export async function updateUser(
  username: string,
  updates: Partial<
    Pick<
      UserRecord,
      | "passwordHash"
      | "role"
      | "email"
      | "authProvider"
      | "providerSubject"
      | "schoolId"
      | "status"
    >
  >,
) {
  if (isDatabaseEnabled()) {
    const fragments: string[] = [];
    const params: unknown[] = [username];
    let i = 2;
    if (updates.passwordHash !== undefined) {
      fragments.push(`password_hash = $${i++}`);
      params.push(updates.passwordHash);
    }
    if (updates.role !== undefined) {
      fragments.push(`role = $${i++}`);
      params.push(updates.role);
    }
    if (updates.email !== undefined) {
      fragments.push(`email = $${i++}`);
      params.push(updates.email);
    }
    if (updates.authProvider !== undefined) {
      fragments.push(`auth_provider = $${i++}`);
      params.push(updates.authProvider);
    }
    if (updates.providerSubject !== undefined) {
      fragments.push(`provider_subject = $${i++}`);
      params.push(updates.providerSubject);
    }
    if (updates.schoolId !== undefined) {
      fragments.push(`school_id = $${i++}`);
      params.push(updates.schoolId);
    }
    if (updates.status !== undefined) {
      fragments.push(`status = $${i++}`);
      params.push(updates.status);
    }

    if (fragments.length === 0) {
      return findUserByUsername(username);
    }

    const { rows } = await dbQuery<{
      username: string;
      password_hash: string | null;
      role: string;
      email: string | null;
      auth_provider: string;
      provider_subject: string | null;
      school_id: string | null;
      status: string;
    }>(
      `UPDATE users SET ${fragments.join(", ")}
       WHERE username = $1
       RETURNING username, password_hash, role, email, auth_provider, provider_subject, school_id, status`,
      params,
    );
    const row = rows[0];
    if (!row) return null;
    return mapDbUser(row);
  }

  const users = await getUsers();
  const index = users.findIndex((item) => item.username === username);
  if (index === -1) {
    return null;
  }

  const prev = users[index]!;
  users[index] = {
    ...prev,
    ...updates,
    schoolId:
      updates.schoolId === undefined ? prev.schoolId : updates.schoolId,
  };
  await saveUsers(users);
  return users[index];
}

export async function removeUser(username: string) {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      username: string;
      password_hash: string | null;
      role: string;
      email: string | null;
      auth_provider: string;
      provider_subject: string | null;
      school_id: string | null;
      status: string;
    }>(
      `DELETE FROM users WHERE username = $1
       RETURNING username, password_hash, role, email, auth_provider, provider_subject, school_id, status`,
      [username],
    );
    const row = rows[0];
    if (!row) return null;
    return mapDbUser(row);
  }

  const users = await getUsers();
  const removed = users.find((item) => item.username === username) ?? null;
  if (!removed) {
    return null;
  }

  const remaining = users.filter((item) => item.username !== username);
  await saveUsers(remaining);
  return removed;
}

export type UpsertOAuthUserInput = {
  email: string;
  sub: string;
  schoolId: string | null;
  role: UserRole;
};

/**
 * สร้างหรืออัปเดตผู้ใช้จาก OAuth (username = email ตัวพิมพ์เล็ก)
 */
export async function upsertOAuthUser(
  provider: Exclude<AuthProvider, "local">,
  input: UpsertOAuthUserInput,
): Promise<UserRecord> {
  const username = input.email.trim().toLowerCase();
  const email = username;

  const bySub = await findUserByProviderAndSubject(provider, input.sub);
  if (bySub) {
    await updateUser(bySub.username, {
      email,
      authProvider: provider,
      providerSubject: input.sub,
      schoolId: input.schoolId,
      role: input.role,
    });
    const updated = await findUserByUsername(bySub.username);
    if (updated) return updated;
  }

  const byEmail = await findUserByEmail(email);
  if (byEmail) {
    await updateUser(byEmail.username, {
      email,
      authProvider: provider,
      providerSubject: input.sub,
      schoolId: input.schoolId,
      role: input.role,
    });
    const updated = await findUserByUsername(byEmail.username);
    if (updated) return updated;
  }

  const created: UserRecord = {
    username,
    passwordHash: null,
    role: input.role,
    email,
    authProvider: provider,
    providerSubject: input.sub,
    schoolId: input.schoolId,
    status: "active",
  };

  const added = await addUser(created);
  if (!added.ok) {
    const again = await findUserByUsername(username);
    if (again) return again;
    throw new Error("OAUTH_USER_UPSERT_FAILED");
  }
  return created;
}

export type UpsertGoogleUserInput = UpsertOAuthUserInput;

/** @deprecated ใช้ upsertOAuthUser('google', input) */
export async function upsertGoogleUser(
  input: UpsertGoogleUserInput,
): Promise<UserRecord> {
  return upsertOAuthUser("google", input);
}
