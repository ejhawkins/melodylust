# Handoff: MelodyLust hybrid artist search → songs → Gemini styling → products (2026-10-11)

Work in `~/Documents/Codex/2026-10-10/can-x20/outputs/frame-fashion-muse` (dev: `npm run dev`, http://localhost:5173).
Ground rules from the owner: never print `.env` values; preserve uncommitted work (incl. other sessions' files, `package-lock.json`, `work/`);
don't bulk-approve candidates; don't push/deploy unless asked; don't rewrite pushed history (Lovable). Stop and hand off before 50% of the 5-hour usage limit.

## Done this session (uncommitted; 225 tests pass, `npx tsc --noEmit -p .` clean, `npm run build` passes)
Page order for a searched artist (`src/components/MelodyLustEvidence.tsx`):
1. **Approved articles + designer connections** — ranked by evidence strength first (`evidenceStrength`/`STRENGTH_RANK` in `src/lib/melodylust-evidence.ts`, used in `searchEvidence`), then lift. Each card labelled: verified quote (worn/styled/worked with) · quoted together · contextual (same article only). Test: Charli XCX case in `src/lib/style-search.test.ts`.
   "No approved articles about X yet" status shows first when none.
2. **Live publication search** (`src/components/ScoutedArticles.tsx` → `src/lib/scout.functions.ts` → `src/lib/live-scout.ts`, search in `src/lib/article-scout.server.ts`, shared with `npm run scout`). Saved Supabase candidates are reused for free; otherwise one OpenAI web search (allowed Hearst/intl domains, cited URLs only), saved as **candidate** (never approved). Cache 1 week per artist; 6 new searches/hour/visitor. Verified live: Tate McRae → 8 articles (53 s); Bruno Mars → 7 saved candidates (0.2 s).
3. **Three songs** (`src/components/ArtistSongs.tsx`, `lookupArtistSongs` in `src/lib/freqblog.functions.ts`, `readArtistSongs` in `src/lib/freqblog.ts`): FreqBlog `GET /artist/tracks`, top 3 distinct by popularity, FreqBlog attribution shown. Hidden when the hand-written catalog (`song-recommendations.ts`) already has picks.
4. **Gemini styling + products** (`src/components/AIArtistStyle.tsx`, `src/lib/ai-style.ts`, `src/lib/ai-style.functions.ts`): input = artist, genres, 3 songs, approved articles, quiz preferences. Output validated: "evidence" ideas must quote an exact substring of a named approved article (else dropped); "creative" ideas carry no source. Cache key covers artist/genres/songs/article IDs/preferences (1 day); 20 answers/hour/visitor. Falls back to the rule-based `ArtistOutfitResult` if AI unavailable. Verified live: Charli → 3 ideas, 2 evidence (3.8 s); Tate → 3 creative.
   Products: `ShopProducts` now takes `seed` + `genres`; fetches 8 candidates per piece and picks deterministically via `src/lib/product-pick.ts` (overlap QA test `product-pick.test.ts`: mean cross-artist overlap 0.25 → 0.03). Search terms from `src/lib/outfit-search.ts`.
- Supabase now has 27 approved articles (owner ran `npm run db:articles`, new script `scripts/db-articles.ts`) + candidates.
- `clientKey` moved to `src/lib/client-key.server.ts` (exporting it from a `.functions.ts` file broke the browser bundle).

## Next steps
1. **Approve Supabase candidates** (e.g. `npm run scout -- --approve-db "Tate McRae"` listing candidates for review, approving chosen IDs only). `--approve` today only handles the local CSV.
2. **Product relevance**: "skull scarf" matched an adidas football scarf (only "scarf" matched). Consider requiring the best available word-match tier and showing "closest match" wording, or dropping matches below 2 words for multi-word items. One piece (biker boots) showed no card — check its pool.
3. Genre Mixing Playground (primary/secondary genre, blend slider, example pairs) feeding the same Gemini input; include blend in the cache key.
4. QA metrics report (overlap, duplicate IDs, evidence coverage, latency) from the logs `[AI style]`, `[Scout] live`, `[Products]`.
5. Commit in small steps when the owner asks (files are mixed with other sessions' uncommitted work).

## Update (later on 2026-10-11)
- Committed on branch `melodylust/hybrid-artist-search`: `c9fdfa1` (hybrid search, songs, Gemini styling, products) and `f18ad7d` (genre moodboards + style pills under the Style Matrix). Not pushed.
- GitHub CLI is signed in as **ejhawkins**. No Lovable repo exists in that account yet: the owner is connecting the Lovable project to GitHub (Lovable → GitHub → Connect).
  When the repo URL arrives: add it as `origin`, push this branch, check whether histories are related, then (after owner confirms) merge into `main` with a normal merge commit (`--allow-unrelated-histories` if needed). Never force-push.
- Left uncommitted on purpose: `package-lock.json` (unused @supabase/ssr), `work/`, `data/articles-candidates.csv`.
- Site copy rewrite (numbered 01–05 story) was proposed in chat and is waiting for the owner's edits.
