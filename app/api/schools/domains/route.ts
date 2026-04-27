import { NextResponse } from "next/server";

import {
  getCurrentAdminUsername,
  isAuthenticated,
  isPlatformAdmin,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { addSchoolDomain } from "@/lib/schools";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    schoolId?: string;
    domain?: string;
    isVerified?: boolean;
    isPrimary?: boolean;
  };
  const schoolId = body.schoolId?.trim() || "";
  const domain = body.domain?.trim() || "";
  if (!schoolId || !domain) {
    return NextResponse.json(
      { error: "กรอก schoolId และ domain" },
      { status: 400 },
    );
  }

  try {
    const added = await addSchoolDomain({
      schoolId,
      domain,
      isVerified: body.isVerified,
      isPrimary: body.isPrimary,
    });
    if ("error" in added) {
      if (added.error === "exists") {
        return NextResponse.json({ error: "โดเมนนี้มีแล้ว" }, { status: 409 });
      }
      return NextResponse.json({ error: "ไม่พบโรงเรียน" }, { status: 404 });
    }
    const actor = await getCurrentAdminUsername();
    await writeAuditLog(
      "UPDATE",
      `เพิ่มโดเมน ${added.domain} ให้โรงเรียน ${added.schoolId} โดย ${actor}`,
    );
    return NextResponse.json(added, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SCHOOL_STORAGE_UNAVAILABLE"
    ) {
      return NextResponse.json(
        { error: "ต้องตั้งค่า DATABASE_URL ก่อนจึงจะจัดการโดเมนได้" },
        { status: 503 },
      );
    }
    throw error;
  }
}
