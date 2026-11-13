import { useId, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Check, Download, Import, Link2, ListMusic, Loader2, MoreHorizontal, Pause, Play, Plus, Share2, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSpotifyArtist } from "@/lib/spotify-track.functions";
import { useAlbumArt } from "@/lib/album-art";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  createStudioPlaylist, deleteStudioPlaylist, importTracks, matchCatalog, parseMusicLink, spotifyTrackInfo, parseSongList,
  setInPlaylist, studioMix, useStudio, type StudioTrack,
} from "@/lib/studio";
import type { MixSong } from "@/lib/listening-room";
import { useWishlist, type WishItem } from "@/lib/wishlist";
import { AI_PLAYLIST_LENGTHS, localPlaylist, type AIPlaylist } from "@/lib/ai-playlist";
import { generateAIPlaylist } from "@/lib/ai-playlist.functions";
import { UNPLAYABLE } from "@/lib/capsule-tree";
import { FIT_ITEMS, fitWishName } from "@/lib/fit-compass";
import { stories } from "@/data/home";

type Tab = "library" | "explore" | "import";
const pill = "rounded-full px-4 py-1.5 text-sm transition-colors";

/** A song's album art: its own, or its record's cover from Spotify when it came in without one. */
function TrackArt({ t }: { t: StudioTrack }) {
  const fetched = useAlbumArt(t.art ? null : t.spotify);
  const art = t.art ?? fetched;
  return art ? <img src={art} alt="" className="size-full object-cover" loading="lazy" /> : <ListMusic className="m-auto size-5 text-muted-foreground" />;
}

function Eq({ on }: { on: boolean }) {
  return <span className="ls-studio-eq" data-on={on} aria-hidden><i /><i /><i /><i /></span>;
}

/** The Studio: My Library, Explore, Import, with an Add-to-playlist sheet, Spotify previews and a share card. In the
 *  listening room a song plays through the room's player bar (`onPlay`), queued with the rest of the list it was pressed
 *  in, so the bar's next and previous walk that list; `nowPlaying` is the bar's song, marked in the rows. Without `onPlay`
 *  the Studio previews in its own Spotify player. */
