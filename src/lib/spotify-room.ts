// The listening room's controller: one per page, outside React so the sign-in callback can hand it a token and the
// room picks it up without a reload. It owns the mode machine, the in-memory token, the SDK player and the Web API.
// Everything it talks to is passed in, so tests drive it with a fake SDK and a fake Spotify.
import { useSyncExternalStore } from "react";
import { SILENCE, isPremium, nextMode, sdkErrorNotice, type ListeningMode, type ModeEvent, type Notice } from "./listening-mode";
import { createSpotifyApi, SpotifyApiError, type PlayRequest, type SpotifyApi } from "./spotify-api";
import { createTokenStore, type RefreshResult, type SpotifyToken, type TokenStore } from "./spotify-auth";
import { readPlayerState, type NowPlaying, type SdkErrorEvent, type SpotifyPlayer, type SpotifySdk } from "./spotify-player";

export type RoomState = {
  mode: ListeningMode;
  /** What this browser's player holds, once Spotify reports it. */
  playing: NowPlaying | null;
  /** A passing problem that doesn't end listening (one song wouldn't play). Cleared by the next action. */
  flash: Notice | null;
};

export type RoomDeps = {
  refresh: () => Promise<RefreshResult>;
  forget: () => Promise<unknown>;
  loadSdk: () => Promise<SpotifySdk>;
  /** Sends the reader to Spotify's sign-in (the /auth/login route). */
  signIn: (returnTo: string) => void;
  fetchImpl?: typeof fetch;
  now?: () => number;
  playerName?: string;
};

const SDK_ERRORS: SdkErrorEvent[] = ["initialization_error", "authentication_error", "account_error", "playback_error"];
const noticeOf = (error: unknown): Notice => (error instanceof SpotifyApiError ? error.notice : "unavailable");

