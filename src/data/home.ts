import biaWeOnGo from "@/assets/bia-we-on-go.jpg";
import charliRock from "@/assets/charli-rock-music.webp";
import coverStory from "@/assets/cover-story.jpg";
import kidCudi from "@/assets/day-n-nite.jpg";
import fashionWeek from "@/assets/fashion-week.jpg";
import glorillaMeta from "@/assets/glorilla-meta.jpg";
import cover from "@/assets/grunge-cover.jpg";
import coverWide from "@/assets/grunge-cover-wide.jpg";
import iKnowWhatYouWant from "@/assets/i-know-what-you-want.jpg";
import nicoleKidman from "@/assets/nicole-kidman.jpg";
import skuzland from "@/assets/skuzland.jpg";
import slayyyterDance from "@/assets/slayyyter-dance.jpg";
import sleeveBanks from "@/assets/sleeve-banks.jpg";
import sleeveChihiro from "@/assets/sleeve-chihiro.jpg";
import sleeveSolange from "@/assets/sleeve-solange.jpg";
import sleeveWeeknd from "@/assets/sleeve-weeknd.jpg";
import songA from "@/assets/song-a.jpg";
import songB from "@/assets/song-b.jpg";
import songC from "@/assets/song-c.jpg";
import songD from "@/assets/song-d.jpg";
import songE from "@/assets/song-e.jpg";
import songF from "@/assets/song-f.jpg";
import street from "@/assets/street-style.jpg";

