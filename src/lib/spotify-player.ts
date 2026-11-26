// The Spotify Web Playback SDK, loaded only once a reader has signed in to the listening room — never on page load.
// Types cover just what the room uses.

export const SPOTIFY_SDK_URL = "https://sdk.scdn.co/spotify-player.js";

export type SdkErrorEvent = "initialization_error" | "authentication_error" | "account_error" | "playback_error";

export type SdkPlaybackState = {
  paused: boolean;
  track_window: { current_track: { uri: string; name: string; artists: { name: string }[] } | null };
} | null;

export interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: "ready" | "not_ready", cb: (data: { device_id: string }) => void): boolean;
  addListener(event: SdkErrorEvent, cb: (error: { message: string }) => void): boolean;
  addListener(event: "player_state_changed", cb: (state: SdkPlaybackState) => void): boolean;
  removeListener(event: string): boolean;
  togglePlay(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  /** Must run inside a click on mobile browsers, so audio is allowed to start. */
  activateElement(): Promise<void>;
}

export type SpotifySdk = {
  Player: new (options: { name: string; getOAuthToken: (cb: (token: string) => void) => void; volume?: number }) => SpotifyPlayer;
};

declare global {
  interface Window {
    Spotify?: SpotifySdk;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

let loading: Promise<SpotifySdk> | null = null;

/** Adds Spotify's SDK script once and resolves when it is ready. Rejects if it can't load (blocked, offline). */
export function loadSpotifySdk(win: Window = window, timeoutMs = 15_000): Promise<SpotifySdk> {
  if (win.Spotify) return Promise.resolve(win.Spotify);
  loading ??= new Promise<SpotifySdk>((resolve, reject) => {
    const doc = win.document;
    const timer = win.setTimeout(() => fail(new Error("The Spotify player took too long to load.")), timeoutMs);
    const fail = (error: Error) => { win.clearTimeout(timer); loading = null; reject(error); };
    win.onSpotifyWebPlaybackSDKReady = () => {
      win.clearTimeout(timer);
      if (win.Spotify) resolve(win.Spotify); else fail(new Error("The Spotify player didn't start."));
    };
    const script = doc.createElement("script");
    script.src = SPOTIFY_SDK_URL;
    script.async = true;
    script.onerror = () => { script.remove(); fail(new Error("The Spotify player couldn't load.")); };
    doc.head.appendChild(script);
  });
  return loading;
}

/** For tests: forget a load in progress. */
export function resetSpotifySdkLoader() {
  loading = null;
}

export type NowPlaying = { paused: boolean; trackUri: string; title: string; artist: string };

/** The SDK's state, reduced to what the bar shows. */
export function readPlayerState(state: SdkPlaybackState): NowPlaying | null {
  const track = state?.track_window.current_track;
  if (!state || !track) return null;
  return { paused: state.paused, trackUri: track.uri, title: track.name, artist: track.artists.map(a => a.name).join(", ") };
}
