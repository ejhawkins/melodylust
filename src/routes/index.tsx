import { createFileRoute, Link } from "@tanstack/react-router";
import type React from "react";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { flushSync } from "react-dom";
import { prefersReducedMotion, useRoomMotion } from "@/components/useRoomMotion";
import { useHeroParallax } from "@/components/useHeroParallax";
import { ArrowLeft, House, Play, Search, SlidersHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CuratorDossier, type DossierTab } from "@/components/CuratorDossier";
import { DuotoneFilter } from "@/components/DuotoneFilter";
import { FashionMusicSearch } from "@/components/FashionMusicSearch";
import { ListenLibrary, PhotoOr } from "@/components/ListenLibrary";
import { ListenContents } from "@/components/ListenContents";
import { ListenFavorites } from "@/components/ListenFavorites";
import { ListenIssueDock, type IssueTab } from "@/components/ListenIssueDock";
import { ListenLook } from "@/components/ListenLook";
import { ListenMood } from "@/components/ListenMood";
import { ListenPlaylist } from "@/components/ListenPlaylist";
import { LikeButton } from "@/components/LikeButton";
import { ListenProductCard } from "@/components/ListenProductCard";
import { ListenVideo } from "@/components/ListenVideo";
import { ListenPlayer } from "@/components/ListenPlayer";
import { ListenRunway, useRunwayNotes, useRunwaySongs } from "@/components/ListenRunway";
import { ListenRunwayNote } from "@/components/ListenRunwayNote";
import { ListenCapsule } from "@/components/ListenCapsule";
import { ListenDayPlaylist } from "@/components/ListenDayPlaylist";
import { moodVideos } from "@/components/RecordStack";
import { NowWearing } from "@/components/NowWearing";
import { StyleProfileQuiz } from "@/components/StyleProfileQuiz";
import { useStyleProfile } from "@/lib/use-style-profile";
import { StoryDialog } from "@/components/StoryDialog";
import { Wishlist } from "@/components/Wishlist";
import { ListenWantShelf } from "@/components/ListenWantShelf";
import { ListenStudio } from "@/components/ListenStudio";
import { moodboards } from "@/components/StyleMatrix";
import { FitCompass } from "@/components/FitCompass";
import { ListenFashion } from "@/components/ListenFashion";
import { categories, iconicSongs, playlist, stories, type Story } from "@/data/home";
import { fromRunway, step, toMix, type MixSong } from "@/lib/listening-room";
import { usePlaylists } from "@/lib/playlists";
import logo from "@/assets/melody-lust-logo.png";
import heroRunway from "@/assets/hero-runway-2.jpg";
import heroRunway3 from "@/assets/hero-runway-3.jpg";
import heroRunway4 from "@/assets/hero-runway-4.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "The Listening Room — Melody Lust" },
    // The browser's own bar in the top bar's plum (--color-fig-950), so the page runs flush into it.
    { name: "theme-color", content: "#140713" },
    { name: "description", content: "Melody Lust as a listening room: your library, The Autumn Mix and the three pieces that dress each song." },
    { property: "og:title", content: "The Listening Room — Melody Lust" },
    { property: "og:description", content: "Your library, The Autumn Mix, and music-led looks in the Melody Lust Listening Room." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ListeningRoom,
});

// The Autumn Mix opens on BIA's WE ON GO II. (Its thumbnail in Your Library is its genres' shape, from GenreMark.) Only the room
// reorders it; the home page keeps its own song order. (sort is stable, so the rest keep theirs.)
const mixLead = "WE ON GO II — BIA";
const mix = toMix(iconicSongs).sort((a, b) => Number(b.caption === mixLead) - Number(a.caption === mixLead));

// The hero's rotating line under YOU KNOW, as on the home cover. `em` is "YOUR <word>"'s measured width in em of WTF Hammer
// XXX Compressed, so each line is sized to run exactly as wide as YOU KNOW.
const heroWords = [
  { word: "MUSIC", em: 2.219 },
  { word: "PLAYLIST", em: 2.602 },
  { word: "RUNWAY", em: 2.571 },
  { word: "FASHION", em: 2.557 },
];
const heroTallestEm = Math.min(...heroWords.map(w => w.em));

