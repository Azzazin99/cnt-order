import { promises as fs } from "fs";
import path from "path";

import { dbQuery, isDatabaseEnabled } from "@/lib/db";

export type SchoolStatus = "active" | "inactive";

export type SchoolRecord = {
  id: string;
  name: string;
  status: SchoolStatus;
};

export type SchoolDomainRecord = {
  id: string;
  schoolId: string;
  domain: string;
  isVerified: boolean;
  isPrimary: boolean;
};

const schoolsFilePath = path.join(process.cwd(), "data", "schools.json");
const domainsFilePath = path.join(process.cwd(), "data", "school_domains.json");

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
  try {
    await fs.access(domainsFilePath);
  } catch {
    await fs.writeFile(domainsFilePath, "[]", "utf-8");
  }
}

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

export function emailDomain(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return normalizeDomain(email.slice(at + 1));
}

export async function getSchools(): Promise<SchoolRecord[]> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      id: string;
      name: string;
      status: string;
    }>(`SELECT id, name, status FROM schools ORDER BY name ASC`);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status === "inactive" ? "inactive" : "active",
    }));
  }

  try {
    await ensureSchoolsFiles();
    const raw = await fs.readFile(schoolsFilePath, "utf-8");
    const parsed = JSON.parse(raw) as SchoolRecord[];
    return parsed;
  } catch {
    return [];
  }
}

export async function getSchoolById(id: string): Promise<SchoolRecord | null> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      id: string;
      name: string;
      status: string;
    }>(`SELECT id, name, status FROM schools WHERE id = $1`, [id]);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      status: r.status === "inactive" ? "inactive" : "active",
    };
  }

  const schools = await getSchools();
  return schools.find((s) => s.id === id) ?? null;
}

export async function hasVerifiedSchoolDomains(): Promise<boolean> {
  const domains = await getSchoolDomains();
  return domains.some((d) => d.isVerified);
}

export async function getSchoolDomains(): Promise<SchoolDomainRecord[]> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      id: string;
      school_id: string;
      domain: string;
      is_verified: boolean;
      is_primary: boolean;
    }>(
      `SELECT id, school_id, domain, is_verified, is_primary
       FROM school_domains
       ORDER BY domain ASC`,
    );
    return rows.map((r) => ({
      id: r.id,
      schoolId: r.school_id,
      domain: normalizeDomain(r.domain),
      isVerified: r.is_verified,
      isPrimary: r.is_primary,
    }));
  }

  try {
    await ensureSchoolsFiles();
    const raw = await fs.readFile(domainsFilePath, "utf-8");
    return JSON.parse(raw) as SchoolDomainRecord[];
  } catch {
    return [];
  }
}

export async function findSchoolIdByEmailDomain(
  email: string,
): Promise<{ schoolId: string; domain: string } | null> {
  const dom = emailDomain(email);
  if (!dom) return null;

  const domains = await getSchoolDomains();
  const match = domains.find(
    (d) => d.isVerified && normalizeDomain(d.domain) === dom,
  );
  if (!match) return null;
  return { schoolId: match.schoolId, domain: match.domain };
}

export async function addSchool(input: {
  name: string;
  status?: SchoolStatus;
}): Promise<SchoolRecord> {
  const id = crypto.randomUUID();
  const status = input.status ?? "active";

  if (isDatabaseEnabled()) {
    await dbQuery(
      `INSERT INTO schools (id, name, status) VALUES ($1, $2, $3)`,
      [id, input.name.trim(), status],
    );
    return { id, name: input.name.trim(), status };
  }

  if (!canWriteLocalFiles()) {
    throw new Error("SCHOOL_STORAGE_UNAVAILABLE");
  }
  await ensureSchoolsFiles();
  const schools = await getSchools();
  const row: SchoolRecord = { id, name: input.name.trim(), status };
  schools.push(row);
  await fs.writeFile(schoolsFilePath, JSON.stringify(schools, null, 2), "utf-8");
  return row;
}

export async function addSchoolDomain(input: {
  schoolId: string;
  domain: string;
  isVerified?: boolean;
  isPrimary?: boolean;
}): Promise<SchoolDomainRecord | { error: "exists" | "school_not_found" }> {
  const domain = normalizeDomain(input.domain);
  if (!domain) {
    return { error: "school_not_found" };
  }

  const school = await getSchoolById(input.schoolId);
  if (!school) return { error: "school_not_found" };

  const id = crypto.randomUUID();
  const isVerified = input.isVerified ?? true;
  const isPrimary = input.isPrimary ?? false;

  if (isDatabaseEnabled()) {
    try {
      await dbQuery(
        `INSERT INTO school_domains (id, school_id, domain, is_verified, is_primary)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, input.schoolId, domain, isVerified, isPrimary],
      );
    } catch {
      return { error: "exists" };
    }
    return { id, schoolId: input.schoolId, domain, isVerified, isPrimary };
  }

  if (!canWriteLocalFiles()) {
    throw new Error("SCHOOL_STORAGE_UNAVAILABLE");
  }
  const domains = await getSchoolDomains();
  if (domains.some((d) => normalizeDomain(d.domain) === domain)) {
    return { error: "exists" };
  }
  const row: SchoolDomainRecord = {
    id,
    schoolId: input.schoolId,
    domain,
    isVerified,
    isPrimary,
  };
  domains.push(row);
  await fs.writeFile(domainsFilePath, JSON.stringify(domains, null, 2), "utf-8");
  return row;
}

export async function removeSchoolDomain(
  domainId: string,
): Promise<SchoolDomainRecord | null> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      id: string;
      school_id: string;
      domain: string;
      is_verified: boolean;
      is_primary: boolean;
    }>(
      `DELETE FROM school_domains WHERE id = $1
       RETURNING id, school_id, domain, is_verified, is_primary`,
      [domainId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      schoolId: r.school_id,
      domain: normalizeDomain(r.domain),
      isVerified: r.is_verified,
      isPrimary: r.is_primary,
    };
  }

  if (!canWriteLocalFiles()) {
    throw new Error("SCHOOL_STORAGE_UNAVAILABLE");
  }
  const domains = await getSchoolDomains();
  const found = domains.find((d) => d.id === domainId) ?? null;
  if (!found) return null;
  const next = domains.filter((d) => d.id !== domainId);
  await fs.writeFile(domainsFilePath, JSON.stringify(next, null, 2), "utf-8");
  return found;
}

export async function setSchoolDomainVerified(
  domainId: string,
  isVerified: boolean,
): Promise<SchoolDomainRecord | null> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      id: string;
      school_id: string;
      domain: string;
      is_verified: boolean;
      is_primary: boolean;
    }>(
      `UPDATE school_domains SET is_verified = $2 WHERE id = $1
       RETURNING id, school_id, domain, is_verified, is_primary`,
      [domainId, isVerified],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      schoolId: r.school_id,
      domain: normalizeDomain(r.domain),
      isVerified: r.is_verified,
      isPrimary: r.is_primary,
    };
  }

  if (!canWriteLocalFiles()) {
    throw new Error("SCHOOL_STORAGE_UNAVAILABLE");
  }
  const domains = await getSchoolDomains();
  const idx = domains.findIndex((d) => d.id === domainId);
  if (idx === -1) return null;
  domains[idx] = { ...domains[idx]!, isVerified };
  await fs.writeFile(domainsFilePath, JSON.stringify(domains, null, 2), "utf-8");
  return domains[idx]!;
}

export async function getDomainsBySchoolId(
  schoolId: string,
): Promise<SchoolDomainRecord[]> {
  const all = await getSchoolDomains();
  return all.filter((d) => d.schoolId === schoolId);
}
