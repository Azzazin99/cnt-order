import { NextResponse } from "next/server";

import {
  getCurrentAdminUsername,
  isAuthenticated,
  isPlatformAdmin,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { provisionSchoolAccount } from "@/lib/school-accounts";
import { addSchool, getSchools } from "@/lib/schools";

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
  return NextResponse.json({ schools });
}

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    schoolCode?: string;
    moeCode?: string;
  };
  const name = body.name?.trim() || "";
  const schoolCode = body.schoolCode?.trim() || "";
  const moeCode = body.moeCode?.trim() || "";
  if (!name) {
    return NextResponse.json({ error: "กรอกชื่อโรงเรียน" }, { status: 400 });
  }
  if (!schoolCode) {
    return NextResponse.json({ error: "กรอกรหัส SMIS" }, { status: 400 });
  }

  try {
    const schoolResult = await addSchool({ name, schoolCode, moeCode });
    if ("error" in schoolResult) {
      if (schoolResult.error === "code_exists") {
        return NextResponse.json(
          { error: "รหัส SMIS นี้ถูกใช้แล้ว" },
          { status: 409 },
        );
      }
      if (schoolResult.error === "moe_exists") {
        return NextResponse.json(
          { error: "รหัสกระทรวงนี้ถูกใช้แล้ว" },
          { status: 409 },
        );
      }
      if (schoolResult.error === "invalid_smis") {
        return NextResponse.json(
          { error: "รหัส SMIS ต้องเป็นตัวเลข 8 หลัก" },
          { status: 400 },
        );
      }
      if (schoolResult.error === "invalid_moe") {
        return NextResponse.json(
          { error: "รหัสกระทรวงต้องเป็นตัวเลข 10 หลัก" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "ข้อมูลโรงเรียนไม่ถูกต้อง" }, { status: 400 });
    }

    const account = await provisionSchoolAccount(schoolResult);
    if ("error" in account) {
      return NextResponse.json(
        { error: "สร้างโรงเรียนแล้ว แต่สร้างบัญชี login ไม่สำเร็จ" },
        { status: 500 },
      );
    }

    const actor = await getCurrentAdminUsername();
    await writeAuditLog(
      "UPDATE",
      `เพิ่มโรงเรียน ${schoolResult.name} (รหัส ${schoolResult.schoolCode}) และบัญชี login โดย ${actor}`,
    );
    return NextResponse.json(
      { ...schoolResult, loginUsername: account.username },
      { status: 201 },
    );
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
