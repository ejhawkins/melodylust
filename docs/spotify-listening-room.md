# Spotify listening room

The listening room (`/`) has two modes:

- **Silence** (the default). This is the site as it has always been. Nothing plays until a reader presses play, and then Spotify's own embedded player plays the song. No sign-in is involved.
- **Listening**. The reader presses **Enter the listening room** in the player bar and signs in with Spotify. The bar's play/pause, next and previous buttons then play **full songs** in this browser through the [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk). **Leave listening room** disconnects and returns to silence.

Spotify is the only identity. There's no Melody Lust account, no user table and no stored user record. The only thing kept is Spotify's refresh token, in an httpOnly cookie in the reader's own browser.

The whole feature is behind a flag and is **off by default**.

## How it works

| Step | Where |
| --- | --- |
| "Enter the listening room" → a remembered sign-in reconnects straight away; otherwise the reader goes to `/auth/login` | `src/lib/spotify-room.ts`, `src/components/ListenRoomSwitch.tsx` |
| `/auth/login` makes a PKCE verifier, challenge and state, then redirects to Spotify | `src/routes/auth.login.tsx`, `src/lib/spotify-pkce.ts` |
| Spotify → `/auth/callback`. The state is checked, and the code and verifier go to a server function | `src/routes/auth.callback.tsx` |
| The server function trades the code for tokens. The refresh token goes into an httpOnly cookie and the access token goes back to the page's memory | `src/lib/spotify-auth.functions.ts` |
| `GET /v1/me`: anyone who isn't Premium stops here, before any SDK loads | `src/lib/spotify-room.ts` |
| The SDK loads (`https://sdk.scdn.co/spotify-player.js`, only now), creates a player and calls `connect()`. `ready` gives the device id | `src/lib/spotify-player.ts` |
| A click on play sends `PUT /v1/me/player/play?device_id=…` with the queue's track URIs, from the pressed song on | `src/lib/spotify-api.ts`, `src/routes/index.tsx` |
| Leave: `disconnect()`, the in-memory token is cleared and the cookie is deleted | `spotify-room.ts` → `forgetSpotify` |

**Tokens.**
- The access token lives only in memory (`createTokenStore`). It's refreshed a minute before it expires, with one refresh shared by concurrent callers, and a 401 is retried once with a fresh token.
- The refresh token lives only in the `ml_spotify_rt` cookie: `httpOnly`, `SameSite=Lax`, `Secure` on https, and 180 days long.
- Nothing goes in `localStorage`. During the round trip to Spotify, only the PKCE verifier and state sit in this tab's `sessionStorage`, and they're deleted on return.
- **No client secret is used anywhere.** PKCE replaces it.

**Scopes.** These five only: `streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state`. The app makes no playlist or library calls.

**Autoplay.** Full playback starts only from a reader's click. The click handlers call `activateElement()` and then the Web API. The bar follows Spotify as it moves through the queue by itself.

**In-app browsers** (Instagram, TikTok and so on) keep the existing silent mode (`src/lib/silent-mode.ts`) and aren't offered the room. Spotify's player doesn't run there.

### When it falls back to silence

The room never shows a broken player. Each of these returns to silence (the embed still works) with one plain sentence (`noticeMessage` in `src/lib/listening-mode.ts`):

