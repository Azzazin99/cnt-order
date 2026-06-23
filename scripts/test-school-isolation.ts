/**
 * Smoke test for school document isolation (file-based storage).
 * Adds temporary test schools and cleans them up without touching imported data.
 *
 * Run: npx tsx scripts/test-school-isolation.ts
 */
import { promises as fs } from "fs";
import path from "path";

import { addDocument } from "../lib/documents";
import { getDocuments } from "../lib/documents";
import { provisionSchoolAccount } from "../lib/school-accounts";
import { addSchool, getSchoolByCode } from "../lib/schools";

const TEST_CODES = ["19990001", "19990002"] as const;
const dataDir = path.join(process.cwd(), "data");

async function cleanupTestArtifacts() {
  const schoolsPath = path.join(dataDir, "schools.json");
  const usersPath = path.join(dataDir, "users.json");
  const domainsPath = path.join(dataDir, "school_domains.json");
  const documentsPath = path.join(dataDir, "documents.json");

  const schools = JSON.parse(await fs.readFile(schoolsPath, "utf-8")) as Array<{
    id: string;
    schoolCode?: string;
  }>;
  const testSchoolIds = new Set(
    schools
      .filter((s) => TEST_CODES.includes(s.schoolCode as (typeof TEST_CODES)[number]))
      .map((s) => s.id),
  );

  const nextSchools = schools.filter((s) => !testSchoolIds.has(s.id));
  await fs.writeFile(schoolsPath, JSON.stringify(nextSchools, null, 2), "utf-8");

  const users = JSON.parse(await fs.readFile(usersPath, "utf-8")) as Array<{
    username: string;
    schoolId?: string | null;
  }>;
  const nextUsers = users.filter(
    (u) =>
      !TEST_CODES.includes(u.username as (typeof TEST_CODES)[number]) &&
      !testSchoolIds.has(u.schoolId ?? ""),
  );
  await fs.writeFile(usersPath, JSON.stringify(nextUsers, null, 2), "utf-8");

  try {
    const domains = JSON.parse(await fs.readFile(domainsPath, "utf-8")) as Array<{
      schoolId: string;
    }>;
    const nextDomains = domains.filter((d) => !testSchoolIds.has(d.schoolId));
    await fs.writeFile(domainsPath, JSON.stringify(nextDomains, null, 2), "utf-8");
  } catch {
    /* optional file */
  }

  try {
    const documents = JSON.parse(await fs.readFile(documentsPath, "utf-8")) as Array<{
      id: string;
      schoolId?: string | null;
      title?: string;
    }>;
    const nextDocuments = documents.filter(
      (d) => d.title !== "School A isolation test doc" && !testSchoolIds.has(d.schoolId ?? ""),
    );
    await fs.writeFile(documentsPath, JSON.stringify(nextDocuments, null, 2), "utf-8");
  } catch {
    /* optional file */
  }
}

async function main() {
  await cleanupTestArtifacts();

  try {
    const schoolA = await addSchool({
      name: "โรงเรียนทดสอบ A",
      schoolCode: "19990001",
      moeCode: "1019999001",
    });
    if ("error" in schoolA) throw new Error(`addSchool A failed: ${schoolA.error}`);

    const schoolB = await addSchool({
      name: "โรงเรียนทดสอบ B",
      schoolCode: "19990002",
      moeCode: "1019999002",
    });
    if ("error" in schoolB) throw new Error(`addSchool B failed: ${schoolB.error}`);

    await fs.writeFile(
      path.join(dataDir, "school_domains.json"),
      JSON.stringify(
        [
          {
            id: "dom-isolation-test",
            schoolId: schoolA.id,
            domain: "isolation-test.ac.th",
            isVerified: true,
            isPrimary: true,
          },
        ],
        null,
        2,
      ),
      "utf-8",
    );

    await addDocument({
      orderNo: "ISO-001",
      title: "School A isolation test doc",
      category: "others",
      orderDate: "2026-01-01",
      fileUrl: "#",
      schoolId: schoolA.id,
    });

    const accountA = await provisionSchoolAccount(schoolA);
    if ("error" in accountA) throw new Error("provision A failed");

    const schoolADocs = await getDocuments({ kind: "school", schoolId: schoolA.id });
    const schoolBDocs = await getDocuments({ kind: "school", schoolId: schoolB.id });
    const publicDocs = await getDocuments({ kind: "public" });
    const noneDocs = await getDocuments({ kind: "none" });

    const checks = [
      schoolADocs.some((d) => d.title === "School A isolation test doc"),
      schoolBDocs.length === 0,
      publicDocs.every((d) => !d.schoolId),
      noneDocs.length === 0,
      accountA.username === "19990001" && accountA.schoolId === schoolA.id,
      (await getSchoolByCode("18010004")) !== null,
    ];

    if (checks.every(Boolean)) {
      console.log("PASS: school isolation smoke test");
    } else {
      console.error("FAIL:", {
        schoolADocs: schoolADocs.length,
        schoolBDocs: schoolBDocs.length,
        publicDocs: publicDocs.length,
        noneDocs: noneDocs.length,
        accountA,
        importedSample: await getSchoolByCode("18010004"),
      });
      process.exitCode = 1;
    }
  } finally {
    await cleanupTestArtifacts();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
