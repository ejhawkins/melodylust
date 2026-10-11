# Handoff: MelodyLust artist search with autocomplete + artist submissions

Continue building the artist search feature in this project. Work in:
`/Users/ericahawkins/Documents/Codex/2026-10-10/can-x20/outputs/frame-fashion-muse`
(TanStack Start + Vite + React, Supabase, Vitest. Dev server: `npm run dev` → http://localhost:5173).

## Ground rules
- Read `AGENTS.md` first and follow it (server functions in `src/lib/*.functions.ts` with credentials read inside the handler; payload→UI mapping in a plain sibling module with unit tests; design tokens in `src/styles.css`; shared `Button` component).
- **Never print, paste or commit `.env` values or any credential.** To check a key exists, count lines (`grep -c '^NAME=.' .env`), never echo values.
- Don't rewrite pushed git history (Lovable-connected project). Commit in small steps with clear messages.
- Preserve unrelated uncommitted work: `package-lock.json` (adds unused `@supabase/ssr`) and `work/debug-index.mjs` were left by someone else — don't commit or delete them without asking.
- `scripts/dev.mjs` fully restarts the servers whenever `.env` / `.env.local` changes (a running server can't pick up changed env values). After env edits, wait for "[dev] .env changed: restarting…".
- Finding an artist establishes identity only. Never derive fashion evidence or recommendation scores from artist records.

## The brief (from the product owner)
Artist search field with autocomplete and an artist submission option, using the existing framework, database and design system.
- Suggestions after ≥2 characters; ~300 ms debounce; cancel outdated requests; older responses never replace newer results.
- Search the approved artist database first, then the external provider.
- Suggestions show name + identifying details (genre/image/disambiguation) to separate same-name artists.
- Selecting populates the field and stores a stable artist ID with the display name.
- Keyboard: arrows, Enter selects, Escape closes; accessible labels; works on mobile.
- No results: show **“No artists found for ‘[query]’.”** + button **“Submit an artist.”** → compact form, searched name prefilled; artist name + one official artist/music profile URL required; optional note. Check existing artists and pending submissions first. Save as **pending** (never add to approved artists). Confirm: **“Thanks! Your artist submission is pending review.”**
- Reliability: distinguish no-matches vs loading vs connection error vs provider unavailable; credentials server-side; validate inputs; rate-limit search and submit; basic spam protection; preserve source identifiers + provenance for external records.

## Verified provider facts (FreqBlog) — do not invent endpoints
- Official API: `https://api.freqblog.com`, OpenAPI "Music Metadata API" 1.5.0 (`/openapi.json`, docs at `/docs`). Auth header `X-Api-Key`.
- `GET /search?q=&limit=` (limit ≤ 50) returns **track stubs**, not artists: `{ q, count, results: [{ itunes_track_id, track_name, artist_name, album_name?, genre?, release_date?, mbid? (recording), isrc?, popularity?, … }] }`. **No artist ID, no artist image.** Also exists: `GET /artist/tracks?artist=`, `GET /related-artists?artist=`.
- Plans: every tier includes API access. The owner is subscribing to **Hobbyist** (£9.99/mo, 15,000 requests/month).
- Terms §6.1 (paid plans only): may cache and display returned values in-app (incl. paid products); must credit **“Audio analysis by FreqBlog”** somewhere findable (about/credits); no redistribution as an API/feed/export/dataset; on cancellation, delete cached FreqBlog data within 90 days. Free tier is NOT covered by the caching consent.
- Sources: https://freqblog.com, https://api.freqblog.com/docs, https://freqblog.com/terms.html

## Done (committed, d312ffc) — all tests pass (141), `npx tsc --noEmit -p .` clean
- `supabase/migrations/20261011120000_artists.sql` — `artists` (UUID id, name, normalized_name, disambiguation, genres[], image_url, country, status approved|hidden, source, source_id, source_url, provenance jsonb, unique(source, source_id)) and `artist_submissions` (pending|approved|rejected|duplicate, profile_url, profile_host, note, submitter_hash; unique partial indexes = one pending per normalized name and per profile URL). RLS on, no public policies. **Not yet run in Supabase** — the owner pastes it into Supabase → SQL Editor → Run (project ref `ditnpwkdptipozyxibem`). Earlier, a partial paste created a broken table; check columns afterwards via the REST OpenAPI (`GET $SUPABASE_URL/rest/v1/` with the secret key) before relying on it.
- `src/lib/artist-search.ts` — types (`ArtistSuggestion`, `SelectedArtist`, `ArtistSearchResponse`, `SubmissionResponse`), `normalizeArtistName`, `artistQuerySchema`, `mergeSuggestions` (DB first, prefix matches first; provider records with an approved artist's name are dropped), `checkProfileUrl` (public https only), `submissionInputSchema` (name, profileUrl, note, honeypot `website`, `startedAt`), `looksLikeSpam` (honeypot, < 2.5 s fill, > 24 h, link-stuffing).
- `src/lib/artist-provider.ts` — `readFreqblogArtists(payload, query, fetchedAt)` (groups stubs by primary artist, filters names by typed-word prefixes, disambiguation = sample track + year, provenance = endpoint/query/fetchedAt/itunesTrackIds/attribution; id `freqblog:<encoded name>`), `primaryArtist`, `nameMatchesQuery`, `FREQBLOG_ATTRIBUTION`, **`MOCK_ARTISTS` (fictional, labelled “Mock data, not a real artist”)** and `searchMockArtists`.
- `src/lib/artist-provider.server.ts` — `searchProvider(query)` by `ARTIST_PROVIDER` = `freqblog` | `mock` | unset; 4 s timeout; never throws (failures → `unavailable`, logged server-side).
- `src/lib/artist-submit.server.ts` — `submitArtistWith(db, data, submitterHash, now)`: spam → silent `created`; invalid URL/name; `unavailable` without DB; duplicate approved artist (name or source_url) → `duplicate_artist`; pending (name or URL) → `duplicate_pending`; insert pending; unique-violation 23505 → `duplicate_pending`.
- `src/lib/artists.functions.ts` — `searchArtists` (rate limit 60/min/client; DB + provider in parallel; `error` only if both fail) and `submitArtist` (rate limit 5/hour/client; delegates to `submitArtistWith`). Client key = salted SHA-256 of IP (`RATE_LIMIT_SALT`).
- `src/lib/rate-limit.ts` — in-memory sliding window (per instance; note this limitation).
- `src/lib/use-artist-suggestions.ts` + test — debounce/abort/stale-response logic with injected search fn (3 passing tests: debounce one request, stale answer ignored + previous request aborted, error/rate-limit vs empty).

## Remaining steps
1. **Tests** (Vitest, no network/credentials):
   - `artist-search.test.ts`: normalizeArtistName, mergeSuggestions ordering/dedupe, checkProfileUrl (http, private hosts, credentials in URL), looksLikeSpam, submissionInputSchema.
   - `artist-provider.test.ts`: readFreqblogArtists with a payload shaped exactly like the documented SearchResponse (grouping "X feat. Y", filtering track/album-only matches, disambiguation, provenance, missing fields); mock search.
   - `artist-submit.server.test.ts`: fake `db.from()` chain (`select/eq/or/limit` and `insert`) covering created, duplicate_artist, duplicate_pending (existing pending), 23505 race, DB error → `error`, no DB → `unavailable`, spam → `created` with **no insert**.
   - `artist-provider.server.test.ts`: provider failure (fetch reject, 401/429/500, timeout) → `unavailable`; unset → `not_configured`; mock → `mock`. Stub `fetch` and env with `vi.stubEnv`.
   - `rate-limit.test.ts` with an injected clock.
2. **`src/components/ArtistSearch.tsx`** — ARIA 1.2 combobox: `<label>`, `input role="combobox" aria-expanded aria-controls aria-activedescendant aria-autocomplete="list"`, `ul role="listbox"`, options `role="option" aria-selected`. ArrowUp/Down move, Enter selects, Escape closes (and clears active option), click/tap selects (use `onMouseDown` preventDefault so blur doesn't close first), 16px input font on mobile, ≥44px targets. Each option: name, genres, disambiguation, image if present, and a small source badge — **“Mock data”** for `mock`, “via FreqBlog” for `freqblog`. Status line with `role="status"`: loading “Searching artists…”, error “We couldn’t reach artist search. Check your connection and try again.”, offline, rate limited “Too many searches — wait a moment.”, provider unavailable note “Our music directory is unavailable right now, so results may be incomplete.” (only when it matters), empty → **“No artists found for ‘[query]’.”** + **“Submit an artist.”**. Use `useServerFn(searchArtists)` and pass `{ data: { query }, signal }` (TanStack server fns accept `signal`). Selecting sets the input text and calls `onSelect({ id, name, source })`; expose hidden inputs `artist_id` / `artist_name` for forms. Submission form: name (prefilled), official profile URL (type=url, required), optional note (≤500), hidden honeypot `website` (off-screen, `tabIndex={-1}`, `autoComplete="off"`), `startedAt` set when the form opens; map each `SubmissionResponse` to a clear message; success shows exactly **“Thanks! Your artist submission is pending review.”** Show FreqBlog attribution text (`FREQBLOG_ATTRIBUTION`) near results when any FreqBlog suggestion is shown, or in a credits area.
3. **Integrate** into `src/components/StyleProfileQuiz.tsx` (“Favorite artists or songs”): add the ArtistSearch above the existing free-text field; store picks in the profile — add `artistPicks: z.array(z.object({ id: z.string().max(200), name: z.string().max(120), source: z.string().max(20) })).max(10).default([])` to `styleProfileSchema` in `src/lib/style-profile.ts` (existing saved profiles must still parse; update `profileSelectionCount` and the summary view; picks removable). Run the style-profile tests.
4. **Env examples** — append to `.env.example` (no real values): `ARTIST_PROVIDER=` (`freqblog` | `mock` | empty), `FREQBLOG_API_KEY=`, `SUPABASE_URL=`, `SUPABASE_PUBLISHABLE_KEY=`, `SUPABASE_SECRET_KEY=`, `RATE_LIMIT_SALT=`. Extend `scripts/db-check.ts` to include `artists` and `artist_submissions`.
5. **Verify** after the owner runs the migration: `npm run db:check`; with `ARTIST_PROVIDER=mock`, type “ve” in the quiz field → see two same-name “Velvet Static” mocks distinguished by genre and labelled Mock data; select with keyboard; search “zzqx” → no-results message → submit → pending confirmation; submit again → duplicate message; check the row in `artist_submissions` is `pending` and nothing was added to `artists`. Then with `ARTIST_PROVIDER=freqblog` (Hobbyist key in `.env`), type “ush” → FreqBlog Usher suggestion with sample track. Simulate provider failure (e.g. temporarily invalid key) → provider-unavailable note, DB results still shown. Check phone width (no horizontal scroll) and VoiceOver labels.
6. Run `npx vitest run`, `npx tsc --noEmit -p .`, `npm run build`; commit; report what was verified, what is mock, and the remaining integration step.

## Remaining integration step to state in the report
FreqBlog can't supply artist IDs or images, so FreqBlog suggestions are identified by FreqBlog's artist-name string (kept as source_id with provenance). For true stable identities across same-name artists, a reviewer should promote chosen artists into `artists` (with source/source_id/provenance), or add an identity provider with artist IDs (e.g. MusicBrainz artist MBIDs) — verify that provider's API and terms first.

## Also pending (separate)
A reminder fires at 11:43 AM (Oct 11) about two "luxury" decisions: rewording the empty-search message in `MelodyLustEvidence.tsx`, and luxury-first ranking for “Shop the article” in `farfetch.ts` / `products.functions.ts`.
