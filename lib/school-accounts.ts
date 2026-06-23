import { hash } from "bcryptjs";

import { normalizeSchoolCode, type SchoolRecord } from "@/lib/schools";
import {
  addUser,
  findUserByUsername,
  updateUser,
  type UserRecord,
} from "@/lib/users";

export async function hashSchoolPassword(schoolCode: string) {
  return hash(schoolCode.trim(), 10);
}

export async function provisionSchoolAccount(
  school: SchoolRecord,
): Promise<UserRecord | { error: "invalid_code" | "username_taken" }> {
  const username = normalizeSchoolCode(school.schoolCode);
  if (!username) {
    return { error: "invalid_code" };
  }

  const passwordHash = await hashSchoolPassword(school.schoolCode);
  const existing = await findUserByUsername(username);

  if (existing) {
    if (existing.schoolId !== school.id) {
      return { error: "username_taken" };
    }
    const updated = await updateUser(username, {
      passwordHash,
      role: "admin",
      schoolId: school.id,
      authProvider: "local",
      status: "active",
    });
    if (!updated) {
      return { error: "username_taken" };
    }
    return updated;
  }

  const user: UserRecord = {
    username,
    passwordHash,
    role: "admin",
    email: null,
    authProvider: "local",
    providerSubject: null,
    schoolId: school.id,
    status: "active",
  };

  const added = await addUser(user);
  if (!added.ok) {
    return { error: "username_taken" };
  }
  return user;
}

export async function resetSchoolAccountPassword(
  school: SchoolRecord,
): Promise<UserRecord | { error: "no_account" | "invalid_code" }> {
  const username = normalizeSchoolCode(school.schoolCode);
  if (!username) {
    return { error: "invalid_code" };
  }

  const existing = await findUserByUsername(username);
  if (!existing || existing.schoolId !== school.id) {
    return { error: "no_account" };
  }

  const passwordHash = await hashSchoolPassword(school.schoolCode);
  const updated = await updateUser(username, { passwordHash });
  if (!updated) {
    return { error: "no_account" };
  }
  return updated;
}
