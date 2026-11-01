# Fix the hero: visible black logo and headline, cleaner centre

## What the screenshots show (desktop 1440 and phone 390)

- The Melody Lust logo is black over the dark, hazy photo — it nearly disappears.
- "YOU KNOW YOUR MUSIC" is black over a murky middle, so it loses its edge.
- The middle of the hero is washed in a pale beige haze. Two layers cause it:
  the light "readability wash" behind the text (a whitish radial band at the
  centre) and the animated plum-orange gradient laid over the photo at 58%
  opacity in soft-light — together they turn the photo muddy.

## Changes (all in `src/styles.css`)

1. **Keep the logo and all hero type black.**
   The logo, edition text, category nav, "YOU KNOW YOUR MUSIC", EXPERIENCE /
   GET READY and the bottom links/caption remain the site's black foreground.
   The correction happens in the overlay beneath them, not by inverting the
   lettering.

2. **Invert the overlay treatment and remove the beige haze.**
   - Delete the pale light wash behind the text (`.cover-content::before`)
     — that whitish radial band is the beige.
   - Replace the current plum-orange soft-light wash with a restrained,
     cool near-white overlay behind the black lettering. It will brighten
     the image enough for contrast without producing a cream/beige middle.
   - Keep the photograph stronger at the outer edges and lower half, so the
     treatment still feels photographic rather than fogged over.

3. **Solid header state remains unchanged.**
   The logo and header text remain black both over the corrected hero and on
   the white background after scrolling.

## Verification

- Playwright at 1440px and 390px: screenshot the hero — logo and headline
  clearly black, no beige band in the middle, photo readable.
- Scroll down: the solid header shows the black logo on white again.
- Measure text contrast in the page (dark luma for hero type) and confirm
  the build log is clean.
