import { useEffect, useId, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { roomPool } from "@/lib/capsule-tree";
import { FILLER_PROFILE, applyTweak, buildDayPlaylist, type DayProfile, type Tweak } from "@/lib/day-playlist";
import type { MixSong } from "@/lib/listening-room";

const KEY = "ml-day-profile";
function readProfile(): DayProfile {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<DayProfile> | null;
    return saved && typeof saved === "object" ? { ...FILLER_PROFILE, ...saved } : FILLER_PROFILE;
  } catch { return FILLER_PROFILE; }
}

type TextField = Exclude<keyof DayProfile, "energy" | "length">;
const FIELDS: { key: TextField; label: string; hint: string }[] = [
  { key: "style", label: "Style", hint: "quiet luxury, 90s minimal, thrifted" },
  { key: "palette", label: "Palette", hint: "camel, cream, black" },
  { key: "fabrics", label: "Fabrics and textures", hint: "silk, denim, leather" },
  { key: "silhouettes", label: "Silhouettes", hint: "oversized tailoring" },
  { key: "icons", label: "Icons and references", hint: "designers, films, people" },
  { key: "love", label: "Artists I love", hint: "Frank Ocean, SZA" },
  { key: "avoid", label: "Artists to skip", hint: "anyone you'd rather not hear" },
  { key: "mood", label: "The day and its mood", hint: "coffee to last call" },
];
const TIER_NAME = { core: "Core", adjacent: "Adjacent", wildcard: "Wildcard" } as const;

/**
 * Build a day: the reader's taste profile (it opens on sample answers to replace) turned into one day's playlist, laid
 * out as a music supervisor's sheet — title, caption, why it fits, the tracklist by tier and part of the day, what to
 * wear, and three tweaks. Songs come only from the room (the mix and the Studio), so every one is real and plays on the
 * bar; tempos marked ~ are their genre's general BPM. The profile stays on this device.
 */
