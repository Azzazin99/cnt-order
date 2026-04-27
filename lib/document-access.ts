import {
  getCurrentSchoolId,
  isPlatformAdmin,
} from "@/lib/auth";
import type { DocumentListScope } from "@/lib/documents";
import { getDocumentById } from "@/lib/documents";

export async function getAdminDocumentListScope(): Promise<DocumentListScope> {
  if (await isPlatformAdmin()) {
    return { kind: "all" };
  }
  const schoolId = await getCurrentSchoolId();
  if (schoolId) {
    return { kind: "school", schoolId };
  }
  return { kind: "all" };
}

export async function assertCanAccessDocument(
  docId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const doc = await getDocumentById(docId);
  if (!doc) {
    return { ok: false, status: 404, error: "ไม่พบเอกสาร" };
  }
  if (await isPlatformAdmin()) {
    return { ok: true };
  }
  const schoolId = await getCurrentSchoolId();
  if (!schoolId) {
    return { ok: true };
  }
  if (doc.schoolId === schoolId) {
    return { ok: true };
  }
  return { ok: false, status: 403, error: "ไม่มีสิทธิ์เข้าถึงเอกสารนี้" };
}

export async function schoolIdForNewDocument(): Promise<string | null> {
  if (await isPlatformAdmin()) {
    return null;
  }
  return getCurrentSchoolId();
}
