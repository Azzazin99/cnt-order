import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ADMIN_ROLE_COOKIE_NAME,
  ADMIN_SCHOOL_COOKIE_NAME,
  ADMIN_USER_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import {
  isLegacyStaticSessionToken,
  verifySessionToken,
} from "@/lib/session";
import type { UserRole } from "@/lib/users";

async function isSchoolAdminRequest(req: NextRequest) {
  const s = await readSession(req);
  return Boolean(s && s.role === "admin" && s.schoolId !== null);
}

async function readSession(req: NextRequest) {
  const raw = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  const signed = await verifySessionToken(raw);
  if (signed) return signed;
  if (isLegacyStaticSessionToken(raw)) {
    const username = req.cookies.get(ADMIN_USER_COOKIE_NAME)?.value;
    const role = req.cookies.get(ADMIN_ROLE_COOKIE_NAME)?.value;
    const schoolRaw = req.cookies.get(ADMIN_SCHOOL_COOKIE_NAME)?.value;
    if (!username || (role !== "admin" && role !== "editor")) {
      return null;
    }
    return {
      v: 1 as const,
      username,
      role: role as UserRole,
      schoolId:
        !schoolRaw || schoolRaw === ""
          ? null
          : schoolRaw === "null"
            ? null
            : schoolRaw,
      exp: Math.floor(Date.now() / 1000) + 86400 * 365,
    };
  }
  return null;
}

export async function isLoggedIn(req: NextRequest) {
  const s = await readSession(req);
  return s !== null;
}

export async function getSessionFromRequest(req: NextRequest) {
  return readSession(req);
}

export async function getRole(req: NextRequest): Promise<UserRole | "unknown"> {
  const s = await readSession(req);
  if (!s) return "unknown";
  return s.role;
}

export async function isPlatformAdminRequest(req: NextRequest) {
  const s = await readSession(req);
  return Boolean(s && s.role === "admin" && s.schoolId === null);
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await getRole(req);
  const loggedIn = await isLoggedIn(req);
  const platformAdmin = await isPlatformAdminRequest(req);

  if (pathname.startsWith("/admin") && !loggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/api/documents") && !loggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (pathname.startsWith("/api/documents") && req.method === "POST") {
    if (!(role === "admin" || role === "editor")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (pathname.startsWith("/api/documents") && req.method === "PUT") {
    if (!(role === "admin" || role === "editor")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (pathname.startsWith("/api/documents") && req.method === "DELETE") {
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (pathname.startsWith("/api/users") && req.method !== "GET") {
    if (!loggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!(platformAdmin || (await isSchoolAdminRequest(req)))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (pathname.startsWith("/api/users") && req.method === "GET") {
    if (!loggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!(platformAdmin || (await isSchoolAdminRequest(req)))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (pathname.startsWith("/api/schools")) {
    if (!loggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!platformAdmin) {
      return NextResponse.json(
        { error: "เฉพาะแอดมินระดับเขตเท่านั้นที่จัดการโรงเรียนได้" },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/documents/:path*",
    "/api/users/:path*",
    "/api/schools/:path*",
  ],
};
