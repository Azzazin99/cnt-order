import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  assertCanAccessDocument,
  getAdminDocumentListScope,
  resolveDocumentSchoolId,
} from "@/lib/document-access";
import {
  getCurrentAdminRole,
  getCurrentAdminUsername,
  hasRole,
  isAuthenticated,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  type DocumentItem,
  getDocuments,
  removeDocument,
  removeUploadedPdf,
  saveUploadedPdf,
  updateDocument,
} from "@/lib/documents";
import { isDocumentCategory } from "@/lib/document-categories";
import { assertPdfUpload, PDF_UPLOAD_ERROR } from "@/lib/pdf-upload";
import { normalizeOrderDate } from "@/lib/thai-date";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: Request, context: RouteContext) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canDelete = await hasRole(["admin"]);
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const actor = await getCurrentAdminUsername();
  const role = await getCurrentAdminRole();

  const { id } = await context.params;
  const access = await assertCanAccessDocument(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const removed = await removeDocument(id);

  if (!removed) {
    return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });
  }

  await removeUploadedPdf(removed.fileUrl);
  await writeAuditLog(
    "DELETE",
    `ลบเอกสาร ${removed.orderNo} โดย ${actor} (${role})`,
  );
  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, context: RouteContext) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canUpdate = await hasRole(["admin", "editor"]);
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const actor = await getCurrentAdminUsername();
  const role = await getCurrentAdminRole();

  const { id } = await context.params;
  const access = await assertCanAccessDocument(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const scope = await getAdminDocumentListScope();
  const documents: DocumentItem[] = await getDocuments(scope);
  const existing = documents.find((item) => item.id === id);
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });
  }

  const formData = await req.formData();
  const organization = String(formData.get("organization") || "");
  const docSchoolId = await resolveDocumentSchoolId(organization);
  if (docSchoolId && typeof docSchoolId === "object" && "error" in docSchoolId) {
    return NextResponse.json({ error: docSchoolId.error }, { status: 400 });
  }

  const orderNo = String(formData.get("orderNo") || "");
  const title = String(formData.get("title") || "");
  const category = String(formData.get("category") || "");
  const orderDateRaw = String(formData.get("orderDate") || "");
  const file = formData.get("file");

  if (!orderNo || !title || !category || !orderDateRaw) {
    return NextResponse.json({ error: "กรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
  }

  if (!isDocumentCategory(category)) {
    return NextResponse.json({ error: "หมวดหมู่คำสั่งไม่ถูกต้อง" }, { status: 400 });
  }

  const orderDate = normalizeOrderDate(orderDateRaw);
  if (!orderDate) {
    return NextResponse.json({ error: "รูปแบบวันที่ไม่ถูกต้อง" }, { status: 400 });
  }

  let fileUrl = existing.fileUrl;
  if (file instanceof File && file.size > 0) {
    try {
      await assertPdfUpload(file);
    } catch {
      return NextResponse.json({ error: PDF_UPLOAD_ERROR }, { status: 400 });
    }

    const safeOrderNo = orderNo.replace(/[^a-zA-Z0-9ก-๙_-]/g, "-");
    const fileName = `${Date.now()}-${safeOrderNo}.pdf`;
    const arrayBuffer = await file.arrayBuffer();
    fileUrl = await saveUploadedPdf(fileName, new Uint8Array(arrayBuffer));
    if (existing.fileUrl !== fileUrl) {
      await removeUploadedPdf(existing.fileUrl);
    }
  }

  const updated = await updateDocument(id, {
    orderNo,
    title,
    category,
    orderDate,
    fileUrl,
    schoolId: docSchoolId,
  });
  if (!updated) {
    return NextResponse.json({ error: "ไม่พบเอกสาร" }, { status: 404 });
  }

  await writeAuditLog(
    "UPDATE",
    `แก้ไขเอกสาร ${updated.orderNo} โดย ${actor} (${role})`,
  );
  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json(updated);
}
