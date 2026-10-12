import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Check, Search } from "lucide-react";
import { ARTISTS, CONNECTION_TYPES, artistById, relatedFor, suggestedFor, type Artist } from "@/data/musician-circles";

const ERAS = ["1970s–80s", "2010s"];

function CirclePortrait({ artist, size, label, note, onClick, dimmed }: {
  artist: Artist;
  size: "sm" | "md";
  label: string;
  note?: string;
  onClick?: () => void;
  dimmed?: boolean;
}) {
  return (
    <button type="button" className="circles-portrait" data-size={size} onClick={onClick} data-dimmed={dimmed ? "true" : undefined}>
      <span className="circles-photo" data-dimmed={dimmed ? "true" : undefined}>
        <img src={artist.image} alt={artist.name} loading="lazy" width={512} height={512} />
      </span>
      <span className="circles-name">{artist.name}</span>
      <span className="circles-label">{label}</span>
      {note ? <span className="circles-note">{note}</span> : null}
    </button>
  );
}

function SuggestForm() {
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <p className="circles-suggest-thanks">
        <Check aria-hidden /> Thanks — “{name || "your suggestion"}” is noted for the editors. Nothing is published
        until it can be sourced.
      </p>
    );
  }
  return (
    <form
      className="circles-suggest"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <label>
        Artist name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Who should we index?" required />
      </label>
      <label>
        Why do they belong?
        <textarea value={why} onChange={(e) => setWhy(e.target.value)} placeholder="A scene, a collaborator, a document…" rows={3} />
      </label>
      <button type="submit">Suggest an artist</button>
      <p className="circles-suggest-fine">Demo form — suggestions are not stored yet.</p>
    </form>
  );
}

