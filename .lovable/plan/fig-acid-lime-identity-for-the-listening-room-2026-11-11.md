# Fig & Acid Lime identity for the Listening Room

## What changes
- The Listening Room (home page, playlists "Contents" view, full-screen phone player, shop card) moves to a dark fig palette with acid-lime accents.
- Other pages (/home, profile, runway pages, etc.) keep their current look.
- Typography: Isidora for body text and UI; WTF Hammer XXX Compressed for big display headings; WTF Hammer Compressed for secondary headings; Couturier Poster Black Italic for editorial accents ("Stop the show", credits, playlist names). The font files already in the app are kept.

## Colour roles
- Fig black #0B040B: page backdrop
- Fig 950 #140713: player sheet / drawers
- Fig 900 #1F0D1E: panels and cards
- Fig 800 #2D142B: borders and dividers
- Acid lime #D4FF32: play button, active chip, progress needle
- Acid muted #8EAE1C: secondary indicators
- Chalk white #FAF9F6: titles
- Lilac fog #8E788C: artist names, timestamps, metadata

## Technical details
- Add the eight colours to `@theme` in src/styles.css (generates `bg-fig-950`, `text-acid-lime`, etc.).
- Add semantic font tokens: `--font-body` (Isidora), `--font-heading` (Hammer XXX), `--font-subheading` (Hammer), `--font-accent` (Couturier italic).
- Scope a `.ls-theme` class on the Listening Room root that remaps shadcn tokens (`--background`, `--foreground`, `--primary`, `--muted-foreground`, `--border`, `--card`, `--ring`) to the fig/lime values, so existing components restyle without hardcoded colours.
- Update `.ls-*` rules that hardcode colours (playlist, player, hero, Contents spread, product card) to use the new tokens; keep the white-paper Contents spread readable by switching it to fig 900 with chalk text.
- Check contrast: lime buttons get fig-black text; lilac fog only for small metadata.
- Verify with Playwright at 430x786 and 1280x1800; run existing Listening Room tests.
- Record the scoped-theme rule in AGENTS.md and save the palette/fonts as a design memory.
