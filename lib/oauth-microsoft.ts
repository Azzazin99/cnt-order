import { randomBytes } from "crypto";

const MS_AUTHORITY = "https://login.microsoftonline.com/common";
const MS_AUTHORIZE = `${MS_AUTHORITY}/oauth2/v2.0/authorize`;
const MS_TOKEN = `${MS_AUTHORITY}/oauth2/v2.0/token`;
const GRAPH_ME = "https://graph.microsoft.com/v1.0/me";

export const MICROSOFT_OAUTH_STATE_COOKIE = "microsoft_oauth_state";

export function getMicrosoftRedirectUri(req: Request) {
  if (process.env.MICROSOFT_REDIRECT_URI?.trim()) {
    return process.env.MICROSOFT_REDIRECT_URI.trim();
  }
  const url = new URL(req.url);
  return `${url.origin}/api/auth/microsoft/callback`;
}

export function createMicrosoftOAuthState() {
  return randomBytes(24).toString("hex");
}

export function buildMicrosoftAuthorizeUrl(redirectUri: string, state: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("MICROSOFT_CLIENT_ID is not configured");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ["openid", "profile", "email", "offline_access"].join(" "),
    state,
    response_mode: "query",
  });
  return `${MS_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeMicrosoftAuthorizationCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; id_token?: string }> {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth credentials are not configured");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(MS_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json()) as {
    access_token?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "microsoft_token_exchange_failed",
    );
  }

  return { access_token: data.access_token, id_token: data.id_token };
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = Buffer.from(b64 + pad, "base64").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type MicrosoftUserClaims = {
  sub: string;
  email: string;
  emailVerified: boolean;
};

async function fetchGraphMeEmail(accessToken: string): Promise<{
  mail: string | null;
  userPrincipalName: string | null;
} | null> {
  const res = await fetch(GRAPH_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    mail?: string | null;
    userPrincipalName?: string | null;
  };
  return {
    mail: data.mail ?? null,
    userPrincipalName: data.userPrincipalName ?? null,
  };
}

/**
 * อ่าน sub + อีเมลจาก id_token หรือ Microsoft Graph เมื่อ claim ไม่ครบ
 */
export async function resolveMicrosoftUserClaims(
  accessToken: string,
  idToken?: string,
): Promise<MicrosoftUserClaims> {
  let sub = "";
  let email = "";
  let emailVerified = true;

  if (idToken) {
    const payload = decodeJwtPayload(idToken);
    if (payload) {
      sub = typeof payload.sub === "string" ? payload.sub : "";
      const em = typeof payload.email === "string" ? payload.email : "";
      const upn =
        typeof payload.preferred_username === "string"
          ? payload.preferred_username
          : "";
      email = (em || upn).trim().toLowerCase();
      if (payload.email_verified === false) {
        emailVerified = false;
      } else if (payload.email_verified === true) {
        emailVerified = true;
      }
    }
  }

  if (!email) {
    const graph = await fetchGraphMeEmail(accessToken);
    if (graph) {
      const raw = (graph.mail || graph.userPrincipalName || "").trim();
      email = raw.toLowerCase();
    }
  }

  if (!sub && idToken) {
    const payload = decodeJwtPayload(idToken);
    if (payload && typeof payload.sub === "string") {
      sub = payload.sub;
    }
  }

  if (!sub) {
    throw new Error("microsoft_missing_sub");
  }
  if (!email) {
    throw new Error("microsoft_missing_email");
  }

  return { sub, email, emailVerified };
}
