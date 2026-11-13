import { useEffect, useState } from "react";
import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { denyGoogleAnalytics, loadGoogleAnalytics, readAnalyticsConsent, saveAnalyticsConsent, type AnalyticsConsent as Choice } from "@/lib/analytics";

/** The analytics question for a page that doesn't keep the choice itself (the listening room): it asks once, remembers the
 *  answer on this device, and loads Google Analytics only after a yes. Vercel Analytics hears the same choice from the root. */
export function AnalyticsGate({ tone }: { tone?: "room" }) {
  const [choice, setChoice] = useState<Choice>("granted"); // nothing shows until the saved choice is read
  useEffect(() => {
    const saved = readAnalyticsConsent();
    setChoice(saved);
    if (saved === "granted") loadGoogleAnalytics();
  }, []);
  return <AnalyticsConsent consent={choice} {...(tone ? { tone } : {})} onChoose={value => {
    saveAnalyticsConsent(value);
    setChoice(value);
    if (value === "granted") loadGoogleAnalytics(); else denyGoogleAnalytics();
  }} />;
}
