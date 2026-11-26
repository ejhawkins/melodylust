import { ROOM_THEMES, type ThemeId } from "./theme-spec";

/** Off unless VITE_ENABLE_SPOTIFY_LISTENING_ROOM is exactly "true". */
export function isListeningRoomEnabled(
  value: unknown = import.meta.env["VITE_ENABLE_SPOTIFY_LISTENING_ROOM"],
): boolean {
  return value === "true";
}

export const DEFAULT_THEME_ID: ThemeId = "autumn-tartan";

/** Accepts only known theme ids from the URL; anything else falls back to the default. */
export function parseThemeId(value: unknown): ThemeId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ROOM_THEMES, value)
    ? (value as ThemeId)
    : DEFAULT_THEME_ID;
}
