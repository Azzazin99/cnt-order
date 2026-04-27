import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { applySessionCookies, parsePlatformAdminEmails } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleUserInfo,
  getGoogleRedirectUri,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/oauth-google";
import { findSchoolIdByEmailDomain } from "@/lib/schools";
import { upsertGoogleUser } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/login?error=${code}`, origin));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    await writeAuditLog(
      "AUTH_DENY_DOMAIN",
      `Google OAuth ยกเลิกหรือผิดพลาด: ${oauthError}`,
    );
    return fail("google_oauth");
  }

  if (!code || !state) {
    return fail("google_missing");
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (!stateCookie || stateCookie !== state) {
    await writeAuditLog(
      "AUTH_DENY_DOMAIN",
      "Google OAuth state ไม่ตรงกัน",
    );
    return fail("google_state");
  }

  const redirectUri = getGoogleRedirectUri(req);

  let accessToken: string;
  try {
    const tok = await exchangeGoogleAuthorizationCode(code, redirectUri);
    accessToken = tok.access_token;
  } catch {
    await writeAuditLog(
      "AUTH_DENY_DOMAIN",
      "Google OAuth แลก code เป็น token ไม่สำเร็จ",
    );
    return fail("google_token");
  }

  let info: Awaited<ReturnType<typeof fetchGoogleUserInfo>>;
  try {
    info = await fetchGoogleUserInfo(accessToken);
  } catch {
    await writeAuditLog("AUTH_DENY_DOMAIN", "ดึงข้อมูล Google userinfo ไม่สำเร็จ");
    return fail("google_profile");
  }

  const email = (info.email || "").trim().toLowerCase();
  if (!email || !info.email_verified) {
    await writeAuditLog(
      "AUTH_DENY_DOMAIN",
      `อีเมล Google ไม่พร้อมใช้งานหรือยังไม่ยืนยัน (${email || "empty"})`,
    );
    return fail("google_email");
  }

  const platformEmails = parsePlatformAdminEmails();
  const isPlatform = platformEmails.includes(email);

  let schoolId: string | null;
  let role: "admin" | "editor";

  if (isPlatform) {
    schoolId = null;
    role = "admin";
  } else {
    const mapped = await findSchoolIdByEmailDomain(email);
    if (!mapped) {
      await writeAuditLog(
        "AUTH_DENY_DOMAIN",
        `โดเมนอีเมลไม่อยู่ใน whitelist: ${email}`,
      );
      return fail("domain_not_allowed");
    }
    schoolId = mapped.schoolId;
    role = "editor";
  }

  const user = await upsertGoogleUser({
    email,
    sub: info.sub,
    schoolId,
    role,
  });

  const response = NextResponse.redirect(new URL("/admin", origin));
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  await applySessionCookies(response, user.username, user.role, user.schoolId);

  await writeAuditLog(
    "AUTH_LOGIN_GOOGLE",
    `เข้าสู่ระบบ Google สำเร็จ (${email}, role: ${user.role}, schoolId: ${user.schoolId ?? "platform"})`,
  );

  return response;
}
