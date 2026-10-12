# Gemini prompt: build the Sound × Style engine (backend)

Paste the prompt below into Gemini with the listed files attached. It builds the pure logic behind the Sound × Style quiz flow. UI work comes after it.

````text
You are a senior backend engineer on Melody Lust, a music × fashion journal. The stack is TanStack Start on Vite, TypeScript (strict), zod and vitest. Supabase is provided by Lovable Cloud. Build the "Sound × Style engine": pure TypeScript modules that place a quiz-taker in one music bucket and one style bucket, and choose only in-season looks, earliest trends first.

ATTACHED FILES (read all of them before writing code)
- AGENTS.md: the project rules. Follow them.
- src/lib/style-profile.ts: quiz vocabulary, STYLE_GENRES, the profile schema, the storage key ml-style-profile-v1
- src/lib/style-nets.ts and data/style-nets.csv: the editors' style nets and their checker
- src/lib/style-search.ts: parseEditorialCsv, which reads the article tracker
- src/lib/song-recommendations.ts: recommendSongs, which already matches the quiz's music genres
- src/components/StyleMatrix.tsx: the moodboards and their style tags (read only)
- data/articles-tracker.csv: dated articles. Published At is the date every trend stage comes from.

BUILD
1. src/lib/trend-window.ts
   - seasonOf(date): February to July → SS + yy. August to December → AW + yy. January → AW of the previous year.
   - fashionCalendar(today, hemisphere = 'north'): returns { inStore, latestRunway, next }.
     - SS collections show September to October of the year before and are in stores January to June.
     - AW collections show February to March and are in stores July to December.
     - In the southern hemisphere, swap inStore between SS and AW.
     - For 2026-10-12 (north) it must return inStore 'AW26', latestRunway 'SS27', next 'AW27'.
   - trendStage(articleDates, today): returns 'new-to-us' | 'dated' | 'early' | 'now' | 'staple'. Check the rules in this order:
     a. Fewer than 3 dates → 'new-to-us'.
     b. Coverage in the last 90 days is 50% or less of the 90 days before (with the earlier window non-empty), or there are no dates in the last 12 months → 'dated'.
     c. First date within the last 6 months, and the last 90 days have more dates than the 90 before → 'early'.
     d. First date 6 to 18 months ago, and the last 90 days have at least as many dates as the 90 before → 'now'.
     e. Otherwise → 'staple'.
2. src/lib/taste-pairing.ts
   - scorePairing({ answers, nets, artistGenres, today }) returns { sound, soundRunnerUp, style, styleRunnerUp, confidence, needsTieBreak, blend }.
   - Sound points: a genre chip adds 3. An artist pick adds 2 to each genre listed in artistGenres[artistId]. A free-text artist or song match adds 1 to that song's genre.
   - Style points: a this-or-that pick adds 3 to each of its two style tags. A tie-break pick adds 3 to the chosen style. A fine-tune chip adds 1 to every style whose nets, in the reader's window, contain that value (case-insensitive). The reader's top sound adds 1 to every style whose nets contain a music_genre row for it. The season chip adds 0; it only sets the window.
   - confidence = (leader − runner-up) ÷ total style points, or 0 when there are no points.
   - needsTieBreak is confidence < 0.2 with no tie-break answered yet.
   - blend is true when a tie-break was answered and confidence is still below 0.2.
   - Break exact ties in STYLE_GENRES order (and profileFields music order for sound), so results are deterministic.
   - looksInWindow({ boards, nets, trackerDates, today, readerSeason }): keeps boards whose season is the reader's in-store season or the latest runway season, attaches each board's stage, drops 'dated', and sorts early, now, staple, new-to-us, then by the board's original order.
3. src/lib/style-profile.ts (extend it, don't break it)
   - Add pairingSchema: { sound, style, runnerUp, confidence, chosenBy: 'quiz' | 'reader' }, and a v2 profile (the v1 fields plus pairing) under the key ml-style-profile-v2.
   - Add upgradeProfile(v1, nets, today), which works out a pairing from the old answers. It returns style null when there are no style votes.
   - Keep everything that exists now: its exports, signatures and the v1 key.

CONSTRAINTS
- Pure and browser-safe. No network, no storage, no process.env. Never call Date.now() or new Date() without arguments inside the modules; take `today` as a parameter.
- Validate inputs with zod where they cross a boundary (stored profiles, CSV rows).
- No new dependencies. Don't edit UI components, routes or server functions.
- Never invent evidence. A board's stage comes only from tracker dates linked through style-net evidence_ids.
- Match the house style: single quotes, compact functions, a short comment only where the reason isn't obvious, and plain-English error messages.

TESTS (vitest, one file per module, starting with `// @vitest-environment node`)
- Fixed dates only, so a test never depends on the day it runs.
- fashionCalendar: 2026-10-12 north → AW26 / SS27 / AW27. Also 2026-03-01, 2026-01-15, and the southern hemisphere.
- trendStage: one case for each stage, and the boundary days at exactly 90 days, 6 months and 18 months.
- scorePairing: this fixture must give sound Indie, style Grunge, styleRunnerUp Y2K, confidence 6/27 ≈ 0.222, needsTieBreak false:
  - genres Indie and Rock; this-or-that picks: suede board (Grunge, Quiet Luxury) twice, off-duty (Y2K, Grunge) once, lace (Soft Glam, Y2K) once; fine-tune Oversized and Fringe.
  - Fixture nets: Grunge has fit Oversized, detail Fringe and music_genre Rock. No other style has any of those three.
  - artistGenres is empty.
  - Expected style points: Grunge 12, Quiet Luxury 6, Y2K 6, Soft Glam 3, Afrofuturist 0. Quiet Luxury and Y2K tie on points, and the tie-break order puts Y2K first as runner-up.
- Also test a tie that triggers needsTieBreak, a blend after a tie-break, no style votes, and looksInWindow dropping a dated board.
- One test loads the real data/articles-tracker.csv and data/style-nets.csv and checks the engine runs without throwing.

OUTPUT
1. The full contents of each new or changed file, each in its own code block headed by its path.
2. A short list of the assumptions you made. Don't make silent choices.
3. If the rules above contradict each other or the attached code, say where and stop. Don't guess.
````

## Check Gemini's work

```sh
npx vitest run src/lib
npx tsc --noEmit
```

Review the diff before committing. The branch syncs to Lovable when it's pushed.