export function ListenDayPlaylist({ mix, nowPlaying, onPlay, onBack }: {
  mix: readonly MixSong[];
  nowPlaying?: string | undefined;
  onPlay: (queue: MixSong[], index: number) => void;
  onBack: () => void;
}) {
  const [profile, setProfile] = useState<DayProfile>(FILLER_PROFILE);
  const [discover, setDiscover] = useState(false);
  const id = useId();
  useEffect(() => { setProfile(readProfile()); }, []);
  const save = (next: DayProfile) => {
    setProfile(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  const pool = useMemo(() => roomPool(mix), [mix]);
  const day = useMemo(() => buildDayPlaylist(profile, pool, { discover }), [profile, pool, discover]);
  const queue = day.tracks.map(t => t.song);
  const tweak = (t: Tweak) => (t.id === "discover" ? setDiscover(d => !d) : save(applyTweak(profile, t.id)));
  const sample = JSON.stringify(profile) === JSON.stringify(FILLER_PROFILE);

  return (
    <article className="ls-board ls-day" aria-labelledby={`${id}-title`}>
      <header className="ls-board-head">
        <div>
          <p className="ls-kicker">Your Library · Build a day</p>
          <h1 id={`${id}-title`} className="ls-day-title">{day.title}</h1>
          <p className="ls-day-caption">{day.caption}</p>
          <div className="ls-look-actions">
            <Button variant="listenInk" size="bar" disabled={!queue.length} onClick={() => onPlay(queue, 0)}><Play className="fill-current" aria-hidden />Play the day</Button>
          </div>
        </div>
      </header>

      <form className="ls-day-form" aria-labelledby={`${id}-form`} onSubmit={e => e.preventDefault()}>
        <div className="ls-day-form-head">
          <h2 id={`${id}-form`} className="ls-day-h2">Your taste profile</h2>
          {sample ? <p className="ls-day-note">Sample answers — make them yours. The playlist rebuilds as you type.</p>
            : <Button type="button" variant="listenCategory" size="chip" onClick={() => save(FILLER_PROFILE)}>Back to the sample</Button>}
        </div>
        <div className="ls-day-fields">
          {FIELDS.map(f => (
            <label key={f.key} className="ls-day-field">
              <span>{f.label}</span>
              <input type="text" value={profile[f.key]} placeholder={f.hint} autoComplete="off" spellCheck={false}
                onChange={e => save({ ...profile, [f.key]: e.target.value })} />
            </label>
          ))}
          <label className="ls-day-field">
            <span>Energy <output>{profile.energy}</output> / 10</span>
            <input type="range" min={1} max={10} step={1} value={profile.energy} onChange={e => save({ ...profile, energy: Number(e.target.value) })} />
          </label>
          <label className="ls-day-field">
            <span>Length</span>
            <input type="number" inputMode="numeric" min={3} max={20} value={profile.length}
              onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) save({ ...profile, length: Math.min(20, Math.max(3, Math.round(n))) }); }} />
          </label>
        </div>
      </form>

      <section className="ls-day-section" aria-labelledby={`${id}-why`}>
        <h2 id={`${id}-why`} className="ls-day-h2">Why this fits you</h2>
        <p className="ls-day-why">{day.why}</p>
      </section>

      <section className="ls-day-section" aria-labelledby={`${id}-list`}>
        <h2 id={`${id}-list`} className="ls-day-h2">The day, track by track</h2>
        {day.short && <p className="ls-day-note">{day.short}</p>}
        <div className="ls-day-table-wrap">
          <table className="ls-day-table">
            <thead>
              <tr><th scope="col">#</th><th scope="col">Track</th><th scope="col">Artist</th><th scope="col">Tier</th><th scope="col">Role in the day</th><th scope="col">BPM</th><th scope="col">Why</th></tr>
            </thead>
            <tbody>
              {day.tracks.map((t, i) => {
                const live = nowPlaying === t.song.caption;
                return (
                  <tr key={t.song.caption} data-active={live} data-tier={t.tier}>
                    <td className="ls-day-num">{String(i + 1).padStart(2, "0")}</td>
                    <th scope="row">
                      <Button variant="listenTile" size="block" className="ls-day-track" data-active={live} aria-label={`Play ${t.song.title} by ${t.song.artist}`} onClick={() => onPlay(queue, i)}>
                        <img src={t.song.art} alt="" width={40} height={40} loading="lazy" />
                        <span>{t.song.title}</span>
                        <span className="ls-runway-play" aria-hidden><Play /></span>
                      </Button>
                    </th>
                    <td>{t.song.artist}</td>
                    <td><span className="ls-day-tier">{TIER_NAME[t.tier]}</span></td>
                    <td>{t.role} <span className="ls-day-phase">· {t.phase}</span></td>
                    <td className="ls-day-bpm" title={t.bpmKnown ? "The song's tempo" : "Its genre's general tempo; this song's own isn't on file"}>{t.bpmKnown ? t.bpm : `~${t.bpm}`}</td>
                    <td className="ls-day-reason">{t.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="ls-day-aside">BPM with a ~ is the genre’s general tempo where the song’s own isn’t on file. Songs come from the Autumn Mix and the Studio.</p>
      </section>

      <section className="ls-day-section" aria-labelledby={`${id}-wear`}>
        <h2 id={`${id}-wear`} className="ls-day-h2">Wear it with</h2>
        <p className="ls-day-wear">{day.wear.opener}</p>
        <p className="ls-day-wear">{day.wear.closer}</p>
      </section>

      <section className="ls-day-section" aria-labelledby={`${id}-tweak`}>
        <h2 id={`${id}-tweak`} className="ls-day-h2">Tweak it</h2>
        <div className="ls-look-actions">
          {day.tweaks.map(t => <Button key={t.id} variant="listenCategory" size="chip" aria-pressed={t.id === "discover" ? discover : undefined} onClick={() => tweak(t)}>{t.label}</Button>)}
        </div>
      </section>

      <Button variant="listenCategory" size="chip" onClick={onBack}>Back to the feed</Button>
    </article>
  );
}
