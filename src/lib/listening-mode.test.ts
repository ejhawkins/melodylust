import { describe, expect, it } from "vitest";
import { SILENCE, apiErrorNotice, isPremium, listeningRoomEnabled, modeLabel, nextMode, sdkErrorNotice, type ListeningMode, type ModeEvent } from "./listening-mode";

const run = (events: ModeEvent[], from: ListeningMode = SILENCE) => events.reduce(nextMode, from);

describe("listeningRoomEnabled", () => {
  it("is off unless the flag is exactly 'true'", () => {
    expect(listeningRoomEnabled({})).toBe(false);
    expect(listeningRoomEnabled({ VITE_ENABLE_SPOTIFY_LISTENING_ROOM: "false" })).toBe(false);
    expect(listeningRoomEnabled({ VITE_ENABLE_SPOTIFY_LISTENING_ROOM: "1" })).toBe(false);
    expect(listeningRoomEnabled({ VITE_ENABLE_SPOTIFY_LISTENING_ROOM: "true" })).toBe(true);
  });
});

describe("nextMode", () => {
  it("starts in silence", () => {
    expect(SILENCE).toEqual({ kind: "silence", notice: null });
    expect(modeLabel(SILENCE)).toBe("Silence");
  });

  it("walks silence → signing in → connecting → listening", () => {
    const mode = run([{ type: "enter" }, { type: "authorized" }, { type: "ready", deviceId: "d1" }]);
    expect(mode).toEqual({ kind: "listening", deviceId: "d1", ready: true });
    expect(modeLabel(mode)).toBe("Listening");
  });

  it("marks the device offline on not_ready and back on ready", () => {
    const listening = run([{ type: "enter" }, { type: "authorized" }, { type: "ready", deviceId: "d1" }]);
    const offline = nextMode(listening, { type: "not_ready" });
    expect(offline).toEqual({ kind: "listening", deviceId: "d1", ready: false });
    expect(nextMode(offline, { type: "ready", deviceId: "d2" })).toEqual({ kind: "listening", deviceId: "d2", ready: true });
  });

  it("falls back to silence with a notice from any step", () => {
    for (const from of [run([{ type: "enter" }]), run([{ type: "enter" }, { type: "authorized" }]), run([{ type: "enter" }, { type: "authorized" }, { type: "ready", deviceId: "d" }])]) {
      expect(nextMode(from, { type: "fail", notice: "not_premium" })).toEqual({ kind: "silence", notice: "not_premium" });
    }
  });

  it("leaves to plain silence, and a notice can be dismissed", () => {
    const listening = run([{ type: "enter" }, { type: "authorized" }, { type: "ready", deviceId: "d" }]);
    expect(nextMode(listening, { type: "leave" })).toEqual(SILENCE);
    expect(nextMode({ kind: "silence", notice: "invite_only" }, { type: "dismiss" })).toEqual(SILENCE);
  });

  it("ignores events out of order", () => {
    expect(nextMode(SILENCE, { type: "authorized" })).toEqual(SILENCE);
    expect(nextMode(SILENCE, { type: "ready", deviceId: "d" })).toEqual(SILENCE);
    expect(nextMode(SILENCE, { type: "not_ready" })).toEqual(SILENCE);
    expect(run([{ type: "enter" }, { type: "enter" }])).toEqual({ kind: "signing_in" });
  });
});

describe("sdkErrorNotice", () => {
  it("reads a free account as not Premium", () => {
    expect(sdkErrorNotice("account_error", "This functionality is restricted to premium users only")).toBe("not_premium");
  });

  it("tells the invite-only cap from an expired sign-in", () => {
    expect(sdkErrorNotice("authentication_error", "Check settings on developer.spotify.com/dashboard, the user may not be registered.")).toBe("invite_only");
    expect(sdkErrorNotice("authentication_error", "Invalid token scopes.")).toBe("signed_out");
  });

  it("reads browser and playback trouble", () => {
    expect(sdkErrorNotice("initialization_error")).toBe("unsupported");
    expect(sdkErrorNotice("playback_error")).toBe("playback");
  });
});

describe("apiErrorNotice", () => {
  it("maps Web API failures onto notices", () => {
    expect(apiErrorNotice(401)).toBe("signed_out");
    expect(apiErrorNotice(403, "Check settings on developer.spotify.com/dashboard, the user may not be registered.")).toBe("invite_only");
    expect(apiErrorNotice(403, "Player command failed: Premium required")).toBe("not_premium");
    expect(apiErrorNotice(403, "Player command failed: Restriction violated")).toBe("playback");
    expect(apiErrorNotice(404, "Device not found")).toBe("playback");
    expect(apiErrorNotice(429)).toBe("unavailable");
    expect(apiErrorNotice(502)).toBe("unavailable");
  });
});

describe("isPremium", () => {
  it("is true only for a premium product", () => {
    expect(isPremium({ product: "premium" })).toBe(true);
    expect(isPremium({ product: "free" })).toBe(false);
    expect(isPremium(null)).toBe(false);
  });
});
