import biaWeOnGo from "@/assets/bia-we-on-go.jpg";
import charliRock from "@/assets/charli-rock-music.webp";
import coverStory from "@/assets/cover-story.jpg";
import dayNNite from "@/assets/day-n-nite.jpg";
import fashionWeek from "@/assets/fashion-week.jpg";
import glorillaMeta from "@/assets/glorilla-meta.jpg";
import iKnowWhatYouWant from "@/assets/i-know-what-you-want.jpg";
import kaliAlbum from "@/assets/kali-album.jpg";
import editorialPick1 from "@/assets/editorial-pick-1.jpg";
import skuzland from "@/assets/skuzland.jpg";
import slayyyterDance from "@/assets/slayyyter-dance.jpg";

/**
 * Musician Circles demonstration dataset.
 *
 * IMPORTANT: this is a clearly labeled demonstration dataset. Portraits are
 * placeholder images already in the project (not the artists' own photos),
 * and every documented connection must carry a real, public source link.
 * Shared genres alone never imply a relationship — the UI labels those
 * matches "Suggested discovery".
 */

export interface ArtistConnection {
  /** id of the related musician */
  toId: string;
  /** short label shown under the related musician's portrait, e.g. "Produced" */
  label: string;
  /** filterable connection type */
  type: "Recorded together" | "Produced" | "Featured on" | "Documented scene";
  /** short explanation supporting the connection */
  explanation: string;
  sourceLabel: string;
  sourceUrl: string;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  genres: string[];
  scene: string;
  era: string;
  location: string;
  intro: string;
  songs: { title: string; year: string }[];
  connections: ArtistConnection[];
}

export const CONNECTION_TYPES = ["Recorded together", "Produced", "Featured on", "Documented scene"] as const;