export function MusicianCircles({ variant = "section" }: { variant?: "section" | "page" }) {
  const root = useRef<HTMLDivElement>(null);
  // Portraits drop in from under the heading the first time the section scrolls into view.
  useEffect(() => {
    const el = root.current; if (!el) return;
    el.querySelectorAll<HTMLElement>(".circles-grid > *").forEach((n, i) => n.style.setProperty("--d", String(Math.min(i, 14))));
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.setAttribute("data-in", "true"); return; }
    el.setAttribute("data-in", "false");
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { el.setAttribute("data-in", "true"); io.disconnect(); } }, { rootMargin: "0px 0px -25% 0px" });
    const grid = el.querySelector(".circles-grid"); if (grid) io.observe(grid); else el.setAttribute("data-in", "true");
    return () => io.disconnect();
  }, []);
  const [q, setQ] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [genreMatch, setGenreMatch] = useState<"any" | "all">("any");
  const [era, setEra] = useState<string>("All eras");
  const [location, setLocation] = useState<string>("All locations");
  const [connType, setConnType] = useState<string>("All connections");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [acOpen, setAcOpen] = useState(false);

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    for (const a of ARTISTS) a.genres.forEach((g) => set.add(g));
    return [...set].sort();
  }, []);
  const allLocations = useMemo(() => [...new Set(ARTISTS.map((a) => a.location))].sort(), []);

  const selected = selectedId ? artistById(selectedId) ?? null : null;
  const activeArtist = selected;

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ARTISTS.filter((a) => {
      if (needle && !(
        a.name.toLowerCase().includes(needle) ||
        a.genres.some((g) => g.toLowerCase().includes(needle)) ||
        a.scene.toLowerCase().includes(needle) ||
        a.location.toLowerCase().includes(needle)
      )) return false;
      if (genres.length) {
        const hits = genres.filter((g) => a.genres.includes(g)).length;
        if (genreMatch === "any" ? hits === 0 : hits < genres.length) return false;
      }
      if (era !== "All eras" && a.era !== era) return false;
      if (location !== "All locations" && a.location !== location) return false;
      if (connType !== "All connections" && !a.connections.some((c) => c.type === connType)) return false;
      return true;
    });
  }, [q, genres, genreMatch, era, location, connType]);

  const openArtist = (id: string) => {
    if (selectedId) setHistory((h) => [...h, selectedId]);
    setSelectedId(id);
    if (variant === "page") window.scrollTo({ top: 0, behavior: "smooth" });
    else root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const back = () => {
    const prev = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setSelectedId(prev ?? null);
  };

  const toggleGenre = (g: string) =>
    setGenres((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));
  const clearAll = () => {
    setQ(""); setGenres([]); setEra("All eras"); setLocation("All locations"); setConnType("All connections");
  };
  const activeChips = genres.length + (era !== "All eras" ? 1 : 0) + (location !== "All locations" ? 1 : 0) + (connType !== "All connections" ? 1 : 0);

  return (
    <div className="circles-block" data-variant={variant} ref={root}>
      <header className="circles-head">
        {variant === "page" ? (
          <Link to="/" className="circles-home" aria-label="Melody Lust home">
            <ArrowLeft aria-hidden /> Melody Lust
          </Link>
        ) : null}
        {variant === "page" ? (
          <h1>Explore Musician Circles</h1>
        ) : (
          <h2 className="circles-heading">Explore Musician Circles</h2>
        )}
        <p className="circles-lede">
          Sift through musicians and the circles around them — collaborators, producers, bands and documented scenes.
        </p>
        <p className="circles-principle">We index influence; we don’t declare taste.</p>
      </header>

      <nav className="circles-controls" aria-label="Search and filters">
        <div className="circles-search">
          <Search aria-hidden />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setAcOpen(true); }}
            onFocus={() => setAcOpen(true)}
            onBlur={() => setTimeout(() => setAcOpen(false), 150)}
            onKeyDown={(e) => { if (e.key === "Escape") setAcOpen(false); }}
            placeholder="Search a musician, genre or city"
            aria-label="Search musicians"
          />
          {acOpen && q.trim() ? (
            <ul className="circles-ac" role="listbox">
              {ARTISTS.filter((a) => a.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 5).map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => { openArtist(a.id); setAcOpen(false); }}>
                    {a.name} <span>{a.scene}</span>
                  </button>
                </li>
              ))}
              {ARTISTS.filter((a) => a.name.toLowerCase().includes(q.trim().toLowerCase())).length === 0 ? (
                <li className="circles-ac-empty">No musician named that — try a genre instead.</li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <div className="circles-filter-row">
          <div className="circles-genre-filter" role="group" aria-label="Genres">
            {allGenres.map((g) => (
              <button key={g} type="button" className="circles-genre-pill" data-active={genres.includes(g) ? "true" : undefined} onClick={() => toggleGenre(g)}>
                {g}
              </button>
            ))}
            <div className="circles-match-mode" role="group" aria-label="Genre matching">
              <button type="button" data-active={genreMatch === "any" ? "true" : undefined} onClick={() => setGenreMatch("any")}>Either</button>
              <button type="button" data-active={genreMatch === "all" ? "true" : undefined} onClick={() => setGenreMatch("all")}>Both</button>
            </div>
          </div>
          <select value={era} onChange={(e) => setEra(e.target.value)} aria-label="Era">
            <option>All eras</option>
            {ERAS.map((e) => <option key={e}>{e}</option>)}
          </select>
          <select value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location">
            <option>All locations</option>
            {allLocations.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select value={connType} onChange={(e) => setConnType(e.target.value)} aria-label="Connection type">
            <option>All connections</option>
            {CONNECTION_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="circles-meta-row">
          <span className="circles-count">
            {matches.length} {matches.length === 1 ? "musician" : "musicians"}
            {genres.length
              ? genreMatch === "any"
                ? ` matching any of ${genres.join(", ")}`
                : ` matching both ${genres.join(" and ")}`
              : ""}
          </span>
          {activeChips ? <button type="button" className="circles-clear" onClick={clearAll}>Clear all</button> : null}
          <div className="circles-view-toggle" role="group" aria-label="View">
            <button type="button" data-active={view === "grid" ? "true" : undefined} onClick={() => setView("grid")}>Grid</button>
            <button type="button" data-active={view === "list" ? "true" : undefined} onClick={() => setView("list")}>List</button>
          </div>
        </div>
      </nav>

      {activeArtist ? (
        <section className="circles-detail" aria-label={`About ${activeArtist.name}`}>
          <nav className="circles-breadcrumb" aria-label="Breadcrumb">
            <button type="button" onClick={back} className="circles-back"><ArrowLeft aria-hidden /> Back</button>
            <span>Musician Circles</span>
            {history.map((id) => (
              <span key={id}>{artistById(id)?.name}</span>
            ))}
            <span data-current="true">{activeArtist.name}</span>
          </nav>

          <div className="circles-detail-grid">
            <div className="circles-detail-intro">
              <span className="circles-detail-photo"><img src={activeArtist.image} alt={activeArtist.name} width={512} height={512} /></span>
              <h2>{activeArtist.name}</h2>
              <p className="circles-detail-labels">{activeArtist.genres.join(" · ")} — {activeArtist.scene} — {activeArtist.era} — {activeArtist.location}</p>
              <p className="circles-detail-text">{activeArtist.intro}</p>
              <h3>Songs</h3>
              <ul className="circles-songs">
                {activeArtist.songs.map((s) => (
                  <li key={s.title}>{s.title} <span>{s.year}</span></li>
                ))}
              </ul>
            </div>
            <div className="circles-detail-related">
              <h3>Related musicians</h3>
              {relatedFor(activeArtist).length ? (
                <div className="circles-related-grid">
                  {relatedFor(activeArtist).map(({ artist, connection }) => (
                    <CirclePortrait key={artist.id} artist={artist} size="sm" label={connection.label} onClick={() => openArtist(artist.id)} />
                  ))}
                </div>
              ) : (
                <p className="circles-none">No documented relationships for this musician yet.</p>
              )}
              {relatedFor(activeArtist).map(({ connection }) => (
                <div key={connection.toId} className="circles-connection">
                  <span className="circles-connection-label">{connection.label} — {artistById(connection.toId)?.name}</span>
                  <p>{connection.explanation}</p>
                  <a href={connection.sourceUrl} target="_blank" rel="noreferrer">{connection.sourceLabel} <ArrowUpRight aria-hidden /></a>
                </div>
              ))}
              <h3>Suggested discovery</h3>
              <p className="circles-evidence-note">
                Shared genre tags only — this is not evidence of collaboration or influence.
              </p>
              {suggestedFor(activeArtist).length ? (
                <div className="circles-related-grid">
                  {suggestedFor(activeArtist).map((a) => (
                    <CirclePortrait key={a.id} artist={a} size="sm" label="Suggested discovery" onClick={() => openArtist(a.id)} />
                  ))}
                </div>
              ) : (
                <p className="circles-none">Nothing shares this musician's genre tags.</p>
              )}
            </div>
          </div>
        </section>
      ) : matches.length ? (
        view === "grid" ? (
          <section className="circles-grid" aria-label="Musician grid">
            {matches.map((a) => (
              <CirclePortrait key={a.id} artist={a} size="md" label={`${a.scene} · ${a.era} · ${a.location}`} note={a.genres.join(" · ")} onClick={() => openArtist(a.id)} />
            ))}
          </section>
        ) : (
          <section className="circles-list" aria-label="Musician list">
            {matches.map((a) => (
              <article key={a.id} className="circles-list-row">
                <button type="button" className="circles-portrait circles-list-portrait" data-size="sm" onClick={() => openArtist(a.id)}>
                  <span className="circles-photo"><img src={a.image} alt={a.name} loading="lazy" width={512} height={512} /></span>
                  <span className="circles-name">{a.name}</span>
                </button>
                <div className="circles-list-body">
                  <p className="circles-list-labels">{a.genres.join(" · ")} — {a.era} — {a.location}</p>
                  <p className="circles-list-connection">
                    {a.connections.length
                      ? a.connections.map((c) => `${c.label}: ${artistById(c.toId)?.name}`).join(" · ")
                      : "No documented relationships yet — only suggested discovery."}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )
      ) : (
        <section className="circles-empty" aria-label="No results">
          <h2>No musicians match — yet.</h2>
          <p>Nothing in the demonstration dataset fits those filters. Suggest an artist the editors should index next.</p>
          <SuggestForm />
        </section>
      )}

      <footer className="circles-footer">
        <p>Demonstration dataset — portraits, songs and labels are placeholders. Documented connections link to public sources; shared-genre matches are always marked “Suggested discovery.”</p>
      </footer>
    </div>
  );
}
