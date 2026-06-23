<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is `cnt-order`, a Thai-language document admin system (Next.js 16 App Router, React 19, Tailwind 4, `pg`). Scripts live in `package.json` (`dev`, `build`, `start`, `lint`); there is no automated test script.

- **Runs without a database by default.** When `DATABASE_URL` is unset, all data persists to JSON files in `data/` (e.g. `data/documents.json`, `data/users.json`, `data/audit-log.json`) and uploads go to `public/uploads/`. This is the normal dev path — do not assume Postgres is required. Setting `DATABASE_URL` switches to Postgres; schema/seed run automatically on first query.
- **Local login (no OAuth needed):** username `admin` / password `admin1234`, or `editor` / `editor1234` (password is role + `1234` when `ADMIN_PASSWORD_HASH` is unset). Google/Microsoft OAuth buttons on `/login` need external provider credentials (`GOOGLE_*` / `MICROSOFT_*` env vars) and are non-functional without them.
- **Dev server:** `npm run dev` serves on port 3000. Core flow to verify: log in at `/login` → `/admin` dashboard → add/edit documents.
- **Pre-existing lint error:** `npm run lint` reports one error in `components/theme-toggle.tsx` (`react-hooks/set-state-in-effect`) that exists on the base branch; it is not caused by your changes.