export const ARTISTS: Artist[] = [
  {
    id: "bowie",
    name: "David Bowie",
    image: coverStory,
    genres: ["Glam rock", "Art rock", "Pop"],
    scene: "Glam / art rock",
    era: "1970s–80s",
    location: "London",
    intro:
      "Demonstration entry — a chameleon of pop who moved through glam, art rock and dance music, and whose collaborations rewired the circles he touched.",
    songs: [
      { title: "Life on Mars?", year: "1971" },
      { title: "\"Heroes\"", year: "1977" },
      { title: "Ashes to Ashes", year: "1980" },
      { title: "Let's Dance", year: "1983" },
    ],
    connections: [
      {
        toId: "eno",
        label: "Recorded together",
        type: "Recorded together",
        explanation: "Eno co-wrote and performed on Bowie's Berlin albums Low, \"Heroes\" and Lodger (1977–79).",
        sourceLabel: "Wikipedia — Low (David Bowie album)",
        sourceUrl: "https://en.wikipedia.org/wiki/Low_(David_Bowie_album)",
      },
      {
        toId: "iggy",
        label: "Produced",
        type: "Produced",
        explanation: "Bowie produced The Idiot and Lust for Life (1977) and co-wrote \"China Girl\" with Iggy Pop.",
        sourceLabel: "Wikipedia — Lust for Life (album)",
        sourceUrl: "https://en.wikipedia.org/wiki/Lust_for_Life_(album)",
      },
      {
        toId: "rodgers",
        label: "Produced",
        type: "Produced",
        explanation: "Nile Rodgers produced Bowie's Let's Dance (1983), his biggest-selling album.",
        sourceLabel: "Wikipedia — Let's Dance (David Bowie album)",
        sourceUrl: "https://en.wikipedia.org/wiki/Let%27s_Dance_(David_Bowie_album)",
      },
    ],
  },
  {
    id: "eno",
    name: "Brian Eno",
    image: iKnowWhatYouWant,
    genres: ["Electronic", "Ambient", "Art rock"],
    scene: "Ambient / studio innovation",
    era: "1970s–80s",
    location: "London",
    intro:
      "Demonstration entry — a former Roxy Music member who turned the studio into an instrument and quietly shaped four decades of pop and ambient music.",
    songs: [
      { title: "An Ending (Ascent)", year: "1983" },
      { title: "By This River", year: "1977" },
      { title: "1/1", year: "1978" },
    ],
    connections: [
      {
        toId: "bowie",
        label: "Recorded together",
        type: "Recorded together",
        explanation: "Eno co-wrote and performed on Bowie's Berlin albums Low, \"Heroes\" and Lodger (1977–79).",
        sourceLabel: "Wikipedia — Low (David Bowie album)",
        sourceUrl: "https://en.wikipedia.org/wiki/Low_(David_Bowie_album)",
      },
    ],
  },
  {
    id: "iggy",
    name: "Iggy Pop",
    image: skuzland,
    genres: ["Proto-punk", "Punk rock"],
    scene: "Punk's first wave",
    era: "1970s–80s",
    location: "Detroit",
    intro:
      "Demonstration entry — frontman of The Stooges and godfather of punk, whose late-70s Berlin records paired him with David Bowie.",
    songs: [
      { title: "Lust for Life", year: "1977" },
      { title: "The Passenger", year: "1977" },
      { title: "Search and Destroy", year: "1973" },
    ],
    connections: [
      {
        toId: "bowie",
        label: "Produced",
        type: "Produced",
        explanation: "Bowie produced The Idiot and Lust for Life (1977) and co-wrote \"China Girl\" with Iggy Pop.",
        sourceLabel: "Wikipedia — Lust for Life (album)",
        sourceUrl: "https://en.wikipedia.org/wiki/Lust_for_Life_(album)",
      },
      {
        toId: "harry",
        label: "Recorded together",
        type: "Recorded together",
        explanation: "Iggy Pop and Debbie Harry recorded the duet \"Well, Did You Evah!\" for the Red Hot + Blue AIDS-benefit album (1990).",
        sourceLabel: "Wikipedia — Red Hot + Blue",
        sourceUrl: "https://en.wikipedia.org/wiki/Red_Hot_%2B_Blue",
      },
    ],
  },
  {
    id: "harry",
    name: "Debbie Harry",
    image: slayyyterDance,
    genres: ["Punk rock", "New wave", "Pop"],
    scene: "New York new wave",
    era: "1970s–80s",
    location: "New York",
    intro:
      "Demonstration entry — Blondie's frontwoman, who carried downtown New York's punk scene onto the pop charts and into the fashion pages.",
    songs: [
      { title: "Heart of Glass", year: "1979" },
      { title: "Atomic", year: "1980" },
      { title: "Call Me", year: "1980" },
    ],
    connections: [
      {
        toId: "iggy",
        label: "Recorded together",
        type: "Recorded together",
        explanation: "Iggy Pop and Debbie Harry recorded the duet \"Well, Did You Evah!\" for the Red Hot + Blue AIDS-benefit album (1990).",
        sourceLabel: "Wikipedia — Red Hot + Blue",
        sourceUrl: "https://en.wikipedia.org/wiki/Red_Hot_%2B_Blue",
      },
    ],
  },
  {
    id: "jones",
    name: "Grace Jones",
    image: fashionWeek,
    genres: ["Disco", "Electronic", "Soul"],
    scene: "Disco / club futurism",
    era: "1970s–80s",
    location: "New York",
    intro:
      "Demonstration entry — a model, club icon and disco futurist whose Jean-Paul Goude imagery and androgynous disco redefined fashion-music crossover.",
    songs: [
      { title: "Pull Up to the Bumper", year: "1981" },
      { title: "Slave to the Rhythm", year: "1985" },
      { title: "I've Seen That Face Before", year: "1981" },
    ],
    connections: [
      {
        toId: "rodgers",
        label: "Produced",
        type: "Produced",
        explanation: "Nile Rodgers produced Grace Jones's Inside Story album (1986).",
        sourceLabel: "Wikipedia — Inside Story (Grace Jones album)",
        sourceUrl: "https://en.wikipedia.org/wiki/Inside_Story_(album)",
      },
    ],
  },
  {
    id: "rodgers",
    name: "Nile Rodgers",
    image: editorialPick1,
    genres: ["Funk", "Disco", "Soul"],
    scene: "Chic / dance-floor funk",
    era: "1970s–80s",
    location: "New York",
    intro:
      "Demonstration entry — Chic's guitarist turned hit producer for Bowie, Grace Jones, Madonna and Duran Duran; the common denominator of the dance floor.",
    songs: [
      { title: "Le Freak", year: "1978" },
      { title: "Good Times", year: "1979" },
    ],
    connections: [
      {
        toId: "bowie",
        label: "Produced",
        type: "Produced",
        explanation: "Nile Rodgers produced Bowie's Let's Dance (1983), his biggest-selling album.",
        sourceLabel: "Wikipedia — Let's Dance (David Bowie album)",
        sourceUrl: "https://en.wikipedia.org/wiki/Let%27s_Dance_(David_Bowie_album)",
      },
      {
        toId: "jones",
        label: "Produced",
        type: "Produced",
        explanation: "Nile Rodgers produced Grace Jones's Inside Story album (1986).",
        sourceLabel: "Wikipedia — Inside Story (Grace Jones album)",
        sourceUrl: "https://en.wikipedia.org/wiki/Inside_Story_(album)",
      },
    ],
  },
  {
    id: "solange",
    name: "Solange",
    image: biaWeOnGo,
    genres: ["R&B", "Soul", "Neo-soul"],
    scene: "Independent R&B",
    era: "2010s",
    location: "Houston",
    intro:
      "Demonstration entry — a singer, songwriter and curator whose A Seat at the Table and Saint Heron turned R&B into an editorial art form.",
    songs: [
      { title: "Losing You", year: "2012" },
      { title: "Cranes in the Sky", year: "2016" },
      { title: "Almeda", year: "2019" },
    ],
    connections: [
      {
        toId: "hynes",
        label: "Co-wrote",
        type: "Recorded together",
        explanation: "Dev Hynes co-wrote and produced most of Solange's True EP, including \"Losing You\" (2012).",
        sourceLabel: "Wikipedia — True (Solange EP)",
        sourceUrl: "https://en.wikipedia.org/wiki/True_(Solange_EP)",
      },
    ],
  },
  {
    id: "hynes",
    name: "Dev Hynes",
    image: dayNNite,
    genres: ["R&B", "Electronic", "Neo-soul"],
    scene: "Blood Orange / alt-R&B",
    era: "2010s",
    location: "New York",
    intro:
      "Demonstration entry — Blood Orange's architect, a writer and producer whose fingerprints are all over independent R&B's last decade.",
    songs: [
      { title: "You're Not Good Enough", year: "2013" },
      { title: "Charlene", year: "2018" },
    ],
    connections: [
      {
        toId: "solange",
        label: "Co-wrote",
        type: "Recorded together",
        explanation: "Dev Hynes co-wrote and produced most of Solange's True EP, including \"Losing You\" (2012).",
        sourceLabel: "Wikipedia — True (Solange EP)",
        sourceUrl: "https://en.wikipedia.org/wiki/True_(Solange_EP)",
      },
      {
        toId: "twigs",
        label: "Produced",
        type: "Produced",
        explanation: "Dev Hynes is credited as a co-producer on \"Hours\" from FKA twigs' LP1 (2014).",
        sourceLabel: "Wikipedia — LP1 (FKA twigs album)",
        sourceUrl: "https://en.wikipedia.org/wiki/LP1_(FKA_twigs_album)",
      },
    ],
  },
  {
    id: "twigs",
    name: "FKA twigs",
    image: glorillaMeta,
    genres: ["Art pop", "Electronic"],
    scene: "Experimental pop",
    era: "2010s",
    location: "London",
    intro:
      "Demonstration entry — a dancer-turned-auteur whose LP1 fused club music, avant-pop and fashion imagery into one of the 2010s' defining debuts.",
    songs: [
      { title: "Two Weeks", year: "2014" },
      { title: "Cellophane", year: "2019" },
    ],
    connections: [
      {
        toId: "hynes",
        label: "Produced",
        type: "Produced",
        explanation: "Dev Hynes is credited as a co-producer on \"Hours\" from FKA twigs' LP1 (2014).",
        sourceLabel: "Wikipedia — LP1 (FKA twigs album)",
        sourceUrl: "https://en.wikipedia.org/wiki/LP1_(FKA_twigs_album)",
      },
    ],
  },
  {
    id: "tyler",
    name: "Tyler, the Creator",
    image: charliRock,
    genres: ["Hip-hop", "Neo-soul"],
    scene: "Independent hip-hop",
    era: "2010s",
    location: "Los Angeles",
    intro:
      "Demonstration entry — an auteur rapper-producer whose Flower Boy and Igor folded neo-soul and orchestral pop into rap's mainstream.",
    songs: [
      { title: "See You Again", year: "2017" },
      { title: "EARFQUAKE", year: "2019" },
    ],
    connections: [
      {
        toId: "kali",
        label: "Featured on",
        type: "Featured on",
        explanation: "Kali Uchis sings the hook on \"See You Again\" from Tyler's Flower Boy (2017).",
        sourceLabel: "Wikipedia — Flower Boy",
        sourceUrl: "https://en.wikipedia.org/wiki/Flower_Boy",
      },
    ],
  },
  {
    id: "kali",
    name: "Kali Uchis",
    image: kaliAlbum,
    genres: ["R&B", "Neo-soul"],
    scene: "Alt-R&B",
    era: "2010s",
    location: "Los Angeles",
    intro:
      "Demonstration entry — a Colombian-American singer whose dreamy R&B bridges Spanish-language pop and Los Angeles soul.",
    songs: [
      { title: "Telepatía", year: "2020" },
      { title: "After the Storm", year: "2018" },
    ],
    connections: [
      {
        toId: "tyler",
        label: "Featured on",
        type: "Featured on",
        explanation: "Kali Uchis sings the hook on \"See You Again\" from Tyler's Flower Boy (2017).",
        sourceLabel: "Wikipedia — Flower Boy",
        sourceUrl: "https://en.wikipedia.org/wiki/Flower_Boy",
      },
    ],
  },
];

export function artistById(id: string): Artist | undefined {
  return ARTISTS.find(a => a.id === id);
}

/** Musicians who share at least one genre — labelled "Suggested discovery", never a documented relationship. */
export function suggestedFor(artist: Artist): Artist[] {
  return ARTISTS.filter(
    a => a.id !== artist.id && a.genres.some(g => artist.genres.includes(g)),
  );
}

/** Artists related to the given one through a documented connection, with the label for the pairing. */
export function relatedFor(artist: Artist): { artist: Artist; connection: ArtistConnection }[] {
  return artist.connections
    .map(c => ({ artist: artistById(c.toId), connection: c }))
    .filter((x): x is { artist: Artist; connection: ArtistConnection } => Boolean(x.artist));
}