export function ListenStudio({ onPlay, nowPlaying }: { onPlay?: (queue: MixSong[], index: number) => void; nowPlaying?: string | undefined } = {}) {
  const studio = useStudio();
  const [tab, setTab] = useState<Tab>("library");
  const [openList, setOpenList] = useState<string | null>(null);
  const [playing, setPlaying] = useState<StudioTrack | null>(null);
  const [adding, setAdding] = useState<StudioTrack | null>(null);
  const [sharing, setSharing] = useState<StudioTrack | null>(null);
  const [newName, setNewName] = useState("");
  const byId = useMemo(() => new Map(studio.tracks.map(t => [t.id, t])), [studio.tracks]);
  const list = studio.playlists.find(p => p.id === openList);
  const listTracks = (list?.trackIds ?? []).flatMap(i => byId.get(i) ?? []);

  // The bar's song, when it is a Studio song: matched on the caption the bar plays it under.
  const onBar = (t: StudioTrack) => Boolean(onPlay && nowPlaying && studioMix(t)?.caption === nowPlaying);
  const play = (t: StudioTrack, from: readonly StudioTrack[]) => {
    if (!t.spotify) { toast("No preview for this song yet", { description: `${t.title} · ${t.artist}` }); return; }
    if (onPlay) {
      const playable = from.filter(track => track.spotify);
      onPlay(playable.flatMap(track => studioMix(track) ?? []), Math.max(0, playable.findIndex(track => track.id === t.id)));
      return;
    }
    setPlaying(p => p?.id === t.id ? null : t);
  };

  const Row = ({ t, playlistId, from }: { t: StudioTrack; playlistId?: string; from: readonly StudioTrack[] }) => {
    const previewing = !onPlay && playing?.id === t.id;
    const live = previewing || onBar(t);
    return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary/60">
      <button type="button" onClick={() => play(t, from)} aria-label={previewing ? `Pause ${t.title}` : onBar(t) ? `Playing ${t.title}, play it from the start` : `Play ${t.title}`} className="relative size-11 overflow-hidden rounded-lg bg-secondary">
        <TrackArt t={t} />
        <span className="absolute inset-0 grid place-items-center bg-background/50">{previewing ? <Pause className="size-4 text-primary" /> : <Play className="size-4 text-primary" />}</span>
      </button>
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate font-medium text-foreground">{t.title}<Eq on={live} /></p>
        <p className="truncate text-xs text-muted-foreground">{t.artist}{t.album ? ` · ${t.album}` : ""}{t.duration ? ` · ${t.duration}` : ""}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" className="text-primary" onClick={() => setAdding(t)} aria-label={`Add ${t.title} to a playlist`}><Plus className="size-4" /><span className="max-sm:sr-only">Add</span></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="More"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setSharing(t)}><Share2 className="size-4" />Share card</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAdding(t)}><Plus className="size-4" />Add to another playlist</DropdownMenuItem>
            {playlistId && <DropdownMenuItem onSelect={() => {
              setInPlaylist(playlistId, t.id, false);
              toast("Removed from playlist", { action: { label: "Undo", onClick: () => setInPlaylist(playlistId, t.id, true) } });
            }}><Trash2 className="size-4" />Remove</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
  };

  return (
    <section className="ls-section ls-studio rounded-3xl border border-border bg-card/70 p-4 text-card-foreground backdrop-blur sm:p-6" aria-labelledby="ls-studio-h">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="ls-studio-h" className="ls-studio-title"><span className="ls-studio-the">The</span> Studio</h2>
          <p className="ls-studio-sub">Build playlists, preview songs, share the look of what you're hearing.</p>
        </div>
        <nav className="flex gap-1 rounded-full bg-secondary p-1" aria-label="Studio">
          {([["library", "My Library"], ["explore", "Explore"], ["import", "Import Music"]] as const).map(([id, label]) =>
            <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setOpenList(null); }}
              className={`${pill} ${tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
        </nav>
      </header>

      {tab === "library" && !list && (
        <ul className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-4">
          {studio.playlists.map(p => {
            // Up to four of its songs' album covers: their own, or fetched from Spotify for songs that came in without one.
            const covers = p.trackIds.flatMap(i => byId.get(i) ?? []).filter(t => t.art || t.spotify).slice(0, 4);
            return <li key={p.id}>
              <button type="button" onClick={() => setOpenList(p.id)} className="group w-full text-left">
                <div className="grid aspect-square grid-cols-2 overflow-hidden rounded-2xl bg-secondary transition-transform group-hover:-translate-y-0.5">
                  {covers.length ? covers.map(t => <span key={t.id} className={`block size-full bg-secondary ${covers.length === 1 ? "col-span-2 row-span-2" : ""}`}><TrackArt t={t} /></span>) : <ListMusic className="col-span-2 m-auto size-8 text-muted-foreground" />}
                </div>
                <p className="mt-2 truncate font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.trackIds.length} {p.trackIds.length === 1 ? "song" : "songs"}</p>
              </button>
            </li>;
          })}
          <li>
            <form className="flex aspect-square flex-col justify-center gap-2 rounded-2xl border border-dashed border-border p-3" onSubmit={e => {
              e.preventDefault(); const p = createStudioPlaylist(newName); setNewName(""); toast(`Made “${p.name}”`);
            }}>
              <Plus className="mx-auto size-6 text-primary" />
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New playlist" aria-label="New playlist name" className="rounded-lg bg-secondary px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground" />
              <Button type="submit" size="sm">Create</Button>
            </form>
          </li>
          <li className="col-span-2"><AIPlaylistCard tracks={studio.tracks} onMade={setOpenList} /></li>
        </ul>
      )}

      {tab === "library" && list && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpenList(null)}>← All playlists</Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { deleteStudioPlaylist(list.id); setOpenList(null); toast(`Deleted “${list.name}”`); }}><Trash2 className="size-4" />Delete</Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="ls-studio-list-title">{list.name}</h3>
            {onPlay && listTracks.some(t => t.spotify) && <Button size="sm" onClick={() => { const first = listTracks.find(t => t.spotify); if (first) play(first, listTracks); }}><Play className="size-4" />Play all</Button>}
          </div>
          {listTracks.length ? <ul>{listTracks.map(t => <Row key={t.id} t={t} playlistId={list.id} from={listTracks} />)}</ul>
            : <p className="py-6 text-sm text-muted-foreground">Empty for now. Tap + Add on any song in Explore.</p>}
        </div>
      )}

      {tab === "explore" && <ul>{studio.tracks.map(t => <Row key={t.id} t={t} from={studio.tracks} />)}</ul>}

      {tab === "import" && <Importer onDone={id => { setTab("library"); setOpenList(id); }} />}

      {playing?.spotify && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <div className="flex items-center justify-between bg-secondary px-3 py-2 text-xs">
            <span className="flex items-center gap-2 text-primary"><Eq on />Now previewing · {playing.title}</span>
            <button type="button" aria-label="Close preview" onClick={() => setPlaying(null)}><X className="size-4" /></button>
          </div>
          <iframe key={playing.spotify} title={`Spotify preview: ${playing.title}`} src={`https://open.spotify.com/embed/track/${playing.spotify}?utm_source=generator&theme=0`} width="100%" height="152" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="block border-0" />
        </div>
      )}

      <AddSheet track={adding} onClose={() => setAdding(null)} onView={id => { setTab("library"); setOpenList(id); }} />
      <ShareCard track={sharing} onClose={() => setSharing(null)} />
    </section>
  );
}

