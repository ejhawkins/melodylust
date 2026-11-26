import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  SPOTIFY_TOKEN_URL,
  codeExchangeBody,
  parseTokenReply,
  refreshBody,
  type RefreshResult,
} from "./spotify-auth";

// The listening room's token exchange and refresh. PKCE needs no client secret, so nothing here is secret except the
// refresh token itself, which goes straight into an httpOnly cookie and never reaches page scripts. Spotify is the only
// identity: no Melody Lust account, no user rows, nothing stored but that cookie.

const clientId = () => import.meta.env["VITE_SPOTIFY_CLIENT_ID"] as string | undefined;
const redirectUri = () => import.meta.env["VITE_SPOTIFY_REDIRECT_URI"] as string | undefined;

async function cookieOptions() {
  const { getRequest } = await import("@tanstack/react-start/server");
  // Secure everywhere except a plain-http loopback dev server, where browsers would drop a Secure cookie.
  const secure = new URL(getRequest().url).protocol === "https:";
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: REFRESH_COOKIE_MAX_AGE };
}

async function postToken(body: URLSearchParams) {
  const reply = await fetch(SPOTIFY_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  return { ok: reply.ok, status: reply.status, json: (await reply.json().catch(() => null)) as unknown };
}

const exchangeInput = z.object({ code: z.string().min(1).max(2048), verifier: z.string().min(43).max(128), redirectUri: z.string().url() });

export type ExchangeResult = { status: "ok"; accessToken: string; expiresAt: number } | { status: "not_configured" } | { status: "error" };

/** Trades the sign-in code for tokens: the refresh token into the cookie, the access token back to the page's memory. */
export const exchangeSpotifyCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => exchangeInput.parse(input))
  .handler(async ({ data }): Promise<ExchangeResult> => {
    const id = clientId();
    if (!id || !redirectUri()) return { status: "not_configured" };
    // Only the redirect URI this deployment registered with Spotify.
    if (data.redirectUri !== redirectUri()) return { status: "error" };
    try {
      const reply = await postToken(codeExchangeBody({ clientId: id, code: data.code, verifier: data.verifier, redirectUri: data.redirectUri }));
      const parsed = reply.ok ? parseTokenReply(reply.json, Date.now()) : null;
      if (!parsed) return { status: "error" };
      const { setCookie } = await import("@tanstack/react-start/server");
      if (parsed.refreshToken) setCookie(REFRESH_COOKIE, parsed.refreshToken, await cookieOptions());
      return { status: "ok", accessToken: parsed.token.accessToken, expiresAt: parsed.token.expiresAt };
    } catch (failure) {
      console.error("[Spotify sign-in] exchange failed", failure instanceof Error ? failure.message : failure);
      return { status: "error" };
    }
  });

/** A fresh access token from the cookie's refresh token, rotating the cookie when Spotify issues a new one. */
export const refreshSpotifyToken = createServerFn({ method: "POST" }).handler(async (): Promise<RefreshResult> => {
  const id = clientId();
  const { getCookie, setCookie, deleteCookie } = await import("@tanstack/react-start/server");
  const refreshToken = getCookie(REFRESH_COOKIE);
  if (!id || !refreshToken) return { status: "signed_out" };
  try {
    const reply = await postToken(refreshBody({ clientId: id, refreshToken }));
    if (reply.status === 400 || reply.status === 401) {
      // Revoked or expired: forget it, so the room falls back to silence instead of retrying forever.
      deleteCookie(REFRESH_COOKIE, { path: "/" });
      return { status: "signed_out" };
    }
    const parsed = reply.ok ? parseTokenReply(reply.json, Date.now()) : null;
    if (!parsed) return { status: "error" };
    if (parsed.refreshToken) setCookie(REFRESH_COOKIE, parsed.refreshToken, await cookieOptions());
    return { status: "ok", token: parsed.token };
  } catch (failure) {
    console.error("[Spotify sign-in] refresh failed", failure instanceof Error ? failure.message : failure);
    return { status: "error" };
  }
});

/** Leaving the listening room: the refresh-token cookie goes. */
export const forgetSpotify = createServerFn({ method: "POST" }).handler(async () => {
  const { deleteCookie } = await import("@tanstack/react-start/server");
  deleteCookie(REFRESH_COOKIE, { path: "/" });
  return { status: "ok" as const };
});
