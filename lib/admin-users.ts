import { getCurrentSchoolId, isPlatformAdmin } from "@/lib/auth";
import { getUsers, getUsersBySchoolId } from "@/lib/users";

export async function getUsersForAdminSession() {
  if (await isPlatformAdmin()) {
    return getUsers();
  }
  const schoolId = await getCurrentSchoolId();
  if (!schoolId) {
    return getUsers();
  }
  return getUsersBySchoolId(schoolId);
}
