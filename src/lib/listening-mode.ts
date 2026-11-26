// The listening room's two modes. Silence (the default) is the site as it has always been: no audio until a reader
// presses play, and then Spotify's own embed. Listening is opt-in: the reader signs in with Spotify (Premium) and the
// player bar plays full songs in this browser through the Web Playback SDK. Every failure lands back in silence with
// a plain notice, never on a broken player.

/** The feature flag. Off (the default), the room behaves exactly as before: no button, no SDK, no sign-in routes in use. */
export function listeningRoomEnabled(env: Record<string, unknown> = import.meta.env): boolean {
  return env["VITE_ENABLE_SPOTIFY_LISTENING_ROOM"] === "true";
}

/** Why the room fell back to silence, shown once to the reader. */
export type Notice = "not_premium" | "invite_only" | "signed_out" | "denied" | "unsupported" | "playback" | "unavailable";

export type ListeningMode =
  | { kind: "silence"; notice: Notice | null }
  | { kind: "signing_in" }
  | { kind: "connecting" }
  | { kind: "listening"; deviceId: string; ready: boolean };

export type ModeEvent =
  | { type: "enter" }
  | { type: "authorized" }
  | { type: "ready"; deviceId: string }
  | { type: "not_ready" }
  | { type: "fail"; notice: Notice }
  | { type: "leave" }
  | { type: "dismiss" };

export const SILENCE: ListeningMode = { kind: "silence", notice: null };

/** The mode machine. Anything it doesn't expect leaves the mode as it was. */
export function nextMode(mode: ListeningMode, event: ModeEvent): ListeningMode {
  switch (event.type) {
    case "enter":
      return mode.kind === "silence" ? { kind: "signing_in" } : mode;
    case "authorized":
      return mode.kind === "signing_in" ? { kind: "connecting" } : mode;
    case "ready":
      return mode.kind === "connecting" || mode.kind === "listening" ? { kind: "listening", deviceId: event.deviceId, ready: true } : mode;
    case "not_ready":
      return mode.kind === "listening" ? { ...mode, ready: false } : mode;
    case "fail":
      return { kind: "silence", notice: event.notice };
    case "leave":
      return SILENCE;
    case "dismiss":
      return mode.kind === "silence" && mode.notice ? SILENCE : mode;
  }
}

/** The label for the mode indicator. */
export const modeLabel = (mode: ListeningMode) => (mode.kind === "listening" ? "Listening" : mode.kind === "silence" ? "Silence" : "Tuning in");

/** The sentence a reader sees for each notice. */
export const noticeMessage: Record<Notice, string> = {
  not_premium: "Full songs need Spotify Premium. You can keep listening to previews here.",
  invite_only: "The listening room is invite-only right now. You can keep listening to previews here.",
  signed_out: "Your Spotify sign-in ended. Enter the listening room again to pick up where you left off.",
  denied: "No problem: the room stays in silence. You can still play previews.",
  unsupported: "This browser can't play Spotify in the page. Previews still work here.",
  playback: "Spotify couldn't play that song. Try another, or keep listening to previews.",
  unavailable: "Spotify isn't answering right now. Previews still work here.",
};

/** The notice for a Web Playback SDK error event. Spotify reports a free account as account_error. */
export function sdkErrorNotice(event: "initialization_error" | "authentication_error" | "account_error" | "playback_error", message = ""): Notice {
  if (event === "account_error") return "not_premium";
  if (event === "initialization_error") return "unsupported";
  if (event === "authentication_error") return INVITE.test(message) ? "invite_only" : "signed_out";
  return "playback";
}

// Development mode refuses anyone not on the app's user list with a 403 that points at the developer dashboard.
const INVITE = /not (be )?registered|developer\.spotify\.com\/dashboard|allow ?list|whitelist/i;

/** The notice for a failed Web API call, from its status and Spotify's error message. */
export function apiErrorNotice(status: number, message = ""): Notice {
  if (status === 401) return "signed_out";
  if (status === 403) {
    if (INVITE.test(message)) return "invite_only";
    if (/premium/i.test(message)) return "not_premium";
    return "playback";
  }
  if (status === 404) return "playback";
  return "unavailable";
}

/** Premium is the account Spotify lets play in the page. */
export const isPremium = (me: unknown) => (me as { product?: unknown } | null)?.product === "premium";
