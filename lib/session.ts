import type { UserRole } from "@/lib/users";

export type SessionPayload = {
  v: 1;
  username: string;
  role: UserRole;
  /** null = platform (เขต/ส่วนกลาง) */
  schoolId: string | null;
  exp: number;
};

function getSessionSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.ADMIN_SESSION_TOKEN ||
    "dev-only-change-me"
  );
}

function encodeBase64Url(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSessionPayload(payload: SessionPayload): Promise<string> {
  const body = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const key = await importHmacKey(getSessionSecret());
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const sigPart = encodeBase64Url(sigBuf);
  return `${body}.${sigPart}`;
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sigPart] = parts;
  if (!body || !sigPart) return null;

  let sigBytes: Uint8Array;
  try {
    sigBytes = decodeBase64Url(sigPart);
  } catch {
    return null;
  }

  const key = await importHmacKey(getSessionSecret());
  const ab = new ArrayBuffer(sigBytes.byteLength);
  const signature = new Uint8Array(ab);
  signature.set(sigBytes);

  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    signature as BufferSource,
    new TextEncoder().encode(body),
  );
  if (!ok) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(decodeBase64Url(body)));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (typeof o.username !== "string" || !o.username) return null;
  if (o.role !== "admin" && o.role !== "editor") return null;
  if (typeof o.exp !== "number") return null;
  if (o.schoolId !== null && typeof o.schoolId !== "string") return null;

  if (Date.now() / 1000 > o.exp) return null;

  return {
    v: 1,
    username: o.username,
    role: o.role,
    schoolId: o.schoolId === null ? null : o.schoolId,
    exp: o.exp,
  };
}

export function sessionMaxAgeSeconds() {
  return 60 * 60 * 12;
}

export function createSessionPayload(
  username: string,
  role: UserRole,
  schoolId: string | null,
): SessionPayload {
  return {
    v: 1,
    username,
    role,
    schoolId,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds(),
  };
}

/** รองรับการย้ายจากค่า session เดิมที่เป็นคงที่ (legacy) */
export function isLegacyStaticSessionToken(token: string) {
  const legacy = process.env.ADMIN_SESSION_TOKEN || "dev-admin-session-token";
  return token === legacy;
}
