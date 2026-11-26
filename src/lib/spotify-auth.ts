// Spotify tokens for the listening room. The access token lives only in memory (createTokenStore); the refresh token
// lives only in an httpOnly cookie that the server functions in spotify-auth.functions.ts set, rotate and clear. This
// module is the plain logic both sides share, tested without Spotify or a request.

export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

/** The httpOnly cookie holding the refresh token. Never readable from page scripts. */
export const REFRESH_COOKIE = "ml_spotify_rt";

/** Spotify's refresh tokens for this app last 180 days (developer dashboard, Basic Information). */
export const REFRESH_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;

export type SpotifyToken = { accessToken: string; expiresAt: number };

export type TokenReply = { token: SpotifyToken; refreshToken: string | null };

/** Spotify's token reply, read defensively. Null when it isn't a usable bearer token. */
export function parseTokenReply(reply: unknown, now: number): TokenReply | null {
  const r = reply as { access_token?: unknown; token_type?: unknown; expires_in?: unknown; refresh_token?: unknown } | null;
  if (!r || typeof r.access_token !== "string" || !r.access_token) return null;
  if (typeof r.token_type === "string" && r.token_type.toLowerCase() !== "bearer") return null;
  const seconds = typeof r.expires_in === "number" && r.expires_in > 0 ? r.expires_in : 3600;
  return {
    token: { accessToken: r.access_token, expiresAt: now + seconds * 1000 },
    refreshToken: typeof r.refresh_token === "string" && r.refresh_token ? r.refresh_token : null,
  };
}

/** The form body that trades a sign-in code for tokens (PKCE: the verifier stands in for a client secret). */
export function codeExchangeBody({ clientId, code, verifier, redirectUri }: { clientId: string; code: string; verifier: string; redirectUri: string }) {
  return new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier });
}

/** The form body that trades a refresh token for a fresh access token. */
export function refreshBody({ clientId, refreshToken }: { clientId: string; refreshToken: string }) {
  return new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId });
}

/** True once the token is within `skewMs` of expiring (or past it), so a call never goes out on a dying token. */
export const needsRefresh = (token: SpotifyToken | null, now: number, skewMs = 60_000) => !token || token.expiresAt - skewMs <= now;

/** A refresh answer: a new token, or a sign-out (no cookie, or Spotify refused the refresh token). */
export type RefreshResult = { status: "ok"; token: SpotifyToken } | { status: "signed_out" } | { status: "error" };

/**
 * The access token, held in memory. get() hands back a live token, refreshing first when it is close to expiring;
 * concurrent callers share one refresh. clear() forgets it (sign-out, or leaving the listening room).
 */
export function createTokenStore({ refresh, now = Date.now }: { refresh: () => Promise<RefreshResult>; now?: () => number }) {
  let token: SpotifyToken | null = null;
  let pending: Promise<string | null> | null = null;
  let generation = 0;

  const run = (): Promise<string | null> => {
    const started = generation;
    pending ??= refresh()
      .then(result => {
        // Cleared while the refresh was in flight: drop the answer rather than sign back in.
        if (started !== generation) return null;
        token = result.status === "ok" ? result.token : null;
        return token?.accessToken ?? null;
      })
      .catch(() => null)
      .finally(() => { pending = null; });
    return pending;
  };

  return {
    set(next: SpotifyToken) { token = next; },
    current: () => token,
    async get(): Promise<string | null> {
      if (!needsRefresh(token, now())) return token?.accessToken ?? null;
      return run();
    },
    /** A fresh token regardless of expiry: for retrying a call Spotify answered with 401. */
    forceRefresh: run,
    clear() { token = null; pending = null; generation += 1; },
  };
}

export type TokenStore = ReturnType<typeof createTokenStore>;
