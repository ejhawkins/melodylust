import { FeaturedSongCollage } from "@/components/FeaturedSongCollage";
import { RecordStack } from "@/components/RecordStack";
import { MobileParallax } from "@/components/MobileParallax";
import { ScrollFadeUp } from "@/components/ScrollFadeUp";
import cover from "@/assets/grunge-cover.jpg";
import coverWide from "@/assets/grunge-cover-wide.jpg";
import heroRunway from "@/assets/hero-runway-2.jpg";
import heroRunway3 from "@/assets/hero-runway-3.jpg";
import heroRunway4 from "@/assets/hero-runway-4.jpg";

import street from "@/assets/street-style.jpg";
import matrixShoeImage from "@/assets/style-matrix-shoe.png";
import { StyleMatrix } from "@/components/StyleMatrix";
import { ShopSection } from "@/components/ShopSection";
import { DigitalZine } from "@/components/DigitalZine";
import { MusicianCircles } from "@/components/MusicianCircles";
import { GenreHeadingSelect } from "@/components/GenreHeadingSelect";
import { StylingNotes } from "@/components/StylingNotes";
import { SongStyleNotes } from "@/components/SongStyleNotes";
import { GuidedStory, GuidedStoryQuote } from "@/components/GuidedStory";
import { HowItWorks } from "@/components/HowItWorks";
import { DesignerMusing } from "@/components/DesignerMusing";
import { DuotoneFilter } from "@/components/DuotoneFilter";
import { StoryDialog } from "@/components/StoryDialog";
import { categories, iconicSongs, moodPool, playlist, songLooks, stories, type PhotoCredit, type Story } from "@/data/home";
import glorillaMetaImage from "@/assets/glorilla-meta.jpg";
import charliRockImage from "@/assets/charli-rock-music.webp";
import skuzlandImage from "@/assets/skuzland.jpg";
import coverStoryImage from "@/assets/cover-story.jpg";
import logoImage from "@/assets/melody-lust-logo.png";
const logo = { url: logoImage };
const matrixShoe = { url: matrixShoeImage };
const glorillaMeta = { url: glorillaMetaImage };
const charliRock = { url: charliRockImage };
const skuzland = { url: skuzlandImage };
const coverStory = { url: coverStoryImage };
const coverStoryFilm = { url: "" };
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, ArrowDown, ArrowRight, Play, ArrowUp, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wishlist } from "@/components/Wishlist";
import { StyleSearch } from "@/components/StyleSearch";
import { FashionMusicSearch } from "@/components/FashionMusicSearch";
import { StyleProfileQuiz } from "@/components/StyleProfileQuiz";
import { useStyleProfile } from "@/lib/use-style-profile";
import { addWish } from "@/lib/wishlist";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTumblrPosts, TUMBLR_BLOG } from "@/lib/tumblr.functions";
import { formatDay } from "@/lib/tumblr";
import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { WantListPop } from "@/components/WantListPop";
import { MoodHeading } from "@/components/MoodHeading";
import { BillboardBroadsheet, hot100QueryOptions } from "@/components/BillboardBroadsheet";
import { analyticsEnabled, denyGoogleAnalytics, loadGoogleAnalytics, readAnalyticsConsent, saveAnalyticsConsent, type AnalyticsConsent as AnalyticsChoice } from "@/lib/analytics";

const FILM_CONSENT_KEY = "ml-cover-story-film";

const tumblrQueryOptions = queryOptions({
  queryKey: ["tumblr-posts"],
  queryFn: () => getTumblrPosts(),
  staleTime: 5 * 60 * 1000,
});

const TUMBLR_MIN = 4;
const TUMBLR_MAX = 8;