// The runway film behind the hero: Thom Browne's Fall/Winter 2017 show, from FF Channel on YouTube. It loads from
// youtube-nocookie (as the record stack does) as the page opens, on every screen (on trial, to see how phones cope), or from
// Watch the show for reduced-motion readers. It plays muted so it never fights the player bar, and joins at 3:17, mid-walk.
// enablejsapi lets the page play and pause it by postMessage.
const youtube = "https://www.youtube-nocookie.com";
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const heroShow = { id: "Hm2zrWSdbjY", start: 197, title: "Thom Browne Fall/Winter 2017 show", credit: "Thom Browne FW17 · FF Channel", url: "https://www.youtube.com/watch?v=Hm2zrWSdbjY" };
const heroShowSrc = `${youtube}/embed/${heroShow.id}?autoplay=1&mute=1&loop=1&playlist=${heroShow.id}&start=${heroShow.start}&controls=0&playsinline=1&rel=0&disablekb=1&iv_load_policy=3&modestbranding=1&enablejsapi=1`;
// Only once the embed has loaded: before that its window is still a blank page on this site, and a message addressed to
// YouTube is refused ("Unable to post message"). The "listening" handshake keeps asking, so it starts as soon as it loads.
const tellShow = (frame: HTMLIFrameElement | null, message: object) => { if (frame?.dataset["loaded"]) frame.contentWindow?.postMessage(JSON.stringify(message), youtube); };

/** Each word of a line in its own mask, so it can rise into view from behind its own bottom edge. The spaces stay text
 *  between the masks (never a flex item of their own), so the line keeps its measured width. */
function MaskedWords({ text }: { text: string }) {
  return <>{text.split(" ").map((word, i) => <Fragment key={i}>{i > 0 && " "}<span className="ls-mask"><span className="ls-mask-in">{word}</span></span></Fragment>)}</>;
}
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** YOU KNOW over a YOUR line that changes every few seconds. Its own component, so the timer re-renders only the headline.
 *  With motion allowed, GSAP reveals it word by word through masks once the cover is in view, then each change lifts the
 *  old line out of the top of its masks as the new one rises from below. Reduced motion keeps the plain crossfade. */
function HeroTitle() {
  const [index, setIndex] = useState(0);
  const title = useRef<HTMLHeadingElement>(null);
  const shown = useRef(index);
  const ready = useRef(false);
  useEffect(() => {
    const id = window.setInterval(() => setIndex(i => (i + 1) % heroWords.length), 4600);
    return () => window.clearInterval(id);
  }, []);

  // Hide the words behind their masks before the first paint, then reveal them once the headline is in view.
  useIsoLayoutEffect(() => {
    const el = title.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    el.dataset["mask"] = "on";
    const inner = (scope: Element) => scope.querySelectorAll<HTMLElement>(".ls-mask-in");
    const ctx = gsap.context(() => gsap.set(inner(el), { yPercent: 115 }), el);
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const active = el.querySelectorAll(".ls-hero-word")[shown.current];
      ctx.add(() => {
        gsap.timeline({ onComplete: () => { ready.current = true; } })
          .to(inner(el.querySelector(".ls-hero-know")!), { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.12 })
          .to(active ? inner(active) : [], { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.12 }, "-=0.7");
      });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => { io.disconnect(); ctx.revert(); delete el.dataset["mask"]; };
  }, []);

  // Each new line: the old words lift out through the top of their masks while the new ones rise in from below.
  useEffect(() => {
    const el = title.current;
    const from = shown.current;
    shown.current = index;
    if (!el || from === index || el.dataset["mask"] !== "on") return;
    const words = el.querySelectorAll(".ls-hero-word");
    const out = words[from]?.querySelectorAll(".ls-mask-in") ?? [];
    const into = words[index]?.querySelectorAll(".ls-mask-in") ?? [];
    gsap.to(out, { yPercent: -115, duration: 0.6, ease: "power3.in", stagger: 0.06, overwrite: true });
    gsap.fromTo(into, { yPercent: 115 }, { yPercent: 0, duration: ready.current ? 0.9 : 0.01, ease: "power4.out", stagger: 0.1, delay: ready.current ? 0.35 : 0, overwrite: true });
  }, [index]);

  return (
    <h1 ref={title} id="ls-hero-title" className="ls-hero-title" style={{ "--ls-slot-em": heroWords[index]?.em, "--ls-tallest-em": heroTallestEm } as CSSProperties}>
      <span className="ls-hero-know" aria-hidden="true"><MaskedWords text="YOU KNOW" /></span>
      <span className="ls-hero-slot" aria-hidden="true">
        {heroWords.map((w, i) => <span key={w.word} className="ls-hero-word" data-active={i === index} style={{ "--word-em": w.em } as CSSProperties}><MaskedWords text={`YOUR ${w.word}`} /></span>)}
      </span>
      <span className="sr-only">YOU KNOW YOUR MUSIC</span>
    </h1>
  );
}

