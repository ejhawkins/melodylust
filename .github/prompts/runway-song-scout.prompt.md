---
description: Build a Gemini song scout that finds more runway show songs by designer, for Runway Songs
---

# Runway song scout: more runway songs, found with Gemini

Read `AGENTS.md` first and follow it. Work on a new branch and open a pull request. Never force-push, rebase or amend pushed commits: the repo syncs with Lovable.

## Where things stand

Runway Songs (`/runway-songs`) plays the songs that runway shows used. Each song has a show (house, season, year), the show's creative directors and up to five Tagwalk look links.

- **Built-in songs.** `src/lib/runway-sampler.ts` holds `SAMPLER_TRACKS`, and every track there cites a source (`SAMPLER_SOURCES`). `src/lib/runway-songs.ts` holds `SHOWS` and `DESIGNERS`. The categories and their tempo ranges are `RUNWAY_CATEGORIES`, and `bandFit` checks a BPM against them. In one line each:
  - A: Industrial
  - B: Electro-pulse
  - C: Post-punk
  - D: Spatial
- **New songs** are entered by hand in Contentful. The content model is `scripts/contentful/runway-music-archive.cjs`, with three types: `runwayDesigner`, `runwayShow` and `runwaySong`. The site reads published songs through `src/lib/runway-archive.functions.ts`, which calls `src/lib/runway-archive.ts`.
- **Precedent to copy:** the article scout. It is `npm run scout`, made of `scripts/scout-articles.ts`, `src/lib/article-scout.ts` and `src/lib/article-scout.server.ts`. It works like this:
  - A web search proposes candidates.
  - Only URLs the search itself returned can become candidates.
  - The candidates go to a review CSV, and a person decides.
  - `SCOUT_DOMAINS` already lists the Hearst titles.
- **Gemini** is already wired in `src/lib/ai/read-json.server.ts`, using `@ai-sdk/google` with `GEMINI_API_KEY` and `MELODYLUST_AI_MODEL` from `.env`.

## What to build

`npm run song-scout -- "<designer or house>"` searches news, magazines and social posts for songs that designer's shows used. It writes candidates to `data/runway-song-candidates.csv`. I'll review that file and type the songs I keep into Contentful myself. **The scout never writes to Contentful.**

1. **`src/lib/song-scout.ts`** (pure, browser-safe, unit-tested). It holds:
   - the prompt
   - the domain lists
   - a zod schema for the model's JSON
   - the rules that turn a reply into candidate rows
   - de-duplication against `SAMPLER_TRACKS` and the rows already in the candidates file, by artist plus title, ignoring case and punctuation
   - the CSV row shape

   Reuse `canonicalUrl`, `parseScoutJson` and `stripCitations` from `article-scout.ts` rather than copying them.

2. **`src/lib/song-scout.server.ts`** runs Gemini with Google Search grounding through `@ai-sdk/google`. Check the installed version's docs for the Google Search tool and for where grounding sources come back.
   - The caller passes the key in.
   - Return the model's JSON plus every URL the grounding returned.
   - Grounding URLs arrive as `vertexaisearch.cloud.google.com/grounding-api-redirect/…` redirects. Resolve each one to its final URL before you check its domain.

3. **`scripts/scout-songs.ts`** plus a `song-scout` script in `package.json`, modelled on `scout`: `node --env-file-if-exists=.env scripts/scout-songs.ts`.
   - Run one designer per invocation, with at most 10 candidates.
   - Print a short summary: how many were kept, and how many were rejected, with the reason for each.

## Where to look

- **Fashion press:**
  - vogue.com (including Vogue Runway)
  - the Hearst titles in `SCOUT_DOMAINS`: harpersbazaar.com, elle.com, esquire.com, townandcountrymag.com, cosmopolitan.com and their international editions
  - wwd.com, businessoffashion.com, dazeddigital.com, i-d.co, anothermag.com, highsnobiety.com, hypebeast.com
- **Music press:** pitchfork.com, billboard.com, nme.com, mixmag.net, residentadvisor.net
- **Show soundtrack designers'** interviews, for example Michel Gaubert and Frédéric Sanchez.
- **Social media:** only posts that the grounded search returns, from the house, the artist or the show's sound designer. Don't scrape Instagram, TikTok or X directly.
  - A social post can be a lead, and can be the evidence when it is the house's or the artist's own account.
  - A fan post is never evidence on its own.

## Evidence rules

Gemini proposes; sources decide.

- Every candidate needs at least one evidence URL that the grounding returned, from an allowed domain or an official account.
- Never keep a URL the model wrote itself.
- Fetch each evidence page and check that it names the song title. Accented and plain letters count as the same. If the page names the title, mark the row `verified`; if not, drop it.
- If the page can't be fetched (paywall, bot block), keep the row but mark it `unverified`, so I know to check it by hand.
- Record a quote of 15 words or fewer that names the song. Never store article text beyond that quote.
- Say when the show used an edit, remix or version made for it, and what it was. The sampler's `versionNote` is the model to follow.

## CSV columns, matching the Contentful fields

| Column | Contents |
|---|---|
| Designer | Who designed the show |
| House | The fashion house |
| Show | e.g. Prada SS21 Womenswear |
| Season | e.g. Spring/Summer |
| Year | e.g. 2021 |
| Line | woman, man, couture or resort |
| Title | Song title |
| Version | The show edit or remix, if any |
| Artist | Who made the song |
| Category | Only a suggestion, A to D, with the reason |
| BPM | If a source states it |
| Spotify | Track link if the search found one, otherwise blank |
| Evidence URL(s) | The verified source pages |
| Publication | Where the evidence was published |
| Quote | 15 words or fewer, naming the song |
| Status | `verified` or `unverified` |
| Note | Anything else worth knowing |

## Designers to try first

Start with the archive's own designers: Miuccia Prada, Raf Simons, Jonathan Anderson, Demna and Hedi Slimane. Then try Rick Owens, Dries Van Noten, Nicolas Ghesquière, Alessandro Michele, Pierpaolo Piccioli, Matthieu Blazy, Simone Rocha, Martine Rose, Grace Wales Bonner and Anthony Vaccarello.

Search by designer, not by house, because designers move between houses.

## Rules

- Keys stay in `.env` and are read inside the handler or script, and never logged. Don't write any key into a file.
- No UI changes. No Contentful writes.
- Don't touch files the scout doesn't need.
- Match the surrounding code style and its comment density.
- Tests go in `src/lib/song-scout.test.ts`. Use fixture model replies and fixture page HTML, with no network. Cover:
  - parsing
  - de-duplication
  - dropping model-written URLs
  - resolving redirect URLs
  - the `verified` / `unverified` rule
  - the quote length limit

## Done when

- `npm test`, `npm run typecheck` and `npm run lint` pass.
- `npm run song-scout -- "Rick Owens"`, with `GEMINI_API_KEY` set, writes verified candidate rows with real evidence links to `data/runway-song-candidates.csv`.
- The pull request explains how to run it and how to review the file.
