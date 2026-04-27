import { NextResponse } from "next/server";

import {
  applySessionCookies,
  isLocalLoginEnabled,
  validateAdminCredentials,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  if (!isLocalLoginEnabled()) {
    return NextResponse.json(
      { error: "การเข้าสู่ระบบด้วยรหัสผ่านถูกปิดใช้งาน กรุณาใช้ Google" },
      { status: 403 },
    );
  }

  const body = (await req.json()) as { username?: string; password?: string };
  const username = body.username?.trim() || "";
  const password = body.password || "";

  const user = await validateAdminCredentials(username, password);
  if (!user) {
    await writeAuditLog(
      "LOGIN",
      `เข้าสู่ระบบไม่สำเร็จ (username: ${username || "unknown"})`,
    );
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  await applySessionCookies(response, user.username, user.role, user.schoolId);

  await writeAuditLog(
    "LOGIN",
    `เข้าสู่ระบบสำเร็จ (username: ${user.username}, role: ${user.role}, schoolId: ${user.schoolId ?? "platform"})`,
  );
  return response;
}
