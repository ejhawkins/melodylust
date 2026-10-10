# MelodyLust — evidence-first replacement

We index influence; we don’t declare taste.

## Current Search Workflow

The public search now accepts an artist, song or genre name without upload, indexing, raw-text or manual-association controls. `searchTrackedEditorialEvidence` reads the server-owned `data/articles-tracker.csv`, a copy of the supplied Articles Tracker spreadsheet. Set `MELODYLUST_TRACKER_CSV` to a server-local CSV path to use an updated tracker without editing the bundled copy. Only valid complete CSV batches are indexed; the AI-extracted corpus is revalidated and cached in server memory until CSV contents change or the server restarts. The first search indexes the tracker; merely opening the page makes no AI request. A music API is not required, and absent song/genre evidence is never replaced with an artist.

Development terminal logs prefixed `[MelodyLust]` report tracker counts/timing and association inputs/results. Set `MELODYLUST_DEBUG=1` to enable these in production. Public-page reading and cited-summary/styling server functions remain available for backend tests, with count-only diagnostics; their testing forms are removed. Neither credentials nor full article bodies are logged. Search uses CSV metadata, not automatically fetched article bodies or externally verified music metadata. The existing standalone association API remains unchanged.

The sections below record the original implementation and its historical validation, not the current public UI.

The previous AI outfit-writing form has been replaced in the local source by a manual editorial-evidence importer and designer × music association measurement. Existing site imagery, editorial picks, quiz and wishlist presentation remain. Quiz preferences do not enter the association mathematics.

## Working circuit

Import a reviewed version 1 JSON corpus → validate source metadata, literal entity mentions, copied quotes and references → select designer and music entity → deduplicate source documents → count mentions and overlap → calculate expected overlap and lift → show evidence level, sources and observations.

Expected = designer-document count × music-document count / eligible-document count.
Lift = observed / expected, or null when expected is zero.
Every eligible document, including zero-hit documents, belongs in the denominator. A filtered corpus measures that subset only. The import limit is 2,000 documents / 2,000 entities / 10,000 observations; the pure engine is also tested against the 100,000-document architecture example. No affinity percentage or desirability index is invented.

## Try it

Use Node 24 and run `npm run test:melodylust` without installing dependencies. All nine engine tests pass. In the restored site, open Load editorial evidence and paste `examples/melodylust-synthetic-corpus.json`. Select Designer A and Artist A, then Measure association. Two documents, one overlap, expected 0.5, lift 2×. This fixture is expressly synthetic and is not loaded automatically or presented as Hearst evidence.

## Entity and evidence model

Designer and Product are separate objects. `designer_id` joins them; collection records contain designer, season and year. `enrichProduct` verifies those links and returns the objects together. There is no designer index in this implementation.

Artist, Song, Genre and Subculture are distinct entity kinds. The UI measures exactly the selected entity. `resolveMusicEvidence` optionally accepts an explicitly supplied fallback chain and returns requested and matched entity IDs with fallback_used, evidence_level and song_specific. It does not infer parent relationships. Counts are article-level presence counts, not numbers of repeated phrases. Corpus import does not create cultural truth beyond the supplied evidence.

Observation records retain relationship, verbatim quote, field, article section and proximity. The metadata-only reader accepts headline, summary and category sections; it rejects invented lede/body/caption positions. Broader article structures are modeled for future approved source access. Proximity and location are visible evidence annotations; they do not secretly change the raw lift baseline. Multiple quotes cannot increase an article-level overlap count.

## Optional reader and retrieval boundary

`src/lib/melodylust.functions.ts` exposes `extractEditorialEvidence`: a validated server function reading one metadata record using the existing server-only Responses helper. It has not been connected to the manual-import UI or verified against live credentials. It returns missing-connection status when LOVABLE_API_KEY is absent. The LLM extracts entities and observations; it outputs no scores. Model output is revalidated and must preserve the original document metadata. All API credentials stay server-side.

Automatic Hearst retrieval is not connected. No article bodies are fetched, no partnership access is assumed, and no real Hearst corpus is included. Approved RSS metadata or manually supplied metadata is the intended input boundary. Spotify identification/discovery/playback handoff remains downstream and is not connected. Runway ingestion and catalog retrieval remain external data boundaries; product joins exist as a pure validated model, not a fake catalog.

## Validation and limitations

Nine dependency-free Node tests cover the review-sheet 3× calculation; zero-hit documents; duplicate URLs; zero denominators; explicit hierarchy fallback; fabricated quotes/references/song attribution; unsafe links/version handling; genre evidence; product and temporal collection joins.

Dependencies installed successfully. Static TypeScript checking passed. All 24 tests in the three existing pure-library Vitest suites passed, along with 10 MelodyLust tests including a live HTTP test. The full Vite build was attempted and failed because 16 referenced binary image files are absent from this source export. Browser layout remains unverified. Restore binary assets and environment configuration from the full original export, install dependencies using the existing lockfile on your computer, then run build and browser checks before merging. The text source snapshot includes 123 exported original files; credentials and binaries remain excluded. Changes exist only in the downloadable copy and have not been synced or deployed to Lovable.

## Parking lot

Collaborative filtering, distributional semantics, multimodal runway AI, complex personalization, LLM-generated affinity scores, giant knowledge-graph dashboards, daily-retention mechanics and fancy frontend behavior remain parked. Lift is the first measurement. No new intelligence layer is required for this test.

## Standalone backend server

On Node 24, run `npm run start:melodylust` without installing packages. This starts a local API at http://127.0.0.1:3000. GET /health verifies readiness. POST /api/association accepts {corpus, designer_id, music_id, fallback_ids?}; corpus is the same validated version 1 evidence JSON. The optional fallback chain must be supplied explicitly. Requests are bounded to 2 MB. No evidence is stored and no external APIs are called. This local development server is not publicly deployed. Ten tests, including a live HTTP round trip, now pass via `npm run test:melodylust`.
