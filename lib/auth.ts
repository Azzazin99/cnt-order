import { cookies } from "next/headers";
import { compare } from "bcryptjs";
import { findUserByUsername, type UserRole } from "@/lib/users";
import {
  createSessionPayload,
  isLegacyStaticSessionToken,
  signSessionPayload,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session";

export const SESSION_COOKIE_NAME = "go_admin_session";
export const ADMIN_USER_COOKIE_NAME = "go_admin_user";
export const ADMIN_ROLE_COOKIE_NAME = "go_admin_role";
export const ADMIN_SCHOOL_COOKIE_NAME = "go_admin_school";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "admin1234";
}

export function getAdminUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

function getAdminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH || "";
}

export function isLocalLoginEnabled() {
  return process.env.ENABLE_LOCAL_LOGIN !== "false";
}

export async function validateAdminCredentials(
  username: string,
  password: string,
) {
  const user = await findUserByUsername(username);
  if (user) {
    if (!user.passwordHash) {
      return null;
    }
    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      return null;
    }
    if (user.status === "inactive") {
      return null;
    }
    return {
      username: user.username,
      role: user.role,
      schoolId: user.schoolId,
    };
  }

  const validUsername = username === getAdminUsername();
  if (!validUsername) {
    return null;
  }

  const hash = getAdminPasswordHash();
  if (hash) {
    const ok = await compare(password, hash);
    return ok
      ? { username, role: "admin" as UserRole, schoolId: null as string | null }
      : null;
  }

  const ok = password === getAdminPassword();
  return ok
    ? { username, role: "admin" as UserRole, schoolId: null as string | null }
    : null;
}

async function readSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const signed = await verifySessionToken(raw);
  if (signed) return signed;

  if (isLegacyStaticSessionToken(raw)) {
    const username = cookieStore.get(ADMIN_USER_COOKIE_NAME)?.value;
    const role = cookieStore.get(ADMIN_ROLE_COOKIE_NAME)?.value;
    const schoolRaw = cookieStore.get(ADMIN_SCHOOL_COOKIE_NAME)?.value;
    if (!username || (role !== "admin" && role !== "editor")) {
      return null;
    }
    return {
      v: 1,
      username,
      role,
      schoolId:
        schoolRaw === "" || schoolRaw === undefined
          ? null
          : schoolRaw === "null"
            ? null
            : schoolRaw,
      exp: Math.floor(Date.now() / 1000) + 86400 * 365,
    };
  }

  return null;
}

export async function isAuthenticated() {
  const session = await readSessionPayload();
  return session !== null;
}

export async function getSession(): Promise<SessionPayload | null> {
  return readSessionPayload();
}

export async function getCurrentAdminUsername() {
  const session = await readSessionPayload();
  return session?.username || "unknown";
}

export async function getCurrentAdminRole(): Promise<UserRole | "unknown"> {
  const session = await readSessionPayload();
  if (!session) return "unknown";
  return session.role;
}

export async function getCurrentSchoolId(): Promise<string | null> {
  const session = await readSessionPayload();
  return session?.schoolId ?? null;
}

/** แอดมินระดับเขต/ส่วนกลาง (schoolId เป็น null) */
export async function isPlatformAdmin() {
  const session = await readSessionPayload();
  return Boolean(session && session.role === "admin" && session.schoolId === null);
}

export async function hasRole(allowedRoles: UserRole[]) {
  const session = await readSessionPayload();
  if (!session) return false;
  return allowedRoles.includes(session.role);
}

export async function createSignedSessionValue(
  username: string,
  role: UserRole,
  schoolId: string | null,
) {
  const payload = createSessionPayload(username, role, schoolId);
  return signSessionPayload(payload);
}

export async function applySessionCookies(
  response: import("next/server").NextResponse,
  username: string,
  role: UserRole,
  schoolId: string | null,
) {
  const maxAge = 60 * 60 * 12;
  const token = await createSignedSessionValue(username, role, schoolId);
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
  response.cookies.set({ name: SESSION_COOKIE_NAME, value: token, ...base });
  response.cookies.set({ name: ADMIN_USER_COOKIE_NAME, value: username, ...base });
  response.cookies.set({ name: ADMIN_ROLE_COOKIE_NAME, value: role, ...base });
  response.cookies.set({
    name: ADMIN_SCHOOL_COOKIE_NAME,
    value: schoolId ?? "",
    ...base,
  });
}

export function clearSessionCookies(
  response: import("next/server").NextResponse,
) {
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  response.cookies.set({ name: SESSION_COOKIE_NAME, value: "", ...base });
  response.cookies.set({ name: ADMIN_USER_COOKIE_NAME, value: "", ...base });
  response.cookies.set({ name: ADMIN_ROLE_COOKIE_NAME, value: "", ...base });
  response.cookies.set({ name: ADMIN_SCHOOL_COOKIE_NAME, value: "", ...base });
}

export function parsePlatformAdminEmails() {
  const legacy = process.env.PLATFORM_GOOGLE_ADMIN_EMAILS || "";
  const unified = process.env.PLATFORM_OAUTH_ADMIN_EMAILS || "";
  const merged = `${legacy},${unified}`;
  const set = new Set<string>();
  for (const part of merged.split(",")) {
    const e = part.trim().toLowerCase();
    if (e) set.add(e);
  }
  return [...set];
}
