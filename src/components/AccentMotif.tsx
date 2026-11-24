import type { AccentMotif as Motif } from "@/lib/style-accents";

/** A small line drawing of a style accent, in the room's ink, so the corner piece needs no borrowed product photo. */
export function AccentMotif({ motif }: { motif: Motif }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className="fc-accent-motif" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {motif === "butterfly" && <>
        <path d="M8 6 Q32 34 56 6" strokeWidth="1.4" />
        <path d="M32 30 C22 18 10 22 14 34 C16 40 26 40 32 36 C38 40 48 40 50 34 C54 22 42 18 32 30 Z" />
        <path d="M32 36 C26 44 20 52 26 54 C30 55 32 48 32 44 C32 48 34 55 38 54 C44 52 38 44 32 36 Z" />
        <path d="M32 28 V50" />
      </>}
      {motif === "shades" && <>
        <path d="M4 26 Q32 18 60 26 L57 36 Q50 46 36 40 Q32 36 28 40 Q14 46 7 36 Z" fill="currentColor" fillOpacity=".18" />
        <path d="M4 26 L2 22 M60 26 L62 22" />
        <path d="M10 30 Q18 28 26 31" strokeWidth="1.4" opacity=".6" />
      </>}
      {motif === "pearls" && <>
        <circle cx="20" cy="34" r="9" fill="currentColor" fillOpacity=".15" /><circle cx="44" cy="34" r="9" fill="currentColor" fillOpacity=".15" />
        <path d="M16 30 Q18 28 21 28 M40 30 Q42 28 45 28" strokeWidth="1.4" />
      </>}
      {motif === "chain" && <>
        {[10, 22, 34, 46].map((x, i) => <rect key={x} x={x} y={i % 2 ? 26 : 22} width="14" height="16" rx="7" />)}
      </>}
      {motif === "bow" && <>
        <path d="M32 30 C22 16 8 20 10 30 C12 40 24 38 32 32 C40 38 52 40 54 30 C56 20 42 16 32 30 Z" />
        <path d="M30 33 L22 54 M34 33 L42 54" /><rect x="28" y="27" width="8" height="8" rx="2" fill="currentColor" fillOpacity=".25" />
      </>}
    </svg>
  );
}
