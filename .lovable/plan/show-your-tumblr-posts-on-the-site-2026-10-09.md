# Show your Tumblr posts on the site

A new section on the journal page that pulls your latest posts straight from your Tumblr blog and lays them out in the same editorial style as the rest of the site. Read-only — nothing gets published, and no visitor ever needs to log in.

## What you'll need to do (about 3 minutes, one time)

1. Sign in to Tumblr and open **tumblr.com/oauth/apps**.
2. Click **Register application** and fill in:
   - **Application Name:** `Melody Lust`
   - **Default Callback URL:** `https://id-preview--c28f6b41-c80d-4f3d-b2fe-2878a0f1d6c6.lovable.app/` (it's only used for posting, which we're not doing — any valid URL works)
   - **Application Website:** your preview or published URL
3. Save, then copy the **consumer key** shown at the top of that page and paste it into the secure form I'll open (never into the code).
4. Tell me your **blog address** (e.g. `melodylust.tumblr.com`) — this one is public, so chat is fine.

That's the whole setup. No secrets in the codebase, nothing for your visitors to see.

## What I'll build

1. **A safe key store** — your consumer key goes into Lovable's secret store as `TUMBLR_CONSUMER_KEY` and is read only on the server, so it can never be read from the browser.
2. **A small server-side fetcher** — asks Tumblr for your most recent posts (title, caption, image, date, link), on request, with a short cache so the page stays fast and well inside Tumblr's 1,000-calls-an-hour allowance.
3. **A new section, "+ From Tumblr"** — sitting between **Playlist** and **Archive**, matching the site's look: a light sans-serif header, a four-column grid of cards (two columns on a phone), serif captions, each card linking through to the real post on Tumblr.
   - Photo posts show the photo; text posts show the title and first lines; quote posts show the quote as a pull-quote; link and video posts show their thumbnail with a small "open" marker.
   - A small line under the header links to your blog so readers can follow you.
4. **A fallback that never breaks the page** — if the key isn't in place yet, or Tumblr is slow or unreachable, the section quietly shows the in-house journal notes instead of an error or a blank gap.

## How I'll check it

- Load the page and confirm real Tumblr posts appear, in order, with images and working links.
- Confirm it looks right at your screen width and at phone width, with no overflow or clipped captions.
- Confirm the fallback renders cleanly when the key is missing.
- Confirm the key does not appear anywhere in the page's browser code.

## Technical details

- **Endpoint:** `GET https://api.tumblr.com/v2/blog/{blog}/posts?api_key={key}&limit=12` — public blog reads need only the consumer key passed as `api_key`; no OAuth signing required. Optional `type` and `tag` filters are available if you later want only photos, or only one tag.
- **Implementation:** a `createServerFn` from `@tanstack/react-start` in `src/routes/index.tsx`'s route loader, with `process.env.TUMBLR_CONSUMER_KEY` read inside the handler. Blog address is a plain constant (it's public). Response handling covers both Tumblr's current NPF post format and the older legacy fields, so photos, quotes, text and links all map correctly.
- **Caching:** in-memory with a short TTL, plus a graceful timeout, so a slow Tumblr response can't stall the page.
- **No database or accounts needed** — this is read-only, so Lovable Cloud stays off and the site keeps its current zero-backend shape.
- **Rate limits:** 1,000 calls per hour, 5,000 per day per consumer key — comfortably clear with caching.
- **Note:** Tumblr also publishes an RSS feed per blog that needs no key at all; we're using the API because the consumer key gives cleaner data and the option to filter by post type or tag later.

## Open question for you

Where should it sit? I've planned it between **Playlist** and **Archive**. If you'd rather it replace the Archive grid, or sit right under the hero, say so and I'll move it.

