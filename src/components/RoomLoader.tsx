import { useEffect, useState, type CSSProperties } from "react";
import { ROOM_THEMES, type ThemeId, type RoomTheme } from "@/lib/themes/theme-spec";
import { TEXTURES } from "@/lib/themes/theme-css";

// Themed loading screen for the listening room.
// Reads palette, texture, motion.loader and copy.loadingCaptions from the theme spec.
// Progress is driven by the caller (e.g. Spotify SDK "ready" + content fetch), not a timer.

export interface RoomLoaderProps {
  themeId: ThemeId;
  /** 0-100. Caller owns progress; pass real loading signals. */
  progress: number;
  onEnter?: () => void;
  onStaySilent?: () => void;
}

export function captionAt(theme: RoomTheme, tick: number): string {
  const list = theme.copy.loadingCaptions;
  if (list.length === 0) return "";
  return list[((tick % list.length) + list.length) % list.length] ?? "";
}

export function clampProgress(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(100, Math.max(0, Math.round(p)));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

function Motif({
  theme,
  progress,
  reduced,
}: {
  theme: RoomTheme;
  progress: number;
  reduced: boolean;
}) {
  const spin = !reduced && progress >= 100;
  const { accent, highlight, ink } = theme.palette;
  if (theme.motion.loader === "chain-link") {
    const links = 6;
    const lit = Math.round((progress / 100) * links);
    return (
      <svg viewBox="0 0 240 40" width="240" height="40" aria-hidden="true">
        {Array.from({ length: links }, (_, i) => (
          <rect
            key={i}
            x={8 + i * 38}
            y={8}
            width={34}
            height={24}
            rx={12}
            fill="none"
            stroke={i < lit ? highlight : accent}
            strokeOpacity={i < lit ? 1 : 0.35}
            strokeWidth={5}
          />
        ))}
      </svg>
    );
  }
  if (theme.motion.loader === "spotlight-walk") {
    return (
      <svg viewBox="0 0 240 60" width="240" height="60" aria-hidden="true">
        <ellipse
          cx={20 + (progress / 100) * 200}
          cy={40}
          rx={28}
          ry={10}
          fill={highlight}
          fillOpacity={0.5}
        />
        <line x1={10} y1={50} x2={230} y2={50} stroke={accent} strokeWidth={2} />
      </svg>
    );
  }
  // belt-and-record: the record and tonearm (the arm drops when ready), and a leather belt whose tip threads
  // through a silver buckle as the room gets ready: progress is how far the strap has passed through.
  const tip = 16 + (progress / 100) * 128;
  return (
    <svg viewBox="0 0 160 200" width="160" height="200" aria-hidden="true">
      <g
        style={{
          transformOrigin: "80px 80px",
          animation: spin ? "ml-spin 3s linear infinite" : "none",
        }}
      >
        <circle cx={80} cy={80} r={70} fill={ink} stroke={accent} strokeWidth={2} />
        <circle cx={80} cy={80} r={22} fill={theme.palette.surface} />
        <circle cx={80} cy={80} r={3} fill={highlight} />
      </g>
      <line
        x1={150}
        y1={10}
        x2={progress >= 100 ? 110 : 140}
        y2={progress >= 100 ? 70 : 40}
        stroke={accent}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <g data-part="belt">
        <rect x={8} y={172} width={Math.max(0, tip - 8)} height={12} rx={3} fill={highlight} />
        {[24, 40, 56].filter(x => x < tip - 6).map(x => <circle key={x} cx={x} cy={178} r={1.6} fill={ink} />)}
        <rect data-part="buckle" x={86} y={166} width={18} height={24} rx={4} fill="none" stroke="#d9dde3" strokeWidth={3} />
        <line x1={95} y1={169} x2={95} y2={187} stroke="#d9dde3" strokeWidth={2} />
      </g>
    </svg>
  );
}

export function RoomLoader({ themeId, progress, onEnter, onStaySilent }: RoomLoaderProps) {
  const theme = ROOM_THEMES[themeId];
  const reduced = usePrefersReducedMotion();
  const pct = clampProgress(progress);
  const ready = pct >= 100;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced || ready) return;
    const ms = theme.motion.intensity === "punchy" ? 1400 : 2400;
    const id = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [reduced, ready, theme.motion.intensity]);

  const style: CSSProperties = {
    background: TEXTURES[theme.texture](theme),
    color: theme.palette.text,
    fontFamily: theme.type.body,
  };

  return (
    <section
      data-theme={theme.id}
      data-loader={theme.motion.loader}
      style={style}
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-8 text-center"
    >
      <style>{`@keyframes ml-spin{to{transform:rotate(360deg)}}`}</style>
      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: theme.palette.accent }}>
        {ready ? `${theme.copy.listeningLabel} ready` : theme.copy.silenceLabel}
      </p>
      <h1
        className="text-4xl"
        style={{
          fontFamily: theme.type.display,
          fontStyle: theme.type.display_style === "italic" ? "italic" : "normal",
        }}
      >
        {theme.label}
      </h1>
      <Motif theme={theme} progress={pct} reduced={reduced} />
      <div
        role="progressbar"
        aria-label="Loading the room"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 w-64 overflow-hidden rounded-full"
        style={{ background: `${theme.palette.accent}33` }}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: theme.palette.highlight,
            transition: reduced ? "none" : "width 300ms",
          }}
        />
      </div>
      <p aria-live="polite" className="min-h-[1.5em] text-sm">
        {reduced ? theme.copy.loadingCaptions.join(" · ") : captionAt(theme, tick)}
      </p>
      {ready && (
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onEnter}
            className="rounded-full px-6 py-2 font-medium focus-visible:outline focus-visible:outline-2"
            style={{ background: theme.palette.highlight, color: theme.palette.ink }}
          >
            {theme.copy.enterCta}
          </button>
          <button
            type="button"
            onClick={onStaySilent}
            className="rounded-full border px-6 py-2 focus-visible:outline focus-visible:outline-2"
            style={{ borderColor: theme.palette.accent, color: theme.palette.text }}
          >
            Stay in {theme.copy.silenceLabel.toLowerCase()}
          </button>
        </div>
      )}
      {ready && (
        <p className="text-xs opacity-70">
          Full songs need Spotify Premium. {theme.copy.silenceLabel} needs no login.
        </p>
      )}
    </section>
  );
}
