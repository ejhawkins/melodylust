import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, Download, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lookupTrackDetails } from '@/lib/freqblog.functions';
import { trackStats } from '@/lib/freqblog';
import { FREQBLOG_ATTRIBUTION } from '@/lib/artist-provider';
import {
  bandFitLabel, categoryIds, MAX_PICKS, parseBpm, resolveSampler, RUNWAY_CATEGORIES, SAMPLER_OPEN_QUESTIONS, SAMPLER_PLAYLIST, SAMPLER_SOURCES, samplerCsv,
  withManualTrack, withManualTrackUpdate, withoutManualTrack, withoutTrackEdit, withTrackEdit,
  type CategoryId, type SamplerEdits, type SamplerRow,
} from '@/lib/runway-sampler';
import { useSamplerEdits } from '@/lib/runway-sampler-store';

type Update = (change: (current: SamplerEdits) => SamplerEdits) => void;

const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.2em]';
const field = 'w-full rounded-none border border-stylus-paper/30 bg-stylus-ink px-3 py-2 text-base text-stylus-paper placeholder:text-stylus-paper/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-stylus-accent';
const primary = 'min-h-11 rounded-none bg-stylus-paper text-stylus-ink hover:bg-stylus-accent hover:text-stylus-ink';
const tool = 'min-h-11';
const bpmText = (bpm: number | null) => (bpm === null ? 'Free time' : `${bpm} BPM`);

