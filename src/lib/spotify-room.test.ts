import { describe, expect, it, vi } from "vitest";
import { createSpotifyRoom, type RoomDeps } from "./spotify-room";
import { playRequest, trackUri } from "./spotify-api";
import { readPlayerState, type SdkPlaybackState, type SpotifyPlayer, type SpotifySdk } from "./spotify-player";

// A fake Web Playback SDK: records listeners so tests can fire Spotify's events.
function fakeSdk({ connects = true } = {}) {
  const handlers = new Map<string, (data: never) => void>();
  const player = {
    connect: vi.fn(async () => connects),
    disconnect: vi.fn(),
    addListener: vi.fn((event: string, cb: (data: never) => void) => { handlers.set(event, cb); return true; }),
    removeListener: vi.fn((event: string) => handlers.delete(event)),
    togglePlay: vi.fn(async () => {}),
    nextTrack: vi.fn(async () => {}),
    previousTrack: vi.fn(async () => {}),
    activateElement: vi.fn(async () => {}),
  };
  const sdk: SpotifySdk = { Player: vi.fn(function Player() { return player as unknown as SpotifyPlayer; }) as unknown as SpotifySdk["Player"] };
  const fire = (event: string, data: unknown) => (handlers.get(event) as ((d: unknown) => void) | undefined)?.(data);
  return { sdk, player, fire, handlers };
}

// A fake Spotify Web API: routes by path, records calls.
function fakeApi(routes: Record<string, () => Response>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname.replace("/v1", "");
    return (routes[path] ?? (() => new Response(null, { status: 404 })))();
  });
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const signedIn = { status: "ok" as const, token: { accessToken: "tok", expiresAt: 10_000_000 } };
const flush = () => new Promise(r => setTimeout(r, 0));

function makeRoom(overrides: Partial<RoomDeps> & { fetchImpl?: typeof fetch } = {}, sdk = fakeSdk()) {
  const deps: RoomDeps = {
    refresh: vi.fn(async () => signedIn),
    forget: vi.fn(async () => ({ status: "ok" })),
    loadSdk: vi.fn(async () => sdk.sdk),
    signIn: vi.fn(),
    fetchImpl: fakeApi({ "/me": () => json({ product: "premium" }) }) as unknown as typeof fetch,
    now: () => 0,
    ...overrides,
  };
  return { room: createSpotifyRoom(deps), deps, sdk };
}

describe("entering the listening room", () => {
  it("connects with a remembered sign-in and becomes Listening when the device is ready", async () => {
    const { room, sdk, deps } = makeRoom();
    await room.enter();
    await flush();
    expect(deps.signIn).not.toHaveBeenCalled();
    expect(room.getState().mode.kind).toBe("connecting");
    expect(sdk.player.connect).toHaveBeenCalled();
    sdk.fire("ready", { device_id: "device-1" });
    expect(room.getState().mode).toEqual({ kind: "listening", deviceId: "device-1", ready: true });
  });

  it("sends the reader to Spotify's sign-in when there is no sign-in to refresh", async () => {
    const { room, deps } = makeRoom({ refresh: vi.fn(async () => ({ status: "signed_out" as const })) });
    await room.enter("/?from=hero");
    expect(deps.signIn).toHaveBeenCalledWith("/?from=hero");
    expect(deps.loadSdk).not.toHaveBeenCalled();
    expect(room.getState().mode.kind).toBe("signing_in");
  });

  it("picks up the callback's token without another sign-in", async () => {
    const { room, deps, sdk } = makeRoom({ refresh: vi.fn(async () => ({ status: "signed_out" as const })) });
    room.signedIn({ accessToken: "fresh", expiresAt: 10_000_000 });
    await flush();
    sdk.fire("ready", { device_id: "d" });
    expect(room.getState().mode.kind).toBe("listening");
    expect(deps.signIn).not.toHaveBeenCalled();
  });
});

describe("falling back to silence", () => {
  it("stops a free account before loading the SDK", async () => {
    const { room, deps } = makeRoom({ fetchImpl: fakeApi({ "/me": () => json({ product: "free" }) }) as unknown as typeof fetch });
    await room.enter();
    await flush();
    expect(room.getState().mode).toEqual({ kind: "silence", notice: "not_premium" });
    expect(deps.loadSdk).not.toHaveBeenCalled();
  });

  it("reads the development-mode 403 as invite-only", async () => {
    const fetchImpl = fakeApi({ "/me": () => json({ error: { status: 403, message: "Check settings on developer.spotify.com/dashboard, the user may not be registered." } }, 403) });
    const { room } = makeRoom({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await room.enter();
    await flush();
    expect(room.getState().mode).toEqual({ kind: "silence", notice: "invite_only" });
  });

  it("turns the SDK's account_error into the Premium notice and disconnects", async () => {
    const { room, sdk } = makeRoom();
    await room.enter();
    await flush();
    sdk.fire("account_error", { message: "This functionality is restricted to premium users only" });
    expect(room.getState().mode).toEqual({ kind: "silence", notice: "not_premium" });
    expect(sdk.player.disconnect).toHaveBeenCalled();
  });

  it("reports a browser that can't connect, or an SDK that won't load", async () => {
    const offline = makeRoom({}, fakeSdk({ connects: false }));
    await offline.room.enter();
    await flush();
    expect(offline.room.getState().mode).toEqual({ kind: "silence", notice: "unsupported" });

    const blocked = makeRoom({ loadSdk: vi.fn(async () => { throw new Error("blocked"); }) });
    await blocked.room.enter();
    await flush();
    expect(blocked.room.getState().mode).toEqual({ kind: "silence", notice: "unsupported" });
  });
});

describe("leaving the listening room", () => {
  it("disconnects, forgets the cookie and returns to plain silence", async () => {
    const { room, sdk, deps } = makeRoom();
    await room.enter();
    await flush();
    sdk.fire("ready", { device_id: "d" });
    await room.leave();
    expect(sdk.player.disconnect).toHaveBeenCalled();
    expect(deps.forget).toHaveBeenCalled();
    expect(room.getState()).toEqual({ mode: { kind: "silence", notice: null }, playing: null });
  });
});

describe("reading playback", () => {
  it("follows player_state_changed", async () => {
    const { room, sdk } = makeRoom();
    await room.enter();
    await flush();
    const state: SdkPlaybackState = { paused: false, track_window: { current_track: { uri: "spotify:track:1", name: "Song", artists: [{ name: "A" }, { name: "B" }] } } };
    sdk.fire("player_state_changed", state);
    expect(room.getState().playing).toEqual({ paused: false, trackUri: "spotify:track:1", title: "Song", artist: "A, B" });
    expect(readPlayerState(null)).toBeNull();
  });
});

describe("playRequest", () => {
  const a = { link: "https://open.spotify.com/track/0123456789abcdefghijkl" };
  const b = { link: "https://open.spotify.com/track/abcdefghijkl0123456789?si=x" };
  const film = { link: "https://www.youtube.com/watch?v=x" };

  it("plays the queue's tracks from the pressed one, skipping songs without a track", () => {
    expect(playRequest([a, film, b], 2)).toEqual({ uris: [trackUri(a.link), trackUri(b.link)], offset: 1 });
    expect(playRequest([a, film, b], 1)).toBeNull();
  });
});
