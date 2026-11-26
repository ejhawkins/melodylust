import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import {
  SPOTIFY_SCOPES,
  base64Url,
  buildAuthorizeUrl,
  createCodeChallenge,
  createCodeVerifier,
  createState,
  readCallback,
  readPendingSignIn,
  safeReturnPath,
} from "./spotify-pkce";

// A fixed "random" source: byte i is i, so the output is predictable.
const counting = { getRandomValues: <T extends ArrayBufferView | null>(array: T) => { const v = array as unknown as Uint8Array; v.forEach((_, i) => { v[i] = i; }); return array; } } as Pick<Crypto, "getRandomValues">;

describe("createCodeVerifier", () => {
  it("draws only unreserved characters at the asked length", () => {
    const verifier = createCodeVerifier(64, webcrypto as unknown as Crypto);
    expect(verifier).toHaveLength(64);
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it("maps bytes onto the unreserved set", () => {
    expect(createCodeVerifier(43, counting).slice(0, 5)).toBe("ABCDE");
  });

  it("refuses lengths outside RFC 7636's 43–128", () => {
    expect(() => createCodeVerifier(42)).toThrow(RangeError);
    expect(() => createCodeVerifier(129)).toThrow(RangeError);
  });
});

describe("createCodeChallenge", () => {
  it("matches the RFC 7636 appendix B example", async () => {
    const challenge = await createCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk", webcrypto.subtle as unknown as SubtleCrypto);
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("base64Url", () => {
  it("is unpadded and URL-safe", () => {
    expect(base64Url(new Uint8Array([251, 255, 191]))).toBe("-_-_");
    expect(base64Url(new Uint8Array([1]))).toBe("AQ");
  });
});

describe("createState", () => {
  it("is URL-safe and long enough to guess-proof", () => {
    const state = createState(webcrypto as unknown as Crypto);
    expect(state).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
});

describe("buildAuthorizeUrl", () => {
  it("asks Spotify for a PKCE code with only the listening-room scopes", () => {
    const url = new URL(buildAuthorizeUrl({ clientId: "client", redirectUri: "http://127.0.0.1:5192/auth/callback", challenge: "abc", state: "xyz" }));
    expect(url.origin + url.pathname).toBe("https://accounts.spotify.com/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "client",
      response_type: "code",
      redirect_uri: "http://127.0.0.1:5192/auth/callback",
      code_challenge_method: "S256",
      code_challenge: "abc",
      state: "xyz",
      scope: "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state",
    });
    expect(SPOTIFY_SCOPES).not.toContain("playlist-modify-public");
  });
});

describe("safeReturnPath", () => {
  it("keeps same-site paths and sends anything else to the room", () => {
    expect(safeReturnPath("/?room=listening")).toBe("/?room=listening");
    expect(safeReturnPath("//evil.example")).toBe("/");
    expect(safeReturnPath("https://evil.example")).toBe("/");
    expect(safeReturnPath("/\\evil.example")).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
  });
});

describe("readPendingSignIn and readCallback", () => {
  const pending = readPendingSignIn(JSON.stringify({ verifier: "v", state: "s", returnTo: "/" }));

  it("parses what the login route saved, and nothing malformed", () => {
    expect(pending).toEqual({ verifier: "v", state: "s", returnTo: "/" });
    expect(readPendingSignIn("{nope")).toBeNull();
    expect(readPendingSignIn(JSON.stringify({ state: "s" }))).toBeNull();
    expect(readPendingSignIn(null)).toBeNull();
  });

  it("accepts a code only when the state matches", () => {
    expect(readCallback("?code=c&state=s", pending)).toEqual({ kind: "code", code: "c", verifier: "v", returnTo: "/" });
    expect(readCallback("?code=c&state=other", pending).kind).toBe("invalid");
    expect(readCallback("?code=c&state=s", null).kind).toBe("invalid");
  });

  it("reports a declined sign-in", () => {
    expect(readCallback("?error=access_denied&state=s", pending).kind).toBe("denied");
  });
});