const tumblrTypeLabel: Record<string, string> = {
  text: "Note", photo: "Photo", quote: "Quote", link: "Link",
  video: "Film", chat: "Chat", audio: "Track", answer: "Answer",
};

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [
    { title: "Melody Lust — Your Style, Your Sound" },
    { name: "description", content: "Explore fashion through music, shop the moodboard, and share your own Styling Notes with photos and song picks." },
    { property: "og:title", content: "Melody Lust — Your Style, Your Sound" },
    { property: "og:description", content: "Fashion, music, and your point of view — editorials, live shopping, musician circles, and community Styling Notes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(tumblrQueryOptions),
    context.queryClient.ensureQueryData(hot100QueryOptions),
  ]),
  component: Index,
});

// The rotating word under YOU KNOW, one line each. `em` is "YOUR <word>"'s measured width in em of WTF Hammer XXX
// Compressed, so the stylesheet can size every word to run exactly as wide as YOU KNOW.
const coverWords = [
  { word: "MUSIC", em: 2.219 },
  { word: "STYLE", em: 2.039 },
  { word: "FASHION", em: 2.557 },
  { word: "RUNWAYS", em: 2.807 },
  { word: "PLAYLIST", em: 2.602 },
];
const tallestEm = Math.min(...coverWords.map(w => w.em));
const genres = [
  { name: "Pop", note: "Bright hooks, glossy finishes. Wear the colour, own the chorus." },
  { name: "Rock", note: "Leather, worn denim and boots that have seen a few stages." },
  { name: "Hip-Hop", note: "Oversized fits, fresh sneakers and confidence that leads the room." },
  { name: "R&B", note: "Soft knits, slow silhouettes and a little shine after dark." },
  { name: "Indie", note: "Thrifted layers, charity-shop finds and a tote full of records." },
  { name: "Electronic", note: "Technical fabrics, sharp lines and something that glows." },
  { name: "Jazz", note: "Tailoring, loafers and an easy, late-night polish." },
  { name: "Country", note: "Western boots, faded denim and a well-loved jacket." },
];
function PlaylistBoard({ pick, setPick }: { pick: number | null; setPick: React.Dispatch<React.SetStateAction<number | null>> }) {
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState<number | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const n = playlist.tracks.length;
  // Each picked song "plays" for a beat, then its row swipes away and the next rolls up.
  useEffect(() => {
    if (pick === null) return;
    const done = window.setTimeout(() => setLeaving(pick), 7000);
    const next = window.setTimeout(() => { setLeaving(null); setPick(p => (p === null ? null : (p + 1) % n)); }, 7600);
    return () => { clearTimeout(done); clearTimeout(next); };
  }, [pick, n, setPick]);
  useEffect(() => {
    const ol = list.current; if (!ol || pick === null) return;
    const li = ol.children[pick] as HTMLElement | undefined;
    if (li) ol.scrollTo({ top: li.offsetTop, behavior: "smooth" });
  }, [pick]);
  const track = pick === null ? null : playlist.tracks[pick];
  const photo = track?.musician ?? (track ? { image: track.image, alt: `${track.title} by ${track.artist}`, width: 1024, height: 1024, credit: null } : playlist.feature);
  const choose = (i: number) => { setLeaving(null); setPick(i); setFlipped(false); };
  return <div className="playlist-layout">
    <figure className="playlist-feature" aria-live="polite">
      <div className="playlist-flip" data-flipped={flipped}>
        <button type="button" className="playlist-face playlist-front" aria-label="Tap to view all songs" onClick={() => setFlipped(true)} tabIndex={flipped ? -1 : 0}>
          <img key={photo.image} src={photo.image} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" className="playlist-feature-photo" />
          <span className="playlist-flip-hint">Tap to view all songs</span>
        </button>
        <div className="playlist-face playlist-back" aria-hidden={!flipped}>
          {playlist.tracks.map((t, i) => <button type="button" key={t.title} tabIndex={flipped ? 0 : -1} className="playlist-tile" data-active={pick === i} aria-label={`Play ${t.title} by ${t.artist}`} onClick={() => choose(i)}>
            <img src={t.image} alt="" loading="lazy" /><span>{String(i + 1).padStart(2, "0")}</span>
          </button>)}
          <button type="button" className="playlist-flip-back" tabIndex={flipped ? 0 : -1} onClick={() => setFlipped(false)}>Flip back</button>
        </div>
      </div>
      <figcaption>{track ? track.artist : playlist.feature.caption}{track && pick !== null && <span className="playlist-feature-sub">Track {String(pick + 1).padStart(2, "0")} · {track.title}</span>}{photo.credit && <PhotoCreditLine credit={photo.credit} />}</figcaption>
    </figure>
    <ol className="playlist-tracks" ref={list}>
      {playlist.tracks.map((t, i) => <li className="playlist-track" key={t.title} data-leaving={leaving === i}>
        <button type="button" className="playlist-track-button" aria-pressed={pick === i} aria-label={`${t.title} by ${t.artist}`} onClick={() => setPick(p => (p === i ? null : i))}>
          <span className="playlist-track-num">{String(i + 1).padStart(2, "0")}</span>
          <span className="playlist-track-text"><span className="playlist-track-title">{t.title}</span><span>{t.artist}</span></span>
          <img src={t.image} alt="" width={160} height={160} loading="lazy" />
        </button>
        {pick === i && <span className="playlist-progress" aria-hidden key={`p${i}`} />}
      </li>)}
    </ol>
  </div>;
}
function PhotoCreditLine({ credit }: { credit: PhotoCredit }) {
  return <small className="playlist-credit">Photo: <a href={credit.source} target="_blank" rel="noopener noreferrer">{credit.author}</a> / Wikimedia Commons, <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer license">{credit.license}</a>, cropped</small>;
}
const filmWords = ["THIS", "IS", "A", "MOOD"];
const filmLetters = filmWords.map((word, wi) => ({ word, letters: word.split("").map((ch, ci) => ({ ch, delay: (filmWords.slice(0, wi).reduce((n, w) => n + w.length, 0) + ci) * 45 })) }));
const soundWords = ["SEARCH", "BY", "SOUND"];
const soundLetters = soundWords.map((word, wi) => ({ word, letters: word.split("").map((ch, ci) => ({ ch, delay: (soundWords.slice(0, wi).reduce((n, w) => n + w.length, 0) + ci) * 45 })) }));
const soundExamples = [
  { song: "Heart of Glass", look: "disco glam, gold hoops" },
  { song: "Smells Like Teen Spirit", look: "grunge layers & boots" },
  { song: "Redbone", look: "satin & warm tones" },
  { song: "Dreams", look: "bohemian suede layers" },
  { song: "Dance the Night", look: "sequins, bold lip" },
];

