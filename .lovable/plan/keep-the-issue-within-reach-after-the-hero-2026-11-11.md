# Keep "The Issue" within reach after the hero

## What changes (phones and narrow screens)
1. **Sections inside the hero.** A slim row of section tabs (Playlists, Runway, Looks, Notes, Want List) sits along the bottom edge of the hero, over the runway photo, just above "The Autumn Mix". Tapping one opens that section in place, the same way the black Issue panel does now.
2. **Sticky Issue dock after the hero.** Once the hero scrolls out of view, the same row slides up and stays pinned at the bottom of the screen, just above the player bar. It hides again when you scroll back up to the hero. Tapping "The Issue" in the dock opens the full panel as a sheet from the bottom; tapping a tab goes straight to that section.
3. The current black Issue panel below the hero stays as-is, so nothing is lost; the dock is a shortcut to it.

Desktop keeps its current side panel layout.

## Look
Fig 950 background, fig 800 hairline on top, Isidora labels in lilac fog, the active tab in acid lime. Height around 44px so it doesn't crowd the player bar or the shop card.

## Technical details
- New `ListenIssueDock` component rendered in `src/routes/index.tsx`, reusing the existing ListenLibrary handlers (onContents, onPlaylist, onWant, category "Runway", etc.).
- In-hero variant rendered inside `.ls-hero-wrap`; an IntersectionObserver on `.ls-hero-wrap` toggles a `data-docked` state that shows the fixed dock (`position: fixed; bottom: var(player bar height)`), with a transform slide-in and `prefers-reduced-motion` respected.
- "The Issue" button opens the existing library via `setLibraryOpen(true)`.
- Styles scoped under `.ls` in `src/styles.css`, only under `max-width: 900px`.
- Verify with Playwright at 430x786 and 699x868: tabs visible in hero, dock appears after scrolling past it, hides on scroll back, doesn't overlap the player bar or the shop card.
