# Remove the wipe from "This is a mood"

Only one change: the white sweep panel that covers "THIS IS A MOOD" until you scroll goes away. Every text, color and other animation stays exactly as it is.

## What changes

- Delete the `<div className="film-wipe" aria-hidden="true" />` element in `src/routes/index.tsx` (line 436).
- Delete the `.film-wipe` rule in `src/styles.css` (line 480) and the `.film-wipe { display: none }` line inside the reduced-motion block (line 503).
- The scroll handoff effect keeps running for the hero (it still sets `--cover-out`, so the hero keeps its gentle scale-back as the film approaches), but stops writing `--film-p`, which only the wipe used.

## What stays

- The "THIS IS A MOOD" headline, the CHIHIRO video credit line and every other text — unchanged, still in their current colors (orange included).
- The letter-by-letter headline reveal, staggered credits, poster clip reveal and PLAY THE FILM fade — they trigger when the section enters view and are not tied to the wipe, so the chapter still arrives with animation, just without the panel covering it first.
- The hero photo drift, all phone parallax layers, and the reduced-motion fades.

## Technical notes

- Only `src/styles.css` (remove the two wipe rules) and `src/routes/index.tsx` (remove the wipe element and the now-unused `--film-p` write). No libraries, no markup restructuring, no color changes.

## Verification

- Build log clean (`/tmp/observability/build-errors.log`).
- Playwright at 1280px and 390px: scroll to the film section and confirm no white panel covers it — headline, credits and poster reveal directly, texts unchanged.
