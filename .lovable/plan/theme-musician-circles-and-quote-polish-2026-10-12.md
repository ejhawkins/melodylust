# Theme, Musician Circles and quote polish

## What changes
1. **Theme name under the video** (e.g. "Soft Armor") — remove the underline. Size and font stay the same.
2. **Musician Circles section**
   - Swap the beige paper background for white.
   - Make all text in the section black, including the orange principle line, notes, labels and active filter pills (active pills turn black with white text).
   - When the section scrolls into view, the circular portraits drop in one after another from just under the "Explore Musician Circles" heading — falling down into place with a slight bounce and a fade. This plays once.
3. **Quote card** ("The song comes first…")
   - The quote and its sign-off slide in from the left as they appear.
   - While you scroll past, the quote also drifts slowly (parallax) at its own pace relative to the page.
   - Background stays white.
4. Reduced-motion visitors see everything in place with no drop, slide or drift.

## Technical details
- `src/styles.css`: delete the `border-bottom` and padding on `.records-theme > span`. `.circles-section` background goes to `var(--background)` and its text to `var(--foreground)`. Inside `.circles-section`, override `--stylus-accent` / `--stylus-paper` / `--stylus-ink` to foreground/background, so every accent rule turns black without touching the separate /circles page.
- `MusicianCircles.tsx`: an IntersectionObserver on the portrait grid sets `data-in` and a per-portrait `--d` index. The CSS starts each `.circles-portrait` at `translateY(-80px)` with opacity 0, then transitions to rest with a staggered delay of `--d * 60ms`.
- `GuidedStory.tsx` (GuidedStoryQuote): the `.gs-reveal` items inside `.gs-quote` start at `translateX(-80px)` instead of rising. A rAF scroll loop writes a `--qp` progress value, and the blockquote wrapper gets `translateY(calc(var(--qp) * -60px))`. The parallax sits on a wrapper element so it doesn't fight the slide-in transform.
- I'll check it at 1440 and 390px wide.
