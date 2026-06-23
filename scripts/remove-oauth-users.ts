/**
 * Remove users created via OAuth (google, microsoft, line).
 *
 * Run: npx tsx --env-file=.env.local scripts/remove-oauth-users.ts
 */
import { promises as fs } from "fs";
import path from "path";

import { dbQuery, isDatabaseEnabled } from "../lib/db";
import { getUsers, removeUser } from "../lib/users";

const OAUTH_PROVIDERS = new Set(["google", "microsoft", "line"]);
const usersFilePath = path.join(process.cwd(), "data", "users.json");

type OAuthUserRow = {
  username: string;
  authProvider: string;
  role: string;
};

async function listOAuthUsers(): Promise<OAuthUserRow[]> {
  if (isDatabaseEnabled()) {
    const { rows } = await dbQuery<{
      username: string;
      auth_provider: string;
      role: string;
    }>(
      `SELECT username, auth_provider, role
       FROM users
       WHERE auth_provider = ANY($1::text[])
       ORDER BY username ASC`,
      [["google", "microsoft", "line"]],
    );
    return rows.map((row) => ({
      username: row.username,
      authProvider: row.auth_provider,
      role: row.role,
    }));
  }

  try {
    const raw = await fs.readFile(usersFilePath, "utf-8");
    const parsed = JSON.parse(raw) as Array<{
      username: string;
      authProvider?: string;
      role: string;
    }>;
    return parsed
      .filter((user) => OAUTH_PROVIDERS.has(user.authProvider ?? "local"))
      .map((user) => ({
        username: user.username,
        authProvider: user.authProvider ?? "local",
        role: user.role,
      }));
  } catch {
    return [];
  }
}

async function main() {
  const oauthUsers = await listOAuthUsers();

  if (oauthUsers.length === 0) {
    console.log("No OAuth users found — already clean.");
    return;
  }

  const allUsers = await getUsers();
  const localAdmins = allUsers.filter(
    (user) => user.role === "admin" && !oauthUsers.some((o) => o.username === user.username),
  );

  const oauthAdmins = oauthUsers.filter((user) => user.role === "admin");
  if (localAdmins.length === 0 && oauthAdmins.length > 0) {
    throw new Error(
      "Refusing to delete OAuth users: no local admin accounts would remain.",
    );
  }

  console.log(`Removing ${oauthUsers.length} OAuth user(s)...`);

  for (const user of oauthUsers) {
    const removed = await removeUser(user.username);
    if (removed) {
      console.log(`Removed ${user.username} (${user.authProvider})`);
    }
  }

  const remainingOAuth = await listOAuthUsers();
  if (remainingOAuth.length > 0) {
    throw new Error(`${remainingOAuth.length} OAuth user(s) still remain.`);
  }

  const after = await getUsers();
  console.log(`Done. Users remaining: ${after.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
