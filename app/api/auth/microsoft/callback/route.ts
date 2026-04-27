import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { applySessionCookies, parsePlatformAdminEmails } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  exchangeMicrosoftAuthorizationCode,
  getMicrosoftRedirectUri,
  MICROSOFT_OAUTH_STATE_COOKIE,
  resolveMicrosoftUserClaims,
} from "@/lib/oauth-microsoft";
import { findSchoolIdByEmailDomain } from "@/lib/schools";
import { upsertOAuthUser } from "@/lib/users";

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
      `Microsoft OAuth ยกเลิกหรือผิดพลาด: ${oauthError}`,
    );
    return fail("microsoft_oauth");
  }

  if (!code || !state) {
    return fail("microsoft_missing");
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(MICROSOFT_OAUTH_STATE_COOKIE)?.value;

  if (!stateCookie || stateCookie !== state) {
    await writeAuditLog(
      "AUTH_DENY_DOMAIN",
      "Microsoft OAuth state ไม่ตรงกัน",
    );
    return fail("microsoft_state");
  }

  const redirectUri = getMicrosoftRedirectUri(req);

  let accessToken: string;
  let idToken: string | undefined;
  try {
    const tok = await exchangeMicrosoftAuthorizationCode(code, redirectUri);
    accessToken = tok.access_token;
    idToken = tok.id_token;
  } catch {
    await writeAuditLog(
      "AUTH_DENY_DOMAIN",
      "Microsoft OAuth แลก code เป็น token ไม่สำเร็จ",
    );
    return fail("microsoft_token");
  }

  let claims: Awaited<ReturnType<typeof resolveMicrosoftUserClaims>>;
  try {
    claims = await resolveMicrosoftUserClaims(accessToken, idToken);
  } catch {
    await writeAuditLog(
      "AUTH_DENY_DOMAIN",
      "ดึงข้อมูล Microsoft profile ไม่สำเร็จ",
    );
    return fail("microsoft_profile");
  }

  const email = claims.email.trim().toLowerCase();
  if (!email) {
    await writeAuditLog(
      "AUTH_DENY_DOMAIN",
      `อีเมล Microsoft ว่างเปล่า`,
    );
    return fail("microsoft_email");
  }

  if (claims.emailVerified === false) {
    await writeAuditLog(
      "AUTH_DENY_DOMAIN",
      `อีเมล Microsoft ยังไม่ยืนยัน: ${email}`,
    );
    return fail("microsoft_email");
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

  const user = await upsertOAuthUser("microsoft", {
    email,
    sub: claims.sub,
    schoolId,
    role,
  });

  const response = NextResponse.redirect(new URL("/admin", origin));
  response.cookies.set({
    name: MICROSOFT_OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  await applySessionCookies(response, user.username, user.role, user.schoolId);

  await writeAuditLog(
    "AUTH_LOGIN_MICROSOFT",
    `เข้าสู่ระบบ Microsoft สำเร็จ (${email}, role: ${user.role}, schoolId: ${user.schoolId ?? "platform"})`,
  );

  return response;
}