function Index() {
  const tumblr = useSuspenseQuery(tumblrQueryOptions);
  // Two rows of the blog's photo posts; under four, the journal's own stories stand in.
  const tumblrImages = tumblr.data.posts.filter(p => p.image).slice(0, TUMBLR_MAX);
  const coverRef = useRef<HTMLElement>(null);
  const filmRef = useRef<HTMLElement>(null);
  const journal = useRef<HTMLElement>(null);
  const [category, setCategory] = useState("All");
  const [solid, setSolid] = useState(false);
  const [filmIn, setFilmIn] = useState(false);
  const [filmOnScreen, setFilmOnScreen] = useState(false);
  const [article, setArticle] = useState<Story | null>(null);
  const [quiz, setQuiz] = useState(false);
  const { profile: styleProfile, save: saveStyleProfile, clear: clearStyleProfile } = useStyleProfile();
  const [genre, setGenre] = useState("Pop");
  const [musicGenre, setMusicGenre] = useState("All genres");
  const [showTop, setShowTop] = useState(false);


  const [coverWord, setCoverWord] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setCoverWord(w => (w + 1) % coverWords.length), 4600);
    return () => window.clearInterval(id);
  }, []);
  const soundRef = useRef<HTMLElement>(null);
  const [soundIn, setSoundIn] = useState(false);
  const [soundExample, setSoundExample] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      const y = window.scrollY;
      setShowTop(y > 600);
      setSolid(y > (coverRef.current?.offsetHeight ?? 640) - 110);
      if (reduce) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Scroll-linked hero handoff: the cover scales back + dims as the next section comes up.
        // --cover-out is the share of the cover scrolled away (0 at rest on every screen); --cover-scroll is the same in px,
        // which drives the photo and headline parallax.
        const cover = coverRef.current;
        if (cover) {
          const rect = cover.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, -rect.top / rect.height));
          cover.style.setProperty("--cover-out", p.toFixed(3));
          cover.style.setProperty("--cover-scroll", `${Math.round(Math.min(cover.offsetHeight, Math.max(0, -rect.top)))}px`);
        }
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", update); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => {
    const el = filmRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setFilmIn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setFilmIn(true); io.disconnect(); } }, { threshold: .2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // The film offer only belongs while the music-video chapter is on screen; anywhere
  // else the card would float over later chapters, so it stays hidden there.
  useEffect(() => {
    const el = filmRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setFilmOnScreen(true); return; }
    const io = new IntersectionObserver(([e]) => setFilmOnScreen(!!e?.isIntersecting), { threshold: .15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const el = soundRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setSoundIn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setSoundIn(true); io.disconnect(); } }, { threshold: .2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const t = setInterval(() => setSoundExample(i => (i + 1) % soundExamples.length), 3000);
    return () => clearInterval(t);
  }, []);
  const filmVideo = useRef<HTMLVideoElement>(null);
  const [filmConsent, setFilmConsent] = useState<"ask" | "yes" | "no">("ask");
  const [shopSong, setShopSong] = useState<string | null>(null);
  // Which playlist track's musician fills the feature photo; null shows The October Mix.
  const [playlistPick, setPlaylistPick] = useState<number | null>(null);
  const [askFilm, setAskFilm] = useState(false);
  // Google Analytics waits for the reader's yes; with no Measurement ID set this does nothing.
  const [analytics, setAnalytics] = useState<AnalyticsChoice>("ask");
  useEffect(() => {
    const saved = readAnalyticsConsent();
    setAnalytics(saved);
    if (saved === "granted") loadGoogleAnalytics();
  }, []);
  const chooseAnalytics = (value: "granted" | "denied") => {
    saveAnalyticsConsent(value);
    setAnalytics(value);
    if (value === "granted") loadGoogleAnalytics(); else denyGoogleAnalytics();
  };
  useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(FILM_CONSENT_KEY); } catch { stored = null; }
    if (stored === "yes" || stored === "no") { setFilmConsent(stored); return; }
    const t = setTimeout(() => setAskFilm(true), 1500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const v = filmVideo.current;
    if (!v) return;
    if (filmConsent === "yes") { const p = v.play(); if (p) p.catch(() => { setFilmConsent("no"); }); }
    else v.pause();
  }, [filmConsent]);
  const setFilm = (ok: boolean) => {
    const value = ok ? "yes" : "no";
    setFilmConsent(value);
    setAskFilm(false);
    try { window.localStorage.setItem(FILM_CONSENT_KEY, value); } catch { /* storage unavailable */ }
  };
  const [findOpen, setFindOpen] = useState(false);
  const goJournal = (next = "All") => {
    setCategory(next);
    journal.current?.scrollIntoView({ behavior: "smooth" });
  };
  const filtered = stories.filter(s => (category === "All" || s.category === category) && (category !== "Music" || musicGenre === "All genres" || s.genre === musicGenre));

  return (
    <main className="site-frame">
      <header className="masthead" data-solid={solid}>
        <a href="/" aria-label="Melody Lust home" className="brand"><img src={logo.url} alt="" className="brand-mark" width={448} height={209} /></a>
      </header>
      <FashionMusicSearch open={findOpen} onOpenChange={setFindOpen} playlist={playlist.tracks} />
      <MobileParallax />
      <ScrollFadeUp />
      <section className="cover" id="cover" ref={coverRef} aria-label="Fashion meets music">
        <div className="cover-backdrop" aria-hidden="true">
          <DuotoneFilter id="cover-duotone" />
          {[heroRunway3, heroRunway, heroRunway4, heroRunway].map((src, i) => <span key={i} className={`cover-slide cover-slide-${i + 1}`}><img className="cover-photo" src={src} alt="" width={1200} height={1600} fetchPriority={i === 0 ? "high" : undefined} loading={i === 0 ? undefined : "lazy"} /></span>)}
        </div>
        <div className="cover-content" style={{ "--slot-em": coverWords[coverWord]?.em, "--tallest-em": tallestEm } as React.CSSProperties}>
          <nav className="cover-nav" aria-label="Journal categories">
            {categories.slice(1).map(c => <Button key={c} variant="coverNav" className="px-1 h-7" onClick={() => goJournal(c)}>{c}</Button>)}
            <Button variant="coverNav" className="px-1 h-7" aria-haspopup="dialog" aria-expanded={findOpen} aria-controls={findOpen ? "fashion-music-search" : undefined} onClick={() => setFindOpen(o => !o)}><span className="hidden sm:inline">Fashion &amp; Music Search</span><Search className="sm:hidden" aria-label="Fashion and music search" /></Button>
          </nav>
          <h1 className="cover-title"><span className="rise-line cover-know">YOU KNOW</span><span className="rise-line" style={{ animationDelay: "120ms" }}><span className="cover-word-slot" aria-hidden="true">{coverWords.map((w, i) => <span key={w.word} className="cover-word" data-active={i === coverWord} style={{ "--word-em": w.em } as React.CSSProperties}>YOUR <em className="cover-em">{w.word}</em></span>)}</span></span><span className="sr-only">YOU KNOW YOUR MUSIC</span></h1>
          <div className="cover-subtitle"><span>EXPERIENCE</span><span>GET READY</span></div>
          <div className="cover-bottom">
            <Button variant="coverStart" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>START HERE <ArrowDown /></Button>
            <span className="cover-caption">FASHION X MUSIC X YOUR DECISION X TRENDS</span>
            <Button variant="coverLink" onClick={() => setQuiz(true)}>TAKE A QUIZ <ArrowUpRight /></Button>
          </div>
        </div>
        <div className="genres">
          <h3 className="genres-title">Shop by sound</h3>
          <div className="genre-tabs" role="tablist" aria-label="Music genres">{genres.map(g => <Button key={g.name} role="tab" variant="category" aria-selected={genre === g.name} data-active={genre === g.name} onClick={() => setGenre(g.name)}>{g.name}</Button>)}</div>
          <p className="genre-note" role="tabpanel" key={genre}>{genres.find(g => g.name === genre)?.note}</p>
        </div>
      </section>
      <section className="film" id="film" ref={filmRef} data-inview={filmIn} aria-label="This is a mood">
        <div className="film-head">
          <h2 className="film-title" aria-label="This is a mood">{filmLetters.map(({ word, letters }) => <span className="film-word" key={word} aria-hidden>{letters.map(({ ch, delay }, i) => <span key={i} style={{ transitionDelay: `${delay}ms` }}>{ch}</span>)}</span>)}</h2>
          <span className="film-credit">I do not own any of the vibes below</span>
          <span className="film-rule" aria-hidden="true" />
        </div>
        <RecordStack />
      </section>
      <DesignerMusing />
      <HowItWorks />
      <GuidedStoryQuote />
      <section className="iconic" id="iconic" aria-label="Featured iconic songs of today">
        <MoodHeading text="Fashion moments" className="moments-head" />
        <div className="iconic-head">
          <h2 className="iconic-title"><span>+ Featured songs</span></h2>
        </div>
        <FeaturedSongCollage songs={iconicSongs.filter((s): s is typeof s & { link: string } => "link" in s && typeof s.link === "string")} onShop={setShopSong} onSave={s => addWish({ kind: "song", name: s.caption, detail: "", link: s.link, note: "" })} />
        <article className="song-cover-story">
          <video ref={filmVideo} poster={coverStory.url} muted loop playsInline preload="none" aria-label="The cover story film">{coverStoryFilm.url && <source src={coverStoryFilm.url} type="video/mp4" />}</video>
          <div><h3>The cover story</h3>{filmConsent !== "yes" && <Button variant="editorial" onClick={() => setFilm(true)}><Play aria-hidden /> Play the film</Button>}</div>
        </article>
      </section>
      <section className="circles-section" id="circles" aria-label="Musician Circles">
        <MusicianCircles />
      </section>
      <GenreHeadingSelect genres={genres.map(g => g.name)} />
      <section className="journal" ref={journal} id="journal" hidden>{/* Hidden for now; remove `hidden` to bring The latest notes back. */}
        <div className="section-heading"><h2>The latest notes</h2><span className="text-xs uppercase">Fashion. Music. A point of view.</span></div>
        <div className="filter-row">
          <div className="filters" aria-label="Filter stories">{categories.map(c => <Button key={c} variant="category" data-active={category === c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</Button>)}</div>
          <div className="filter-tools">
            {category === "Music" && <Select value={musicGenre} onValueChange={setMusicGenre}>
              <SelectTrigger className="genre-select" aria-label="Filter by genre"><SelectValue placeholder="All genres" /></SelectTrigger>
              <SelectContent>{["All genres", ...genres.map(g => g.name)].map(g => <SelectItem className="genre-option" key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>}
            <span className="text-[10px] uppercase text-muted-foreground">The autumn edit / 2026</span>
          </div>
        </div>
        {category === "Music" && musicGenre !== "All genres" && <p className="genre-pick" key={musicGenre}>{genres.find(g => g.name === musicGenre)?.note}</p>}
        <div className="story-grid">{filtered.slice(0, category === "All" ? 3 : 4).map(s => <article className="story" key={s.id}>
          <a href="#" onClick={e => { e.preventDefault(); setArticle(s); }} aria-label={`Read ${s.title}`}><div className="story-image-wrap"><img className="story-image" src={s.image} style={{ objectPosition: s.image === skuzland.url ? "center 35%" : undefined }} alt={s.image === glorillaMeta.url ? "GloRilla in a pink blazer and blue tie, wearing Ray-Ban glasses, against a warm terracotta studio backdrop" : s.image === charliRock.url ? "Charli XCX in black and white: a shaggy faux-fur jacket over an unbuttoned shirt, hair slicked back and a smoked eye" : s.image === skuzland.url ? "Robot Moonjuice and Jazzelle in a flash-lit portrait: he wears gold sunglasses on his head and a pink fishnet top, she wears a fur-trimmed cap and a Black Flag t-shirt" : s.image === street ? "Paris street style with an oversized leather jacket and vintage denim" : "Grunge outfit: a navy argyle sweater, a red tartan pleated skirt and three layered silver belts"} width={1024} height={1280} loading="lazy" /></div></a>
          <div className="story-meta"><span>{s.category}{s.category === "Music" ? ` · ${s.genre}` : ""}</span><span>{s.date}</span></div>
          <h3>{s.title}</h3><Button variant="editorial" onClick={() => setArticle(s)}>Read the story <ArrowUpRight /></Button>
        </article>)}</div>
        {filtered.length === 0 && <p className="py-10 text-muted-foreground">{category === "Music" && musicGenre !== "All genres" ? `Nothing filed under ${musicGenre} yet. Try another sound.` : "No stories found. Try another word or category."}</p>}
      </section>
      {/* No rule of its own: the Zine's top border sits right below and underlines it. */}
      <MoodHeading text="Runway report" className="runway-head" rule={false} />
      <DigitalZine />
      <StyleSearch profile={styleProfile} onEditProfile={() => setQuiz(true)} />
      <section className="playlist" id="playlist" aria-label="Playlist">
        <h2 className="iconic-title"><span>+ Playlist</span></h2>
        <PlaylistBoard pick={playlistPick} setPick={setPlaylistPick} />
      </section>
      <BillboardBroadsheet />
      <MoodHeading text="Fashion music" className="music-head" />
      <section className="leaderboard" id="leaderboard" aria-label="Featured banner">
        <div className="leaderboard-band">
          <img src={coverWide} alt="" width={1920} height={1080} loading="lazy" />
          <div className="leaderboard-veil" aria-hidden />
          <div className="leaderboard-copy">
            <span className="leaderboard-kicker">+ Melody Lust</span>
            <p className="leaderboard-line">Dress loud. Listen louder.</p>
            <a className="leaderboard-link" href="#journal">Read the journal</a>
            <a className="leaderboard-link leaderboard-link--circles" href="#circles">Browse Musician Circles</a>
          </div>
        </div>
      </section>
      <section className="tumblr" id="tumblr" aria-label="From Tumblr">
        <h2 className="iconic-title"><span>+ From Tumblr</span></h2>
        <p className="tumblr-note">Straight from the blog — <a className="tumblr-follow" href={`https://${TUMBLR_BLOG}`} target="_blank" rel="noreferrer">follow along</a></p>
        <div className="tumblr-grid">
          {tumblrImages.length >= TUMBLR_MIN ? tumblrImages.map(p => <article className="tumblr-card" key={p.id} data-type={p.type}>
            <a href={p.url} target="_blank" rel="noreferrer" aria-label="Open this post on Tumblr">{p.image ? <img src={p.image} alt={p.alt} loading="lazy" /> : <span className="tumblr-blank" aria-hidden>{tumblrTypeLabel[p.type] ?? "Post"}</span>}</a>
            {p.type === "quote" && p.excerpt ? <blockquote className="tumblr-quote">“{p.excerpt}”</blockquote> : <><h3>{p.title}</h3>{p.excerpt && <p>{p.excerpt}</p>}</>}
            <span className="tumblr-date">{formatDay(p.timestamp)}</span>
          </article>) : stories.slice(0, 4).map(s => <article className="tumblr-card" key={s.id} data-type="note">
            <a href="#" onClick={e => { e.preventDefault(); setArticle(s); }} aria-label={`Read ${s.title}`}><img src={s.image} alt={s.title} loading="lazy" /></a>
            <h3>{s.title}</h3><p>{s.intro}</p>
            <span className="tumblr-date">{s.date}</span>
          </article>)}
        </div>
      </section>
      <section className="matrix" id="matrix" aria-label="Style matrix">
        <p className="matrix-intro"><strong>One statement piece, five ways.</strong> The same coat runs through every board below — the common denominator — styled a different way each time.</p>
        <StyleMatrix />
      </section>

      <MoodHeading text="Style matrix" className="matrix-head" stacked />
      <section className="archive" id="archive" aria-label="Archive">
        <h2 className="iconic-title"><span>+ Archive</span></h2>
        <div className="archive-grid">
          {stories.slice(0, 2).map(s => <article className="archive-card" key={s.id}>
            <a href="#" onClick={e => { e.preventDefault(); setArticle(s); }} aria-label={`Read ${s.title}`}><img src={s.image} alt={s.title} width={1024} height={1280} loading="lazy" /></a>
            <h3>{s.title}</h3>
            <p>{s.intro}</p>
          </article>)}
        </div>
      </section>
      <ShopSection />
      <Wishlist />
      <MoodHeading text="Reader looks" className="notes-head" stacked />
      <StylingNotes />
      <GuidedStory />
      <section className="manifesto"><h2>GOOD STYLE.<br />GREAT MUSIC. YOUR RULES.</h2><p>For the clothes you live in. The records you return to. And the moments when the two come together.</p></section>
      <footer className="footer"><a href="/" aria-label="Melody Lust home" className="brand"><img src={logo.url} alt="" className="brand-mark" width={448} height={209} /></a>{analyticsEnabled() && <button type="button" className="footer-link" onClick={() => setAnalytics("ask")}>Analytics settings</button>}<span className="text-muted-foreground">Independent in style. Always.<br />© 2026 Melody Lust</span></footer>
      <AnalyticsConsent consent={analytics} onChoose={chooseAnalytics} />
      <WantListPop />
      {/* One card at a time: the film question waits until analytics is answered. */}
      {askFilm && filmConsent === "ask" && solid && filmOnScreen && (!analyticsEnabled() || analytics !== "ask") && (
        <div className="film-consent" role="dialog" aria-modal="false" aria-labelledby="film-consent-title" aria-describedby="film-consent-note">
          <span className="film-consent-kicker">+ The cover story</span>
          <h2 className="film-consent-title" id="film-consent-title">The cover story moves.</h2>
          <p className="film-consent-note" id="film-consent-note">A film loops silently behind the card. May we play it for you?</p>
          <div className="film-consent-actions">
            <Button variant="soundCta" onClick={() => setFilm(true)}>Play the film</Button>
            <Button variant="editorial" onClick={() => setFilm(false)}>Not now</Button>
          </div>
        </div>
      )}
      <Button variant="railCta" className="to-top" data-show={showTop} aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp /></Button>
      <Sheet open={shopSong !== null} onOpenChange={open => { if (!open) setShopSong(null); }}>
        <SheetContent className="shop-panel">
          {shopSong && (() => {
            const song = iconicSongs.find(x => x.caption === shopSong);
            const pool = moodPool;
            const k = iconicSongs.findIndex(x => x.caption === shopSong);
            const looks = songLooks[shopSong] ?? [];
            const referenceImages = [pool[(k * 2) % pool.length], pool[(k * 2 + 1) % pool.length]];
            return <>
              <span className="shop-panel-kicker">The song / Your edit</span>
              <SheetTitle className="font-editorial text-3xl font-normal">{shopSong}</SheetTitle>
              <SheetDescription>Three pieces that dress the track.</SheetDescription>
              {song && <img src={song.image} alt="" className="shop-panel-art" />}
              <p className="shop-mood-title">+ Moodboard</p>
              <div className="shop-mood">{[0, 1, 2, 3, 4].map(j => <img key={j} src={pool[(k * 2 + j) % pool.length]} alt="" loading="lazy" />)}</div>
              <ul className="shop-list">{looks.map(l => <li key={l.name}>
                <div><p className="shop-name">{l.name}</p><p className="shop-note">{l.note}</p></div>
                <span className="shop-price">{l.price}</span>
                <Button variant="ghost" size="icon" className="shop-save" aria-label={`Add ${l.name} to Want List`} title="Add to Want List" onClick={() => addWish({ kind: "piece", name: l.name, detail: l.price, link: "", note: "", from: shopSong })}>+</Button>
              </li>)}</ul>
              <Button variant="outline" className="shop-panel-want" onClick={() => {
                looks.forEach(l => addWish({ kind: "piece", name: l.name, detail: l.price, link: "", note: "", from: shopSong }));
                if (song && "link" in song) addWish({ kind: "song", name: shopSong, detail: "", link: song.link, note: "" });
                setShopSong(null);
                setTimeout(() => document.getElementById("wishlist")?.scrollIntoView({ behavior: "smooth" }), 300);
              }}><ShoppingBag />Add to Want List</Button>
              <SongStyleNotes key={shopSong} song={shopSong} references={referenceImages.flatMap((image, index) => image ? [{ image, quote: index === 0 ? "Start with one soft piece and one hard piece." : "Keep the pieces you love, and try wearing them differently." }] : [])} />
            </>;
          })()}
        </SheetContent>
      </Sheet>
      <StoryDialog story={article} onClose={() => setArticle(null)} />
      <StyleProfileQuiz open={quiz} onOpenChange={setQuiz} profile={styleProfile} onSave={saveStyleProfile} onClear={clearStyleProfile} onRead={id => { setQuiz(false); setArticle(stories.find(story => story.id === id) ?? null); }} />
    </main>
  );
}

