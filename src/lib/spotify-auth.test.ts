import { describe, expect, it, vi } from "vitest";
import { codeExchangeBody, createTokenStore, needsRefresh, parseTokenReply, refreshBody, type RefreshResult } from "./spotify-auth";

describe("parseTokenReply", () => {
  it("reads a bearer token and dates its expiry", () => {
    expect(parseTokenReply({ access_token: "a", token_type: "Bearer", expires_in: 3600, refresh_token: "r" }, 1000)).toEqual({
      token: { accessToken: "a", expiresAt: 1000 + 3_600_000 },
      refreshToken: "r",
    });
  });

  it("keeps the old refresh token when Spotify doesn't rotate it", () => {
    expect(parseTokenReply({ access_token: "a", expires_in: 60 }, 0)?.refreshToken).toBeNull();
  });

  it("refuses anything that isn't a usable bearer token", () => {
    expect(parseTokenReply(null, 0)).toBeNull();
    expect(parseTokenReply({ error: "invalid_grant" }, 0)).toBeNull();
    expect(parseTokenReply({ access_token: "a", token_type: "mac" }, 0)).toBeNull();
  });
});

describe("request bodies", () => {
  it("sends the verifier, never a secret, when trading a code", () => {
    const body = codeExchangeBody({ clientId: "c", code: "k", verifier: "v", redirectUri: "http://127.0.0.1:5192/auth/callback" });
    expect(Object.fromEntries(body)).toEqual({ grant_type: "authorization_code", code: "k", redirect_uri: "http://127.0.0.1:5192/auth/callback", client_id: "c", code_verifier: "v" });
    expect(body.has("client_secret")).toBe(false);
  });

  it("refreshes with the client id only", () => {
    expect(Object.fromEntries(refreshBody({ clientId: "c", refreshToken: "r" }))).toEqual({ grant_type: "refresh_token", refresh_token: "r", client_id: "c" });
  });
});

describe("needsRefresh", () => {
  it("refreshes a minute early, and when there is no token", () => {
    expect(needsRefresh(null, 0)).toBe(true);
    expect(needsRefresh({ accessToken: "a", expiresAt: 120_000 }, 0)).toBe(false);
    expect(needsRefresh({ accessToken: "a", expiresAt: 120_000 }, 60_000)).toBe(true);
  });
});

describe("createTokenStore", () => {
  const ok = (accessToken: string, expiresAt: number): RefreshResult => ({ status: "ok", token: { accessToken, expiresAt } });

  it("hands back a live token without refreshing", async () => {
    const refresh = vi.fn(async () => ok("new", 10_000_000));
    const store = createTokenStore({ refresh, now: () => 0 });
    store.set({ accessToken: "live", expiresAt: 3_600_000 });
    expect(await store.get()).toBe("live");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes a token about to expire, once for concurrent callers", async () => {
    let clock = 0;
    const refresh = vi.fn(async () => ok("fresh", clock + 3_600_000));
    const store = createTokenStore({ refresh, now: () => clock });
    store.set({ accessToken: "old", expiresAt: 3_600_000 });
    clock = 3_590_000;
    const [a, b] = await Promise.all([store.get(), store.get()]);
    expect([a, b]).toEqual(["fresh", "fresh"]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await store.get()).toBe("fresh");
  });

  it("signs out when the refresh is refused or fails", async () => {
    const store = createTokenStore({ refresh: async () => ({ status: "signed_out" }), now: () => 0 });
    expect(await store.get()).toBeNull();
    const broken = createTokenStore({ refresh: () => Promise.reject(new Error("offline")), now: () => 0 });
    expect(await broken.get()).toBeNull();
  });

  it("forgets everything on clear, even a refresh already in flight", async () => {
    let finish: (r: RefreshResult) => void = () => {};
    const store = createTokenStore({ refresh: () => new Promise(resolve => { finish = resolve; }), now: () => 0 });
    const asked = store.get();
    store.clear();
    finish(ok("late", 3_600_000));
    expect(await asked).toBeNull();
    expect(store.current()).toBeNull();
  });

  it("forceRefresh fetches a new token even when the current one looks live", async () => {
    const refresh = vi.fn(async () => ok("forced", 3_600_000));
    const store = createTokenStore({ refresh, now: () => 0 });
    store.set({ accessToken: "live", expiresAt: 3_600_000 });
    expect(await store.forceRefresh()).toBe("forced");
  });
});
