import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
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
import { addDocument, getDocuments, saveUploadedPdf } from "@/lib/documents";
import { isDocumentCategory } from "@/lib/document-categories";
import { assertPdfUpload, PDF_UPLOAD_ERROR } from "@/lib/pdf-upload";
import { normalizeOrderDate } from "@/lib/thai-date";

export const runtime = "nodejs";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scope = await getAdminDocumentListScope();
  const items = await getDocuments(scope);
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canWrite = await hasRole(["admin", "editor"]);
  if (!canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const actor = await getCurrentAdminUsername();
  const role = await getCurrentAdminRole();

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
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
      return NextResponse.json(
        { error: "กรอกข้อมูลให้ครบถ้วน" },
        { status: 400 },
      );
    }

    if (!isDocumentCategory(category)) {
      return NextResponse.json(
        { error: "หมวดหมู่คำสั่งไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const orderDate = normalizeOrderDate(orderDateRaw);
    if (!orderDate) {
      return NextResponse.json(
        { error: "รูปแบบวันที่ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    let fileUrl = "#";
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
    }

    const item = await addDocument({
      orderNo,
      title,
      category,
      orderDate,
      fileUrl,
      schoolId: docSchoolId,
    });
    await writeAuditLog(
      "CREATE",
      `เพิ่มเอกสาร ${item.orderNo} โดย ${actor} (${role})`,
    );
    revalidatePath("/");
    revalidatePath("/admin");

    return NextResponse.json(item, { status: 201 });
  }

  const body = (await req.json()) as {
    orderNo?: string;
    title?: string;
    category?: string;
    orderDate?: string;
    fileUrl?: string;
    organization?: string;
  };

  const docSchoolId = await resolveDocumentSchoolId(body.organization);
  if (docSchoolId && typeof docSchoolId === "object" && "error" in docSchoolId) {
    return NextResponse.json({ error: docSchoolId.error }, { status: 400 });
  }

  if (!body.orderNo || !body.title || !body.category || !body.orderDate) {
    return NextResponse.json(
      { error: "กรอกข้อมูลให้ครบถ้วน" },
      { status: 400 },
    );
  }

  if (!isDocumentCategory(body.category)) {
    return NextResponse.json(
      { error: "หมวดหมู่คำสั่งไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  const orderDate = normalizeOrderDate(body.orderDate);
  if (!orderDate) {
    return NextResponse.json(
      { error: "รูปแบบวันที่ไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  const item = await addDocument({
    orderNo: body.orderNo,
    title: body.title,
    category: body.category,
    orderDate,
    fileUrl: body.fileUrl || "#",
    schoolId: docSchoolId,
  });
  await writeAuditLog(
    "CREATE",
    `เพิ่มเอกสาร ${item.orderNo} โดย ${actor} (${role})`,
  );
  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json(item, { status: 201 });
}
