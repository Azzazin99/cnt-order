import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_CATEGORY,
  type DocumentCategory,
  isDocumentCategory,
} from "@/lib/document-categories";
import { dbQuery, isDatabaseEnabled } from "@/lib/db";
import { isMultiSchoolMode } from "@/lib/schools";

export type DocumentItem = {
  id: string;
  issuedAt: string;
  orderNo: string;
  title: string;
  category: DocumentCategory;
  orderDate: string;
  fileUrl: string;
  schoolId?: string | null;
};

export type DocumentListScope =
  | { kind: "all" }
  | { kind: "public" }
  | { kind: "school"; schoolId: string }
  | { kind: "none" };

const dataFilePath = path.join(process.cwd(), "data", "documents.json");
const uploadsDirPath = path.join(process.cwd(), "public", "uploads");

type DocumentRow = {
  id: string;
  issued_at: string;
  order_no: string;
  title: string;
  category: string;
  order_date: string;
  file_url: string;
  school_id: string | null;
};

type LegacyDocumentJson = Partial<DocumentItem> & {
  department?: string;
};

function normalizeCategory(value: unknown): DocumentCategory {
  if (typeof value === "string" && isDocumentCategory(value)) {
    return value;
  }
  return DEFAULT_CATEGORY;
}

function mapRow(row: DocumentRow): DocumentItem {
  return {
    id: row.id,
    issuedAt: row.issued_at,
    orderNo: row.order_no,
    title: row.title,
    category: normalizeCategory(row.category),
    orderDate: row.order_date,
    fileUrl: row.file_url,
    schoolId: row.school_id,
  };
}

function mapJsonItem(raw: LegacyDocumentJson): DocumentItem {
  return {
    id: raw.id ?? crypto.randomUUID(),
    issuedAt: raw.issuedAt ?? new Date().toLocaleString("th-TH"),
    orderNo: raw.orderNo ?? "",
    title: raw.title ?? "",
    category: normalizeCategory(raw.category),
    orderDate: raw.orderDate ?? "",
    fileUrl: raw.fileUrl ?? "#",
    schoolId: raw.schoolId ?? null,
  };
}

async function ensureDataFile() {
  const dir = path.dirname(dataFilePath);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(dataFilePath);
  } catch {
    await fs.writeFile(dataFilePath, "[]", "utf-8");
  }
}

export async function getDocuments(scope: DocumentListScope = { kind: "all" }) {
  if (scope.kind === "none") {
    return [];
  }

  const multi = await isMultiSchoolMode();

  if (isDatabaseEnabled()) {
    if (scope.kind === "all") {
      const { rows } = await dbQuery<DocumentRow>(`
        SELECT id, issued_at, order_no, title, category, order_date, file_url, school_id
        FROM documents
        ORDER BY sort_id DESC
      `);
      return rows.map((row) => mapRow(row));
    }
    if (scope.kind === "public") {
      if (!multi) {
        const { rows } = await dbQuery<DocumentRow>(`
          SELECT id, issued_at, order_no, title, category, order_date, file_url, school_id
          FROM documents
          ORDER BY sort_id DESC
        `);
        return rows.map((row) => mapRow(row));
      }
      const { rows } = await dbQuery<DocumentRow>(
        `
        SELECT id, issued_at, order_no, title, category, order_date, file_url, school_id
        FROM documents
        WHERE school_id IS NULL
        ORDER BY sort_id DESC
      `,
      );
      return rows.map((row) => mapRow(row));
    }
    if (scope.kind === "school") {
      const { rows } = await dbQuery<DocumentRow>(
        `
        SELECT id, issued_at, order_no, title, category, order_date, file_url, school_id
        FROM documents
        WHERE school_id = $1
        ORDER BY sort_id DESC
      `,
        [scope.schoolId],
      );
      return rows.map((row) => mapRow(row));
    }
    return [];
  }

  await ensureDataFile();
  const raw = await fs.readFile(dataFilePath, "utf-8");
  const parsed = JSON.parse(raw) as LegacyDocumentJson[];
  const items = parsed.map((item) => mapJsonItem(item));
  if (scope.kind === "all") {
    return items;
  }
  if (scope.kind === "public") {
    if (!multi) return items;
    return items.filter((d) => d.schoolId == null || d.schoolId === "");
  }
  if (scope.kind === "school") {
    return items.filter((d) => d.schoolId === scope.schoolId);
  }
  return [];
}

