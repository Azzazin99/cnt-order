import { NextResponse } from "next/server";

import {
  buildGoogleAuthorizeUrl,
  createOAuthState,
  getGoogleRedirectUri,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/oauth-google";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const redirectUri = getGoogleRedirectUri(req);
    const state = createOAuthState();
    const url = buildGoogleAuthorizeUrl(redirectUri, state);

    const response = NextResponse.redirect(url);
    response.cookies.set({
      name: GOOGLE_OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=google_config", new URL(req.url).origin),
    );
  }
}
