# Tidy the song tiles and picks row on phones

## What I verified on a 430px phone screen

- The editorial picks row (`.stylus-track`) is inset 32px from each screen edge
  (16px page frame + 16px section padding). Its tiles are cut at that inner
  line, leaving a 32px dead strip before the real screen edge — the row looks
  misaligned, and the cut happens mid-screen instead of at the edge.
- The song picks rows (album sleeve + text + buttons) fit inside the screen
  today, but nothing guarantees it: a long artist/album line or large system
  text could push them past the edge.
- The document itself is 12px wider than the screen (the playlist photo's
  intentional edge bleed is not clipped). On browsers without the modern
  `overflow-x: clip` support the page can then be dragged sideways.

## Changes (all in `src/styles.css`)

1. **Picks row bleeds to the screen edges on phones.**
   At `max-width: 600px` give `.stylus-track` negative side margins that cancel
   the 32px combined inset, so tiles start flush at the left screen edge and are
   cut only at the true right screen edge — a proper mobile carousel. Add a
   matching `scroll-padding-left` so snapped tiles land flush, and keep the
   "The editorial picks" heading and arrows inset as they are. Desktop and
   tablet unchanged.

2. **Song picks rows can never overflow.**
   On `.stylus-song-head span` add `overflow-wrap: anywhere` so long
   artist · album · year lines wrap instead of pushing wide; keep the 72px
   sleeve column; add `overflow-x: clip` on `.stylus-songs` as a final guard
   so no state can paint past the screen edge.

3. **Stop the 12px sideways nudge at the source.**
   Add `overflow-x: clip` (with an `overflow-x: hidden` fallback line first, for
   older browsers) on the sections whose images bleed past the screen — the
   playlist section. The bleed still looks the same; the document is no longer
   wider than the screen, so no phone browser can scroll the page sideways.

## Verification

- Playwright at 430px and 390px: confirm the document scroll width equals the
  screen width, nothing renders outside the screen except tiles inside the
  picks scroller, and screenshot the picks row and the song picks rows.
- Confirm desktop (1280px) is unchanged.
