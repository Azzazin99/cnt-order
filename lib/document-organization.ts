import { formatSchoolDisplayName } from "@/lib/school-display";

export const DISTRICT_ORG_KEY = "district";
export const DISTRICT_ORG_LABEL = "สพป.ชัยนาท";

export function organizationKeyFromSchoolId(
  schoolId: string | null | undefined,
): string {
  if (schoolId == null || schoolId === "") {
    return DISTRICT_ORG_KEY;
  }
  return schoolId;
}

export function getOrganizationLabel(
  schoolId: string | null | undefined,
  schoolsById: Map<string, string>,
): string {
  if (schoolId == null || schoolId === "") {
    return DISTRICT_ORG_LABEL;
  }
  const name = schoolsById.get(schoolId);
  if (!name) {
    return "โรงเรียน (ไม่พบข้อมูล)";
  }
  return formatSchoolDisplayName(name);
}

export function buildSchoolNameMap(
  schools: { id: string; name: string }[],
): Map<string, string> {
  return new Map(schools.map((school) => [school.id, school.name]));
}
