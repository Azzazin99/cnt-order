export function formatSchoolDisplayName(rawName: string) {
  const trimmed = rawName.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("โรงเรียน")) return trimmed;
  return `โรงเรียน${trimmed}`;
}