async function saveDocuments(items: DocumentItem[]) {
  await ensureDataFile();
  await fs.writeFile(dataFilePath, JSON.stringify(items, null, 2), "utf-8");
}

export async function addDocument(
  payload: Omit<DocumentItem, "id" | "issuedAt"> & { schoolId?: string | null },
) {
  const schoolId = payload.schoolId ?? null;

  if (isDatabaseEnabled()) {
    const newItem: DocumentItem = {
      id: crypto.randomUUID(),
      issuedAt: new Date().toLocaleString("th-TH"),
      orderNo: payload.orderNo,
      title: payload.title,
      category: payload.category,
      orderDate: payload.orderDate,
      fileUrl: payload.fileUrl,
      schoolId,
    };

    await dbQuery(
      `INSERT INTO documents
        (id, issued_at, order_no, title, category, order_date, file_url, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newItem.id,
        newItem.issuedAt,
        newItem.orderNo,
        newItem.title,
        newItem.category,
        newItem.orderDate,
        newItem.fileUrl,
        schoolId,
      ],
    );
    return newItem;
  }

  const items = await getDocuments({ kind: "all" });
  const newItem: DocumentItem = {
    id: crypto.randomUUID(),
    issuedAt: new Date().toLocaleString("th-TH"),
    orderNo: payload.orderNo,
    title: payload.title,
    category: payload.category,
    orderDate: payload.orderDate,
    fileUrl: payload.fileUrl,
    schoolId,
  };
  items.unshift(newItem);
  await saveDocuments(items);
  return newItem;
}

export async function saveUploadedPdf(fileName: string, bytes: Uint8Array) {
  await fs.mkdir(uploadsDirPath, { recursive: true });
  const filePath = path.join(uploadsDirPath, fileName);
  await fs.writeFile(filePath, bytes);
  return `/uploads/${fileName}`;
}

export async function getDocumentById(id: string): Promise<DocumentItem | null> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<DocumentRow>(
      `SELECT id, issued_at, order_no, title, category, order_date, file_url, school_id
       FROM documents WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  const items = await getDocuments({ kind: "all" });
  return items.find((item) => item.id === id) ?? null;
}

export async function removeDocument(id: string) {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<DocumentRow>(
      `DELETE FROM documents
       WHERE id = $1
       RETURNING id, issued_at, order_no, title, category, order_date, file_url, school_id`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  const items = await getDocuments({ kind: "all" });
  const removedItem = items.find((item) => item.id === id) ?? null;
  const filtered = items.filter((item) => item.id !== id);
  await saveDocuments(filtered);
  return removedItem;
}

export async function updateDocument(
  id: string,
  payload: Omit<DocumentItem, "id" | "issuedAt">,
) {
  if (isDatabaseEnabled()) {
    const issuedAt = new Date().toLocaleString("th-TH");
    const { rows } = await dbQuery<DocumentRow>(
      `UPDATE documents
       SET issued_at = $2,
           order_no = $3,
           title = $4,
           category = $5,
           order_date = $6,
           file_url = $7,
           school_id = $8
       WHERE id = $1
       RETURNING id, issued_at, order_no, title, category, order_date, file_url, school_id`,
      [
        id,
        issuedAt,
        payload.orderNo,
        payload.title,
        payload.category,
        payload.orderDate,
        payload.fileUrl,
        payload.schoolId ?? null,
      ],
    );

    const row = rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  const items = await getDocuments({ kind: "all" });
  const targetIndex = items.findIndex((item) => item.id === id);
  if (targetIndex === -1) {
    return null;
  }

  const updated: DocumentItem = {
    ...items[targetIndex]!,
    ...payload,
    issuedAt: new Date().toLocaleString("th-TH"),
  };
  items[targetIndex] = updated;
  await saveDocuments(items);
  return updated;
}

export async function removeUploadedPdf(fileUrl: string) {
  if (!fileUrl.startsWith("/uploads/")) {
    return;
  }

  const fileName = fileUrl.replace("/uploads/", "");
  const filePath = path.join(uploadsDirPath, fileName);

  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore missing file errors to keep delete flow resilient.
  }
}
