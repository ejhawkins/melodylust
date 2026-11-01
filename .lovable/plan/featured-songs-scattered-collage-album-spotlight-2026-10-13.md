# Featured songs: scattered collage → album spotlight

## Experience
- Replace the Featured songs grid with a deliberately messy editorial collage using the existing song artwork: varied sizes, small rotations, staggered positions and controlled overlap.
- As the visitor scrolls, bring one album cover into a clear, upright spotlight while the surrounding covers drift toward the edges. Continue scrolling to spotlight the next song.
- Pair each spotlight with the song and artist name, BPM, music details and social analytics. Keep the album and its data visible together, with no competing foreground covers.
- Allow selecting a cover directly as an alternative to scrolling. Retain Listen and Shop the look actions, including the existing black song panel and its three-column moodboard.

## Data preview
- Clearly mark the figures **Sample data — not live analytics**.
- Preview BPM, key, genre, duration and release information alongside social metrics such as Reel uses, video views and engagement rate, with a compact sample trend chart.
- Keep sample metrics separate from documented song links and artwork; do not present invented figures as sourced facts.

## Layout and motion
- Preserve the site's editorial typography and semantic colours.
- Desktop: broad scattered collage transitioning into an album-and-data composition.
- Mobile: a contained collage with the focused cover above compact metrics; prevent sideways overflow and keep controls unobstructed.
- Reduced motion: stable album details with direct song selection, without drift or scroll-driven transforms.
- Preserve the existing cover-story film and its consent controls as a separate editorial item within the replacement section, rather than treating it as a song with analytics.

## Technical details
- Isolate the collage and spotlight presentation in a dedicated component, retaining the `iconic` section anchor and existing song-panel callbacks.
- Replace this section's grid reveal and pointer-tilt handling with a single scoped scroll-animation controller; clean up listeners and animation frames.
- Leave the artist search engine, search components, record arc, playlist and community submissions unchanged.

## Verification
- Check the full collage → spotlight → next-song scroll sequence on desktop and mobile.
- Verify direct song selection, Listen links and Shop the look opening the correct panel.
- Check reduced motion, sample-data labelling, text legibility and absence of overlapping metrics or horizontal overflow.
- Check preview errors and targeted tests before completion.