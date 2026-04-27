import { NextResponse } from "next/server";

import {
  getCurrentAdminUsername,
  isAuthenticated,
  isPlatformAdmin,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { removeSchoolDomain, setSchoolDomainVerified } from "@/lib/schools";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as { isVerified?: boolean };
  if (typeof body.isVerified !== "boolean") {
    return NextResponse.json({ error: "ส่ง isVerified เป็น boolean" }, { status: 400 });
  }

  try {
    const updated = await setSchoolDomainVerified(id, body.isVerified);
    if (!updated) {
      return NextResponse.json({ error: "ไม่พบโดเมน" }, { status: 404 });
    }
    const actor = await getCurrentAdminUsername();
    await writeAuditLog(
      "UPDATE",
      `อัปเดตสถานะโดเมน ${updated.domain} verified=${updated.isVerified} โดย ${actor}`,
    );
    return NextResponse.json(updated);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SCHOOL_STORAGE_UNAVAILABLE"
    ) {
      return NextResponse.json({ error: "จัดเก็บข้อมูลไม่พร้อม" }, { status: 503 });
    }
    throw error;
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const removed = await removeSchoolDomain(id);
    if (!removed) {
      return NextResponse.json({ error: "ไม่พบโดเมน" }, { status: 404 });
    }
    const actor = await getCurrentAdminUsername();
    await writeAuditLog(
      "DELETE",
      `ลบโดเมน ${removed.domain} โดย ${actor}`,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SCHOOL_STORAGE_UNAVAILABLE"
    ) {
      return NextResponse.json({ error: "จัดเก็บข้อมูลไม่พร้อม" }, { status: 503 });
    }
    throw error;
  }
}
