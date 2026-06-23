import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { getUsersForAdminSession } from "@/lib/admin-users";
import {
  getCurrentAdminRole,
  getCurrentAdminUsername,
  getCurrentSchoolId,
  hasRole,
  isAuthenticated,
  isPlatformAdmin,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { addUser, type UserRecord, type UserRole } from "@/lib/users";

export const runtime = "nodejs";

function safeUser(user: UserRecord) {
  return {
    username: user.username,
    role: user.role,
    email: user.email,
    schoolId: user.schoolId,
  };
}

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canManage = await hasRole(["admin"]);
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users: UserRecord[] = await getUsersForAdminSession();
  return NextResponse.json(users.map(safeUser));
}

export async function POST(req: Request) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const canManage = await hasRole(["admin"]);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const platform = await isPlatformAdmin();
    const actorSchoolId = await getCurrentSchoolId();

    const body = (await req.json()) as {
      username?: string;
      password?: string;
      role?: UserRole;
      schoolId?: string | null;
      email?: string | null;
    };

    const username = body.username?.trim() || "";
    const password = body.password || "";
    const role = body.role;

    if (!username || !password || !role) {
      return NextResponse.json({ error: "กรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }
    if (!["admin", "editor"].includes(role)) {
      return NextResponse.json({ error: "role ไม่ถูกต้อง" }, { status: 400 });
    }
    if (username.length < 3 || password.length < 6) {
      return NextResponse.json(
        { error: "username อย่างน้อย 3 ตัว และ password อย่างน้อย 6 ตัว" },
        { status: 400 },
      );
    }

    let schoolId: string | null;
    if (platform) {
      schoolId =
        body.schoolId === undefined || body.schoolId === ""
          ? null
          : body.schoolId;
    } else {
      if (!actorSchoolId) {
        return NextResponse.json(
          { error: "บัญชีนี้ไม่ได้ผูกกับโรงเรียน" },
          { status: 403 },
        );
      }
      schoolId = actorSchoolId;
      if (body.schoolId != null && body.schoolId !== actorSchoolId) {
        return NextResponse.json(
          { error: "ไม่สามารถกำหนดโรงเรียนอื่นได้" },
          { status: 403 },
        );
      }
    }

    if (!platform && role === "admin" && schoolId === null) {
      return NextResponse.json(
        { error: "แอดมินโรงเรียนไม่สามารถสร้างแอดมินระดับเขตได้" },
        { status: 403 },
      );
    }

    const passwordHash = await hash(password, 10);
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().toLowerCase()
        : null;

    const record: UserRecord = {
      username,
      passwordHash,
      role,
      email,
      authProvider: "local",
      providerSubject: null,
      schoolId,
      status: "active",
    };

    const added = await addUser(record);
    if (!added.ok) {
      return NextResponse.json({ error: "มี username นี้แล้ว" }, { status: 409 });
    }

    const actor = await getCurrentAdminUsername();
    const actorRole = await getCurrentAdminRole();
    await writeAuditLog(
      "UPDATE",
      `เพิ่มผู้ใช้ ${username} (role: ${role}, schoolId: ${schoolId ?? "platform"}) โดย ${actor} (${actorRole})`,
    );

    return NextResponse.json(safeUser(record), { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "USER_STORAGE_UNAVAILABLE"
    ) {
      return NextResponse.json(
        { error: "ระบบ Vercel ต้องตั้งค่า DATABASE_URL ก่อนจึงจะเพิ่มผู้ใช้ได้" },
        { status: 503 },
      );
    }
    throw error;
  }
}
