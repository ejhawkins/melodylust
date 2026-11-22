import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AVOID_MAX, BUILDS, COLOR_PLACES, DRESS_LEVELS, HEELS, LEAD_COLORS, OCCASIONS, SEASONS, SILHOUETTES,
  briefLines, swatchFor, type StylistBrief,
} from "@/lib/stylist-brief";

type Props = { value: StylistBrief; onChange: (next: StylistBrief) => void };

/** The stylist brief's toggles in the board composer. Every question is optional: chips that allow several answers
 *  press on and off, single-answer rows press again to clear. */
export function StylistBriefFields({ value: b, onChange }: Props) {
  const set = (patch: Partial<StylistBrief>) => onChange({ ...b, ...patch });
  const flip = <T extends string>(list: T[], item: T) => (list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  return <fieldset className="ls-brief-fields"><legend>Stylist brief <span>(optional)</span></legend>
    <p className="ls-brief-hint">Answer what you know. Anything left blank stays off the board.</p>

    <Many label="Occasion" options={OCCASIONS} on={b.occasions} onPick={o => set({ occasions: flip(b.occasions, o) })} />
    <One label="How dressed up" options={DRESS_LEVELS} on={b.dressLevel} onPick={o => set({ dressLevel: b.dressLevel === o ? null : o })} />

    {/* Lead colour: named swatches, then where the colour goes */}
    <div className="ls-brief-q" role="radiogroup" aria-label="Lead colour">
      <p className="ls-brief-label">Lead colour{b.leadColor && <em> · {b.leadColor}</em>}</p>
      <div className="ls-brief-swatches">{LEAD_COLORS.map(c => <button key={c.name} type="button" role="radio" aria-checked={b.leadColor === c.name}
        aria-label={c.name} title={c.name} className="ls-brief-swatch" style={{ backgroundColor: c.hex }}
        onClick={() => set({ leadColor: b.leadColor === c.name ? null : c.name })} />)}</div>
    </div>
    <Many label="Colour goes on" options={COLOR_PLACES} on={b.colorOn} onPick={o => set({ colorOn: flip(b.colorOn, o) })} />

    <Many label="Silhouette" options={SILHOUETTES} on={b.silhouettes} onPick={o => set({ silhouettes: flip(b.silhouettes, o) })} />
    <One label="Dress or separates" options={BUILDS} on={b.build} onPick={o => set({ build: b.build === o ? null : o })} />

    <One label="Heel" options={HEELS} on={b.heel} onPick={o => set({ heel: b.heel === o ? null : o })} />
    <Toggle label="Made for walking" checked={b.walkable} onChange={walkable => set({ walkable })} />

    <One label="Season" options={SEASONS} on={b.season} onPick={o => set({ season: b.season === o ? null : o })} />
    <Toggle label="Bring a layer" checked={b.layer} onChange={layer => set({ layer })} />

    <label>Avoid<input maxLength={AVOID_MAX} value={b.avoid} placeholder="e.g. no sequins, nothing strapless" onChange={e => set({ avoid: e.target.value })} /></label>
  </fieldset>;
}

function Many<T extends string>({ label, options, on, onPick }: { label: string; options: readonly T[]; on: readonly T[]; onPick: (o: T) => void }) {
  return <div className="ls-brief-q" role="group" aria-label={label}><p className="ls-brief-label">{label}</p>
    <div className="ls-board-tabs">{options.map(o => <Button key={o} type="button" size="chip" variant={on.includes(o) ? "listenSolid" : "listenOutline"}
      aria-pressed={on.includes(o)} onClick={() => onPick(o)}>{o}</Button>)}</div>
  </div>;
}

function One<T extends string>({ label, options, on, onPick }: { label: string; options: readonly T[]; on: T | null; onPick: (o: T) => void }) {
  return <div className="ls-brief-q" role="radiogroup" aria-label={label}><p className="ls-brief-label">{label}</p>
    <div className="ls-board-tabs">{options.map(o => <Button key={o} type="button" size="chip" variant={on === o ? "listenSolid" : "listenOutline"}
      role="radio" aria-checked={on === o} onClick={() => onPick(o)}>{o}</Button>)}</div>
  </div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return <div className="ls-brief-switch"><Switch id={id} checked={checked} onCheckedChange={onChange} /><label htmlFor={id}>{label}</label></div>;
}

/** The brief on the public board page: one labelled line per answered question. */
export function StylistBriefPanel({ brief }: { brief: StylistBrief }) {
  const lines = briefLines(brief);
  if (!lines.length) return null;
  const hex = swatchFor(brief.leadColor);
  return <section className="ls-brief" aria-labelledby="ls-brief-title">
    <h2 id="ls-brief-title" className="ls-board-h2">Stylist brief</h2>
    <dl>{lines.map(l => <div key={l.label}><dt>{l.label}</dt>
      <dd>{l.label === "Lead colour" && hex && <span className="ls-brief-dot" style={{ backgroundColor: hex }} aria-hidden="true" />}{l.value}</dd></div>)}</dl>
  </section>;
}