function AddSheet({ track, onClose, onView }: { track: StudioTrack | null; onClose: () => void; onView: (id: string) => void }) {
  const studio = useStudio();
  const [name, setName] = useState("");
  if (!track) return null;
  const toggle = (pid: string, pname: string, on: boolean) => {
    setInPlaylist(pid, track.id, on);
    if (on) toast(`Added to ${pname}`, { description: track.title, action: { label: "Undo", onClick: () => setInPlaylist(pid, track.id, false) }, cancel: { label: "View", onClick: () => onView(pid) } });
  };
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="ls-studio-dialog max-w-sm">
        <DialogHeader><DialogTitle>Add “{track.title}”</DialogTitle></DialogHeader>
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {studio.playlists.map(p => {
            const on = p.trackIds.includes(track.id);
            const cover = studio.tracks.find(t => t.id === p.trackIds[0])?.art;
            return <li key={p.id}>
              <button type="button" aria-pressed={on} onClick={() => toggle(p.id, p.name, !on)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-secondary">
                <span className="size-10 overflow-hidden rounded-md bg-secondary">{cover && <img src={cover} alt="" className="size-full object-cover" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate">{p.name}</span><span className="text-xs text-muted-foreground">{p.trackIds.length} songs</span></span>
                <span className={`grid size-6 place-items-center rounded-full border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{on && <Check className="size-3.5" />}</span>
              </button>
            </li>;
          })}
        </ul>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); const p = createStudioPlaylist(name); setName(""); toggle(p.id, p.name, true); }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="New playlist name" aria-label="New playlist name" className="min-w-0 flex-1 rounded-lg bg-secondary px-3 text-sm" />
          <Button type="submit" size="sm"><Plus className="size-4" />Create & add</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Importer({ onDone }: { onDone: (playlistId: string) => void }) {
  const studio = useStudio();
  const [link, setLink] = useState("");
  const [embed, setEmbed] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<(Omit<StudioTrack, "id"> & { keep: boolean })[]>([]);
  const [target, setTarget] = useState("new");

  const [found, setFound] = useState<Omit<StudioTrack, "id"> | null>(null);
  const [linkTarget, setLinkTarget] = useState("new");
  const readLink = async () => {
    const l = parseMusicLink(link.trim());
    setFound(null);
    if (!l) { toast("That doesn't look like a Spotify or YouTube link"); return; }
    if (l.source === "spotify") {
      setEmbed(`https://open.spotify.com/embed/${l.kind}/${l.id}?utm_source=generator&theme=0`);
      if (l.kind === "track") { const [info, who] = await Promise.all([spotifyTrackInfo(l.id), getSpotifyArtist({ data: { id: l.id } }).catch(() => ({ artist: null }))]); if (info && who.artist) info.artist = who.artist; setFound(info ?? { title: "Spotify track", artist: "Spotify", spotify: l.id }); }
      else toast(`Spotify ${l.kind} loaded`, { description: "Press play below. To bring its songs in, paste their names in the box underneath." });
    }
    else { setEmbed(l.kind === "playlist" ? `https://www.youtube.com/embed/videoseries?list=${l.id}` : `https://www.youtube.com/embed/${l.id}`); }
  };
  const review = () => {
    const parsed = matchCatalog(parseSongList(text), studio.tracks);
    if (!parsed.length) { toast("No songs found", { description: "Try one per line, like: Frank Ocean - Ivy" }); return; }
    setRows(parsed.map(r => ({ ...r, keep: true })));
  };
  const confirm = () => {
    const keep = rows.filter(r => r.keep).map(({ keep: _k, ...r }) => r);
    if (!keep.length) return;
    const pid = target === "new" ? createStudioPlaylist(`Imported ${new Date().toLocaleDateString()}`).id : target;
    const n = importTracks(pid, keep);
    toast(`Imported ${n} ${n === 1 ? "song" : "songs"}`);
    setRows([]); setText(""); onDone(pid);
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-2">
        <h3 className="ls-studio-list-title flex items-center gap-2"><Link2 className="size-4 text-primary" />Paste a link</h3>
        <p className="text-xs text-muted-foreground">A public Spotify track, album or playlist, or a YouTube playlist.</p>
        <div className="flex gap-2">
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://open.spotify.com/playlist/…" aria-label="Spotify or YouTube link" className="min-w-0 flex-1 rounded-lg bg-secondary px-3 py-2 text-sm" />
          <Button size="sm" onClick={() => void readLink()}><Play className="size-4" />Play</Button>
        </div>
        {embed && <iframe title="Imported link preview" src={embed} width="100%" height="352" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="rounded-xl border-0" />}
        {found && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
          {found.art && <img src={found.art} alt="" className="size-11 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1"><p className="truncate font-medium text-foreground">{found.title}</p><p className="truncate text-xs text-muted-foreground">{found.artist}</p></div>
          <select value={linkTarget} onChange={e => setLinkTarget(e.target.value)} aria-label="Add to playlist" className="ls-studio-btn rounded-lg bg-secondary px-2 py-1.5 text-sm">
            <option value="new">New playlist</option>
            {studio.playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button size="sm" onClick={() => {
            const pid = linkTarget === "new" ? createStudioPlaylist(`Imported ${new Date().toLocaleDateString()}`).id : linkTarget;
            importTracks(pid, [found]); toast(`Added ${found.title}`); setFound(null); setLink(""); onDone(pid);
          }}><Plus className="size-4" />Add to playlist</Button>
        </div>}
      </div>
      <div className="space-y-2">
        <h3 className="ls-studio-list-title flex items-center gap-2"><Import className="size-4 text-primary" />Paste a song list</h3>
        <p className="text-xs text-muted-foreground">One per line: “Artist - Title”, CSV “Title, Artist”, SongShift text or M3U.</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder={"Frank Ocean - Ivy\nSZA - Kill Bill\nDaft Punk - Get Lucky"} aria-label="Song list" className="w-full rounded-lg bg-secondary p-3 font-mono text-xs" />
        <Button size="sm" variant="secondary" onClick={review}>Review songs</Button>
        {rows.length > 0 && <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">{rows.filter(r => r.keep).length} of {rows.length} selected · lime = has a preview</p>
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {rows.map((r, i) => <li key={i}><label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={r.keep} onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, keep: e.target.checked } : x))} className="accent-primary" />
              <span className={r.spotify ? "text-primary" : ""}>{r.title}</span><span className="text-muted-foreground">· {r.artist}</span>
            </label></li>)}
          </ul>
          <div className="flex flex-wrap gap-2">
            <select value={target} onChange={e => setTarget(e.target.value)} aria-label="Import into" className="rounded-lg bg-secondary px-2 text-sm">
              <option value="new">New playlist</option>
              {studio.playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Button size="sm" onClick={confirm}>Confirm & import to Library</Button>
          </div>
        </div>}
      </div>
    </div>
  );
}

/** Draws the branded card at Story size on a canvas and downloads it. */
/** The shareable link: a Melodylust song page with real Spotify audio, or a Spotify search when we have no track id. */
export function shareLink(t: StudioTrack, origin: string) {
  return t.spotify ? `${origin}/song/${t.spotify}` : `https://open.spotify.com/search/${encodeURIComponent(`${t.title} ${t.artist}`)}`;
}

export type ShareMode = "music" | "fashion" | "read";
export type ShareExtra = { label: string; title: string; sub: string; image?: string };

/** What can ride along with the song: Want List pieces and Style Matrix looks for fashion, journal stories for a good read. */
export function shareExtras(mode: ShareMode, wishes: WishItem[]): ShareExtra[] {
  if (mode === "fashion") return [
    ...wishes.filter(w => w.kind === "piece").map(w => ({ label: "Wearing", title: w.name, sub: w.detail || w.from || "", ...(w.image ? { image: w.image } : {}) })),
    ...FIT_ITEMS.flatMap(i => i.looks.map(l => ({ label: "Wearing", title: fitWishName(i, l), sub: `${l.num} — ${l.line}`, image: l.images[0]!.src }))),
  ];
  if (mode === "read") return stories.map(s => ({ label: "Reading", title: s.title, sub: `${s.category} · ${s.date}`, image: s.image }));
  return [];
}

const loadImg = (src: string) => new Promise<HTMLImageElement | null>(r => {
  const img = new Image(); img.crossOrigin = "anonymous"; img.src = src;
  img.onload = () => r(img); img.onerror = () => r(null);
});
function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, rad: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / s, sh = h / s;
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, rad); g.clip();
  g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h); g.restore();
}
function fitText(g: CanvasRenderingContext2D, text: string, max: number) {
  let t = text; while (t.length > 1 && g.measureText(t).width > max) t = t.slice(0, -2);
  return t === text ? t : `${t.trimEnd()}…`;
}