// The journal's stories, featured songs, their looks and The October Mix: shared by the
// editorial home page and the listening room so both show the same edit.
export const stories = [
  { id: 12, category: "Music", genre: "Hip-Hop", title: "GloRilla talks tea, hands-free", image: glorillaMeta, date: "October 09, 2026", intro: "Advice is free, but you better be ready to hear the truth. GloRilla handles business in the new Ray-Ban Meta Audio glasses.", body: "GloRilla has never needed a microphone to be heard, but her latest accessory does the talking anyway. In a new post, she handles business hands-free in the Ray-Ban Meta Audio glasses — designed without a camera, so she can talk tea all day.\n\nThe smart glasses moment is having a fashion moment, too. Worn like any good pair of frames, they sit somewhere between statement accessory and everyday tool. If the front row was the place to be seen, the group chat is the place to be heard — and Glo is dressed for both." },

  { id: 1, category: "Music", genre: "Rock", title: "Rock music, not actually rock", image: charliRock, date: "October 09, 2026", intro: "“I think the dance floor is dead, so now we're making rock music.” Charli XCX opens her eighth album with a blazing guitar riff and a joke that is entirely hers.", body: "“I think the dance floor is dead, so now we're making rock music,” Charli XCX declares over a blazing guitar riff on ‘Rock Music’, the lead single from Music, Fashion, Film, her eighth studio album. She released it on 8 May 2026, having recorded it the previous October at Rue Boyer Studios in Paris with A. G. Cook and Finn Keane, who wrote and produced it with her. It runs one minute and fifty-five seconds and reached 36 in the UK.\n\nThe joke belongs to her. She posted studio footage captioned as a video of herself making a song called ‘rock music’ that is not actually rock music, then told British Vogue she enjoyed flipping the form — and that keeping the result from feeling too macho mattered. The video is shot in hard black and white: Charli roaming city streets, smoking beside enormous piles of cigarettes.\n\nThe album's title puts fashion in the room with music and film, and the styling follows. A shaggy faux-fur zip, an unbuttoned shirt, lace underneath, hair slicked back, an eye smoked to the bone. It is the rock uniform worn by someone who read the handbook and doodled in the margins — no leather jacket required. If the dance floor really is dead, she has at least dressed us for the wake." },
  { id: 3, category: "Music", genre: "Rock", title: "Who is Skuzland?", image: skuzland, date: "October 09, 2026", intro: "Jazzelle and Robot Moonjuice built a world out of New York nightlife — and now it makes a noise.", body: "Skuzland is two people: Jazzelle, the model and artist the internet knows as Ugly Worldwide, and Robot Moonjuice, the Harlem-born creative director, songwriter and performance artist. They met at Berlin nightclub in Chicago — Robot in town for his first out-of-state gig, Jazzelle hosting in crutches with a broken foot and, as Robot put it, fully committed to the look.\n\nJazzelle's path runs straight through fashion. A Chicago club kid discovered by photographer Nick Knight, she went on to star in campaigns for Savage X Fenty and Fenty Skin, fronted her own Fenty Beauty collection with Rihanna's brand, and shot for Fendi, Nike and the covers of i-D and Interview — all while insisting beauty stays undefined. Robot made his name in New York's 2010s nightlife, turning fine art and theatre training into fearless, flamboyant performance.\n\nTogether they call the sound experimental techno pop-punk, and they refuse to be referential — as Robot has it, everyone is reheating everyone else's nachos. The debut EP, OTW, arrived on September 18 via Republic Records: seven tracks written entirely by the pair, from the siren howl of POOR CHOICES to the political fury of GiRL AMERiCA. In Skuzland, they say, everyone is welcome — arrive dressed however you like." },
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
export type Story = typeof stories[number];
export const categories = ["All", "Style", "Music", "Fashion", "Runway"];
// `genres` files each song in the shape lexicon (src/lib/genre-shapes.ts), which draws The Autumn Mix's thumbnail.
export const iconicSongs = [
  { image: kidCudi, alt: "Day 'N' Nite (Crookers Remix) album art by Kid Cudi", caption: "Day 'N' Nite — Kid Cudi", link: "https://open.spotify.com/track/6ouTGbETM7ZdID1eMXZJde", genres: ["Electronic", "Hip-Hop"] as const },
  { image: slayyyterDance, alt: "DANCE... album art by Slayyyter", caption: "DANCE... — Slayyyter", link: "https://open.spotify.com/track/5rfOARz6QO73wPATyMtQQZ", genres: ["Pop"] as const },
  { image: biaWeOnGo, alt: "WE ON GO II album art by BIA", caption: "WE ON GO II — BIA", link: "https://open.spotify.com/track/3LtqBgvHGsaSjYw9NmLkky", genres: ["Hip-Hop"] as const },
  { image: nicoleKidman, alt: "Nicole Kidman album art by ADÉLA", caption: "Nicole Kidman — ADÉLA", link: "https://open.spotify.com/track/3fuCoVxqdBRd0xBeEivlR4", genres: ["Pop"] as const },
  { image: coverStory, alt: "Figure sinking underwater beneath a floating door", caption: "The cover story", tall: true, film: true },
  { image: iKnowWhatYouWant, alt: "I Know What You Want album art by Busta Rhymes", caption: "I Know What You Want — Busta Rhymes", link: "https://open.spotify.com/track/0xDxS2g775ttrfrwDQl9f8", genres: ["Hip-Hop", "R&B"] as const },
  { image: fashionWeek, alt: "Fashion Week album art by Wale featuring G-Eazy", caption: "Fashion Week — Wale", link: "https://open.spotify.com/track/0Vtvich3vkhne7Pzum3tXF", genres: ["Hip-Hop"] as const },
];
export type Look = { name: string; note: string; price: string };
export const songLooks: Record<string, Look[]> = {
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
export type PhotoCredit = { author: string; source: string; license: string; licenseUrl: string };
export type PlaylistPhoto = { image: string; alt: string; width: number; height: number; credit: PhotoCredit };
// Wikimedia Commons photos under CC licences — each one's credit line is required by its licence.
const commons = (file: string, author: string, license: "CC BY 2.0" | "CC BY 4.0" | "CC BY-SA 2.0") => ({
  author,
  source: `https://commons.wikimedia.org/wiki/File:${file}`,
  license,
  licenseUrl: `https://creativecommons.org/licenses/${license.replace("CC ", "").replace(" ", "/").toLowerCase()}/`,
});
export const playlist: { feature: PlaylistPhoto & { caption: string }; tracks: { title: string; artist: string; image: string; musician?: PlaylistPhoto }[] } = {
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
    { title: "DANCE...", artist: "Slayyyter", image: slayyyterDance, musician: {
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Slayyyter_%40_Greek_Theatre_10_09_2024_%2854229625185%29_%28cropped%29.jpg/960px-Slayyyter_%40_Greek_Theatre_10_09_2024_%2854229625185%29_%28cropped%29.jpg",
      alt: "Slayyyter performing at the Greek Theatre, October 2024", width: 960, height: 1282, credit: commons("Slayyyter_@_Greek_Theatre_10_09_2024_(54229625185)_(cropped).jpg", "Justin Higuchi", "CC BY 2.0") } },
    { title: "WE ON GO II", artist: "BIA", image: biaWeOnGo, musician: {
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Bia_rapper_%28cropped%29.jpg/960px-Bia_rapper_%28cropped%29.jpg",
      alt: "BIA performing on the Dangerous Woman Tour, February 2017", width: 960, height: 1198, credit: commons("Bia_rapper_(cropped).jpg", "Emma", "CC BY-SA 2.0") } },
    { title: "Nicole Kidman", artist: "ADÉLA", image: nicoleKidman, musician: {
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/ADELAINNYC.jpg/960px-ADELAINNYC.jpg",
      alt: "ADÉLA performing at Brooklyn Steel, New York, September 2026", width: 960, height: 1280, credit: commons("ADELAINNYC.jpg", "Saturnmondays", "CC BY 4.0") } },
    { title: "CHIHIRO", artist: "Billie Eilish", image: sleeveChihiro },
    { title: "This Is What It Feels Like", artist: "BANKS", image: sleeveBanks },
    { title: "Cranes in the Sky", artist: "Solange", image: sleeveSolange },
    { title: "Blinding Lights", artist: "The Weeknd", image: sleeveWeeknd },
    { title: "360", artist: "Charli XCX", image: charliRock },
  ],
};
/** The photos a song's look is styled against, offset by the song's place among the featured songs. */
export const moodPool = [cover, street, songA, songB, songC, songD, songE, songF, coverWide];
