import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import {
  getCurrentAdminRole,
  getCurrentAdminUsername,
  getCurrentSchoolId,
  hasRole,
  isAuthenticated,
  isPlatformAdmin,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  findUserByUsername,
  getUsers,
  removeUser,
  type UserRole,
  updateUser,
} from "@/lib/users";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ username: string }>;
};

function decodeUsername(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const canManage = await hasRole(["admin"]);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { username: rawUsername } = await context.params;
    const username = decodeUsername(rawUsername);
    const existing = await findUserByUsername(username);
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const platform = await isPlatformAdmin();
    const actorSchool = await getCurrentSchoolId();

    if (!platform) {
      if (existing.schoolId === null) {
        return NextResponse.json(
          { error: "ไม่มีสิทธิ์แก้ไขผู้ใช้ระดับเขต" },
          { status: 403 },
        );
      }
      if (!actorSchool || existing.schoolId !== actorSchool) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = (await req.json()) as { role?: UserRole; password?: string };
    const updates: Partial<{
      role: UserRole;
      passwordHash: string;
    }> = {};
    if (body.role) {
      if (!["admin", "editor"].includes(body.role)) {
        return NextResponse.json({ error: "role ไม่ถูกต้อง" }, { status: 400 });
      }
      if (!platform && body.role === "admin" && existing.schoolId === null) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!platform && body.role === "admin" && !actorSchool) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      updates.role = body.role;
    }
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: "password อย่างน้อย 6 ตัว" }, { status: 400 });
      }
      updates.passwordHash = await hash(body.password, 10);
    }

    if (!updates.role && !updates.passwordHash) {
      return NextResponse.json({ error: "ไม่มีข้อมูลที่ต้องอัปเดต" }, { status: 400 });
    }

    const updated = await updateUser(username, updates);
    if (!updated) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const actor = await getCurrentAdminUsername();
    const actorRole = await getCurrentAdminRole();
    await writeAuditLog(
      "UPDATE",
      `แก้ไขผู้ใช้ ${username} (role: ${updated.role}) โดย ${actor} (${actorRole})`,
    );

    return NextResponse.json({
      username: updated.username,
      role: updated.role,
      email: updated.email,
      schoolId: updated.schoolId,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "USER_STORAGE_UNAVAILABLE"
    ) {
      return NextResponse.json(
        { error: "ระบบ Vercel ต้องตั้งค่า DATABASE_URL ก่อนจึงจะเปลี่ยนข้อมูลผู้ใช้ได้" },
        { status: 503 },
      );
    }
    throw error;
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const canManage = await hasRole(["admin"]);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { username: rawUsername } = await context.params;
    const username = decodeUsername(rawUsername);
    const users = await getUsers();
    const admins = users.filter((user) => user.role === "admin");
    const target = users.find((user) => user.username === username);
    if (!target) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const platform = await isPlatformAdmin();
    const actorSchool = await getCurrentSchoolId();

    if (!platform) {
      if (target.schoolId === null) {
        return NextResponse.json(
          { error: "ไม่มีสิทธิ์ลบผู้ใช้ระดับเขต" },
          { status: 403 },
        );
      }
      if (!actorSchool || target.schoolId !== actorSchool) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (target.role === "admin" && admins.length <= 1) {
      return NextResponse.json({ error: "ต้องมี admin อย่างน้อย 1 คน" }, { status: 400 });
    }

    const actor = await getCurrentAdminUsername();
    if (actor === username) {
      return NextResponse.json({ error: "ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่" }, { status: 400 });
    }

    const removed = await removeUser(username);
    if (!removed) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const actorRole = await getCurrentAdminRole();
    await writeAuditLog(
      "DELETE",
      `ลบผู้ใช้ ${username} โดย ${actor} (${actorRole})`,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "USER_STORAGE_UNAVAILABLE"
    ) {
      return NextResponse.json(
        { error: "ระบบ Vercel ต้องตั้งค่า DATABASE_URL ก่อนจึงจะลบผู้ใช้ได้" },
        { status: 503 },
      );
    }
    throw error;
  }
}