/** The hero: the Thom Browne show playing behind the rotating headline, with The Autumn Mix below. It plays from the start
 *  until Stop the show (a button in the cover's corner, so the bar below keeps its room for the title), and Watch the show
 *  brings it back. Under it sit the runway photos, which show while it is stopped, before it starts, for reduced-motion
 *  readers (who start it themselves) and wherever the browser blocks autoplay. The film shows only while YouTube says it is
 *  playing and pauses only once it has faded out, so YouTube's pause screen never shows; if YouTube refuses the film
 *  outright, the button becomes a link to it on YouTube. Once loaded it stays loaded, so Watch picks up at once. Its own
 *  component, so leaving the feed resets it. */
function ListenHero({ onPlayMix, children }: { onPlayMix: () => void; children?: React.ReactNode }) {
  const [on, setOn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  // YouTube refused to play the film here (an onError, such as 150 when the owner blocks this kind of embed).
  const [refused, setRefused] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  useHeroParallax(cover);
  const shown = on && playing;
  const wanted = useRef(on);

  useEffect(() => {
    if (!window.matchMedia(reducedMotionQuery).matches) setOn(true);
  }, []);

  useEffect(() => {
    wanted.current = on;
    if (on) {
      setLoaded(true);
      tellShow(frame.current, { event: "command", func: "playVideo", args: [] });
      return;
    }
    // Pause once the .6s fade is over; coming back sooner cancels it.
    const id = window.setTimeout(() => tellShow(frame.current, { event: "command", func: "pauseVideo", args: [] }), 650);
    return () => window.clearTimeout(id);
  }, [on]);

  // The embed autoplays as it loads, which can be after Stop was pressed. Ask it to report its state (re-asking until it
  // answers, as YouTube's own API does) and pause it whenever it says it is playing out of sight.
  useEffect(() => {
    if (!loaded) return;
    let heard = false;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== youtube || e.source !== frame.current?.contentWindow) return;
      heard = true;
      let data: { event?: string; info?: number | { playerState?: number } } | undefined;
      try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
      if (data?.event === "onError") { setRefused(true); return; }
      const state = typeof data?.info === "number" ? data.info : data?.info?.playerState;
      if (state === 2) setPlaying(false);
      if (state !== 1) return;
      setPlaying(true);
      if (!wanted.current) tellShow(frame.current, { event: "command", func: "pauseVideo", args: [] });
    };
    window.addEventListener("message", onMessage);
    const ask = window.setInterval(() => { if (heard) window.clearInterval(ask); else tellShow(frame.current, { event: "listening", id: "ls-hero-show", channel: "widget" }); }, 250);
    return () => { window.removeEventListener("message", onMessage); window.clearInterval(ask); };
  }, [loaded]);

  return (
    <div className="ls-hero-wrap">
      <section className="ls-hero" aria-labelledby="ls-hero-title">
        <div className="ls-hero-cover" ref={cover}>
          <DuotoneFilter id="ls-hero-duotone" />
          {/* The back layer: the runway photos and the film together, so the parallax reads with the film on as well. */}
          <div className="ls-hero-depth">
            {[heroRunway3, heroRunway, heroRunway4, heroRunway].map((src, i) => <span key={i} className={`cover-slide cover-slide-${i + 1} ls-hero-slide`} aria-hidden="true"><img className="ls-hero-img" src={src} alt="" width={1200} height={1600} loading={i === 0 ? undefined : "lazy"} /></span>)}
            {loaded && <span className="ls-hero-show" data-on={shown} aria-hidden="true"><iframe ref={frame} src={`${heroShowSrc}&origin=${encodeURIComponent(window.location.origin)}`} title={heroShow.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" tabIndex={-1} onLoad={e => { e.currentTarget.dataset["loaded"] = "true"; }} /></span>}
          </div>
          <p className="ls-hero-kicker">Music and style notes · By Erica Hawkins</p>
          <HeroTitle />
          {refused ? (
            // The film will not play in this page, so the button sends the reader to it on YouTube instead.
            <Button asChild variant="listenCaption" size="caption" className="ls-hero-show-btn">
              <a href={heroShow.url} target="_blank" rel="noreferrer" aria-label="Watch the show on YouTube"><Play aria-hidden /><span className="ls-hero-show-label">Watch the show on YouTube ↗</span></a>
            </Button>
          ) : (
            // On phones only the icon shows (the label is hidden there), so the name sits on the button itself.
            <Button variant="listenCaption" size="caption" className="ls-hero-show-btn" aria-label={on ? "Stop the show" : "Watch the show"} aria-pressed={on} onClick={() => setOn(value => !value)}>
              {on ? <Square aria-hidden /> : <Play aria-hidden />}<span className="ls-hero-show-label">{on ? "Stop the show" : "Watch the show"}</span>
            </Button>
          )}
          {shown && <a className="ls-hero-credit" href={heroShow.url} target="_blank" rel="noreferrer">{heroShow.credit} ↗</a>}
        </div>
        <div className="ls-hero-foot">
          <Button variant="listenPlay" size="round" className="ls-hero-play h-14 w-14 [&_svg]:size-6" aria-label="Play The Autumn Mix" onClick={onPlayMix}><Play /></Button>
          <div className="ls-hero-name">
            <p className="ls-hero-mix">The <span className="ls-hero-mix-word">Autumn</span> Mix</p>
            <p className="ls-hero-meta">Playlist · {mix.length} songs, {mix.length} looks</p>
          </div>
          <span className="ls-hero-by ls-hide-sm" role="img" aria-label="Melody Lust" style={{ "--logo": `url(${logo})` } as CSSProperties} />
        </div>
      </section>
      {/* The issue's line, in the home page's eyebrow style ("How it works"), above the tagline. */}
      <p className="gs-eyebrow ls-hero-eyebrow">The First Issue Featuring: Musing from Fashion Designer Thom Browne</p>
      <p className="ls-hero-tagline">This is a mood</p>
      {children}
    </div>
  );
}

/** Whether the room is in its one-column phone layout, at the stylesheet's 900px breakpoint. False on the server. */
function usePhoneLayout() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const sync = () => setPhone(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return phone;
}

/** What the feed shows: the edit itself, or the Want List, the profile, a moodboard, a song look, a music video or one of the reader's playlists opened from the library. */
type View = { kind: "feed" } | { kind: "want" } | { kind: "profile"; tab: DossierTab } | { kind: "board"; id: string } | { kind: "look"; index: number } | { kind: "video"; index: number } | { kind: "playlist"; id: string } | { kind: "note"; id: string } | { kind: "contents" } | { kind: "capsule" } | { kind: "day" };

/** The second home page: the journal laid out like a music player, in black and white. The library
 *  sits left, the feed in the middle, Now wearing on the right and the player along the bottom. */
function ListeningRoom() {
  const [now, setNow] = useState(0);
  const [listening, setListening] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [wearingOpen, setWearingOpen] = useState(true);
  // Phones hide the Style profile button, so the style quiz gets its own place in the top bar there.
  const [quizOpen, setQuizOpen] = useState(false);
  const styleProfile = useStyleProfile();
  const [active, setActive] = useState("mix");
  const [view, setView] = useState<View>({ kind: "feed" });
  const [category, setCategory] = useState("All");
  const [article, setArticle] = useState<Story | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [onRunway, setOnRunway] = useState(false);
  // The feed's note shelves stay folded until a pill opens one.
  const [shelf, setShelf] = useState<"music" | "runway" | "style" | "fashion" | null>(null);
  const feed = useRef<HTMLElement>(null);
  const lead = useRef<HTMLDivElement>(null);
  useRoomMotion(feed);
  const phone = usePhoneLayout();
  // The Issue starts folded on phones, so the hero leads straight into the front-row pass; its button still opens it.
  useEffect(() => { setLibraryOpen(!phone); }, [phone]);
  // Phones: pin the section row once the hero (or, off the feed, the header) has scrolled away.
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    if (!phone) { setDocked(false); return; }
    const target = document.querySelector(".ls-lead .ls-hero-wrap") ?? document.querySelector(".ls-head");
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setDocked(!!e && !e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(target);
    return () => io.disconnect();
  }, [phone, view]);
  const runwayShown = category === "Runway" || onRunway || shelf === "runway" || view.kind === "note";
  const runway = useRunwaySongs(runwayShown);
  const runwayMix = useMemo(() => runway.map(fromRunway), [runway]);
  const runwayNoteList = useRunwayNotes(runway, runwayShown);
  // One of the reader's playlists, once it is played; it gives way to the mix if it is emptied or deleted.
  const [listId, setListId] = useState<string | null>(null);
  const playlists = usePlaylists();
  const listSongs = playlists.find(p => p.id === listId)?.songs;
  const listMix = useMemo(() => (listSongs ?? []).flatMap(c => mix.filter(s => s.caption === c)), [listSongs]);
  // A Studio playlist (or its Explore list), once a song in it is pressed: the bar plays it in that order.
  const [studioQueue, setStudioQueue] = useState<MixSong[] | null>(null);
  const onStudio = !onRunway && (studioQueue?.length ?? 0) > 0;
  const onList = !onRunway && !onStudio && listMix.length > 0;
  // The player bar plays The Autumn Mix, or Runway Songs once a runway row is pressed, or a playlist of the reader's.
  const queue = onRunway && runwayMix.length > 0 ? runwayMix : onStudio && studioQueue ? studioQueue : onList ? listMix : mix;
  const song = queue[Math.min(now, queue.length - 1)];
  if (!song) return null;

  const go = (index: number) => { setNow(index); setActive(onRunway ? "runway-songs" : onStudio ? "studio" : onList ? `playlist-${listId}` : `look-${index}`); };
  const play = (index: number) => { setOnRunway(false); setStudioQueue(null); setListId(null); setNow(index); setActive(`look-${index}`); setWearingOpen(true); setListening(true); };
  const playRunway = (index: number) => { setOnRunway(true); setStudioQueue(null); setListId(null); setNow(index); setActive("runway-songs"); setListening(true); };
  const playStudio = (songs: MixSong[], index: number) => { setOnRunway(false); setListId(null); setStudioQueue(songs); setNow(index); setActive("studio"); setListening(true); };
  const playList = (id: string, index: number) => { setOnRunway(false); setStudioQueue(null); setListId(id); setNow(index); setActive(`playlist-${id}`); setListening(true); };
  const playMix = () => { play(0); setActive("mix"); };
  // Back to the top of the feed, once the new view is on the page. On phones the feed is part of the page (the hero leads it
  // on the feed, the rest of it under the library), so the page scrolls to wherever it now starts.
  const feedTopNow = (behavior: ScrollBehavior) => {
    const el = feed.current;
    el?.scrollTo({ top: 0, behavior });
    const start = lead.current ?? el;
    const top = start?.getBoundingClientRect().top ?? 0;
    if (start && (top < 0 || top > window.innerHeight)) start.scrollIntoView({ behavior });
  };
  const toFeedTop = (behavior: ScrollBehavior) => requestAnimationFrame(() => feedTopNow(behavior));
  // Opening a view and going back are view transitions where the browser has them: the old view lifts away and the new
  // one rises in (styles.css, "Motion"). The feed takes its transition name only for the change, and the scroll back to
  // the top happens inside it, so the new view is captured where it lands. Focus moves to the new view's heading.
  const changeView = (update: () => void, behavior: ScrollBehavior) => {
    const main = feed.current;
    if (!main || typeof document.startViewTransition !== "function" || prefersReducedMotion()) { update(); toFeedTop(behavior); return; }
    main.classList.add("ls-view-moving");
    const t = document.startViewTransition(() => { flushSync(update); feedTopNow("instant"); });
    t.finished.finally(() => {
      main.classList.remove("ls-view-moving");
      const heading = main.querySelector<HTMLElement>("h1");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
  };
  const goHome = () => changeView(() => { setView({ kind: "feed" }); setActive("mix"); }, "smooth");
  const open = (next: View, row: string) => changeView(() => { setView(next); setActive(row); }, "auto");
  const openWant = () => open({ kind: "want" }, "want");
  const openProfile = () => open({ kind: "profile", tab: "dna" }, "profile");
  const board = view.kind === "board" ? moodboards.find(b => b.id === view.id) : undefined;
  const look = view.kind === "look" ? mix[view.index] : undefined;
  const video = view.kind === "video" ? moodVideos[view.index] : undefined;
  const ownList = view.kind === "playlist" ? playlists.find(p => p.id === view.id) : undefined;
  const note = view.kind === "note" ? runwayNoteList.find(n => n.id === view.id) : undefined;
  const notes = stories.filter(s => category === "All" || s.category === category);
  // Phones show the feed's hero on its own, ahead of Your Library; the rest of the feed follows the library.
  const heroLeads = phone && view.kind !== "want" && view.kind !== "profile" && !look && !video && !ownList && !note && !board && view.kind !== "contents";
  const issueTab: IssueTab | undefined = view.kind === "contents" ? "playlists" : view.kind === "want" ? "want" : shelf === "runway" ? "runway" : shelf === "style" ? "notes" : shelf === "fashion" ? "fashion" : undefined;
  const pickIssue = (tab: IssueTab) => {
    if (tab === "playlists") return open({ kind: "contents" }, "mix");
    if (tab === "want") return openWant();
    setView({ kind: "feed" });
    setShelf(tab === "notes" ? "style" : tab === "runway" ? "runway" : tab === "fashion" ? "fashion" : "music");
    // Fashion and Runway Songs open above the pill row, so go to the section itself; the notes open right under the row.
    requestAnimationFrame(() => document.querySelector(tab === "fashion" ? ".ls-fashion" : tab === "runway" ? "section[aria-labelledby='ls-runway']" : ".ls-shelf-pills")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="ls">
      <header className="ls-head">
        <Link to="/" className="ls-logo-link" aria-label="Melody Lust home"><img src={logo} alt="" className="ls-logo" width={448} height={209} /></Link>
        <div className="ls-head-center">
          <Button variant="listenHome" size="roundLg" className="ls-home" aria-label="Listening room home" title="Home" onClick={goHome}><House /></Button>
          <Button variant="listenSearch" size="field" className="ls-search" aria-haspopup="dialog" aria-expanded={findOpen} onClick={() => setFindOpen(true)}>
            <Search aria-hidden /><span className="truncate"><span className="sr-only">Search </span>Artists, songs, looks, runways</span>
          </Button>
        </div>
        <div className="ls-head-end">
          <Button variant="listenOutline" size="bar" className="ls-hide-sm" aria-expanded={view.kind === "profile"} onClick={openProfile}><SlidersHorizontal aria-hidden />Style profile</Button>
          <Button variant="listenOutline" size="bar" className="ls-want-btn ls-style-btn ls-show-sm" aria-haspopup="dialog" onClick={() => setQuizOpen(true)}><span>Style quiz</span></Button>
          <Button variant="listenSolid" size="bar" className="ls-want-btn" aria-controls="wishlist" aria-expanded={view.kind === "want"} onClick={openWant}><span>Want List</span></Button>
        </div>
      </header>

      <div className="ls-body">
        {heroLeads && <div className="ls-center ls-lead" ref={lead}><ListenHero onPlayMix={playMix}><ListenIssueDock variant="hero" current={issueTab} onPick={pickIssue} /></ListenHero></div>}
        <ListenLibrary open={libraryOpen} onOpenChange={setLibraryOpen} mix={mix} active={active}
          nowPlaying={listening ? song.caption : undefined} onPlaySong={play} onPlayListSong={playList}
          onPlayMix={playMix}
          onPlaylist={id => open({ kind: "playlist", id }, `playlist-${id}`)}
          onWant={openWant}
          onCapsule={() => open({ kind: "capsule" }, "capsule")}
          onDay={() => open({ kind: "day" }, "day")}
          onContents={() => open({ kind: "contents" }, "mix")}
          contentsShown={view.kind === "contents"}
          onProfile={openProfile}
          onLook={index => open({ kind: "look", index }, `look-${index}`)}
          onVideo={index => open({ kind: "video", index }, `video-${index}`)}
          onBoard={id => open({ kind: "board", id }, `board-${id}`)}
          onRead={story => { setActive(`story-${story.id}`); setArticle(story); }} />

        <main className="ls-center" ref={feed}>
          {/* Every opened view (a Runway Note, a look, a video, a playlist, a moodboard, the Want List, the profile, the contents)
              gets the way back at the top too, pinned while it scrolls; each still ends with Back to the feed. */}
          {view.kind !== "feed" && <div className="ls-back-top"><Button variant="listenCategory" size="chip" onClick={goHome}><ArrowLeft aria-hidden />Back to the feed</Button></div>}
          {view.kind === "want" ? (
            // The home page's Want List, loaded right here and re-inked black and white.
            <div className="ls-want">
              <Wishlist />
              <Button variant="listenCategory" size="chip" onClick={goHome}>Back to the feed</Button>
            </div>
          ) : view.kind === "day" ? (
            <ListenDayPlaylist mix={mix} nowPlaying={listening ? song.caption : undefined} onPlay={playStudio} onBack={goHome} />
          ) : view.kind === "capsule" ? (
            <ListenCapsule mix={mix} nowPlaying={listening ? song.caption : undefined} onPlay={playStudio} onWantList={openWant} onBack={goHome} />
          ) : view.kind === "contents" ? (
            <div className="ls-contents-stage">
              <ListenStudio onPlay={playStudio} nowPlaying={onStudio && listening ? song.caption : undefined} />
              <ListenContents mix={mix} playlists={playlists} nowPlaying={listening ? song.caption : undefined} onPlayMix={play} onPlayList={playList}
                onRunway={() => setCategory("Runway")} onPlaylist={id => open({ kind: "playlist", id }, `playlist-${id}`)} />
              <Button variant="listenCategory" size="chip" onClick={goHome}>Back to the feed</Button>
            </div>
          ) : view.kind === "profile" ? (
            // The profile page, loaded right here under the room's own header.
            <div className="ls-profile">
              <CuratorDossier embedded tab={view.tab} onTabChange={tab => setView({ kind: "profile", tab })} />
              <Button variant="listenCategory" size="chip" onClick={goHome}>Back to the feed</Button>
            </div>
          ) : look && view.kind === "look" ? (
            <ListenLook key={look.caption} song={look} onPlay={() => play(view.index)} onWantList={openWant} onBack={goHome} />
          ) : video ? (
            <ListenVideo key={video.id} video={video} onBack={goHome} />
          ) : note ? (
            <ListenRunwayNote key={note.id} note={note} songs={runway} playing={onRunway ? now : null} onPlay={playRunway} onBack={goHome} />
          ) : ownList ? (
            <ListenPlaylist key={ownList.id} playlist={ownList} mix={mix} playing={onList && listId === ownList.id ? now : null} onPlay={i => playList(ownList.id, i)} onBack={goHome} />
          ) : board ? (
            <section className="ls-board" aria-labelledby="ls-board-title">
              <div className="ls-board-head">
                {board.images[0] && <PhotoOr key={board.id} swatch={board.palette[0]} className="ls-board-cover" src={board.images[0].src} alt="" width={160} height={160} style={{ objectPosition: board.images[0].focus }} />}
                <div>
                  <p className="ls-kicker">Moodboard</p>
                  <h1 id="ls-board-title" className="ls-board-title">{board.title}</h1>
                  <p className="ls-board-meta">{board.genres.join(" · ")}</p>
                  <ul className="ls-palette" aria-label="Palette">{board.palette.map(c => <li key={c} style={{ background: c }} title={c} />)}</ul>
                  <div className="ls-look-actions"><LikeButton kind="board" id={board.id} name={board.title} /></div>
                </div>
              </div>
              <ul className="ls-board-grid">
                {board.images.map((img, j) => <li key={img.alt}><PhotoOr swatch={board.palette[j % board.palette.length]} className="ls-board-photo" src={img.src} alt={img.alt} style={{ objectPosition: img.focus }} loading="lazy" />{img.caption && <span className="ls-board-caption">{img.caption}</span>}</li>)}
              </ul>
              <Button variant="listenCategory" size="chip" onClick={goHome}>Back to the feed</Button>
            </section>
          ) : <>
            {!heroLeads && <ListenHero onPlayMix={playMix} />}

            {shelf === "fashion" && <ListenFashion onProfile={openProfile} />}

            <ListenStudio onPlay={playStudio} nowPlaying={onStudio && listening ? song.caption : undefined} />

            <ListenWantShelf onOpen={openWant} />

            <ListenMood />

            <ListenFavorites onStory={s => { setActive(`story-${s.id}`); setArticle(s); }} />

            {(category === "Runway" || shelf === "runway") && <ListenRunway notes={runwayNoteList} songs={runway} playing={onRunway ? now : null} onPlay={playRunway} onOpen={id => open({ kind: "note", id }, `note-${id}`)} />}

            <div className="ls-shelf-pills" role="group" aria-label="Notes">
              {([["runway", "Runway Notes"], ["music", "Music Notes"], ["style", "Style Matrix Notes"], ["fashion", "Fashion"]] as const).map(([id, label]) =>
                <Button key={id} variant="listenCategory" size="chip" aria-pressed={shelf === id} aria-expanded={shelf === id} onClick={() => {
                  setShelf(shelf === id ? null : id);
                  // Fashion opens well above this row (the others open beside it), so bring it into view.
                  if (id === "fashion" && shelf !== id) requestAnimationFrame(() => document.querySelector(".ls-fashion")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }}>{label}</Button>)}
            </div>
            {shelf === "music" && <section className="ls-section" aria-labelledby="ls-featured">
              <div className="ls-section-head"><h2 id="ls-featured">+ Music notes</h2></div>
              <ul className="ls-tiles">
                {mix.map((s, i) => <li key={s.caption}>
                  <Button variant="listenTile" size="block" className="ls-tile w-full" data-active={!onRunway && !onList && i === now} aria-label={`Play ${s.title} by ${s.artist}`} onClick={() => play(i)}>
                    <span className="ls-tile-art"><img src={s.art} alt="" width={300} height={300} loading="lazy" /><span className="ls-tile-play" aria-hidden><Play /></span></span>
                    <span className="ls-tile-title">{s.title}</span>
                    <span className="ls-tile-artist">{s.artist}</span>
                  </Button>
                  {/* A quick like for the song's look, beside the tile (a button can't sit inside another). */}
                  <LikeButton look="quick" kind="look" id={s.caption} name={`The ${s.title} look`} sub={s.artist} image={s.art} className="ls-quick-like" />
                </li>)}
              </ul>
            </section>}

            {shelf === "style" && <section className="ls-section" aria-labelledby="ls-notes">
              <div className="ls-section-head"><h2 id="ls-notes">+ Style matrix notes</h2><span>Fashion. Music. A point of view.</span></div>
              <FitCompass compact />
              {notes.length === 0 ? <p className="ls-empty">Nothing filed under {category} yet.</p> : (
                <ul className="ls-notes">
                  {notes.map(s => <li key={s.id}>
                    <Button variant="listenTile" size="block" className="ls-note w-full" onClick={() => { setActive(`story-${s.id}`); setArticle(s); }}>
                      <img src={s.image} alt="" width={400} height={500} loading="lazy" />
                      <span className="ls-note-kicker">{s.category} · {s.date}</span>
                      <span className="ls-note-title">{s.title}</span>
                      <span className="ls-note-intro">{s.intro}</span>
                    </Button>
                    <LikeButton look="quick" kind="story" id={String(s.id)} name={s.title} sub={`${s.category} · ${s.date}`} image={s.image} className="ls-quick-like" />
                  </li>)}
                </ul>
              )}
            </section>}

            <div className="ls-chips" role="group" aria-label="Filter stories">
              {categories.map(c => <Button key={c} variant="listenCategory" size="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</Button>)}
            </div>
          </>}
        </main>

        {wearingOpen && <NowWearing onProfile={openProfile} nowPlaying={runway[0]} />}
      </div>

      {/* The sticky issue dock was retired: the in-hero buttons are the only issue nav. */}

      <ListenPlayer song={song} listening={listening} onListen={() => (onRunway ? playRunway(now) : onStudio && studioQueue ? playStudio(studioQueue, now) : onList && listId ? playList(listId, now) : play(now))}
        onPrev={() => go(step(queue.length, now, -1))} onNext={() => go(step(queue.length, now, 1))}
        wearingOpen={wearingOpen} onWearingChange={setWearingOpen} sheet={phone}
        shop={<ListenProductCard active={phone && listening} songKey={song.caption} />} />

      <StyleProfileQuiz tone="room" open={quizOpen} onOpenChange={setQuizOpen} profile={styleProfile.profile} onSave={styleProfile.save} onClear={styleProfile.clear}
        onRead={id => { setQuizOpen(false); const story = stories.find(s => s.id === id); if (story) { setActive(`story-${story.id}`); setArticle(story); } }} />
      <FashionMusicSearch open={findOpen} onOpenChange={setFindOpen} playlist={playlist.tracks} tone="room" />
      <StoryDialog story={article} onClose={() => setArticle(null)} />
    </div>
  );
}
