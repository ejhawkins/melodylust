# Course: Building a Fashion-and-Music Personalization Agent

*Melody Lust Learning Track · Self-paced · About 2 hours · Level: Intermediate*

A course in the spirit of IBM SkillsBuild: short modules, clear learning objectives, hands-on labs and a knowledge
check at the end of each module. It teaches what Melody Lust's style personalization does and the process used to build
it, on the branch `feature/ai-style-personalization` (draft PR ejhawkins/melodylust#15).

---

## Course overview

**What you will build.** A visitor tells Melody Lust their taste, through a room style and a quick style quiz. The site
then acts on it. The room changes its look. Song order follows a style's setlist. And a **Runway inspiration** panel
suggests runway shows, designers and playlists. Every suggestion traces back to a fashion designer's show soundtrack,
with sources cited.

**Who it is for.** Developers and editors working on Melody Lust, and anyone learning how to add personalization to a
content site without accounts, without inventing facts, and without breaking production.

**Prerequisites**
- Reading TypeScript and React components.
- Running the repo locally: Node 24, `npm run dev`, `npx vitest run`.
- Knowing that this repo syncs with Lovable, so pushed history is never rewritten.

**Learning objectives.** By the end of this course you will be able to:
1. Explain the **suggest-then-approve** agent pattern and why every suggestion roots back to a cited runway soundtrack.
2. Describe how a **room style** becomes CSS variables, and why remapping the base palette re-themes every component.
3. Build a loader whose progress comes from **real readiness**, not a timer.
4. Pass a style into an **AI step** as constraints, while keeping the exact-quote, approved-only and fallback rules.
5. Apply the **tag method**: tags in one shared vocabulary, labelled as either read off the show or our interpretation.
6. Ship safely, with a feature flag, small commits, a draft PR, tests, browser checks and a one-step rollback.

**Course map**

| Module | Topic | Time |
|---|---|---|
| 1 | The idea: a personalization agent rooted in runway soundtracks | 10 min |
| 2 | Room styles: from a theme spec to CSS variables | 20 min |
| 3 | A loader driven by real readiness | 15 min |
| 4 | Styling the AI step without loosening its rules | 20 min |
| 5 | The tag method | 20 min |
| 6 | Runway inspiration: designers, runways and playlists | 20 min |
| 7 | Testing and verification | 15 min |
| 8 | Shipping safely | 10 min |

---

## Module 1 · The idea

### Learning objectives
- State what the personalization agent does for a visitor.
- Name the two rules every suggestion follows.

### Key concepts
**A personalization agent** acts on a visitor's taste. In Melody Lust the visitor gives their taste in two ways:
- a **room style** (Autumn Tartan, a runway season, or Hip Hop x Runway, a music genre);
- the **style quiz** (music genres, aesthetic, season, houses and more, saved only on their device).

**Rule 1: suggest, then approve.** The agent proposes and the visitor decides. A playlist is saved only when the visitor
taps **Save to my library**. Nothing is bought, posted or saved automatically.

**Rule 2: root everything in the runway.** Every show, designer and song the agent suggests traces back to a designer's
show soundtrack, with sources cited. Recommendations from listening habits come later, once this foundation exists.

### How the requirements were set
The work began as a written spec, and decisions were made with the product owner before coding:
- **Base branch.** Branch from `main` and connect to the in-flight listening room (PR #12) through small adapters only.
- **Where the style picker lives.** It started in the room's top bar and on `/listen`. After review it was taken out of
  the top bar and kept on `/listen`.
- **What the loader waits for.** Content, fonts, and the Spotify player only when the room uses it.
- **How the agent behaves.** Suggest, visitor approves.
- **How taste is captured.** Taste is eclectic, so a tag cloud of genres and styles replaced a single pick.

### Knowledge check
1. A visitor finishes the quiz. Does the agent save a playlist for them?
2. Why is a show with no source on file left out of the suggestions?

<details><summary>Answers</summary>

1. No. It suggests playlists, and one is saved only when the visitor taps **Save to my library**.
2. Every suggestion has to trace back to a cited soundtrack. A show without a source can't show where its music came from.
</details>

---

## Module 2 · Room styles: from a theme spec to CSS variables

### Learning objectives
- Read a theme spec.
- Explain why remapping the base palette, not individual components, re-themes the room.
- Persist a choice in the URL, with local storage as the fallback.

### Key concepts
**A theme spec** (`src/lib/themes/theme-spec.ts`) describes a style as data:
- **Palette:** ink, surface, accent, highlight and text.
- **Texture:** tartan, chrome, knit or concrete.
- **Type and motion:** fonts and how lively the animation is.
- **Copy tone.**
- **Content rules:** genres, garment keywords and the minimum evidence strength.
- **A four-song setlist** (opener, walk-out, mid, closer) drawn from the song catalogue.

**The CSS-variable layer** (`src/lib/themes/theme-css.ts`) turns a theme into custom properties set on the room's root
(`.ls[data-room-style]`).

**Lesson learned: remap the palette, not three tokens.** The first version changed only three tokens, and the room looked
almost the same. The room is built on one palette: the fig tones, chalk-white and acid-lime. `roomPalette()` now maps
that whole palette, plus the solid "paper" buttons, to each theme, so panels, text, borders and buttons all follow.

**Readability is tested.** `themeTextPairs()` lists every text and background pair a theme draws. A test requires each
pair to reach WCAG AA, a contrast ratio of 4.5:1.

**Where the choice is kept** (`src/lib/themes/style-choice.ts`):
- The URL `?style=hiphop-runway` comes first, so a link can be shared.
- Local storage (`ml-room-style-v1`) is the fallback.
- `?style=none` clears the choice.
- The older `?theme=` parameter is still read.

### Hands-on lab
1. Put `VITE_ENABLE_AI_STYLE_PERSONALIZATION=true` and `VITE_ENABLE_SPOTIFY_LISTENING_ROOM=true` in `.env.local`. Never
   put them in `.env`.
2. Open `/?style=autumn-tartan`. You should see burgundy panels with tartan between them, cream text and amber buttons.
3. Open `/?style=hiphop-runway`. You should see graphite panels, silver borders and amber accents.
4. In DevTools, read `--color-fig-950` on `.ls`. It should equal the theme's `surface`.

### Knowledge check
1. Why set the theme on the room's base palette rather than restyling each component?
2. Which wins, `?style=` or local storage?

<details><summary>Answers</summary>

1. Every component already reads the palette, so one change re-themes them all and nothing is missed.
2. The URL. Local storage is the fallback.
</details>

---

## Module 3 · A loader driven by real readiness

### Learning objectives
- Weight loading steps and report real progress.
- Make sure a stalled step can never hang the page.

### Key concepts
`src/lib/themes/readiness.ts` tracks real steps, each with a weight:

| Step | Weight | When it is included |
|---|---|---|
| Content: the setlist is resolved and the page has loaded | 2 | Always |
| Fonts: `document.fonts.ready` | 1 | Always |
| Player: the Spotify SDK reports ready | 2 | Only when the room is on and a player has registered |

- **Failures still count.** A step that fails still settles, so the bar reaches 100% and the room falls back to silence
  mode.
- **Nothing hangs.** Every step is capped at 8 seconds, so a font or player that never settles can't block the page.
- **Integration seam.** The listening room plugs in its player through `registerPlayerReadiness(fn)`.
- **The animation shows progress.** The loader draws a record and tonearm, and a belt threading through a buckle whose
  strap grows with progress.

**Lesson learned:** the loader's status text was first drawn in the theme's accent colour, which was invisible on
burgundy. It now uses the highlight colour, and that pairing is covered by the contrast test.

### Knowledge check
1. The Spotify SDK never loads. What does the visitor see?

<details><summary>Answer</summary>

The bar reaches 100% after the 8-second cap and the room offers silence mode. The page never hangs.
</details>

---

## Module 4 · Styling the AI step without loosening its rules

### Learning objectives
- Pass a style to the AI as constraints the server controls.
- Keep every existing safety rule in place.

### Key concepts
- **What the browser sends.** It sends only the style's **id**, such as `hiphop-runway`. The server expands it into the
  theme's tone, garment keywords and genres (`aiStylePayload`), so a visitor can't write their own constraints into
  the prompt.
- **What stays the same:**
  - AI ideas may quote approved articles only, word for word. An idea whose quote isn't an exact match is dropped.
  - If the AI is unavailable, the rule-based outfit is shown instead.
  - The limit of 20 requests an hour and the 1-day cache still apply. The style id is part of the cache key, so each
    style is cached separately. Without a style, the key is unchanged.
- **Spotify policy guardrail.** A test (`ai-spotify-import-guard.test.ts`) walks every import from the AI files. It fails
  if any of them imports a Spotify module, calls a Spotify data endpoint, or sends Spotify content to the model. Songs
  reach the AI only as entries from Melody Lust's own catalogue.

### Knowledge check
1. Why send `hiphop-runway` instead of the theme's tone and keywords?
2. Can a visitor's Spotify Liked Songs be fed to the AI to personalize it?

<details><summary>Answers</summary>

1. So the server controls what the prompt says, and a client can't change it.
2. No. Spotify's policy forbids feeding its data into AI models, and the guard test enforces it.
</details>

---

## Module 5 · The tag method

### Learning objectives
- Tag runway shows in one shared vocabulary.
- Keep facts apart from interpretation.

### Key concepts
**One vocabulary.** Tags use the style quiz's own options (`src/lib/style-profile.ts`):
- **Music:** R&B, Hip-hop, Pop, Rock, Electronic, Jazz, Indie, Country.
- **Aesthetic:** Romantic, Minimalist, Preppy.
- **Season:** Spring / summer, Fall / winter.
- **House:** Prada, Chanel, Simone Rocha.

A test fails if a show is tagged with anything outside this list, so the quiz and the tags can't drift apart.

**Two kinds of tag.** The page labels each one.

| Kind | Examples | Where it comes from |
|---|---|---|
| Read off the show | Fall / winter, Prada | The show's season and house |
| Our read | Rock, Preppy | Melody Lust's interpretation: genre per artist (`ARTIST_GENRES`), aesthetic per show (`SHOW_AESTHETICS`) |

**Eclectic by design**
- A song can carry several genres. Britney Spears with BFRND, for example, counts as both Pop and Electronic.
- A visitor can pick as many tags as they like.
- Shows that share more of the visitor's tags rank higher.

**Honest gaps.** Artists outside the quiz's genres (Wagner, Thomas Tallis, a gospel choir) are left untagged rather
than forced into a genre.

### Hands-on lab: add a tag
1. In `src/lib/runway-inspiration.ts`, add an artist to `ARTIST_GENRES` using quiz values only.
2. Run `npx vitest run src/lib/runway-inspiration.test.ts`. The vocabulary test checks your values.
3. In the room, select that genre in the tag cloud and check that the show appears.

### Knowledge check
1. Is "Preppy" on Thom Browne Fall/Winter 2017 a fact or an interpretation? How does the page show it?

<details><summary>Answer</summary>

An interpretation. The page labels it "our read".
</details>

---

## Module 6 · Runway inspiration: designers, runways and playlists

### Learning objectives
- Follow the flow from the quiz to the suggestions.
- Credit images and cite sources properly.

### Key concepts
**The flow**
1. The visitor saves the style quiz.
2. The room opens the Style profile view.
3. The **Runway inspiration** panel appears, built by `src/components/RunwayInspiration.tsx` with its logic in
   `src/lib/runway-inspiration.ts`.

**What the panel shows**
1. **Tag cloud.** It starts with the visitor's quiz picks. Toggling a chip refines the results without changing the
   saved profile.
2. **Designers for your profile.** Each designer is listed with the shows and tags that brought them in, beside a
   portrait. Portraits come from a curated list first, then from Wikipedia's free lead photo with its Commons credit and
   licence (`getDesignerPortraits`), and otherwise an initial.
3. **Runways to inspire.** The matched shows appear with their songs, their tags and **Sources:** links. A source seen
   only in search results is marked "(excerpt)".
4. **Stacked playlists.** First "Your runway mix", then one playlist per tag that has at least two songs. Every song comes
   from the matched shows' soundtracks. **Save to my library** writes the playlist to the visitor's device library.

**Where sources come from**
- A runway note's own reviews.
- For sampler tracks, the sampler's article.
- A show with no source on file is left out.

**Images.** Runway photos are linked, never copied. Portraits always show who took them and under which licence.

### Knowledge check
1. Why is there no hip hop playlist yet for a visitor who picked Hip-hop?

<details><summary>Answer</summary>

Only one sourced hip hop runway song is on file (Mos Def at Wales Bonner AW24), and a playlist needs at least two. Adding
more sourced runway songs is how it grows.
</details>

---

## Module 7 · Testing and verification

### Learning objectives
- Test pure logic without credentials.
- Prove the behaviour in a real browser.

### Key concepts
**Pure modules first.** Logic sits in browser-safe modules that are tested on their own, with no API keys:
- `theme-css`
- `style-choice`
- `readiness`
- `style-evidence`
- `runway-inspiration`

**Tests that guard the rules**
- **Contrast:** every theme's text and background pairs reach WCAG AA.
- **Vocabulary:** every tag is a quiz option.
- **Sources:** every suggested show has at least one source.
- **Playlists:** every playlist song comes from a runway soundtrack.
- **Spotify policy:** no Spotify module or data on the AI path.
- **Flag off:** with the flag off, no style is sent and nothing changes.

**Browser checks**
- Take the real quiz, then confirm the panel, the portraits and their credits, the sources, and that saving a playlist
  writes it to the library.
- Check the layout at desktop width and at 375 px, with no horizontal overflow.
- Confirm the tag chips report `aria-pressed` and work from the keyboard.
- Check the console for errors.

**Testing on an iPad.** The dev server must listen on `0.0.0.0`. Open `http://<Mac's Wi-Fi IP>:<port>` on the iPad, not
`localhost`, which there means the iPad itself.

**Commands**
```bash
npx tsc --noEmit -p .
```
```bash
VITE_ENABLE_AI_STYLE_PERSONALIZATION= VITE_ENABLE_SPOTIFY_LISTENING_ROOM= npx vitest run
```
```bash
npx vite build
```
Run the tests with the flags unset, as above. Otherwise `.env.local` turns them on and the "flag off" tests fail.

---

## Module 8 · Shipping safely

### Learning objectives
- Ship behind a flag, with a rollback.
- Respect the repo's Lovable sync rules.

### Key concepts
- **Feature flag.** Everything sits behind `VITE_ENABLE_AI_STYLE_PERSONALIZATION`, which is off by default. With the flag
  off, production and the AI cache keys are unchanged.
- **Branch discipline:**
  - Work on a feature branch. Never commit to `main`.
  - Make small commits, one concern each.
  - Open a **draft** PR with what changed, how to test, risks and rollback.
  - Never force-push or rewrite pushed history, because Lovable syncs it.
- **Secrets.** Never print or commit `.env`. Local switches go in `.env.local`, and only placeholder names go in
  `.env.example`.
- **Rollback.** Turn the flag off, or `git revert` the merge. There are no migrations and no data to undo.

### Knowledge check
1. The feature misbehaves in production. What is the fastest safe rollback?

<details><summary>Answer</summary>

Set `VITE_ENABLE_AI_STYLE_PERSONALIZATION=false` (the default) and redeploy. Or revert the merge commit.
</details>

---

## Final lab: add a new room style

1. Add a theme to `ROOM_THEMES` in `theme-spec.ts`. Give it a palette, texture, type, tone, content rules, and a setlist
   of songs that exist in `songCatalog`.
2. Run the tests:
   - The contrast tests must pass for its palette.
   - The readiness test resolves its setlist.
3. Open `/?style=<your-id>` and `/listen?style=<your-id>`, and check the room, the loader and the setlist.
4. Commit with a one-concern message on a feature branch.

## Completion checklist

- [ ] I can explain suggest-then-approve and why everything roots back to a cited runway soundtrack.
- [ ] I re-themed the room through the palette and confirmed the contrast tests.
- [ ] I can say what the loader waits for and why it never hangs.
- [ ] I know what the AI step receives with a style, and what it never receives.
- [ ] I added a tag in the quiz vocabulary and saw it in Runway inspiration.
- [ ] I ran the type check, the tests and the build, and checked the page in a browser.
- [ ] I shipped on a branch behind the flag, with a draft PR and a rollback plan.

## Glossary

- **Room style.** A theme that sets the room's look, tone and setlist.
- **Style profile.** The visitor's quiz answers, saved only on their device.
- **Tag.** A value from the quiz vocabulary attached to a show, either read off the show or our read.
- **Our read.** Melody Lust's interpretation, labelled as such and kept apart from sources.
- **Source.** A review or article that places a song at a show.
- **Suggest-then-approve.** The agent proposes; the visitor's tap is the only thing that saves.

## Further reading in this repo

- `docs/ai-style-personalization.md`: the reference doc for the feature, its guardrails and rollback.
- `src/lib/themes/README.md`: how to write a theme spec.
