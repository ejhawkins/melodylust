// Google sign-in works two ways. On Lovable's own hosting, Lovable's broker (/~oauth/initiate)
// handles it. Everywhere else (Vercel, www.melodylust.fashion) that path doesn't exist and
// returns a 404, so the site uses the Supabase project's Google provider directly, and only
// offers the button once that provider is switched on.
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

const LOVABLE_HOSTS = ["lovable.app", "lovableproject.com", "lovableproject-dev.com", "lovable.dev"];

export const isLovableHost = (hostname: string) => LOVABLE_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`));

export type GoogleFlow = "lovable" | "supabase" | null;

/** Lovable's broker on its hosting; Supabase's provider elsewhere if it's on; otherwise no Google. */
export const googleFlow = (hostname: string, supabaseGoogleEnabled: boolean): GoogleFlow =>
  isLovableHost(hostname) ? "lovable" : supabaseGoogleEnabled ? "supabase" : null;

let googleEnabled: Promise<boolean> | null = null;

/** Whether the Supabase project has Google switched on, from its public auth settings (read once). */
export function supabaseGoogleEnabled(): Promise<boolean> {
  googleEnabled ??= (async () => {
    const url = import.meta.env["VITE_SUPABASE_URL"];
    const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return false;
    try {
      const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
      if (!response.ok) return false;
      const settings = (await response.json()) as { external?: { google?: boolean } };
      return settings.external?.google === true;
    } catch {
      return false;
    }
  })();
  return googleEnabled;
}

/** The Google sign-in this page can offer right now, or null for none. */
export async function availableGoogleFlow(): Promise<GoogleFlow> {
  const host = window.location.hostname;
  return isLovableHost(host) ? "lovable" : googleFlow(host, await supabaseGoogleEnabled());
}

/** Starts Google sign-in and comes back to this page; returns an error message, or null on the way out. */
export async function signInWithGoogle(flow: "lovable" | "supabase"): Promise<string | null> {
  if (flow === "lovable") {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin, extraParams: { prompt: "select_account" } });
    return result.error ? result.error.message : null;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}${window.location.pathname}`, queryParams: { prompt: "select_account" } },
  });
  return error ? error.message : null;
}
