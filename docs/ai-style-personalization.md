# AI style personalization (room styles)

A reader picks a **style**, either a runway season (Autumn Tartan) or a music genre (Hip Hop x Runway), and the room adapts:
- **Look:** palette, texture, type and motion.
- **Copy:** tone and labels.
- **Evidence:** which approved articles are surfaced.
- **Ideas:** the AI outfit and product ideas.
- **Songs:** the order of the song picks.

The first persona is the runway hip hop lover (Hip Hop x Runway).

Everything is behind `VITE_ENABLE_AI_STYLE_PERSONALIZATION` (off by default). With it off, nothing changes: no picker, no style applied, no style sent to the AI step.

## How styles work

`src/lib/themes/theme-spec.ts` (`RoomTheme`, `ROOM_THEMES`) is the single source of truth. Each theme has:
- palette, texture, type and loader motion;
- copy: tone, the Silence/Listening labels, the enter button and loading captions;
- content filters: genres, garment keywords, `evidenceStrengthMin`, `approvedOnly: true`;
- a four-slot setlist (opener, walk-out, mid, closer) of `catalogKey` entries from `songCatalog`.

| Piece | Where | What it does |
| --- | --- | --- |
| Choice | `src/lib/themes/style-choice.ts` | `?style=` in the URL (shareable; `/listen`'s `?theme=` still works), else local storage (`ml-room-style-v1`), else none. `?style=none` restores the default look. No accounts or profile records. |
| Look | `src/lib/themes/theme-css.ts` | A theme becomes CSS variables (`--room-*`) and re-points the room's `--ls-ink`, `--ls-paper` and `--color-acid-lime`, so existing components follow. No AI call. Every text/background pair is tested at WCAG AA (4.5:1). Motion is skipped for readers who ask for reduced motion. |
| Picker | `src/components/StylePicker.tsx` | "Room style" in the room's top bar (an icon on phones), and on `/listen`. A native radio group, so arrow keys, Space and Esc work. The checked option and the button's name show the current style. |
| Loader | `src/lib/themes/readiness.ts`, `RoomLoader.tsx`, `ListeningRoomPage.tsx` | Progress comes from real readiness, never a timer. Content (setlist resolved, page assets loaded) counts 2, fonts count 1, and the Spotify player counts 2 when the listening room is on and has registered its SDK "ready" signal. A step that fails or stalls (8 s) still settles, so the loader never hangs. The record and tonearm drop when ready; a leather belt threads through a silver buckle as progress. |
| Evidence | `src/lib/themes/style-evidence.ts` | Drops approved articles below the theme's `evidenceStrengthMin` (Hip Hop x Runway needs a quote tying the artist to a designer; Autumn Tartan takes context too). Then orders stronger evidence first, then articles naming the theme's garments. Nothing is added. |
| Songs | `songsForStyle`, `resolveSetlist` | The setlist comes from the theme spec, never the model. Song picks put setlist songs first, in slot order, then the theme's genres. `/listen` shows the setlist. |

**Blends later.** `StyleSelection` has an unused `secondary` field. `styleKey` returns the theme id alone for one style, so adding blends won't change today's cache keys.

## AI constraints (the Gemini styling step)

- **Input.** The request carries only the theme **id** (`style`, validated against `ROOM_THEMES`). On the server, `aiStylePayload` swaps it for the spec's tone, garment keywords and genres, so a request can't supply its own constraints.
- **The prompt.** The style shapes choice, order and voice only. It is never evidence, never makes an idea `basis: "evidence"`, and never permits inventing a designer, quote, source, song or fact.
- **Unchanged rules:**
  - approved articles only;
  - every "evidence" idea must quote an exact substring of a named approved article, or it's dropped;
  - "creative" ideas carry no source;
  - output is validated;
  - the rule-based `ArtistOutfitResult` shows when AI is unavailable.
- **Cache key.** It now includes the theme id. Without a style, the key is exactly what it was before. The limit is still 20 answers an hour per visitor, with a 1-day cache.
- **Semantic search (PR #13), once merged.** Its server-side merge can add approved articles the style filter never saw. Pass the style into that merge so retrieval-only articles are skipped when the theme's minimum is above `contextual`. That's a one-line follow-up on whichever PR merges second.

## Spotify guardrail

Spotify's Developer Policy forbids using Spotify Platform data or Spotify Content to train, or ingest into, an AI/ML model.
- **What reaches the AI.** Songs reach it only as catalog titles (`songCatalog`, by `catalogKey`) or FreqBlog titles, never from Spotify responses. Theme files hold no Spotify data.
- **Spotify's role.** It's used for playback only, through the listening room.
- **`src/lib/themes/ai-spotify-import-guard.test.ts`** walks the import graph of the AI styling path. That path is the prompt builder, the server function, the client that builds the request, and the style modules. The test fails if:
  - any module there is a Spotify module;
  - any module calls a Spotify data endpoint;
  - the payload carries a Spotify link or ID.

  Temporarily importing `spotify-track.functions` into `style-evidence.ts` makes it fail, which shows the check works.

## Listening room (PR #12)

`roomLabels(theme)` gives the theme's Silence label, Listening label and enter button: "Backstage", "Walk-out" and "Enter the walk-out" for Hip Hop x Runway. With no style, it gives the defaults. When PR #12 merges:
- its `ListenRoomSwitch` reads `roomLabels(useStyleChoice().theme)` in place of its fixed labels;
- its player calls `registerPlayerReadiness(() => sdkReady)` so the loader waits for the SDK.

Its mode machine, its `VITE_ENABLE_SPOTIFY_LISTENING_ROOM` flag (off by default) and its fallbacks don't change. Neither does its invite-only notice with the waitlist, under any theme. The cap is 5 allowlisted accounts in Spotify's development mode.

## Adding a theme

1. Add the id to `ThemeId` and create the `RoomTheme` in `theme-spec.ts`. Register it in `ROOM_THEMES`.
2. Pick four `songCatalog` songs for opener, walk-out, mid and closer, each with a one-line `why`. `theme-spec.test.ts` fails on an unknown `catalogKey`.
3. Choose palette colours that pass `theme-css.test.ts`: every text pair needs at least 4.5:1.
4. It then appears in the picker automatically, and the AI step accepts its id.

## Env vars (names only)

- `VITE_ENABLE_AI_STYLE_PERSONALIZATION`: `"true"` turns styles on. Off by default. Set it in `.env.local` locally, or in Vercel's environment variables. Not in `.env`, which git tracks.
- `VITE_ENABLE_SPOTIFY_LISTENING_ROOM`: the existing listening-room flag; `/listen` needs it.
- The AI step uses the existing `MELODYLUST_AI_PROVIDER` and `GEMINI_API_KEY`. Nothing new.

## Tests

- `style-choice.test.ts`: the URL first then storage, `none`, the shareable URL, blend-ready keys, the flag, and the picker state persisting.
- `theme-css.test.ts`: CSS variables per theme and WCAG AA pairs.
- `StylePicker.test.tsx`: native radios, the current style checked, and the button naming it.
- `readiness.test.ts`: weighted real steps, failures settling, the player step only when registered, the stall timeout, and setlists resolving in slot order.
- `RoomLoader.test.tsx`: the belt threads through the buckle as progress rises.
- `ai-style-personalization.test.ts`:
  - only theme ids are accepted;
  - constraints come from the spec;
  - the cache key changes per style, and is unchanged without one;
  - fake evidence is still dropped;
  - the evidence minimum and order;
  - setlist-first song order.
- `AIArtistStyle.test.tsx`: the id is sent with filtered articles, the fallback shows when AI is unavailable, and no style is sent when off.
- `ai-spotify-import-guard.test.ts`: the Spotify guardrail.
- `theme-spec.test.ts` (existing): every setlist `catalogKey` exists.

## Rollback

- **Fastest.** Unset `VITE_ENABLE_AI_STYLE_PERSONALIZATION`, or set it to anything but `true`, and redeploy. The picker disappears, no style is applied or sent, and cache keys return to the old ones.
- **Code.** Each step is its own commit on `feature/ai-style-personalization`; `git revert` any of them. The choice and the look, the picker, the loader, the AI constraints, the client wiring and the guard test are separate commits.
