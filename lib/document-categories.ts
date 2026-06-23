export const DOCUMENT_CATEGORIES = [
  { slug: "salary_adjustment", label: "เลื่อน/แก้ไข เงินเดือน" },
  { slug: "assistant_appointment", label: "บรรจุ/ประเมิน ครูผู้ช่วย" },
  { slug: "assistant_to_teacher", label: "แต่งตั้งครูผู้ช่วยให้ดำรงตำแหน่งครู" },
  { slug: "teacher_transfer", label: "ย้าย/โอน ข้าราชการครู" },
  { slug: "academic_rank", label: "วิทยฐานะ" },
  { slug: "resignation", label: "ลาออก" },
  { slug: "others", label: "อื่น ๆ" },
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["slug"];

export const DEFAULT_CATEGORY: DocumentCategory = "others";

const CATEGORY_SLUGS = new Set<string>(
  DOCUMENT_CATEGORIES.map((item) => item.slug),
);

export function isDocumentCategory(value: string): value is DocumentCategory {
  return CATEGORY_SLUGS.has(value);
}

export function getCategoryLabel(slug: DocumentCategory): string {
  const match = DOCUMENT_CATEGORIES.find((item) => item.slug === slug);
  return match?.label ?? slug;
}
