import {
  getCurrentSchoolId,
  isPlatformAdmin,
} from "@/lib/auth";
import { DISTRICT_ORG_KEY } from "@/lib/document-organization";
import type { DocumentListScope } from "@/lib/documents";
import { getDocumentById } from "@/lib/documents";
import { getSchoolById } from "@/lib/schools";

export async function getAdminDocumentListScope(): Promise<DocumentListScope> {
  if (await isPlatformAdmin()) {
    return { kind: "all" };
  }
  const schoolId = await getCurrentSchoolId();
  if (schoolId) {
    return { kind: "school", schoolId };
  }
  return { kind: "none" };
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
    return { ok: false, status: 403, error: "ไม่มีสิทธิ์เข้าถึงเอกสารนี้" };
  }
  if (doc.schoolId === schoolId) {
    return { ok: true };
  }
  return { ok: false, status: 403, error: "ไม่มีสิทธิ์เข้าถึงเอกสารนี้" };
}

export async function schoolIdForNewDocument(): Promise<
  string | null | { error: string }
> {
  if (await isPlatformAdmin()) {
    return null;
  }
  const schoolId = await getCurrentSchoolId();
  if (!schoolId) {
    return { error: "ไม่มีสิทธิ์อัปโหลดเอกสาร" };
  }
  return schoolId;
}

export async function resolveDocumentSchoolId(
  formValue: string | null | undefined,
): Promise<string | null | { error: string }> {
  if (await isPlatformAdmin()) {
    const organization = String(formValue || "").trim();
    if (!organization) {
      return { error: "กรุณาเลือกหน่วยงาน" };
    }
    if (organization === DISTRICT_ORG_KEY) {
      return null;
    }
    const school = await getSchoolById(organization);
    if (!school || school.status !== "active") {
      return { error: "หน่วยงานไม่ถูกต้อง" };
    }
    return organization;
  }

  const schoolId = await getCurrentSchoolId();
  if (!schoolId) {
    return { error: "ไม่มีสิทธิ์อัปโหลดเอกสาร" };
  }
  return schoolId;
}
