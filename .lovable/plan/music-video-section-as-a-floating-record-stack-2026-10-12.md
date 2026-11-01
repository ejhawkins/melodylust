# Music video section as a floating record stack

Keep the section (title "THIS IS A MOOD" stays), but replace the two stacked video frames with a Shopify Editions–style stack of records.

## What you'll see
- A fanned stack of vinyl records floating at an angle, gently bobbing. Each record sleeve is one video (Billie Eilish — CHIHIRO, BANKS — This Is What It Feels Like), with the video's cover as the sleeve art and the artist/title in Bodoni Moda on a small tab sticking out of the sleeve.
- Hovering (computer) lifts a record out of the stack; clicking or tapping it slides it to the front, the disc spins out of the sleeve, and the video player opens beside it with that song's credit.
- Tabs along the side (or a swipeable row on phones) let you jump between records; arrow keys work too.
- Only the chosen video loads, so the page stays fast. Reduced-motion visitors get a flat row of sleeves with no floating or spinning.
- Easy to add more videos later — each record is one entry in a list.

## If you'd rather just remove it
Say "remove" and I'll delete the whole section, its side-rail link "Music Video", and move How it works up to follow the hero.

## Technical details
- New `src/components/RecordStack.tsx` with a `videos` array (id, artist, title, credit, url); replaces the film-head/film-frame blocks in `src/routes/index.tsx` (~463–510) and the `playing`/`playingBanks` state.
- CSS 3D transforms (perspective, rotateY/translateZ per index), keyframe float, active record translates forward; youtube-nocookie iframe mounted only for the active record after click.
- Tabs are `role="tablist"` buttons; keep #film id so the rail and scroll handoff (--cover-out) still work.
- Verify at 1440/768/390: no overflow, click plays, build clean.