export async function drawCard(t: StudioTrack, link: string, extra?: ShareExtra | null): Promise<Blob | null> {
  await Promise.all(["900 160px 'WTF Hammer XXX Compressed'", "500 48px Isidora", "900 italic 40px 'Couturier Poster'"].map(f => document.fonts?.load(f).catch(() => null)));
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const css = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
  const fig = v("--color-fig-black", "#0B040B"), fig8 = v("--color-fig-800", "#2D142B"), fig9 = v("--color-fig-900", "#1F0D1E");
  const lime = v("--color-acid-lime", "#D4FF32"), chalk = v("--color-chalk-white", "#FAF9F6"), lilac = v("--color-lilac-fog", "#8E788C");
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, fig8); bg.addColorStop(1, fig);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const art = t.art ? await loadImg(t.art.replace("w=400&h=400", "w=900&h=900").replace("ab67616d00001e02", "ab67616d0000b273")) : null;
  const size = extra ? 620 : 800, ax = (W - size) / 2, ay = extra ? 250 : 290;
  if (art) cover(g, art, ax, ay, size, size, 48);
  g.textAlign = "left"; g.fillStyle = lime; g.font = "900 italic 40px 'Couturier Poster', serif"; g.fillText("Now playing", 140, 210);
  const wy = extra ? 960 : 1200;
  g.fillStyle = lime;
  for (let i = 0; i < 48; i++) { const h = (extra ? 20 : 30) + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * (extra ? 80 : 140); g.fillRect(140 + i * 16.7, wy - h / 2, 9, h); }
  const ty = extra ? 1140 : 1420;
  g.fillStyle = chalk; g.font = "900 160px 'WTF Hammer XXX Compressed', Impact, sans-serif"; g.fillText(fitText(g, t.title.toUpperCase(), 800), 140, ty);
  g.fillStyle = lilac; g.font = "500 48px Isidora, sans-serif"; g.fillText(fitText(g, t.artist, 800), 140, ty + 70);
  if (extra) {
    const by = ty + 110, bh = 330;
    g.fillStyle = fig9; g.beginPath(); g.roundRect(140, by, 800, bh, 36); g.fill();
    const ex = extra.image ? await loadImg(extra.image) : null;
    if (ex) cover(g, ex, 165, by + 25, 280, 280, 24);
    const tx = ex ? 480 : 180, tw = 940 - tx - 30;
    g.fillStyle = lime; g.font = "900 italic 34px 'Couturier Poster', serif"; g.fillText(extra.label, tx, by + 85);
    g.fillStyle = chalk; g.font = "900 72px 'WTF Hammer XXX Compressed', Impact, sans-serif";
    const words = extra.title.toUpperCase().split(" "); let line = "", lines: string[] = [];
    for (const w of words) { const n = line ? `${line} ${w}` : w; if (g.measureText(n).width > tw && line) { lines.push(line); line = w; } else line = n; }
    lines.push(line); lines = lines.slice(0, 3);
    lines.forEach((l, i) => g.fillText(fitText(g, l, tw), tx, by + 165 + i * 68));
    g.fillStyle = lilac; g.font = "500 28px Isidora, sans-serif"; g.fillText(fitText(g, extra.sub, tw), tx, by + 165 + lines.length * 68 - 8);
  }
  g.fillStyle = lilac; g.font = "500 30px Isidora, sans-serif"; g.fillText(`Listen: ${link.replace(/^https?:\/\//, "").slice(0, 48)}`, 140, 1640);
  g.fillStyle = lime; g.beginPath(); g.roundRect(140, 1700, 360, 80, 40); g.fill();
  g.fillStyle = fig; g.font = "500 34px Isidora, sans-serif"; g.fillText("♪ MELODYLUST", 180, 1752);
  return new Promise(r => { try { c.toBlob(b => r(b), "image/png"); } catch { r(null); } });
}

