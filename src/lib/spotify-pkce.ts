// Spotify sign-in for the listening room: Authorization Code with PKCE, so no client secret is ever needed, in the
// browser or on the server. Pure helpers; the routes in src/routes/auth.*.tsx call them. Crypto is passed in so tests
// can pin the random bytes.

/** The only permissions the listening room asks for: play in this browser, read and steer playback, and the account
 *  details that tell a Premium account from a free one. Nothing that changes a reader's playlists or library. */
export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
] as const;

export const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";

/** Where the verifier and state wait during the round trip to Spotify. sessionStorage: this tab only, gone when it
 *  closes, and cleared as soon as the callback reads it. Neither is a token. */
export const PKCE_STORAGE_KEY = "melodylust:spotify-pkce";

const UNRESERVED = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

type RandomSource = Pick<Crypto, "getRandomValues">;

/** A PKCE code verifier: `length` (43–128) characters from the unreserved set, per RFC 7636. */
export function createCodeVerifier(length = 64, random: RandomSource = crypto): string {
  if (!Number.isInteger(length) || length < 43 || length > 128) throw new RangeError("A PKCE verifier is 43 to 128 characters.");
  const bytes = random.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => UNRESERVED[b % UNRESERVED.length]).join("");
}

/** Bytes as base64url, unpadded. */
export function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The S256 challenge for a verifier: base64url(SHA-256(verifier)). */
export async function createCodeChallenge(verifier: string, subtle: SubtleCrypto = crypto.subtle): Promise<string> {
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(digest);
}

/** An opaque value tying the callback to this sign-in, against cross-site request forgery. */
export function createState(random: RandomSource = crypto): string {
  return base64Url(random.getRandomValues(new Uint8Array(24)));
}

/** Spotify's sign-in page for these PKCE values. */
export function buildAuthorizeUrl({ clientId, redirectUri, challenge, state, scopes = SPOTIFY_SCOPES }: {
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
  scopes?: readonly string[];
}): string {
  const url = new URL(SPOTIFY_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: scopes.join(" "),
  }).toString();
  return url.toString();
}

export type PendingSignIn = { verifier: string; state: string; returnTo: string };

/** Reads (and parses) what the login route saved; null when absent or malformed. */
export function readPendingSignIn(raw: string | null): PendingSignIn | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingSignIn>;
    if (typeof value.verifier !== "string" || typeof value.state !== "string") return null;
    return { verifier: value.verifier, state: value.state, returnTo: safeReturnPath(value.returnTo) };
  } catch {
    return null;
  }
}

/** Only same-site paths come back from a sign-in: anything else returns to the listening room. */
export function safeReturnPath(path: unknown): string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/";
}

export type CallbackResult =
  | { kind: "code"; code: string; verifier: string; returnTo: string }
  | { kind: "denied"; returnTo: string }
  | { kind: "invalid"; returnTo: string };

/** What came back from Spotify, checked against the saved state. A mismatch or a missing verifier is refused. */
export function readCallback(search: string, pending: PendingSignIn | null): CallbackResult {
  const params = new URLSearchParams(search);
  const returnTo = pending?.returnTo ?? "/";
  if (params.get("error")) return { kind: "denied", returnTo };
  const code = params.get("code");
  const state = params.get("state");
  if (!pending || !code || !state || state !== pending.state) return { kind: "invalid", returnTo };
  return { kind: "code", code, verifier: pending.verifier, returnTo };
}
