import { NextResponse } from "next/server";

import {
  buildMicrosoftAuthorizeUrl,
  createMicrosoftOAuthState,
  getMicrosoftRedirectUri,
  MICROSOFT_OAUTH_STATE_COOKIE,
} from "@/lib/oauth-microsoft";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const redirectUri = getMicrosoftRedirectUri(req);
    const state = createMicrosoftOAuthState();
    const url = buildMicrosoftAuthorizeUrl(redirectUri, state);

    const response = NextResponse.redirect(url);
    response.cookies.set({
      name: MICROSOFT_OAUTH_STATE_COOKIE,
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
      new URL("/login?error=microsoft_config", new URL(req.url).origin),
    );
  }
}
