import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminAuditLog } from "@/components/admin-audit-log";
import { AdminClient } from "@/components/admin-client";
import { AdminShell, type AdminTabId } from "@/components/admin-shell";
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
import { getSchools, getSchoolById } from "@/lib/schools";

export default async function AdminPage() {
  const authed = await isAuthenticated();
  if (!authed) {
    redirect("/");
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
  const lockedSchool =
    !platform && actorSchoolId ? await getSchoolById(actorSchoolId) : null;
  const sortedSchools = [...schools]
    .filter((school) => school.schoolCode.trim() !== "")
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  const roleBadge = `${currentRole}${actorSchoolId ? " · โรงเรียน" : platform ? " · เขต" : ""}`;

  const tabs: { id: AdminTabId; label: string; content: ReactNode }[] = [
    {
      id: "documents",
      label: "เอกสาร",
      content: (
        <AdminClient
          initialItems={items}
          currentRole={currentRole}
          isPlatformAdmin={platform}
          schools={sortedSchools}
          lockedSchool={
            lockedSchool
              ? { id: lockedSchool.id, name: lockedSchool.name }
              : null
          }
        />
      ),
    },
  ];

  if (currentRole === "admin") {
    tabs.push({
      id: "users",
      label: "ผู้ใช้",
      content: (
        <UserManagement
          initialUsers={users.map((user) => ({
            username: user.username,
            role: user.role,
            email: user.email,
            schoolId: user.schoolId,
          }))}
          currentUsername={currentUsername}
          isPlatformAdmin={platform}
          schools={schools}
          embedded
        />
      ),
    });
  }

  if (currentRole === "admin" && platform) {
    tabs.push({
      id: "audit",
      label: "บันทึกระบบ",
      content: <AdminAuditLog logs={auditLogs} />,
    });
  }

  return (
    <AdminShell
      currentUsername={currentUsername}
      roleBadge={roleBadge}
      tabs={tabs}
    />
  );
}