/** The Runway Sound Sampler: the sourced playlist, sorted by catwalk energy, with the reader's own edits on top. */
export function RunwaySampler() {
  const [edits, update] = useSamplerEdits();
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const rows = useMemo(() => resolveSampler(edits), [edits]);
  const running = rows.filter(row => !row.hidden);
  const hiddenCount = rows.length - running.length;
  const visible = rows.filter(row => (filter === 'all' || row.category === filter) && (showHidden || !row.hidden));
  const changed = Object.keys(edits.edits).length + edits.added.length;

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([samplerCsv(running)], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'runway-sound-sampler.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="min-h-screen bg-stylus-ink text-stylus-paper">
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <a href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-stylus-paper/80 hover:text-stylus-accent"><ArrowLeft className="size-4" aria-hidden="true" />Melody Lust</a>

      <header className="mt-6 border-b border-stylus-paper/25 pb-8">
        <p className={eyebrow}>Runway Sound Reports · Research pool · {SAMPLER_PLAYLIST.researched}</p>
        <h1 className="mt-3 font-['Bodoni_Moda'] text-5xl leading-none tracking-tight sm:text-7xl">Runway Sound Sampler</h1>
        <p className="mt-4 max-w-2xl text-base text-stylus-paper/80">Balenciaga, Prada, Celine and Loewe show soundtracks, each tied to a source and sorted by catwalk energy. Change a category or tempo, hide a track, or add your own picks.</p>
      </header>

      <section aria-labelledby="listen" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="listen" className={eyebrow}>Listen</h2>
          <a href={SAMPLER_PLAYLIST.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm hover:text-stylus-accent">Open in Spotify <ArrowUpRight className="size-4" aria-hidden="true" /></a>
        </div>
        <iframe title={`Spotify playlist: ${SAMPLER_PLAYLIST.title}`} src={SAMPLER_PLAYLIST.embedUrl} className="mt-3 h-[352px] w-full border-0" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
        <p className="mt-2 text-xs text-stylus-paper/60">The Spotify playlist is the sourced running order. Your edits below are saved on this device only and don’t change it.</p>
      </section>

      <section aria-labelledby="running-order" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stylus-paper/25 pb-4">
          <div>
            <h2 id="running-order" className={eyebrow}>Running order</h2>
            <p className="mt-1 text-sm text-stylus-paper/70">{running.length} tracks{hiddenCount > 0 && ` · ${hiddenCount} hidden`}{changed > 0 && ' · includes your edits'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hiddenCount > 0 && <Button variant="stylusTool" className={tool} aria-pressed={showHidden} onClick={() => setShowHidden(shown => !shown)}>{showHidden ? 'Hide hidden' : `Show hidden (${hiddenCount})`}</Button>}
            <Button variant="stylusTool" className={tool} onClick={exportCsv}><Download aria-hidden="true" />Export CSV</Button>
          </div>
        </div>

        <div role="group" aria-label="Filter by category" className="pill-rail mt-4" data-tone="stylus">
          {(['all', ...categoryIds] as const).map(id => <Button key={id} variant="stylusTool" aria-pressed={filter === id} onClick={() => setFilter(id)}
            className={`${tool} ${filter === id ? 'border-stylus-accent bg-stylus-accent text-stylus-ink hover:bg-stylus-accent' : ''}`}>
            {id === 'all' ? 'All' : `${id} · ${RUNWAY_CATEGORIES[id].name}`}
          </Button>)}
        </div>
        {filter !== 'all' && <p className="mt-3 text-sm text-stylus-paper/70">{RUNWAY_CATEGORIES[filter].sound}. {RUNWAY_CATEGORIES[filter].band ? `${RUNWAY_CATEGORIES[filter].band!.min}–${RUNWAY_CATEGORIES[filter].band!.max} BPM.` : 'Ambient and downtempo: no tempo band.'}</p>}

        {visible.length === 0
          ? <p className="mt-8 text-stylus-paper/70">No tracks in this category yet. Add one below.</p>
          : <ol className="mt-2 divide-y divide-stylus-paper/15">
            {visible.map(row => <TrackRow key={row.id} row={row} number={rows.indexOf(row) + 1} editing={editing === row.id}
              onEdit={() => setEditing(row.id)} onClose={() => setEditing(null)} update={update} />)}
          </ol>}
      </section>

      <AddTrack update={update} picks={edits.added.length} />

      <footer className="mt-12 grid gap-8 border-t border-stylus-paper/25 pt-8 sm:grid-cols-2">
        <section aria-labelledby="progression">
          <h2 id="progression" className={eyebrow}>Audio progression · Interpretation</h2>
          <p className="mt-3 text-sm leading-relaxed text-stylus-paper/85">The sampler opens in Tallis’s sacred stillness, the way a show holds its first look in silence, then tightens through Plastikman’s mechanical minimalism and BFRND’s dark club into a high-glamour strut. Post-punk guitars carry the middle, and the finale slows to Prada’s 90s hush and BFRND’s score, like the last walk and the bow.</p>
          <h2 className={`${eyebrow} mt-8`}>Still to verify</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stylus-paper/80">{SAMPLER_OPEN_QUESTIONS.map(question => <li key={question}>{question}</li>)}</ul>
        </section>
        <section aria-labelledby="sources">
          <h2 id="sources" className={eyebrow}>Sources</h2>
          <ol className="mt-3 space-y-2 text-sm">{SAMPLER_SOURCES.map(source => <li key={source.id}>
            <span className="font-semibold">{source.id}</span> <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-stylus-paper/40 underline-offset-2 hover:text-stylus-accent">{source.title}</a>
            <span className="text-stylus-paper/60"> · {source.checked === 'read' ? 'read in full' : 'search excerpt'}</span>
          </li>)}</ol>
          <p className="mt-4 text-xs text-stylus-paper/60">{FREQBLOG_ATTRIBUTION}: tempos from streaming previews, cross-checked with songbpm and Deezer where noted. Categories and tempo bands are editorial.</p>
        </section>
      </footer>
    </div>
  </div>;
}

function TrackRow({ row, number, editing, onEdit, onClose, update }: { row: SamplerRow; number: number; editing: boolean; onEdit: () => void; onClose: () => void; update: Update }) {
  const offBand = row.fit.kind === 'over' || row.fit.kind === 'under';
  return <li className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 py-5 ${row.hidden ? 'opacity-55' : ''}`}>
    <span className="pt-1 text-sm tabular-nums text-stylus-paper/60">{String(number).padStart(2, '0')}</span>
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-lg font-semibold leading-tight">{row.title}</h3>
        <span className="text-stylus-paper/80">{row.artist}</span>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-2"><span className="grid size-6 place-items-center border border-stylus-paper/50 text-xs font-bold" aria-hidden="true">{row.category}</span><span>{RUNWAY_CATEGORIES[row.category].name}</span></span>
        <span className="tabular-nums">{bpmText(row.bpm)}</span>
        <span className={offBand ? 'text-stylus-accent' : 'text-stylus-paper/60'}>{bandFitLabel(row.fit)}</span>
        {row.origin === 'manual' && <span className={`${eyebrow} border border-stylus-accent px-1.5 py-0.5 text-stylus-accent`}>Your pick</span>}
        {row.edited.map(what => <span key={what} className={`${eyebrow} border border-stylus-paper/40 px-1.5 py-0.5`}>Manual {what === 'bpm' ? 'BPM' : 'category'}</span>)}
        {row.hidden && <span className={eyebrow}>Hidden</span>}
      </p>
      <p className="mt-1 text-sm text-stylus-paper/70">
        {[row.house, row.show].filter(Boolean).join(' · ')}
        {row.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="ml-2 underline decoration-stylus-paper/40 underline-offset-2 hover:text-stylus-accent">{source.id}</a>)}
        {row.origin === 'manual' && (row.sourceUrl
          ? <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline decoration-stylus-paper/40 underline-offset-2 hover:text-stylus-accent">Your source</a>
          : <span className="ml-2 text-stylus-accent">Unsourced</span>)}
      </p>
      {row.versionNote && <p className="mt-1 text-sm italic text-stylus-paper/60">{row.versionNote}</p>}
      {row.bpmNote && <p className="mt-1 text-xs text-stylus-paper/55">Tempo: {row.bpmNote}</p>}
      {row.note && <p className="mt-2 border-l-2 border-stylus-accent pl-3 text-sm">Your note: {row.note}</p>}
      {editing
        ? <TrackEditor row={row} update={update} onClose={onClose} />
        : <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="stylusTool" className={tool} asChild><a href={row.spotifyUrl} target="_blank" rel="noopener noreferrer">{row.origin === 'manual' ? 'Find on Spotify' : 'Spotify'} <ArrowUpRight aria-hidden="true" /></a></Button>
          <Button variant="stylusTool" className={tool} aria-label={`Edit ${row.title}`} onClick={onEdit}><Pencil aria-hidden="true" />Edit</Button>
        </div>}
    </div>
  </li>;
}

function TrackEditor({ row, update, onClose }: { row: SamplerRow; update: Update; onClose: () => void }) {
  const [category, setCategory] = useState<CategoryId>(row.category);
  const [bpm, setBpm] = useState(row.bpm === null ? '' : String(row.bpm));
  const [note, setNote] = useState(row.note);
  const [hidden, setHidden] = useState(row.hidden);
  const [error, setError] = useState('');
  const changedHere = row.edited.length > 0 || row.note !== '' || row.hidden;

  const save = (event: FormEvent) => {
    event.preventDefault();
    const tempo = parseBpm(bpm);
    if (tempo === 'invalid') { setError('Type a tempo between 30 and 250, or leave it blank for free time.'); return; }
    update(current => row.origin === 'manual'
      ? withTrackEdit(withManualTrackUpdate(current, row.id, { category, bpm: tempo, note: note.trim() }), row.id, { hidden })
      : withTrackEdit(current, row.id, { category, bpm: tempo, note: note.trim(), hidden }));
    onClose();
  };

  return <form onSubmit={save} aria-label={`Edit ${row.title}`} className="mt-4 grid gap-4 border border-stylus-paper/25 p-4 sm:grid-cols-2">
    <label className="grid gap-1 text-sm">Category
      <select className={field} value={category} onChange={event => setCategory(event.target.value as CategoryId)}>
        {categoryIds.map(id => <option key={id} value={id}>{id} · {RUNWAY_CATEGORIES[id].name}</option>)}
      </select>
    </label>
    <label className="grid gap-1 text-sm">BPM
      <input className={field} inputMode="decimal" value={bpm} onChange={event => { setBpm(event.target.value); setError(''); }} placeholder="Blank = free time" aria-invalid={error !== ''} aria-describedby={error ? `${row.id}-bpm-error` : undefined} />
    </label>
    <label className="grid gap-1 text-sm sm:col-span-2">Note
      <textarea className={`${field} min-h-20`} maxLength={280} value={note} onChange={event => setNote(event.target.value)} placeholder="What you heard, or why you moved it" />
    </label>
    <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
      <input type="checkbox" className="size-5 accent-[var(--stylus-accent)]" checked={hidden} onChange={event => setHidden(event.target.checked)} />
      Hide from my running order
    </label>
    {error && <p id={`${row.id}-bpm-error`} role="alert" className="text-sm text-stylus-accent sm:col-span-2">{error}</p>}
    <div className="flex flex-wrap gap-2 sm:col-span-2">
      <Button type="submit" className={primary}>Save</Button>
      <Button type="button" variant="stylusTool" className={tool} onClick={onClose}>Cancel</Button>
      {row.origin === 'sourced' && changedHere && <Button type="button" variant="stylusTool" className={tool} onClick={() => { update(current => withoutTrackEdit(current, row.id)); onClose(); }}><RotateCcw aria-hidden="true" />Reset to sourced</Button>}
      {row.origin === 'manual' && <Button type="button" variant="stylusTool" className={tool} onClick={() => { update(current => withoutManualTrack(current, row.id)); onClose(); }}><Trash2 aria-hidden="true" />Remove pick</Button>}
    </div>
  </form>;
}

const blankPick = { title: '', artist: '', show: '', category: 'B' as CategoryId, bpm: '', sourceUrl: '', note: '' };

function AddTrack({ update, picks }: { update: Update; picks: number }) {
  const [pick, setPick] = useState(blankPick);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [looking, setLooking] = useState(false);
  const set = (key: keyof typeof blankPick) => (event: { target: { value: string } }) => { setPick(current => ({ ...current, [key]: event.target.value })); setError(''); };

  const lookUp = async () => {
    if (!pick.title.trim() || !pick.artist.trim()) { setError('Type the track and artist first.'); return; }
    setLooking(true); setStatus('Looking up the tempo…');
    try {
      const { track } = await lookupTrackDetails({ data: { track: pick.title.trim(), artist: pick.artist.trim() } });
      if (track?.bpm) {
        setPick(current => ({ ...current, bpm: String(track.bpm) }));
        setStatus(`FreqBlog: ${trackStats(track)} (${track.title} by ${track.artist}). Check it’s the right recording.`);
      } else setStatus('FreqBlog has no tempo for this track. Type one in, or leave it blank for free time.');
    } catch {
      setStatus('Couldn’t reach FreqBlog. Type a tempo in, or try again.');
    } finally { setLooking(false); }
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    const title = pick.title.trim(), artist = pick.artist.trim(), sourceUrl = pick.sourceUrl.trim();
    if (!title || !artist) { setError('A pick needs a track and an artist.'); return; }
    if (picks >= MAX_PICKS) { setError(`You have ${MAX_PICKS} picks, the most this device keeps. Remove one to add another.`); return; }
    const bpm = parseBpm(pick.bpm);
    if (bpm === 'invalid') { setError('Type a tempo between 30 and 250, or leave it blank for free time.'); return; }
    if (sourceUrl && !/^https:\/\/\S+\.\S+/.test(sourceUrl)) { setError('A source link must start with https://.'); return; }
    update(current => withManualTrack(current, { title, artist, show: pick.show.trim(), category: pick.category, bpm, sourceUrl: sourceUrl || null, note: pick.note.trim() }));
    setPick(blankPick);
    setStatus(`Added “${title}” to the end of your running order.`);
  };

  return <section aria-labelledby="add-track" className="mt-10 border-t border-stylus-paper/25 pt-8">
    <h2 id="add-track" className={eyebrow}>Add your own pick</h2>
    <p className="mt-1 text-sm text-stylus-paper/70">Your picks are marked as yours. Add a source link if a show used the track; without one it shows as unsourced.</p>
    <form onSubmit={add} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Track<input className={field} value={pick.title} onChange={set('title')} autoComplete="off" /></label>
      <label className="grid gap-1 text-sm">Artist<input className={field} value={pick.artist} onChange={set('artist')} autoComplete="off" /></label>
      <label className="grid gap-1 text-sm">House / show<input className={field} value={pick.show} onChange={set('show')} placeholder="e.g. Thom Browne AW17" autoComplete="off" /></label>
      <label className="grid gap-1 text-sm">Category
        <select className={field} value={pick.category} onChange={set('category')}>
          {categoryIds.map(id => <option key={id} value={id}>{id} · {RUNWAY_CATEGORIES[id].name}</option>)}
        </select>
      </label>
      <div className="grid gap-1 text-sm">
        <label htmlFor="pick-bpm">BPM</label>
        <div className="flex gap-2">
          <input id="pick-bpm" className={field} inputMode="decimal" value={pick.bpm} onChange={set('bpm')} placeholder="Blank = free time" />
          <Button type="button" variant="stylusTool" className={`${tool} shrink-0`} onClick={lookUp} disabled={looking}>{looking ? 'Looking…' : 'Look up'}</Button>
        </div>
      </div>
      <label className="grid gap-1 text-sm">Source link<input className={field} type="url" value={pick.sourceUrl} onChange={set('sourceUrl')} placeholder="https://" autoComplete="off" /></label>
      <label className="grid gap-1 text-sm sm:col-span-2">Note<textarea className={`${field} min-h-20`} maxLength={280} value={pick.note} onChange={set('note')} /></label>
      {error && <p role="alert" className="text-sm text-stylus-accent sm:col-span-2">{error}</p>}
      <p role="status" className="text-sm text-stylus-paper/80 sm:col-span-2">{status}</p>
      <div className="sm:col-span-2"><Button type="submit" className={primary}><Plus aria-hidden="true" />Add to running order</Button></div>
    </form>
  </section>;
}