export function createSpotifyRoom(deps: RoomDeps) {
  const tokens: TokenStore = createTokenStore({ refresh: deps.refresh, ...(deps.now ? { now: deps.now } : {}) });
  const api: SpotifyApi = createSpotifyApi({ tokens, ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}) });
  let state: RoomState = { mode: SILENCE, playing: null, flash: null };
  let player: SpotifyPlayer | null = null;
  const listeners = new Set<() => void>();

  const emit = (next: Partial<RoomState>) => {
    state = { ...state, ...next };
    listeners.forEach(l => l());
  };
  const dispatch = (event: ModeEvent) => emit({ mode: nextMode(state.mode, event) });
  // Read fresh after an await or a dispatch (a plain `state.mode.kind` would keep TypeScript's earlier narrowing).
  const modeKind = (): ListeningMode["kind"] => state.mode.kind;

  function dropPlayer() {
    if (!player) return;
    for (const event of ["ready", "not_ready", "player_state_changed", ...SDK_ERRORS]) player.removeListener(event);
    player.disconnect();
    player = null;
  }

  /** Back to silence with a notice; tears the player down so nothing half-works. */
  function fail(notice: Notice) {
    dropPlayer();
    if (notice === "signed_out" || notice === "invite_only" || notice === "not_premium") tokens.clear();
    emit({ playing: null, flash: null });
    dispatch({ type: "fail", notice });
  }

  /** A failed call: a song that won't play is a passing note; anything else (sign-in, quota, Premium) ends listening. */
  function trouble(error: unknown) {
    const notice = noticeOf(error);
    if (notice === "playback") emit({ flash: notice }); else fail(notice);
  }

  /** The player, once listening and connected; null otherwise. */
  const live = () => (state.mode.kind === "listening" && state.mode.ready ? player : null);

  /** Signed in: check the account can play, then load the SDK and connect this browser as a player. */
  async function connect() {
    dispatch({ type: "authorized" });
    try {
      // Read-only first: a free account or a reader outside the development-mode list stops here, before any SDK.
      if (!isPremium(await api.me())) return fail("not_premium");
      const sdk = await deps.loadSdk();
      if (modeKind() !== "connecting") return;
      const p = new sdk.Player({
        name: deps.playerName ?? "Melody Lust listening room",
        getOAuthToken: cb => { void tokens.get().then(token => (token ? cb(token) : fail("signed_out"))); },
        volume: 0.8,
      });
      player = p;
      p.addListener("ready", ({ device_id }) => dispatch({ type: "ready", deviceId: device_id }));
      p.addListener("not_ready", () => dispatch({ type: "not_ready" }));
      p.addListener("player_state_changed", s => emit({ playing: readPlayerState(s) }));
      for (const event of SDK_ERRORS) p.addListener(event, ({ message }) => { const notice = sdkErrorNotice(event, message); if (notice === "playback") emit({ flash: notice }); else fail(notice); });
      if (!(await p.connect())) fail("unsupported");
    } catch (error) {
      fail(error instanceof SpotifyApiError ? error.notice : "unsupported");
    }
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    /** "Enter the listening room": a remembered sign-in connects straight away; otherwise off to Spotify's sign-in. */
    async enter(returnTo = "/") {
      if (state.mode.kind !== "silence") return;
      dispatch({ type: "enter" });
      const token = await tokens.get();
      if (modeKind() !== "signing_in") return;
      if (token) return connect();
      deps.signIn(returnTo);
    },

    /** The callback route's handoff: a fresh token from Spotify's sign-in. */
    signedIn(token: SpotifyToken) {
      tokens.set(token);
      if (state.mode.kind === "silence") dispatch({ type: "enter" });
      if (modeKind() === "signing_in") void connect();
    },

    /** Sign-in didn't complete (declined, or the callback was refused). */
    signInFailed(notice: Notice) { fail(notice); },

    /** What Spotify is playing for this account (read-only). */
    async playbackState() {
      try { return await api.playbackState(); } catch (error) { if (noticeOf(error) !== "playback") fail(noticeOf(error)); return null; }
    },

    /**
     * Plays `request` on this browser. Call it from a click: activateElement() needs that gesture on phones, and
     * browsers only allow audio a reader asked for.
     */
    async playQueue(request: PlayRequest) {
      const p = live();
      if (!p || state.mode.kind !== "listening") return;
      emit({ flash: null });
      try {
        await p.activateElement();
        await api.play(state.mode.deviceId, request);
      } catch (error) { trouble(error); }
    },

    /** Pause or resume this browser's player. */
    async togglePlay() {
      const p = live();
      if (!p) return;
      emit({ flash: null });
      try { await p.togglePlay(); } catch (error) { trouble(error); }
    },

    async next() { const p = live(); if (p) { emit({ flash: null }); try { await p.nextTrack(); } catch (error) { trouble(error); } } },
    async previous() { const p = live(); if (p) { emit({ flash: null }); try { await p.previousTrack(); } catch (error) { trouble(error); } } },

    /** "Leave the listening room": disconnect, forget the tokens and the cookie, back to silence. */
    async leave() {
      dropPlayer();
      tokens.clear();
      emit({ playing: null, flash: null });
      dispatch({ type: "leave" });
      await deps.forget().catch(() => undefined);
    },

    dismiss() { emit({ flash: null }); dispatch({ type: "dismiss" }); },
  };
}

export type SpotifyRoom = ReturnType<typeof createSpotifyRoom>;

let room: SpotifyRoom | null = null;

/** The page's room, made on first use in the browser with the real Spotify, SDK and server functions. */
export function spotifyRoom(): SpotifyRoom {
  room ??= createSpotifyRoom({
    refresh: async () => (await import("./spotify-auth.functions")).refreshSpotifyToken(),
    forget: async () => (await import("./spotify-auth.functions")).forgetSpotify(),
    loadSdk: async () => (await import("./spotify-player")).loadSpotifySdk(),
    signIn: returnTo => window.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`),
  });
  return room;
}

const SERVER_STATE: RoomState = { mode: SILENCE, playing: null, flash: null };

/** The room's state for React. Always silence while rendering on the server. */
export function useSpotifyRoom(): RoomState {
  return useSyncExternalStore(
    listener => spotifyRoom().subscribe(listener),
    () => spotifyRoom().getState(),
    () => SERVER_STATE,
  );
}
