import { randomBytes } from "crypto";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

export function getGoogleRedirectUri(req: Request) {
  if (process.env.GOOGLE_REDIRECT_URI?.trim()) {
    return process.env.GOOGLE_REDIRECT_URI.trim();
  }
  const url = new URL(req.url);
  return `${url.origin}/api/auth/google/callback`;
}

export function createOAuthState() {
  return randomBytes(24).toString("hex");
}

export function buildGoogleAuthorizeUrl(redirectUri: string, state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ["openid", "email", "profile"].join(" "),
    state,
    access_type: "online",
    include_granted_scopes: "true",
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function exchangeGoogleAuthorizationCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "token_exchange_failed",
    );
  }

  return { access_token: data.access_token };
}

export type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

export async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as GoogleUserInfo;
  if (!res.ok || !data.sub) {
    throw new Error("userinfo_failed");
  }
  return data;
}