const MODES: { id: ShareMode; label: string }[] = [{ id: "music", label: "Just music" }, { id: "fashion", label: "Music + fashion" }, { id: "read", label: "Music + good read" }];

function ShareCard({ track, onClose }: { track: StudioTrack | null; onClose: () => void }) {
  const wishes = useWishlist();
  const [mode, setMode] = useState<ShareMode>("music");
  const [pick, setPick] = useState(0);
  if (!track) return null;
  const options = shareExtras(mode, wishes);
  const extra = options[Math.min(pick, options.length - 1)] ?? null;
  const link = typeof window !== "undefined" ? shareLink(track, window.location.origin) : "";
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="ls-studio-dialog max-h-[92vh] max-w-sm overflow-y-auto">
        <DialogHeader><DialogTitle>Share “{track.title}”</DialogTitle></DialogHeader>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="What to share">
          {MODES.map(m => <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => { setMode(m.id); setPick(0); }}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${mode === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{m.label}</button>)}
        </div>
        {mode !== "music" && <select value={pick} onChange={e => setPick(Number(e.target.value))} aria-label={mode === "fashion" ? "Fashion piece" : "Good read"} className="ls-studio-btn w-full rounded-lg bg-secondary px-3 py-2 text-sm">
          {options.map((o, i) => <option key={`${o.title}-${i}`} value={i}>{o.title}</option>)}
        </select>}
        <div className="ls-share-card relative overflow-hidden rounded-3xl p-5">
          {track.art && <img src={track.art} alt="" className={`${extra ? "mx-auto w-3/4" : "w-full"} aspect-square rounded-2xl object-cover`} />}
          <span className="ls-share-vinyl" aria-hidden />
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="min-w-0"><p className="ls-share-title truncate">{track.title}</p><p className="truncate text-sm text-muted-foreground">{track.artist}</p></div>
            <span className="flex items-center gap-1.5 text-xs text-primary"><Eq on />Now playing</span>
          </div>
          {extra && <div className="mt-3 flex items-center gap-3 rounded-2xl bg-secondary p-2.5">
            {extra.image && <img src={extra.image} alt="" className="size-16 shrink-0 rounded-xl object-cover" />}
            <div className="min-w-0"><p className="ls-share-extra-label">{extra.label}</p><p className="ls-share-extra-title line-clamp-2">{extra.title}</p><p className="truncate text-xs text-muted-foreground">{extra.sub}</p></div>
          </div>}
          <span className="mt-3 inline-block rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">♪ Melodylust</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(link).then(() => toast("Link copied"), () => toast("Couldn't copy the link")); }}><Link2 className="size-4" />Copy link</Button>
          <Button onClick={async () => {
            const blob = await drawCard(track, link, extra);
            if (!blob) { toast("Couldn't make the image"); return; }
            const name = `${track.title.replace(/\W+/g, "-").toLowerCase()}-story.png`;
            const file = new File([blob], name, { type: "image/png" });
            if (navigator.canShare?.({ files: [file] })) {
              try { await navigator.share({ files: [file], title: track.title, text: `${track.title} · ${track.artist} ${link}` }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = name; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            toast("Story card downloaded", { description: "Add it to your Instagram Story and paste the copied link as a link sticker." });
            void navigator.clipboard?.writeText(link).catch(() => null);
          }}><Download className="size-4" />Story card</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const EXAMPLES = ["Front row at a fall show", "A Sunday thrift run", "Getting ready for a night out"];

/** The Studio's AI playlist generator: describe a mood, a look or an occasion, pick a length, and a new playlist is made
 *  from songs already in the Studio — the AI can only choose among them, never add one. With no AI configured, or when
 *  it can't answer, the prompt's words pick the songs on this device instead, and the toast says which made it. */
function AIPlaylistCard({ tracks, onMade }: { tracks: readonly StudioTrack[]; onMade: (id: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [length, setLength] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const field = useId();
  const candidates = tracks.filter(t => t.spotify && !UNPLAYABLE.has(t.id)).map(t => ({ id: t.id, title: t.title, artist: t.artist, ...(t.genre ? { genre: t.genre } : {}) }));
  const make = (playlist: AIPlaylist, by: string) => {
    const p = createStudioPlaylist(playlist.title);
    for (const pick of playlist.picks) setInPlaylist(p.id, pick.id, true);
    toast(`Made “${p.name}”`, { description: `${playlist.picks.length} ${playlist.picks.length === 1 ? "song" : "songs"} from your Studio · ${by}` });
    setPrompt("");
    onMade(p.id);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (text.length < 2 || busy) return;
    setBusy(true);
    try {
      const answer = await generateAIPlaylist({ data: { prompt: text, length, candidates } }).catch(() => null);
      if (answer?.playlist) return make(answer.playlist, "picked by AI");
      const local = localPlaylist(text, candidates, length);
      if (local) return make(local, answer?.status === "rate_limited" ? "AI is busy, matched on your words" : "matched on your words");
      toast("Nothing in your Studio fits that yet", { description: "Try a mood, an occasion or an artist you have, or import more songs." });
    } finally { setBusy(false); }
  };
  return (
    <form className="ls-ai-card flex flex-col gap-2 rounded-2xl border border-primary/40 bg-secondary/40 p-3" onSubmit={submit} aria-busy={busy}>
      <label htmlFor={field} className="ls-ai-title"><Sparkles className="text-primary" aria-hidden /><span><span className="ls-ai-xxx">AI</span> Playlist</span></label>
      <textarea id={field} value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} maxLength={200} placeholder={EXAMPLES[0]}
        className="min-h-14 resize-none rounded-lg bg-secondary px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground" />
      <div className="flex flex-wrap gap-1" role="group" aria-label="Try a prompt">
        {EXAMPLES.map(x => <button key={x} type="button" onClick={() => setPrompt(x)} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">{x}</button>)}
      </div>
      <div className="mt-auto flex items-center gap-2">
        <div className="flex gap-1 rounded-full bg-secondary p-0.5" role="group" aria-label="Playlist length">
          {AI_PLAYLIST_LENGTHS.map(n => <button key={n} type="button" aria-pressed={length === n} onClick={() => setLength(n)}
            className={`rounded-full px-2.5 py-1 text-xs ${length === n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{n}</button>)}
        </div>
        <Button type="submit" size="sm" className="ml-auto" disabled={busy || prompt.trim().length < 2}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}<span className="ls-ai-go">{busy ? "Making…" : "Generate"}</span>
        </Button>
      </div>
    </form>
  );
}