| What happened | Notice |
| --- | --- |
| Free account (`/me` product ≠ premium, or the SDK's `account_error`) | Full songs need Spotify Premium |
| Development-mode cap: a 403 "user may not be registered", or an SDK `authentication_error` saying so | The listening room is invite-only right now |
| Sign-in expired or revoked (refresh refused → cookie deleted) | Your Spotify sign-in ended |
| Reader declined on Spotify's page | The room stays in silence |
| The SDK won't load or connect (`initialization_error`, blocked script) | This browser can't play Spotify in the page |
| Spotify is down or rate-limiting (429, 5xx) | Spotify isn't answering right now |

A single song that won't play (`playback_error`, or a 403 restriction or 404 from the Web API) **doesn't** end listening. The reader sees a passing note and can pick another song.

## Setup

### 1. Create a separate dev app on Spotify

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → **Create app** and name it **Melody Lust Dev**.
2. Under **Redirect URIs**, add the local callback. Spotify no longer accepts `localhost`, so use the loopback IP and your dev server's port:
   - `http://127.0.0.1:5192/auth/callback`. Use whatever port `npm run dev` prints; Vite's default is 5173.
   - Open the site at `http://127.0.0.1:<port>`, not `localhost`, so the cookie and the redirect share an origin.
3. Under **Which API/SDKs are you planning to use?**, tick **Web API** and **Web Playback SDK**.
4. Under **User Management**, add each tester's Spotify account email (see the limit below). Each tester needs **Spotify Premium**.

Keep the production app (`https://www.melodylust.fashion/auth/callback`) separate from the dev app.

### 2. Environment variables

| Variable | Value | Notes |
| --- | --- | --- |
| `VITE_ENABLE_SPOTIFY_LISTENING_ROOM` | `true` to turn the room on | Anything else, or unset, means off |
| `VITE_SPOTIFY_CLIENT_ID` | The app's Client ID | Public: it ships in the browser bundle, which is fine |
| `VITE_SPOTIFY_REDIRECT_URI` | Exactly one of the app's registered Redirect URIs | The token exchange refuses any other |

- **Locally:** put them in `.env.local`, which git ignores. Never put them in `.env`, which git tracks.
- **On Vercel:** set them under Project → Settings → Environment Variables. Use the production app's Client ID and `https://www.melodylust.fashion/auth/callback`, then redeploy. `VITE_` values are baked into the build.
- No client secret is needed.

### 3. Try it

1. Run `npm run dev` and open `http://127.0.0.1:<port>/`.
2. The player bar shows **● Silence** and **Enter the listening room**.
3. Click it, sign in with an allowlisted Premium account, and you're back in the room showing **● Listening**.
4. Press play: the full song plays in the page. Pause, next and previous work from the bar.
5. **Leave listening room** returns to Silence. The next Enter goes back to Spotify's sign-in, because the cookie is gone.

## Limits: development mode

The Spotify app runs in **development mode**, so only the Spotify accounts listed under **User Management** can sign in. This app is capped at **5**; check the dashboard for the current number. Anyone else gets "The listening room is invite-only right now" and keeps the embed. This is a documented limitation, not a crash.

That notice also offers **Join the waitlist** (`src/components/ListenWaitlist.tsx`). For now it's a **mockup**: it's labelled "Preview", sends nothing and stores nothing, and tells the reader so after they press Join. Connecting it to a real list (a form service or a table) is a separate change.

**Opening it to everyone** requires Spotify's extended quota mode: on the dashboard, open the app → **Request extension**. Spotify reviews these by hand and has tightened who qualifies; it has recently been aimed at registered businesses with an established audience, so check the current criteria before applying. Until it's granted, keep the room invite-only, or keep the flag off in production.

## Turning it off

- **Flag:** set `VITE_ENABLE_SPOTIFY_LISTENING_ROOM` to `false`, or remove it, and redeploy. The button, the sign-in and the SDK all disappear, and the bar's embed behaves exactly as before. Readers' leftover cookies are harmless and expire on their own.
- **Code:** each step is its own commit on `feature/spotify-listening-room`, so `git revert` can undo the UI alone (`feat(listening-room): Enter/Leave…`) or the whole feature.

## Tests

`npm test` covers the feature without calling Spotify:

- `spotify-pkce.test.ts`: the verifier, the S256 challenge (RFC 7636 example), state, the authorize URL scopes and the callback state check.
- `spotify-auth.test.ts`: token parsing, refresh timing, one refresh for concurrent callers, and clearing during an in-flight refresh.
- `listening-mode.test.ts`: the mode machine, the flag, and how SDK and Web API errors become notices.
- `spotify-room.test.ts`: the controller, driven by a fake SDK and a fake Web API. It covers the Premium check, the invite-only 403, connecting, the playback calls, the 401 retry and Leave.
