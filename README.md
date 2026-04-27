This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Authentication (Google + Microsoft + multi-school)

- Copy [`.env.example`](.env.example) and set `AUTH_SESSION_SECRET`, OAuth client IDs/secrets, and platform admin emails.
- **Google:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; optional `GOOGLE_REDIRECT_URI` (defaults to `{origin}/api/auth/google/callback`).
- **Microsoft:** register an app in [Microsoft Entra admin center](https://entra.microsoft.com/) with **Supported account types** = *Accounts in any organizational directory and personal Microsoft accounts* (matches tenant `common`). Add **Web** redirect URIs, e.g. `http://localhost:3000/api/auth/microsoft/callback` and `https://<your-domain>/api/auth/microsoft/callback`. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`; optional `MICROSOFT_REDIRECT_URI`.
- **District admins:** `PLATFORM_GOOGLE_ADMIN_EMAILS` and/or `PLATFORM_OAUTH_ADMIN_EMAILS` (comma-separated, merged and deduped) — those addresses get `admin` with no school after OAuth sign-in.
- In **Admin**, add schools and **verified email domains** so teachers can sign in with Google or Microsoft when their email domain matches.
- After rollout, set `ENABLE_LOCAL_LOGIN=false` to disable password login.
- SQL reference: [`migrations/20260426_google_auth.sql`](migrations/20260426_google_auth.sql), [`migrations/20260427_microsoft_oauth.sql`](migrations/20260427_microsoft_oauth.sql)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
