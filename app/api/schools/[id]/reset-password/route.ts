import { NextResponse } from "next/server";

import {
  getCurrentAdminUsername,
  isAuthenticated,
  isPlatformAdmin,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { resetSchoolAccountPassword } from "@/lib/school-accounts";
import { getSchoolById } from "@/lib/schools";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const school = await getSchoolById(id);
  if (!school) {
    return NextResponse.json({ error: "ไม่พบโรงเรียน" }, { status: 404 });
  }
  if (!school.schoolCode.trim()) {
    return NextResponse.json(
      { error: "โรงเรียนนี้ยังไม่มีรหัสโรงเรียน" },
      { status: 400 },
    );
  }

  const result = await resetSchoolAccountPassword(school);
  if ("error" in result) {
    if (result.error === "no_account") {
      return NextResponse.json(
        { error: "ยังไม่มีบัญชี login สำหรับโรงเรียนนี้" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: "รหัสโรงเรียนไม่ถูกต้อง" }, { status: 400 });
  }

  const actor = await getCurrentAdminUsername();
  await writeAuditLog(
    "UPDATE",
    `รีเซ็ตรหัสผ่านบัญชีโรงเรียน ${school.name} (${school.schoolCode}) โดย ${actor}`,
  );

  return NextResponse.json({ ok: true, username: result.username });
}
