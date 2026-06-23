/**
 * Remove junk / test schools that should not appear in production.
 *
 * Run: npx tsx --env-file=.env.local scripts/remove-junk-schools.ts
 */
import { removeSchool, getSchools } from "../lib/schools";
import { getUsersBySchoolId, removeUser } from "../lib/users";

const JUNK_SCHOOL_NAMES = new Set([
  "โรงเรียน A",
  "โรงเรียน B",
  "โรงเรียนทดสอบ A",
  "โรงเรียนทดสอบ B",
]);

const JUNK_SCHOOL_CODES = new Set(["19990001", "19990002"]);

function isJunkSchool(school: { name: string; schoolCode: string }) {
  return (
    JUNK_SCHOOL_NAMES.has(school.name) ||
    JUNK_SCHOOL_CODES.has(school.schoolCode.trim())
  );
}

async function main() {
  const schools = await getSchools();
  const targets = schools.filter(isJunkSchool);

  if (targets.length === 0) {
    console.log("No junk schools found — already clean.");
    return;
  }

  for (const school of targets) {
    const users = await getUsersBySchoolId(school.id);
    for (const user of users) {
      const removed = await removeUser(user.username);
      if (removed) {
        console.log(`Removed user ${user.username} for ${school.name}`);
      }
    }

    const removedSchool = await removeSchool(school.id);
    if (removedSchool) {
      console.log(`Removed school ${removedSchool.name} (${removedSchool.id})`);
    }
  }

  const remaining = await getSchools();
  console.log(`Done. Schools remaining: ${remaining.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
