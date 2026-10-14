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
import kidCudi from "@/assets/day-n-nite.jpg";
import sleeveChihiro from "@/assets/sleeve-chihiro.jpg";
import sleeveBanks from "@/assets/sleeve-banks.jpg";
import sleeveSolange from "@/assets/sleeve-solange.jpg";
import sleeveWeeknd from "@/assets/sleeve-weeknd.jpg";
import songA from "@/assets/song-a.jpg";
import songB from "@/assets/song-b.jpg";
import songC from "@/assets/song-c.jpg";
import songD from "@/assets/song-d.jpg";
import songE from "@/assets/song-e.jpg";
import songF from "@/assets/song-f.jpg";
import matrixShoeImage from "@/assets/style-matrix-shoe.png";
import { StyleMatrix } from "@/components/StyleMatrix";
import { ShopSection } from "@/components/ShopSection";
import { DigitalZine } from "@/components/DigitalZine";
import { MusicianCircles } from "@/components/MusicianCircles";
import { StylingNotes } from "@/components/StylingNotes";
import { SongStyleNotes } from "@/components/SongStyleNotes";
import { GuidedStory, GuidedStoryQuote } from "@/components/GuidedStory";
import { HowItWorks } from "@/components/HowItWorks";
import glorillaMetaImage from "@/assets/glorilla-meta.jpg";
import charliRockImage from "@/assets/charli-rock-music.webp";
import skuzlandImage from "@/assets/skuzland.jpg";
import slayyyterDanceImage from "@/assets/slayyyter-dance.jpg";
import biaWeOnGoImage from "@/assets/bia-we-on-go.jpg";
import nicoleKidmanImage from "@/assets/nicole-kidman.jpg";
import iKnowWhatYouWantImage from "@/assets/i-know-what-you-want.jpg";
import fashionWeekImage from "@/assets/fashion-week.jpg";
import coverStoryImage from "@/assets/cover-story.jpg";
import logoImage from "@/assets/melody-lust-logo.png";
const logo = { url: logoImage };
const matrixShoe = { url: matrixShoeImage };
const glorillaMeta = { url: glorillaMetaImage };
const charliRock = { url: charliRockImage };
const skuzland = { url: skuzlandImage };
const slayyyterDance = { url: slayyyterDanceImage };
const biaWeOnGo = { url: biaWeOnGoImage };
const nicoleKidman = { url: nicoleKidmanImage };
const iKnowWhatYouWant = { url: iKnowWhatYouWantImage };
const fashionWeek = { url: fashionWeekImage };
const coverStory = { url: coverStoryImage };
const coverStoryFilm = { url: "" };
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, ArrowDown, ArrowRight, Play, ArrowUp, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wishlist } from "@/components/Wishlist";
import { StyleSearch } from "@/components/StyleSearch";
import { StyleProfileQuiz } from "@/components/StyleProfileQuiz";
import { emptyStyleProfile, STYLE_PROFILE_KEY, styleProfileSchema, type StyleProfile } from "@/lib/style-profile";
import { addWish } from "@/lib/wishlist";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTumblrPosts, TUMBLR_BLOG } from "@/lib/tumblr.functions";
import { formatDay } from "@/lib/tumblr";
import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { WantListPop } from "@/components/WantListPop";
import { MoodHeading } from "@/components/MoodHeading";
import { analyticsEnabled, denyGoogleAnalytics, loadGoogleAnalytics, readAnalyticsConsent, saveAnalyticsConsent, type AnalyticsConsent as AnalyticsChoice } from "@/lib/analytics";

const FILM_CONSENT_KEY = "ml-cover-story-film";

const tumblrQueryOptions = queryOptions({
  queryKey: ["tumblr-posts"],
  queryFn: () => getTumblrPosts(),
  staleTime: 5 * 60 * 1000,
});

const tumblrTypeLabel: Record<string, string> = {
  text: "Note", photo: "Photo", quote: "Quote", link: "Link",
  video: "Film", chat: "Chat", audio: "Track", answer: "Answer",
};

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Melody Lust — Your Style, Your Sound" },
    { name: "description", content: "Explore fashion through music, shop the moodboard, and share your own Styling Notes with photos and song picks." },
    { property: "og:title", content: "Melody Lust — Your Style, Your Sound" },
    { property: "og:description", content: "Fashion, music, and your point of view — editorials, live shopping, musician circles, and community Styling Notes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tumblrQueryOptions),
  component: Index,
});

