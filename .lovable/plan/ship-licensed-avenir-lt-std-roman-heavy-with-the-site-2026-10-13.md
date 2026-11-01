# Ship licensed Avenir LT Std (Roman + Heavy) with the site

## Goal
Every visitor sees Avenir LT Std for body text — not just devices with the font installed. Today the stylesheet only declares `local()` sources, so most devices fall back to DM Sans.

## Current state (verified)
- `src/styles.css` lines 210–223: two `@font-face` blocks for "Avenir LT Std" using `local()` only (Roman and Heavy).
- Line 225: `--font-sans: "Avenir LT Std", "DM Sans", sans-serif;` — everything using `var(--font-sans)` switches automatically once real files load.
- User holds a valid license and will upload the font files in chat (Roman + Heavy only).

## Plan
1. Receive the uploaded files. Acceptable formats: `.woff2` (preferred, smallest), `.woff`, `.otf`, `.ttf`. If only desktop formats (.otf/.ttf) arrive, ship those as-is — browsers handle them fine; note they are larger.
2. Upload each font file to Lovable Assets (CDN) with `lovable-assets create`, giving clean filenames such as `avenir-lt-std-roman.woff2` and `avenir-lt-std-heavy.woff2`. Write the returned `.asset.json` pointers under `src/assets/fonts/`. Keep the raw binaries out of the repo.
3. Edit the two existing `@font-face` blocks in `src/styles.css` to prepend the CDN file URL before the existing `local()` sources:
   ```css
   src: url("/__l5e/assets-v1/<id>/avenir-lt-std-roman.woff2") format("woff2"),
        local("AvenirLTStd-Roman"), local("Avenir LT Std 55 Roman");
   ```
   Same shape for the Heavy block. Keeping `local()` after the URL avoids re-downloading on machines that already have the font.
4. No other CSS changes — `--font-sans` already resolves to "Avenir LT Std" first, and DM Sans stays as the last-resort fallback.

## Verification
- Build passes.
- Playwright check: confirm the browser actually loads the font (document.fonts / network request to the CDN URL), and body text renders in Avenir on a machine without the font installed (the sandbox has no local Avenir, so success there proves the file is served).
- Check at desktop and phone widths; confirm no console errors and no layout shift issues from the fallback swap.

## Notes
- Licensing: files come from the user's own licensed copy, not downloaded from the web.
- Publishing to melodylust.fashion is a separate step — not part of this change unless asked.
