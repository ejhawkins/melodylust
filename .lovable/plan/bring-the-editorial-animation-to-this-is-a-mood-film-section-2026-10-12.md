# Bring the editorial animation to "This is a mood" (film section)

Apply the same calm, editorial motion language used in the guided story to the film section (`#film`) the user selected — so the chapter arrives with intention instead of just fading in.

## What changes

1. **Chapter wipe entrance** — a plum/ink overlay sweeps up and off the section as it enters view (same `styling-wipe` idea as Styling Notes), revealing the mood content beneath. Runs once, on entry.
2. **Masked headline reveal** — "THIS IS A MOOD" keeps its per-letter stagger but each letter rises from behind an overflow mask (clip-path / masked line), matching the `rise-line` treatment on the cover title and the story's headline reveals. ~600ms, easing `cubic-bezier(0.22,1,0.36,1)`.
3. **Staggered credits** — "I do not own any of the vibes below", the 1px rule, the CHIHIRO credit line and the Andrew Mukamal credit fade + rise one after another (~80ms apart) after the headline lands.
4. **Poster clip reveal** — the CHIHIRO video poster reveals with a slow clip-path inset opening (bottom-up), then settles; the PLAY THE FILM button fades in last. The existing mobile parallax drift on the poster image is preserved.
5. **Reduced motion** — under `prefers-reduced-motion`, everything becomes a simple opacity fade; no wipe, no mask, no clip animation.

## Technical notes

- All changes in `src/styles.css` (new `.film-*` animation rules keyed off the existing `data-inview` attribute) plus small markup touches in `src/routes/index.tsx` (mask wrapper spans, wipe element).
- No new libraries; transform/opacity/clip-path only, so it stays smooth on phones.
- Existing behavior untouched: letter stagger timing, YouTube embed on play, mobile parallax layer, the 5%-bigger cover title.

## Verification

- `bunx tsgo --noEmit` and build log clean.
- Playwright at 1280 and 390 widths: scroll to #film, confirm wipe + masked reveal + poster clip play in order, and that reduced-motion mode shows simple fades.
