# Run MelodyLust in Visual Studio Code

Use Node.js 24. Open `Frame-Fashion-Muse.code-workspace` in VS Code.

In Terminal → New Terminal:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173 for the website. The evidence backend runs at http://127.0.0.1:3000; health is at `/health`. Vite proxies `/api/association` to the backend. The evidence form now sends its calculation to that backend.

Stop both services with Ctrl+C. You can also use Run and Debug → Debug frontend + backend, or Terminal → Run Task → Start frontend + backend.

To run separately, use `npm run dev:api` and `npm run dev:web` in two terminals. Keep the API on port 3000 because the frontend proxy targets that port.

## Check it

```sh
npm run test:melodylust
npm test
npm run build
```

The first command needs no dependency install. The others require `npm ci`.

## Try evidence search

Open the site's style search/evidence panel. Expand Load editorial evidence and paste `examples/melodylust-synthetic-corpus.json`. Load it, select the designer and music entity, then measure the association. This corpus is synthetic demonstration data, not Hearst research.

## Original media and optional services

The export has asset metadata but no original images, video, or font. Local SVG placeholders make the site runnable; replace the `/placeholders/...` paths in `src/routes/index.tsx` with your real media to restore the original appearance. The missing video is omitted and the font uses existing CSS fallbacks.

No keys are required for local evidence calculations, the editorial pages, quiz, or device-local wishlist. Copy `.env.example` to `.env` if you have a Tumblr consumer key or an authorized Lovable AI gateway key. Restart after editing it. Never put private keys in variables prefixed `VITE_`.

The current project does not include a licensed Hearst corpus, a production database, automated ingestion, or Spotify account/playback integration. The optional LLM metadata reader is present in source; the evidence UI accepts reviewed JSON. It does not produce invented affinity scores.

## Run the compiled website

Run `npm run build`, then `npm start`. This starts the compiled site on port 5173 and the evidence API on port 3000. Stop both with Ctrl+C.
