// The few Spotify Web API calls the listening room makes: who is signed in (to check Premium), what is playing, and
// starting playback on this browser's player. Nothing that creates or changes a playlist or a library.
import { apiErrorNotice, type Notice } from "./listening-mode";
import type { TokenStore } from "./spotify-auth";

export const SPOTIFY_API = "https://api.spotify.com/v1";

export class SpotifyApiError extends Error {
  readonly status: number;
  readonly notice: Notice;
  constructor(status: number, message: string) {
    super(message || `Spotify answered ${status}`);
    this.name = "SpotifyApiError";
    this.status = status;
    this.notice = apiErrorNotice(status, message);
  }
}

type Fetch = typeof fetch;

/** Web API calls with the in-memory token, retried once with a fresh token when Spotify says it has expired. */
export function createSpotifyApi({ tokens, fetchImpl = (...args) => fetch(...args) }: { tokens: Pick<TokenStore, "get" | "forceRefresh">; fetchImpl?: Fetch }) {
  async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T | null> {
    const send = (token: string) => fetchImpl(`${SPOTIFY_API}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, ...(init.body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
    let token = await tokens.get();
    if (!token) throw new SpotifyApiError(401, "Not signed in");
    let reply = await send(token);
    if (reply.status === 401) {
      token = await tokens.forceRefresh();
      if (!token) throw new SpotifyApiError(401, "Not signed in");
      reply = await send(token);
    }
    if (!reply.ok) {
      const body = (await reply.json().catch(() => null)) as { error?: { message?: unknown } | string } | null;
      const message = typeof body?.error === "string" ? body.error : typeof body?.error?.message === "string" ? body.error.message : "";
      throw new SpotifyApiError(reply.status, message);
    }
    const text = reply.status === 204 ? "" : await reply.text();
    return text ? (JSON.parse(text) as T) : null;
  }

  return {
    /** The signed-in account: its `product` tells Premium from free. */
    me: () => call<{ product?: string; display_name?: string }>("/me"),
    /** What Spotify is playing for this account, anywhere; null when nothing is. */
    playbackState: () => call<{ device?: { id?: string }; is_playing?: boolean; item?: { uri?: string } }>("/me/player"),
    /** Starts `uris` from `offset` on the given device (this browser's player). */
    play: (deviceId: string, { uris, offset }: PlayRequest) =>
      call<null>(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, { method: "PUT", body: { uris, offset: { position: offset } } }),
  };
}

export type SpotifyApi = ReturnType<typeof createSpotifyApi>;

export type PlayRequest = { uris: string[]; offset: number };

/** A Spotify track URI for an open.spotify.com track link, or null. */
export function trackUri(link: string | null | undefined): string | null {
  const id = /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})/.exec(link ?? "")?.[1];
  return id ? `spotify:track:${id}` : null;
}

/**
 * What to ask Spotify to play for a queue and the pressed song: the queue's playable tracks in order, starting at the
 * pressed one. Songs without a Spotify track link are skipped; null when the pressed song itself can't play.
 */
export function playRequest(queue: readonly { link: string }[], index: number): PlayRequest | null {
  const uris: string[] = [];
  let offset = -1;
  queue.forEach((song, i) => {
    const uri = trackUri(song.link);
    if (!uri) return;
    if (i === index) offset = uris.length;
    uris.push(uri);
  });
  return offset < 0 ? null : { uris, offset };
}
