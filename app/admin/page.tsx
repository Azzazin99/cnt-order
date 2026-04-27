import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminClient } from "@/components/admin-client";
import { LogoutButton } from "@/components/logout-button";
import { SchoolDomainManagement } from "@/components/school-domain-management";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserManagement } from "@/components/user-management";
import { getUsersForAdminSession } from "@/lib/admin-users";
import { getAuditLogs } from "@/lib/audit";
import {
  getCurrentAdminRole,
  getCurrentAdminUsername,
  getCurrentSchoolId,
  isAuthenticated,
  isPlatformAdmin,
} from "@/lib/auth";
import { getAdminDocumentListScope } from "@/lib/document-access";
import { getDocuments } from "@/lib/documents";
import { getSchools } from "@/lib/schools";

export default async function AdminPage() {
  const authed = await isAuthenticated();
  if (!authed) {
    redirect("/login");
  }

  const scope = await getAdminDocumentListScope();
  const items = await getDocuments(scope);
  const currentUsername = await getCurrentAdminUsername();
  const currentRole = await getCurrentAdminRole();
  const platform = await isPlatformAdmin();
  const actorSchoolId = await getCurrentSchoolId();

  const users = currentRole === "admin" ? await getUsersForAdminSession() : [];
  const auditLogs =
    currentRole === "admin" && platform ? await getAuditLogs(20) : [];
  const schools = platform ? await getSchools() : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-100 to-amber-50/40 px-4 py-8 text-stone-800 dark:from-stone-950 dark:to-stone-900 dark:text-stone-100">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-stone-200 bg-white p-4 shadow-lg shadow-stone-300/25 md:p-6 dark:border-stone-800 dark:bg-stone-950 dark:shadow-black/20">
        <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-900/70">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                Document Admin
              </p>
              <h1 className="notion-heading mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-100">
                แดชบอร์ดจัดการเอกสาร
              </h1>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                จัดการเอกสาร, ผู้ใช้งาน และตรวจสอบ Audit Log จากหน้าเดียว
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              {currentUsername} ({currentRole}
              {actorSchoolId ? ` · โรงเรียน` : platform ? ` · เขต` : ""})
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              กลับหน้าหลัก
            </Link>
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>

        <AdminClient initialItems={items} currentRole={currentRole} />

        {currentRole === "admin" ? (
          <>
            {platform ? (
              <SchoolDomainManagement initialSchools={schools} />
            ) : null}
            <UserManagement
              initialUsers={users.map((user) => ({
                username: user.username,
                role: user.role,
                email: user.email,
                schoolId: user.schoolId,
                authProvider: user.authProvider,
              }))}
              currentUsername={currentUsername}
              isPlatformAdmin={platform}
              schools={schools}
            />
          </>
        ) : null}

        {currentRole === "admin" && platform ? (
          <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950/60">
            <h2 className="notion-heading mb-3 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Audit Log ล่าสุด
            </h2>
            <div className="space-y-2 text-sm">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 transition hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/90"
                >
                  <span className="mr-2 inline-block rounded bg-stone-200 px-2 py-0.5 text-xs font-semibold dark:bg-stone-700">
                    {log.action}
                  </span>
                  <span>{log.detail}</span>
                  <span className="ml-2 text-stone-500 dark:text-stone-400">
                    ({log.createdAt})
                  </span>
                </div>
              ))}
              {auditLogs.length === 0 ? (
                <p className="text-stone-500">ยังไม่มีประวัติการทำรายการ</p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
