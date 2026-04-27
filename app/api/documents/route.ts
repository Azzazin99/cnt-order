import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  getAdminDocumentListScope,
  schoolIdForNewDocument,
} from "@/lib/document-access";
import {
  getCurrentAdminRole,
  getCurrentAdminUsername,
  hasRole,
  isAuthenticated,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { addDocument, getDocuments, saveUploadedPdf } from "@/lib/documents";

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
  const docSchoolId = await schoolIdForNewDocument();

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const orderNo = String(formData.get("orderNo") || "");
    const title = String(formData.get("title") || "");
    const department = String(formData.get("department") || "");
    const orderDate = String(formData.get("orderDate") || "");
    const file = formData.get("file");

    if (!orderNo || !title || !department || !orderDate) {
      return NextResponse.json(
        { error: "กรอกข้อมูลให้ครบถ้วน" },
        { status: 400 },
      );
    }

    let fileUrl = "#";
    if (file instanceof File && file.size > 0) {
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: "รองรับเฉพาะไฟล์ PDF" },
          { status: 400 },
        );
      }

      const safeOrderNo = orderNo.replace(/[^a-zA-Z0-9ก-๙_-]/g, "-");
      const fileName = `${Date.now()}-${safeOrderNo}.pdf`;
      const arrayBuffer = await file.arrayBuffer();
      fileUrl = await saveUploadedPdf(fileName, new Uint8Array(arrayBuffer));
    }

    const item = await addDocument({
      orderNo,
      title,
      department,
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
    department?: string;
    orderDate?: string;
    fileUrl?: string;
  };

  if (!body.orderNo || !body.title || !body.department || !body.orderDate) {
    return NextResponse.json(
      { error: "กรอกข้อมูลให้ครบถ้วน" },
      { status: 400 },
    );
  }

  const item = await addDocument({
    orderNo: body.orderNo,
    title: body.title,
    department: body.department,
    orderDate: body.orderDate,
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
