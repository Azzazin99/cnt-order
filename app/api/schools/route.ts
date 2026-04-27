import { NextResponse } from "next/server";

import {
  getCurrentAdminUsername,
  isAuthenticated,
  isPlatformAdmin,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { addSchool, getSchoolDomains, getSchools } from "@/lib/schools";

export const runtime = "nodejs";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schools = await getSchools();
  const domains = await getSchoolDomains();
  return NextResponse.json({
    schools,
    domains,
  });
}

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim() || "";
  if (!name) {
    return NextResponse.json({ error: "กรอกชื่อโรงเรียน" }, { status: 400 });
  }

  try {
    const school = await addSchool({ name });
    const actor = await getCurrentAdminUsername();
    await writeAuditLog(
      "UPDATE",
      `เพิ่มโรงเรียน ${school.name} (${school.id}) โดย ${actor}`,
    );
    return NextResponse.json(school, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SCHOOL_STORAGE_UNAVAILABLE"
    ) {
      return NextResponse.json(
        { error: "ต้องตั้งค่า DATABASE_URL ก่อนจึงจะจัดการโรงเรียนได้" },
        { status: 503 },
      );
    }
    throw error;
  }
}
