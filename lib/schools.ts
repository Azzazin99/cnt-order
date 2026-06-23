import { promises as fs } from "fs";
import path from "path";

import { dbQuery, isDatabaseEnabled } from "@/lib/db";
import { formatSchoolDisplayName } from "@/lib/school-display";

export { formatSchoolDisplayName };

export type SchoolStatus = "active" | "inactive";

export type SchoolRecord = {
  id: string;
  name: string;
  schoolCode: string;
  moeCode: string;
  status: SchoolStatus;
};

export type AddSchoolError =
  | "invalid_name"
  | "invalid_smis"
  | "invalid_moe"
  | "code_exists"
  | "moe_exists";

const schoolsFilePath = path.join(process.cwd(), "data", "schools.json");

const SMIS_PATTERN = /^\d{8}$/;
const MOE_PATTERN = /^\d{10}$/;

function canWriteLocalFiles() {
  return process.env.VERCEL !== "1";
}

async function ensureSchoolsFiles() {
  if (!canWriteLocalFiles()) return;
  const dir = path.dirname(schoolsFilePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(schoolsFilePath);
  } catch {
    await fs.writeFile(schoolsFilePath, "[]", "utf-8");
  }
}

export function normalizeSchoolCode(code: string) {
  return code.trim();
}

export function validateSmisCode(code: string) {
  return SMIS_PATTERN.test(code.trim());
}

export function validateMoeCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return true;
  return MOE_PATTERN.test(trimmed);
}

function mapSchoolRow(row: {
  id: string;
  name: string;
  school_code?: string | null;
  moe_code?: string | null;
  status: string;
}): SchoolRecord {
  return {
    id: row.id,
    name: row.name,
    schoolCode: row.school_code ?? "",
    moeCode: row.moe_code ?? "",
    status: row.status === "inactive" ? "inactive" : "active",
  };
}

const schoolSelectColumns =
  "id, name, school_code, moe_code, status";

/** มีโรงเรียนที่ import แล้ว — ใช้กำหนด scope เอกสารสาธารณะ */
export async function isMultiSchoolMode(): Promise<boolean> {
  const schools = await getSchools();
  return schools.some((school) => school.schoolCode.trim() !== "");
}

export async function getSchools(): Promise<SchoolRecord[]> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      id: string;
      name: string;
      school_code: string | null;
      moe_code: string | null;
      status: string;
    }>(`SELECT ${schoolSelectColumns} FROM schools ORDER BY name ASC`);
    return rows.map((r) => mapSchoolRow(r));
  }

  try {
    await ensureSchoolsFiles();
    const raw = await fs.readFile(schoolsFilePath, "utf-8");
    const parsed = JSON.parse(raw) as Array<
      SchoolRecord & { schoolCode?: string; moeCode?: string }
    >;
    return parsed.map((s) => ({
      id: s.id,
      name: s.name,
      schoolCode: s.schoolCode ?? "",
      moeCode: s.moeCode ?? "",
      status: s.status === "inactive" ? "inactive" : "active",
    }));
  } catch {
    return [];
  }
}

export async function getSchoolById(id: string): Promise<SchoolRecord | null> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      id: string;
      name: string;
      school_code: string | null;
      moe_code: string | null;
      status: string;
    }>(`SELECT ${schoolSelectColumns} FROM schools WHERE id = $1`, [id]);
    const r = rows[0];
    if (!r) return null;
    return mapSchoolRow(r);
  }

  const schools = await getSchools();
  return schools.find((s) => s.id === id) ?? null;
}

export async function getSchoolByCode(
  schoolCode: string,
): Promise<SchoolRecord | null> {
  const normalized = normalizeSchoolCode(schoolCode);
  if (!normalized) return null;

  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      id: string;
      name: string;
      school_code: string | null;
      moe_code: string | null;
      status: string;
    }>(
      `SELECT ${schoolSelectColumns} FROM schools WHERE school_code = $1`,
      [normalized],
    );
    const r = rows[0];
    if (!r) return null;
    return mapSchoolRow(r);
  }

  const schools = await getSchools();
  return schools.find((s) => normalizeSchoolCode(s.schoolCode) === normalized) ?? null;
}

export async function getSchoolByMoeCode(
  moeCode: string,
): Promise<SchoolRecord | null> {
  const normalized = moeCode.trim();
  if (!normalized) return null;

  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      id: string;
      name: string;
      school_code: string | null;
      moe_code: string | null;
      status: string;
    }>(
      `SELECT ${schoolSelectColumns} FROM schools WHERE moe_code = $1`,
      [normalized],
    );
    const r = rows[0];
    if (!r) return null;
    return mapSchoolRow(r);
  }

  const schools = await getSchools();
  return schools.find((s) => s.moeCode === normalized) ?? null;
}

export async function addSchool(input: {
  name: string;
  schoolCode: string;
  moeCode?: string;
  status?: SchoolStatus;
}): Promise<SchoolRecord | { error: AddSchoolError }> {
  const id = crypto.randomUUID();
  const status = input.status ?? "active";
  const name = input.name.trim();
  const schoolCode = normalizeSchoolCode(input.schoolCode);
  const moeCode = (input.moeCode ?? "").trim();

  if (!name) {
    return { error: "invalid_name" };
  }
  if (!validateSmisCode(schoolCode)) {
    return { error: "invalid_smis" };
  }
  if (!validateMoeCode(moeCode)) {
    return { error: "invalid_moe" };
  }

  const existing = await getSchoolByCode(schoolCode);
  if (existing) {
    return { error: "code_exists" };
  }
  if (moeCode) {
    const existingMoe = await getSchoolByMoeCode(moeCode);
    if (existingMoe) {
      return { error: "moe_exists" };
    }
  }

  if (isDatabaseEnabled()) {
    try {
      await dbQuery(
        `INSERT INTO schools (id, name, school_code, moe_code, status) VALUES ($1, $2, $3, $4, $5)`,
        [id, name, schoolCode, moeCode || null, status],
      );
    } catch {
      return { error: "code_exists" };
    }
    return { id, name, schoolCode, moeCode, status };
  }

  if (!canWriteLocalFiles()) {
    throw new Error("SCHOOL_STORAGE_UNAVAILABLE");
  }
  await ensureSchoolsFiles();
  const schools = await getSchools();
  const row: SchoolRecord = { id, name, schoolCode, moeCode, status };
  schools.push(row);
  await fs.writeFile(schoolsFilePath, JSON.stringify(schools, null, 2), "utf-8");
  return row;
}

export async function removeSchool(
  schoolId: string,
): Promise<SchoolRecord | null> {
  const school = await getSchoolById(schoolId);
  if (!school) return null;

  if (isDatabaseEnabled()) {
    await dbQuery(`DELETE FROM schools WHERE id = $1`, [schoolId]);
    return school;
  }

  if (!canWriteLocalFiles()) {
    throw new Error("SCHOOL_STORAGE_UNAVAILABLE");
  }
  await ensureSchoolsFiles();
  const schools = await getSchools();
  const next = schools.filter((item) => item.id !== schoolId);
  await fs.writeFile(schoolsFilePath, JSON.stringify(next, null, 2), "utf-8");

  return school;
}
