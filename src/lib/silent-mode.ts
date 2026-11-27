// Silent mode: nothing on the page makes sound, and songs open in Spotify instead of playing here. A reader in a social
// app's browser is asked once (InAppAdvisory); anyone can choose it at the room's door (/listen, "Stay in silence
// mode"). The answer stays on this device. A regular browser that never chose behaves as always.
import { useSyncExternalStore } from "react";
import { inAppBrowserName } from "@/lib/in-app-browser";

export type SoundChoice = "silent" | "sound";

export const SOUND_CHOICE_KEY = "melodylust:in-app-sound";
const listeners = new Set<() => void>();

function readChoice(): SoundChoice | null {
  try {
    const value = window.localStorage.getItem(SOUND_CHOICE_KEY);
    return value === "silent" || value === "sound" ? value : null;
  } catch {
    return null;
  }
}

let choice: SoundChoice | null | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const noSubscription = () => () => {};

/** Saves the reader's answer for this device. */
export function setSoundChoice(next: SoundChoice) {
  choice = next;
  try { window.localStorage.setItem(SOUND_CHOICE_KEY, next); } catch { /* storage off: it lasts for this visit */ }
  listeners.forEach(listener => listener());
}

/** The reader's answer, or null if they haven't been asked. */
export function useSoundChoice(): SoundChoice | null {
  return useSyncExternalStore(subscribe, () => (choice === undefined ? (choice = readChoice()) : choice), () => null);
}

/** The social app whose browser the page is in, or null (always null while rendering on the server). */
export function useInAppBrowser(): string | null {
  return useSyncExternalStore(noSubscription, () => inAppBrowserName(navigator.userAgent), () => null);
}

/**
 * Silent when the reader chose silence (in the room's "Stay in silence mode", or the in-app advisory), and in an
 * in-app browser until the reader asks for sound. A regular browser that was never asked plays as always.
 */
export const isSilent = (inApp: string | null, sound: SoundChoice | null) => sound === "silent" || (inApp !== null && sound !== "sound");

export function useSilentMode(): boolean {
  return isSilent(useInAppBrowser(), useSoundChoice());
}

/** For tests: forget the cached answer. */
export function resetSoundChoiceCache() {
  choice = undefined;
}
