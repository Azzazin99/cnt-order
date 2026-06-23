const PDF_MIME = "application/pdf";

export const PDF_UPLOAD_ERROR = "รองรับเฉพาะไฟล์ PDF";

export function isPdfFileName(name: string): boolean {
  return name.toLowerCase().endsWith(".pdf");
}

export function isPdfMimeType(type: string): boolean {
  return !type || type === PDF_MIME;
}

export function hasPdfMagicBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

export function isPdfFileMeta(file: Pick<File, "name" | "type">): boolean {
  return isPdfFileName(file.name) && isPdfMimeType(file.type);
}

export async function assertPdfUpload(file: File): Promise<void> {
  if (!isPdfFileName(file.name)) {
    throw new Error(PDF_UPLOAD_ERROR);
  }
  if (!isPdfMimeType(file.type)) {
    throw new Error(PDF_UPLOAD_ERROR);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasPdfMagicBytes(bytes)) {
    throw new Error(PDF_UPLOAD_ERROR);
  }
}
