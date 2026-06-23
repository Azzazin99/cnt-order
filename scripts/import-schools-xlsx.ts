/**
 * Import schools from _สพป.ชัยนาท.xlsx (SMIS + รหัสกระทรวง + ชื่อโรงเรียน)
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/import-schools-xlsx.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/import-schools-xlsx.ts
 */
import { execFileSync } from "child_process";
import path from "path";

import { provisionSchoolAccount } from "../lib/school-accounts";
import {
  addSchool,
  formatSchoolDisplayName,
  getSchoolByCode,
} from "../lib/schools";

type XlsxSchoolRow = {
  smis: string;
  moe: string;
  name: string;
};

function readXlsxRows(xlsxPath: string): XlsxSchoolRow[] {
  const helper = path.join(process.cwd(), "scripts", "read-xlsx-schools.py");
  const output = execFileSync("python3", [helper, xlsxPath], {
    encoding: "utf-8",
  });
  return JSON.parse(output) as XlsxSchoolRow[];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const xlsxPath =
    process.argv.find((arg) => arg.endsWith(".xlsx")) ??
    path.join(process.cwd(), "_สพป.ชัยนาท.xlsx");

  const rows = readXlsxRows(xlsxPath);
  console.log(`พบ ${rows.length} โรงเรียนในไฟล์ ${path.basename(xlsxPath)}`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const schoolCode = row.smis.trim();
    const moeCode = row.moe.trim();
    const name = formatSchoolDisplayName(row.name);

    const existing = await getSchoolByCode(schoolCode);
    if (existing) {
      skipped += 1;
      console.log(`ข้าม (มีแล้ว): ${schoolCode} ${name}`);
      continue;
    }

    if (dryRun) {
      created += 1;
      console.log(`[dry-run] ${schoolCode} | ${moeCode} | ${name}`);
      continue;
    }

    const schoolResult = await addSchool({ name, schoolCode, moeCode });
    if ("error" in schoolResult) {
      failed += 1;
      console.error(`ล้มเหลว: ${schoolCode} ${name} (${schoolResult.error})`);
      continue;
    }

    const account = await provisionSchoolAccount(schoolResult);
    if ("error" in account) {
      failed += 1;
      console.error(
        `สร้างโรงเรียนแล้วแต่บัญชีล้มเหลว: ${schoolCode} (${account.error})`,
      );
      continue;
    }

    created += 1;
    if (created <= 3 || created % 25 === 0) {
      console.log(`สร้างแล้ว: ${schoolCode} | ${moeCode} | ${name}`);
    }
  }

  console.log("");
  console.log(
    dryRun
      ? `สรุป dry-run: จะสร้าง ${created}, ข้าม ${skipped}, ล้มเหลว ${failed}`
      : `สรุป: สร้าง ${created}, ข้าม ${skipped}, ล้มเหลว ${failed}`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
