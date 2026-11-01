import { useRef, useState, type DragEvent } from "react";
import { Music2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearMusicLibrary, importSongs, useMusicLibrary } from "@/lib/music-library";
import { listenUrl, readTakeoutCsv, searchLibrary } from "@/lib/youtube-takeout";

const PAGE = 100;
const MAX_BYTES = 20 * 1024 * 1024;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/**
 * The Curator Dossier's music library: a reader's YouTube Music library, brought in from the
 * "music library songs.csv" in a Google Takeout export. The file is read in the browser and the
 * songs stay on this device; nothing is uploaded.
 */
export function MusicLibraryPanel() {
  const songs = useMusicLibrary();
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [dragging, setDragging] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const load = async (file: File | undefined) => {
    if (!file) return;
    setConfirm(false);
    if (/\.zip$/i.test(file.name)) { setStatus("Open the Takeout .zip first, then choose “music library songs.csv” from inside it."); return; }
    if (file.size > MAX_BYTES) { setStatus("That file is too large to be a music library list. Choose “music library songs.csv”."); return; }
    const read = readTakeoutCsv(await file.text().catch(() => ""));
    if (read.kind === "playlist") { setStatus(`That’s a playlist file: Takeout lists only video IDs there (${plural(read.videos, "video")}), not song names. Choose “music library songs.csv” from the “music (library and uploads)” folder instead.`); return; }
    if (read.kind === "unknown" || !read.songs.length) { setStatus("That file isn’t a YouTube Music library export. Look for “music library songs.csv” in your Takeout download."); return; }
    const added = importSongs(read.songs);
    if (added === null) setStatus("This browser couldn’t keep your library. Private browsing or a full device can stop it; try another browser.");
    else if (!added) setStatus("Every song in that file is already in your library.");
    else {
      const already = read.songs.length - added;
      setStatus(`Added ${plural(added, "song")} from your YouTube Music library${already > 0 ? `; ${already.toLocaleString()} ${already === 1 ? "was" : "were"} already here` : ""}.`);
    }
  };
  const drop = (e: DragEvent) => { e.preventDefault(); setDragging(false); void load(e.dataTransfer.files[0]); };
  const clear = () => {
    if (!confirm) { setConfirm(true); return; }
    clearMusicLibrary(); setConfirm(false); setQuery(""); setShown(PAGE);
    setStatus("Music library cleared on this device.");
  };

  const found = searchLibrary(songs, query);
  return <div className="dossier-library" data-dragging={dragging || undefined}
    onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
    <div className="dossier-toolbar">
      <p>Your YouTube Music library, brought in from Google Takeout. It stays on this device.</p>
      <div className="dossier-actions">
        <Button variant="dossierSolid" onClick={() => picker.current?.click()}><Upload aria-hidden /> Import Takeout file</Button>
        {songs.length > 0 && <Button variant="dossier" onClick={clear}>{confirm ? `Tap again to clear ${plural(songs.length, "song")}` : "Clear library"}</Button>}
      </div>
      <input ref={picker} type="file" accept=".csv,text/csv" hidden aria-label="Takeout file"
        onChange={e => { void load(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
    <p role="status" className="dossier-status">{status}</p>

    {!songs.length ? <div className="dossier-empty dossier-library-empty">
      <h2>Bring your library in.</h2>
      <ol className="dossier-steps">
        <li>Open <a href="https://takeout.google.com/" target="_blank" rel="noreferrer">Google Takeout</a> and choose “Deselect all”.</li>
        <li>Tick “YouTube and YouTube Music”. Under “All YouTube data included”, keep your music library ticked; the rest can go.</li>
        <li>Create the export. When Google emails you, download the .zip and open it.</li>
        <li>In “YouTube and YouTube Music”, then “music (library and uploads)”, choose “music library songs.csv” here.</li>
      </ol>
      <p className="dossier-fine">Drop the file on this page or use Import Takeout file. It’s read in your browser; nothing is uploaded.</p>
    </div> : <>
      <div className="dossier-library-head">
        <h2 className="dossier-section">Library · {plural(songs.length, "song")}</h2>
        <label className="dossier-library-search"><span className="sr-only">Search your library</span>
          <input type="search" value={query} placeholder="Search your library" onChange={e => { setQuery(e.target.value); setShown(PAGE); }} />
        </label>
      </div>
      {!found.length ? <p className="dossier-status">Nothing in your library matches “{query}”.</p> :
        <ul className="dossier-songs dossier-library-songs">{found.slice(0, shown).map(s => <li key={s.videoId}>
          <Music2 aria-hidden />
          <div className="dossier-library-song"><strong>{s.title}</strong>{(s.artist || s.album) && <small>{[s.artist, s.album].filter(Boolean).join(" · ")}</small>}</div>
          <a href={listenUrl(s.videoId)} target="_blank" rel="noreferrer" aria-label={`Listen to ${s.title} on YouTube Music`}>Listen ↗</a>
        </li>)}</ul>}
      {found.length > shown && <Button variant="dossier" className="dossier-library-more" onClick={() => setShown(n => n + PAGE)}>Show more · {plural(found.length - shown, "song")} left</Button>}
    </>}
  </div>;
}
