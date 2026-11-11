# Style Matrix redesign: "The Fit Compass"

One fashion item sits in the centre. Its four ways to wear it sit on a compass made of two style axes, so the matrix idea reads at a glance and works with a thumb.

```text
                 AFTER DARK
                     |
      Look 02        |        Look 03
   (monochrome)      |     (with colour)
 POLISHED ------ [ THE COAT ] ------ UNDONE
      Look 01        |        Look 04
   (70s suede)       |      (off-duty)
                     |
                  DAYTIME
```

## How it works for the visitor
- **Centre piece:** the hero item's photo with its name, e.g. The Statement Coat.
- **Four looks around it:** tap a corner, or swipe left and right on a phone. The chosen look grows to fill the frame, the others shrink into small corner thumbnails, and the axis labels show why the look sits there.
- **Look details:** the look's photo collage, colour palette and style tags in a sliding panel, with three actions:
  - **Save to Want List:** works as it does today, and the button shows a tick when the look is saved.
  - **Play the matching song:** a Spotify player for the song paired with that look, with no account needed.
  - **Vote "my way to wear it":** one vote per visitor per item. Each corner then shows its share of the votes as a lime bar, and the leading look gets a "Readers' pick" badge.
- **More than one item:** a strip of hero items at the top, shown as round thumbnails. The coat ships first with its existing photos. The design is ready for more items as soon as you send photos for them.
- **Style tag filter:** the existing filter stays as small pills. Looks that don't match fade out instead of being shuffled around.
- **Keyboard and motion:** arrow keys move between corners, and movement is reduced for visitors who turn motion down.

## Where it appears
- **/home:** replaces the current Style Matrix grid under the "Style matrix" heading.
- **Listening Room:** a compact version inside the "Style Matrix Notes" pill, and also from the dock. Playing a look's song there uses the room's own player.

## Look
- Fig and acid-lime colours.
- The item name and big look titles are in WTF Hammer.
- The look number and the "worn with..." line are in Couturier Poster italic.
- Buttons, pills and votes are in Isidora.

## Content I will draft (please replace with the real thing)
- **Axis names:** Polished / Undone and Daytime / After dark.
- **Songs:** one song per look, picked from songs already in the app where possible.
- **Merged look:** the fifth current board, "Worn after dark", becomes part of the After dark corner, because the compass has four corners.

## Technical details
- **New code:** a new `FitCompass` component with its data module `lib/fit-compass.ts`, covering items, looks, axes, positions, palettes and Spotify ids. It reuses the existing moodboard images, `addWish` and `useWishlist`. `StyleMatrix.tsx` is either replaced by it or kept as a thin wrapper.
- **Votes:** a new `style_votes` table in the database, with these columns:
  - `item_id`, `look_id`
  - `voter`, a random id stored on the device; or the user id when signed in
  - `created_at`
  - A unique constraint on (`item_id`, `voter`) so each visitor has one vote and can change it.
  - RLS on. The table gets no direct client access, and grants go to service_role only.
- **Vote server functions:**
  - `castStyleVote` validates its input with zod and upserts through the admin client, after checking that the item and look exist in the static catalogue.
  - `getStyleVotes` returns only aggregate counts, never voter ids.
- **Responsive layout:** a CSS grid compass on desktop. On phones up to 900px, a scroll-snap carousel with the centre item pinned above it. Scoped classes start with `fc-`.
- **Tests (vitest):**
  - The vote share maths.
  - The one-vote-per-visitor upsert key.
  - The look-to-quadrant mapping.
  - Each look has a valid Spotify id.
  - The Want List toggle.
- **Checks:** a Playwright run on /home and the Listening Room at 430px and 1280px, covering tapping corners, saving, playing and voting.
