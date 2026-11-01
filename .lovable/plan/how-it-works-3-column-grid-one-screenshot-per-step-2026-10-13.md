# How it works — 3-column grid, one screenshot per step

## What changes

Replace the current two-panel pinned layout (steps list on the left, single photo on the right) with a **3-column grid**: each column is one step — its number (01/02/03), title, description and its own screenshot stacked together. The pinned scroll moment stays: the section holds on screen while the visitor scrolls, and the active column lights up (full opacity, photo lifts slightly) while the other two stay dimmed.

- Background stays white; headings stay in the big display face, black on white (consistent with the rest of the section).
- The "How it works" eyebrow sits centered above the three columns.
- Same three steps and screenshots as today (Hear it / Find the evidence / Wear it your way) — no content changes.
- The `START HERE` scroll target (`#how-it-works`) keeps working unchanged.

## Phone behaviour

On phones the three columns stack vertically in order; the active step lights up as before and inactive ones stay dimmed, with the screenshot sized to fit. Reduced-motion visitors get the section static with step 01 lit.

## Files touched

- `src/components/HowItWorks.tsx` — markup only: each step renders as one grid card (number, title, body, image) with the existing `data-active` flag; the scroll-step picking logic (rAF + sticky pin) is untouched.
- `src/styles.css` — swap the `.gs-sticky` two-column rules for the how-it-works variant: 3 equal columns, card layout, active-column highlight (opacity + small image lift), phone stacking rules near the existing ~1352 block, reduced-motion exceptions.

## Verification

- Playwright at 1440px: three columns visible, active column lights up while scrolling through the pinned section, START HERE lands on step 01, no horizontal overflow.
- Playwright at 390px: columns stack in order, screenshots fit, nothing clips.
