import { useEffect, useState } from "react";
import { emptyStyleProfile, STYLE_PROFILE_KEY, styleProfileSchema, type StyleProfile } from "./style-profile";

/**
 * The reader's style profile, kept on this device only (validated on the way in and out).
 * Shared by the home page's Stylist AI and the Curator Dossier, so both read the same choices.
 */
export function useStyleProfile() {
  const [profile, setProfile] = useState<StyleProfile>(emptyStyleProfile);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_PROFILE_KEY);
      if (saved) { const parsed = styleProfileSchema.safeParse(JSON.parse(saved)); if (parsed.success) setProfile(parsed.data); }
    } catch { /* Unavailable storage leaves the profile empty. */ }
  }, []);
  const save = (next: StyleProfile) => {
    try { const validated = styleProfileSchema.parse(next); localStorage.setItem(STYLE_PROFILE_KEY, JSON.stringify(validated)); setProfile(validated); return true; }
    catch { return false; }
  };
  const clear = () => {
    try { localStorage.removeItem(STYLE_PROFILE_KEY); setProfile(emptyStyleProfile()); return true; }
    catch { return false; }
  };
  return { profile, save, clear };
}