const stories = [
  { id: 12, category: "Music", genre: "Hip-Hop", title: "GloRilla talks tea, hands-free", image: glorillaMeta.url, date: "October 09, 2026", intro: "Advice is free, but you better be ready to hear the truth. GloRilla handles business in the new Ray-Ban Meta Audio glasses.", body: "GloRilla has never needed a microphone to be heard, but her latest accessory does the talking anyway. In a new post, she handles business hands-free in the Ray-Ban Meta Audio glasses — designed without a camera, so she can talk tea all day.\n\nThe smart glasses moment is having a fashion moment, too. Worn like any good pair of frames, they sit somewhere between statement accessory and everyday tool. If the front row was the place to be seen, the group chat is the place to be heard — and Glo is dressed for both." },

  { id: 1, category: "Music", genre: "Rock", title: "Rock music, not actually rock", image: charliRock.url, date: "October 09, 2026", intro: "“I think the dance floor is dead, so now we're making rock music.” Charli XCX opens her eighth album with a blazing guitar riff and a joke that is entirely hers.", body: "“I think the dance floor is dead, so now we're making rock music,” Charli XCX declares over a blazing guitar riff on ‘Rock Music’, the lead single from Music, Fashion, Film, her eighth studio album. She released it on 8 May 2026, having recorded it the previous October at Rue Boyer Studios in Paris with A. G. Cook and Finn Keane, who wrote and produced it with her. It runs one minute and fifty-five seconds and reached 36 in the UK.\n\nThe joke belongs to her. She posted studio footage captioned as a video of herself making a song called ‘rock music’ that is not actually rock music, then told British Vogue she enjoyed flipping the form — and that keeping the result from feeling too macho mattered. The video is shot in hard black and white: Charli roaming city streets, smoking beside enormous piles of cigarettes.\n\nThe album's title puts fashion in the room with music and film, and the styling follows. A shaggy faux-fur zip, an unbuttoned shirt, lace underneath, hair slicked back, an eye smoked to the bone. It is the rock uniform worn by someone who read the handbook and doodled in the margins — no leather jacket required. If the dance floor really is dead, she has at least dressed us for the wake." },
  { id: 3, category: "Music", genre: "Rock", title: "Who is Skuzland?", image: skuzland.url, date: "October 09, 2026", intro: "Jazzelle and Robot Moonjuice built a world out of New York nightlife — and now it makes a noise.", body: "Skuzland is two people: Jazzelle, the model and artist the internet knows as Ugly Worldwide, and Robot Moonjuice, the Harlem-born creative director, songwriter and performance artist. They met at Berlin nightclub in Chicago — Robot in town for his first out-of-state gig, Jazzelle hosting in crutches with a broken foot and, as Robot put it, fully committed to the look.\n\nJazzelle's path runs straight through fashion. A Chicago club kid discovered by photographer Nick Knight, she went on to star in campaigns for Savage X Fenty and Fenty Skin, fronted her own Fenty Beauty collection with Rihanna's brand, and shot for Fendi, Nike and the covers of i-D and Interview — all while insisting beauty stays undefined. Robot made his name in New York's 2010s nightlife, turning fine art and theatre training into fearless, flamboyant performance.\n\nTogether they call the sound experimental techno pop-punk, and they refuse to be referential — as Robot has it, everyone is reheating everyone else's nachos. The debut EP, OTW, arrived on September 18 via Republic Records: seven tracks written entirely by the pair, from the siren howl of POOR CHOICES to the political fury of GiRL AMERiCA. In Skuzland, they say, everyone is welcome — arrive dressed however you like." },
  { id: 2, category: "Fashion", genre: "Indie", title: "The thrift-store uniform", image: cover, date: "October 07, 2026", intro: "Argyle, tartan and three belts at once. The grunge wardrobe is back, and it never really left.", body: "There is a reason a thrifted sweater, a pleated skirt and an armful of belts still work. Grunge was never about looking rough. It was about wearing what you actually want, in whatever order it comes to you.\n\nStart with one soft piece and one hard piece. Let the knit go a little loose. Stack the belts until they feel like yours. The scuffs and the fraying hem are the point — they say you wore it, not that you saved it." },
  { id: 4, category: "Runway", genre: "Electronic", title: "Beyond the front row", image: songF, date: "October 02, 2026", intro: "The details that stay with us long after the last look leaves the runway.", body: "The best runway moments aren't always the loudest. A change in proportion, a new approach to layering, a familiar fabric seen in an unfamiliar light: these are the ideas that follow us home.\n\nOur notes this season are simple. Embrace texture. Give volume some space. Keep the pieces you love, and try wearing them differently. The runway is a starting point, not a rulebook." },
  { id: 5, category: "Music", genre: "Rock", title: "Leather, eyeliner and the last encore", image: songA, date: "September 30, 2026", intro: "The jacket that outlived the tour. How rock's uniform keeps turning up on the street.", body: "Rock dressing survives because it is mostly attitude and very little rule. A black jacket, a worn band tee, boots that have been broken in on purpose.\n\nWear it the way it was meant to be worn: slightly too loud, slightly too early, and with the collar up if the weather allows." },
  { id: 6, category: "Music", genre: "Hip-Hop", title: "Oversized fits and open decks", image: songB, date: "September 28, 2026", intro: "Baggy denim, fresh laces and the confidence that made hip-hop the best-dressed room in the building.", body: "Hip-hop changed fashion by changing the fit. Shoulders dropped, legs widened, and sneakers moved from the gym to the front row.\n\nThe trick is proportion. Let one piece run large and keep the rest quiet. Then look after the shoes — they are the signature." },
  { id: 7, category: "Music", genre: "R&B", title: "Slow jams and soft knits", image: songC, date: "September 26, 2026", intro: "Satin, cashmere and a little shine after dark — the R&B approach to getting dressed.", body: "R&B dressing is about how a fabric moves. Satin catches the light, a soft knit holds a shape, and everything sits a little lower and a little looser.\n\nBuild an outfit from texture rather than colour. One shiny piece, two matte ones, and a scent you save for the evening." },
  { id: 8, category: "Music", genre: "Indie", title: "Charity-shop chords", image: songE, date: "September 24, 2026", intro: "Thrifted layers, mismatched prints and the joy of owning the only one.", body: "Indie style was never a look so much as a method: dig until you find something nobody else has, then wear it without apology.\n\nMix a formal piece with a casual one. Let the prints clash. The best find in the room should be the cheapest." },
  { id: 9, category: "Music", genre: "Electronic", title: "Technical fabrics, after hours", image: songF, date: "September 21, 2026", intro: "Nylon, mesh and reflective detail — what the club learned from the laboratory.", body: "Electronic music dressed itself in function: fabrics that hold their shape in the heat, lines cut sharp, and a surface that glows under a strobe.\n\nYou don't need the whole uniform. One technical piece — a shell, a mesh top, sunglasses at two in the morning — is enough to change the signal." },
  { id: 10, category: "Music", genre: "Jazz", title: "Loafers, late sets and a good lapel", image: songD, date: "September 19, 2026", intro: "The easy polish of a player who has done this a thousand times.", body: "Jazz style is quiet confidence. A well-cut jacket, a soft collar, loafers worn without socks or with the best socks in the building.\n\nFit does all the work. Have one thing tailored properly and let the rest of the outfit breathe." },
  { id: 11, category: "Music", genre: "Country", title: "Boots, denim and a well-loved jacket", image: cover, date: "September 17, 2026", intro: "Western hardware has been on every runway for three seasons. Here is how to wear it honestly.", body: "Country dressing is built on things that last: boots you can walk in, denim that fades honestly, a jacket with a story on the lining.\n\nWear one western piece at a time — the boots, the belt buckle, the pearl-snap shirt — and keep everything else plain. It reads as a choice rather than a costume." },
];
type Story = typeof stories[number];
const categories = ["All", "Style", "Music", "Fashion", "Runway"];
const coverWords = ["MUSIC", "STYLE", "\nFASHION", "\nRUNWAYS", "\nPLAYLIST"];
const iconicSongs = [
  { image: kidCudi, alt: "Day 'N' Nite (Crookers Remix) album art by Kid Cudi", caption: "Day 'N' Nite — Kid Cudi", link: "https://open.spotify.com/track/6ouTGbETM7ZdID1eMXZJde" },
  { image: slayyyterDance.url, alt: "DANCE... album art by Slayyyter", caption: "DANCE... — Slayyyter", link: "https://open.spotify.com/track/5rfOARz6QO73wPATyMtQQZ" },
  { image: biaWeOnGo.url, alt: "WE ON GO II album art by BIA", caption: "WE ON GO II — BIA", link: "https://open.spotify.com/track/3LtqBgvHGsaSjYw9NmLkky" },
  { image: nicoleKidman.url, alt: "Nicole Kidman album art by ADÉLA", caption: "Nicole Kidman — ADÉLA", link: "https://open.spotify.com/track/3fuCoVxqdBRd0xBeEivlR4" },
  { image: coverStory.url, alt: "Figure sinking underwater beneath a floating door", caption: "The cover story", tall: true, film: true },
  { image: iKnowWhatYouWant.url, alt: "I Know What You Want album art by Busta Rhymes", caption: "I Know What You Want — Busta Rhymes", link: "https://open.spotify.com/track/0xDxS2g775ttrfrwDQl9f8" },
  { image: fashionWeek.url, alt: "Fashion Week album art by Wale featuring G-Eazy", caption: "Fashion Week — Wale", link: "https://open.spotify.com/track/0Vtvich3vkhne7Pzum3tXF" },
];
type Look = { name: string; note: string; price: string };
const songLooks: Record<string, Look[]> = {
  "Day 'N' Nite — Kid Cudi": [
    { name: "Moon-wash denim jacket", note: "Faded indigo, boxy cut", price: "$148" },
    { name: "Glow-stitch hoodie", note: "Heavyweight fleece, night print", price: "$96" },
    { name: "High-top canvas sneakers", note: "Black, white sole", price: "$70" },
  ],
  "DANCE... — Slayyyter": [
    { name: "Liquid satin slip dress", note: "Cherry red, bias cut", price: "$128" },
    { name: "Patent platform heels", note: "4-inch lift", price: "$115" },
    { name: "Rhinestone hoop set", note: "Three sizes", price: "$42" },
  ],
  "WE ON GO II — BIA": [
    { name: "Cropped leather bomber", note: "Chocolate brown", price: "$210" },
    { name: "Low-rise cargo pants", note: "Stone, tie hem", price: "$88" },
    { name: "Gold chain choker", note: "Chunky curb link", price: "$54" },
  ],
  "Nicole Kidman — ADÉLA": [
    { name: "Ivory column gown", note: "Old-Hollywood drape", price: "$240" },
    { name: "Opera gloves", note: "Satin, elbow length", price: "$48" },
    { name: "Pearl drop earrings", note: "Freshwater pearls", price: "$66" },
  ],
  "The cover story": [
    { name: "Sheer layered tunic", note: "Sea-glass blue", price: "$110" },
    { name: "Oversized knit cardigan", note: "Washed grey", price: "$134" },
    { name: "Silver ear cuff", note: "Hand-hammered", price: "$38" },
  ],
  "I Know What You Want — Busta Rhymes": [
    { name: "Shearling-trim parka", note: "Black nylon", price: "$265" },
    { name: "Velour track set", note: "Burgundy, two-piece", price: "$140" },
    { name: "Wheat work boots", note: "Waterproof leather", price: "$180" },
  ],
  "Fashion Week — Wale": [
    { name: "Double-breasted blazer", note: "Charcoal wool", price: "$295" },
    { name: "Silk camp-collar shirt", note: "Abstract print", price: "$120" },
    { name: "Tinted aviators", note: "Amber lens", price: "$85" },
  ],
};
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
type PhotoCredit = { author: string; source: string; license: string; licenseUrl: string };
type PlaylistPhoto = { image: string; alt: string; width: number; height: number; credit: PhotoCredit };
// Wikimedia Commons photos under CC licences — each one's credit line is required by its licence.
const commons = (file: string, author: string, license: "CC BY 2.0" | "CC BY 4.0" | "CC BY-SA 2.0") => ({
  author,
  source: `https://commons.wikimedia.org/wiki/File:${file}`,
  license,
  licenseUrl: `https://creativecommons.org/licenses/${license.replace("CC ", "").replace(" ", "/").toLowerCase()}/`,
});
const playlist: { feature: PlaylistPhoto & { caption: string }; tracks: { title: string; artist: string; image: string; musician?: PlaylistPhoto }[] } = {
  feature: {
    image: "https://upload.wikimedia.org/wikipedia/commons/c/c7/BillieEilishO2140725-39_-_54665577407_%28cropped%29.jpg",
    alt: "Billie Eilish performing at The O2, London, July 2025", width: 779, height: 1039,
    caption: "The October Mix",
    credit: commons("BillieEilishO2140725-39_-_54665577407_(cropped).jpg", "Raph_PH", "CC BY 4.0"),
  },
  tracks: [
    { title: "Day 'N' Nite", artist: "Kid Cudi", image: kidCudi, musician: {
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Kid_Cudi_2010_2_%28crop%29.jpg/960px-Kid_Cudi_2010_2_%28crop%29.jpg",
      alt: "Kid Cudi in New York City, April 2010", width: 960, height: 1511, credit: commons("Kid_Cudi_2010_2_(crop).jpg", "brinsknaps", "CC BY-SA 2.0") } },
    { title: "DANCE...", artist: "Slayyyter", image: slayyyterDance.url, musician: {
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Slayyyter_%40_Greek_Theatre_10_09_2024_%2854229625185%29_%28cropped%29.jpg/960px-Slayyyter_%40_Greek_Theatre_10_09_2024_%2854229625185%29_%28cropped%29.jpg",
      alt: "Slayyyter performing at the Greek Theatre, October 2024", width: 960, height: 1282, credit: commons("Slayyyter_@_Greek_Theatre_10_09_2024_(54229625185)_(cropped).jpg", "Justin Higuchi", "CC BY 2.0") } },
    { title: "WE ON GO II", artist: "BIA", image: biaWeOnGo.url, musician: {
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Bia_rapper_%28cropped%29.jpg/960px-Bia_rapper_%28cropped%29.jpg",
      alt: "BIA performing on the Dangerous Woman Tour, February 2017", width: 960, height: 1198, credit: commons("Bia_rapper_(cropped).jpg", "Emma", "CC BY-SA 2.0") } },
    { title: "Nicole Kidman", artist: "ADÉLA", image: nicoleKidman.url, musician: {
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/ADELAINNYC.jpg/960px-ADELAINNYC.jpg",
      alt: "ADÉLA performing at Brooklyn Steel, New York, September 2026", width: 960, height: 1280, credit: commons("ADELAINNYC.jpg", "Saturnmondays", "CC BY 4.0") } },
    { title: "CHIHIRO", artist: "Billie Eilish", image: sleeveChihiro },
    { title: "This Is What It Feels Like", artist: "BANKS", image: sleeveBanks },
    { title: "Cranes in the Sky", artist: "Solange", image: sleeveSolange },
    { title: "Blinding Lights", artist: "The Weeknd", image: sleeveWeeknd },
    { title: "360", artist: "Charli XCX", image: charliRockImage },
  ],
};
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
  const photo = useRef<HTMLImageElement>(null);
  const coverRef = useRef<HTMLElement>(null);
  const filmRef = useRef<HTMLElement>(null);
  const journal = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("All");
  const [solid, setSolid] = useState(false);
  const [filmIn, setFilmIn] = useState(false);
  const [filmOnScreen, setFilmOnScreen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [article, setArticle] = useState<Story | null>(null);
  const [quiz, setQuiz] = useState(false);
  const [styleProfile, setStyleProfile] = useState<StyleProfile>(emptyStyleProfile);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_PROFILE_KEY);
      if (saved) { const parsed = styleProfileSchema.safeParse(JSON.parse(saved)); if (parsed.success) setStyleProfile(parsed.data); }
    } catch { /* Unavailable storage leaves the profile empty. */ }
  }, []);
  const saveStyleProfile = (profile: StyleProfile) => {
    try { const validated = styleProfileSchema.parse(profile); localStorage.setItem(STYLE_PROFILE_KEY, JSON.stringify(validated)); setStyleProfile(validated); return true; }
    catch { return false; }
  };
  const clearStyleProfile = () => {
    try { localStorage.removeItem(STYLE_PROFILE_KEY); setStyleProfile(emptyStyleProfile()); return true; }
    catch { return false; }
  };
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
        if (photo.current) photo.current.style.transform = `translateY(${Math.min(y * .18, 170)}px)`;
        // Scroll-linked hero -> film handoff: hero scales back + dims as the film approaches.
        const film = filmRef.current;
        if (film) {
          const p = Math.min(1, Math.max(0, 1 - film.getBoundingClientRect().top / window.innerHeight));
          coverRef.current?.style.setProperty("--cover-out", p.toFixed(3));
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
  const [active, setActive] = useState("cover");
  useEffect(() => {
    const els = ["cover", "film", "iconic", "circles", "journal", "shop", "styling-notes"].map(id => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0 || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e?.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
  const goJournal = (next = "All") => {
    setCategory(next);
    journal.current?.scrollIntoView({ behavior: "smooth" });
  };
  const filtered = stories.filter(s => (category === "All" || s.category === category) && (category !== "Music" || musicGenre === "All genres" || s.genre === musicGenre) && `${s.title} ${s.category} ${s.intro}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="site-frame">
      <header className="masthead" data-solid={solid}>
        <a href="/" aria-label="Melody Lust home" className="brand"><img src={logo.url} alt="" className="brand-mark" width={448} height={209} /></a>
        <span className="edition">An independent<br />fashion journal<br />Vol. 01 — Autumn 2026</span>
      </header>
      <nav className="side-rail" aria-label="Page sections" data-tone={active === "cover" ? "light" : "dark"}>
        <a className="rail-item" href="#cover" data-active={active === "cover"}><span className="rail-rule" /><span className="rail-label">Cover</span></a>
        <Button variant="railCta" asChild className="rail-cta" data-active={active === "film"}><a href="#film"><Play aria-hidden /><span className="rail-label">Music Video</span></a></Button>
        <a className="rail-item" href="#iconic" data-active={active === "iconic"}><span className="rail-rule" /><span className="rail-label">Songs</span></a>
        <a className="rail-item" href="#journal" data-active={active === "journal"}><span className="rail-rule" /><span className="rail-label">Journal</span></a>
        <a className="rail-item" href="#shop" data-active={active === "shop"}><span className="rail-rule" /><span className="rail-label">Shop</span></a>
        <a className="rail-item" href="#circles" data-active={active === "circles"}><span className="rail-rule" /><span className="rail-label">Circles</span></a>
        <a className="rail-item" href="#styling-notes" data-active={active === "styling-notes"}><span className="rail-rule" /><span className="rail-label">Notes</span></a>

      </nav>
      <MobileParallax />
      <ScrollFadeUp />
      <section className="cover" id="cover" ref={coverRef} aria-label="Fashion meets music">
        <a className="cover-anchor" href="#search" aria-label="Open Stylist AI, the music and fashion evidence search engine">
          <span className="cover-slide cover-slide-1">
            <img ref={photo} className="cover-photo cover-photo-runway" src={heroRunway3} alt="Model walking a dim museum runway in a charcoal grey tailored overcoat over a striped sweater vest, a pleated skirt and cropped trousers" width={1200} height={1600} fetchPriority="high" />
          </span>
          <span className="cover-slide cover-slide-2">
            <img className="cover-photo cover-photo-runway" src={heroRunway} alt="Model walking a dark runway in a black-and-white houndstooth tailored overcoat" width={1200} height={1600} loading="lazy" />
          </span>
          <span className="cover-slide cover-slide-3">
            <img className="cover-photo cover-photo-runway" src={heroRunway4} alt="Model walking a dim museum runway in a navy hooded coat with white sleeve stripes over a burgundy sweater vest and a grey pleated skirt" width={1200} height={1600} loading="lazy" />
          </span>
          <span className="cover-gradient" aria-hidden="true" />
        </a>
        <div className="cover-content">
          <nav className="cover-nav" aria-label="Journal categories">
            {categories.slice(1).map(c => <Button key={c} variant="coverNav" className="px-1 h-7" onClick={() => goJournal(c)}>{c}</Button>)}
            <Button variant="coverNav" className="px-1 h-7" onClick={() => { setSearchOpen(true); goJournal(); setTimeout(() => searchInput.current?.focus(), 400); }}><span className="hidden sm:inline">Stylist AI</span><Search className="sm:hidden" aria-label="Stylist AI" /></Button>
          </nav>
          <h1 className="cover-title"><span className="rise-line">YOU KNOW</span><span className="rise-line" style={{ animationDelay: "120ms" }}><span className="cover-word-slot" aria-hidden="true" data-lines={coverWords[coverWord]?.includes("\n") ? 2 : 1}>{coverWords.map((w, i) => { const [a, b] = w.split("\n"); return <span key={w} className="cover-word" data-active={i === coverWord}>YOUR {a}{b ? <><br />{b}</> : null}</span>; })}</span></span><span className="sr-only">YOU KNOW YOUR MUSIC</span></h1>
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
      <section className="journal" ref={journal} id="journal">
        <div className="section-heading"><h2>The latest notes</h2><span className="text-xs uppercase">Fashion. Music. A point of view.</span></div>
        <div className="filter-row">
          <div className="filters" aria-label="Filter stories">{categories.map(c => <Button key={c} variant="category" data-active={category === c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</Button>)}</div>
          <div className="filter-tools">
            {category === "Music" && <Select value={musicGenre} onValueChange={setMusicGenre}>
              <SelectTrigger className="genre-select" aria-label="Filter by genre"><SelectValue placeholder="All genres" /></SelectTrigger>
              <SelectContent>{["All genres", ...genres.map(g => g.name)].map(g => <SelectItem className="genre-option" key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>}
            {searchOpen ? <input ref={searchInput} className="search-input" aria-label="Search stories" placeholder="Search the journal…" value={query} onChange={e => setQuery(e.target.value)} /> : <span className="text-[10px] uppercase text-muted-foreground">The autumn edit / 2026</span>}
          </div>
        </div>
        {category === "Music" && musicGenre !== "All genres" && <p className="genre-pick" key={musicGenre}>{genres.find(g => g.name === musicGenre)?.note}</p>}
        <div className="story-grid">{filtered.slice(0, category === "All" && !query ? 3 : 4).map(s => <article className="story" key={s.id}>
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
          {tumblr.data.posts.length > 0 ? tumblr.data.posts.map(p => <article className="tumblr-card" key={p.id} data-type={p.type}>
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

      <section className="archive" id="archive" aria-label="Archive">
        <h2 className="iconic-title"><span>+ Archive</span></h2>
        <div className="archive-grid">
          {stories.map(s => <article className="archive-card" key={s.id}>
            <a href="#" onClick={e => { e.preventDefault(); setArticle(s); }} aria-label={`Read ${s.title}`}><img src={s.image} alt={s.title} width={1024} height={1280} loading="lazy" /></a>
            <h3>{s.title}</h3>
            <p>{s.intro}</p>
          </article>)}
        </div>
      </section>
      <ShopSection />
      <Wishlist />
      <StylingNotes />
      <GuidedStory />
      <section className="manifesto"><h2>GOOD STYLE.<br />GREAT MUSIC. YOUR RULES.</h2><p>For the clothes you live in. The records you return to. And the moments when the two come together.</p></section>
      <footer className="footer"><a href="/" aria-label="Melody Lust home" className="brand"><img src={logo.url} alt="" className="brand-mark" width={448} height={209} /></a><a className="footer-link" href="#circles">Musician Circles</a><a className="footer-link" href="#styling-notes">Styling Notes</a>{analyticsEnabled() && <button type="button" className="footer-link" onClick={() => setAnalytics("ask")}>Analytics settings</button>}<span className="text-muted-foreground">Independent in style. Always.<br />© 2026 Melody Lust</span></footer>
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
            const pool = [cover, street, songA, songB, songC, songD, songE, songF, coverWide];
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
      <Dialog open={article !== null} onOpenChange={open => { if (!open) setArticle(null); }}><DialogContent className="article-dialog">{article && <><span className="text-xs uppercase text-muted-foreground">{article.category} · {article.genre} / {article.date}</span><DialogTitle className="font-editorial text-4xl font-normal">{article.title}</DialogTitle><DialogDescription>{article.intro}</DialogDescription><img src={article.image} alt={article.title} className="w-full aspect-[4/3] object-cover" width={1024} height={768} />{article.body.split("\n\n").map(p => <p className="article-copy" key={p}>{p}</p>)}</>}</DialogContent></Dialog>
      <StyleProfileQuiz open={quiz} onOpenChange={setQuiz} profile={styleProfile} onSave={saveStyleProfile} onClear={clearStyleProfile} onRead={id => { setQuiz(false); setArticle(stories.find(story => story.id === id) ?? null); }} />
    </main>
  );
}

