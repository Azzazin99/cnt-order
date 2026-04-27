import { NextResponse } from "next/server";

import { clearSessionCookies, getCurrentAdminUsername } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const username = await getCurrentAdminUsername();
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  await writeAuditLog("LOGOUT", `ออกจากระบบ (username: ${username})`);
  return response;
}
