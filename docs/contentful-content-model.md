# MelodyLust content model (Contentful)

MelodyLust reads four features from one Contentful space. The model below is the one the site expects. It is kept as
code in `src/lib/contentful-model.ts`, and every type is created by a script in `scripts/contentful/`.

## Get the live model

```sh
npm run contentful:model
```

This is read-only. It fetches the space's content types, writes `docs/contentful/content-model.live.json` and
`docs/contentful/content-model.live.md`, and checks them against the model below. It exits with an error when a type or
required field the site reads is missing or has the wrong type, so a page doesn't quietly fall back to its bundled
content. Put `CONTENTFUL_SPACE_ID` and a token in `.env.local` first (see `.env.example`). A delivery token is enough.

## How the types connect

```
Genre editions   story            (genre is a text field, one of the edition genres)
Reading Room     goodRead         (genre is a text field, one of the edition genres)

Song looks       song ──artist──▶ artist ──similarArtists──▶ artist
                  │  └─genres──▶ genre ◀──parent── genre
                  └─pieces──▶ clothingItem ──colorways──▶ colorway
                                  └─genres / artists / styleTags
                 styleTag is linked from artist, song and clothingItem

Runway Songs     runwaySong ──show──▶ runwayShow ──designers──▶ runwayDesigner

Playlists        playlist ──references──▶ musicalReference, song or runwaySong
```

A song look is found by the song's `caption` ("Title — Artist", with an em dash), which must match the Listening Room
playlist exactly. When a song has no pieces of its own, the product card falls back to pieces linked to its artist or a
similar artist, then to its genres.

## Environment variables

| Variable | Where | What |
| --- | --- | --- |
| `CONTENTFUL_SPACE_ID` | Vercel and `.env.local` | The space |
| `CONTENTFUL_API_KEY` | Vercel and `.env.local` | Content Delivery token. `CONTENTFUL_DELIVERY_TOKEN` also works |
| `CONTENTFUL_ENVIRONMENT` | optional | Defaults to `master` |
| `CONTENTFUL_API_URL` | optional | A gateway in place of `cdn.contentful.com` |
| `CONTENTFUL_MANAGEMENT_TOKEN` | `.env.local` only | For the create and seed scripts. Never on Vercel |

Keep tokens in `.env.local`, which git ignores. The commands below load it with `--env-file-if-exists=.env.local`. `.env` is tracked (it holds the public Supabase values Lovable needs).

## Content types

### Story (`story`)

Listening Room genre editions (journal stories). Read by `src/lib/contentful.ts`; created by `scripts/contentful/seed-stories.ts`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | Symbol | yes |  |
| genre | Symbol | yes | One of Hip-Hop, Pop, R&B, Electronic, Rock, Indie, Jazz, Country |
| category | Symbol |  | Style, Music, Fashion or Runway; Music when empty |
| intro | Text | yes | The first paragraph of the body stands in when empty |
| body | RichText | yes | Long text also reads |
| image | Link → Asset |  | The first image in the body stands in when empty |
| date | Date |  | The first-published date stands in when empty |

### Good read (`goodRead`)

Reading Room Good Reads, and each genre edition’s reads. Read by `src/lib/good-reads.ts`; created by `scripts/contentful/create-good-reads.ts`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | Symbol | yes |  |
| source | Symbol |  | The link’s site stands in when empty |
| note | Symbol |  |  |
| url | Symbol | yes | http or https only |
| genre | Symbol |  | One of Hip-Hop, Pop, R&B, Electronic, Rock, Indie, Jazz, Country |
| image | Link → Asset |  | Thumbnail |
| order | Integer |  | Lowest first |

### Genre (`genre`)

Song looks: genres songs, artists and pieces are filed under. Read by `src/lib/contentful-looks.ts`; created by `scripts/contentful/seed-song-looks.ts`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| name | Symbol | yes |  |
| slug | Symbol | yes |  |
| parent | Link → Entry (genre) |  |  |

### Style tag (`styleTag`)

Song looks: hashtags for era, scene, motif, material, colour, silhouette, mood. Read by `(not read by the site yet)`; created by `scripts/contentful/seed-song-looks.ts`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| label | Symbol | yes | A lowercase hashtag, like #nightdrive |
| kind | Symbol | yes |  |

### Artist (`artist`)

Song looks: the artist fallback for a song’s pieces. Read by `src/lib/contentful-looks.ts`; created by `scripts/contentful/seed-song-looks.ts`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| name | Symbol | yes |  |
| hashtag | Symbol | yes |  |
| genres | Array → Entry (genre) | yes |  |
| similarArtists | Array → Entry (artist) |  |  |
| styleTags | Array → Entry (styleTag) |  |  |

### Clothing item (`clothingItem`)

Song looks: one piece on the product card. Read by `src/lib/contentful-looks.ts`; created by `scripts/contentful/seed-song-looks.ts + extend-clothing-items.ts`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| name | Symbol | yes |  |
| note | Symbol | yes |  |
| price | Symbol | yes |  |
| shopUrl | Symbol |  |  |
| category | Symbol | yes |  |
| genres | Array → Entry (genre) |  |  |
| artists | Array → Entry (artist) |  |  |
| styleTags | Array → Entry (styleTag) |  |  |
| image | Link → Asset |  | A piece with no image and no colourway photo is left off the card |
| kicker | Symbol |  |  |
| collection | Symbol |  |  |
| sizes | Array |  |  |
| colorways | Array → Entry (colorway) |  |  |

### Colourway (`colorway`)

Song looks: one colour of a piece. Read by `src/lib/contentful-looks.ts`; created by `scripts/contentful/extend-clothing-items.ts`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| name | Symbol | yes |  |
| swatch | Symbol | yes | Six-digit hex, like #5a3a22 |
| image | Link → Asset | yes |  |

### Song (`song`)

Song looks: a Listening Room song, keyed by its caption. Read by `src/lib/contentful-looks.ts`; created by `scripts/contentful/seed-song-looks.ts`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| caption | Symbol | yes | "Title — Artist" with an em dash; must match the playlist exactly |
| title | Symbol | yes |  |
| artist | Link → Entry (artist) | yes |  |
| genres | Array → Entry (genre) | yes |  |
| styleTags | Array → Entry (styleTag) |  |  |
| spotifyUrl | Symbol |  |  |
| pieces | Array → Entry (clothingItem) |  | Up to 3, in order |
| moodboard | Array → Asset |  | Up to 3 images (not read by the site yet) |

### Designer (`runwayDesigner`)

Runway Songs: a creative director. Read by `src/lib/runway-archive.ts`; created by `scripts/contentful/runway-music-archive.cjs`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| name | Symbol | yes |  |
| wikipedia | Symbol | yes |  |
| photo | Link → Asset |  |  |
| photoCredit | Symbol |  |  |
| photoLicence | Symbol |  |  |
| photoSource | Symbol |  |  |

### Show (`runwayShow`)

Runway Songs: one runway show. Read by `src/lib/runway-archive.ts`; created by `scripts/contentful/runway-music-archive.cjs`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| name | Symbol | yes |  |
| house | Symbol | yes |  |
| season | Symbol | yes |  |
| year | Integer | yes |  |
| designers | Array → Entry (runwayDesigner) | yes |  |
| looks | Array |  | Up to 5 Tagwalk links |

### Song (runway) (`runwaySong`)

Runway Songs: a song a show played. Read by `src/lib/runway-archive.ts`; created by `scripts/contentful/runway-music-archive.cjs`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | Symbol | yes |  |
| version | Symbol |  |  |
| artist | Symbol | yes |  |
| category | Symbol | yes | A, B, C or D |
| bpm | Integer |  |  |
| spotify | Symbol | yes |  |
| show | Link → Entry (runwayShow) | yes |  |
| sources | Array |  |  |
| order | Integer |  |  |

### Musical reference (`musicalReference`)

Playlists: one piece of music cited as a reference. Not read by the site yet; created by `scripts/contentful/create-playlists.ts`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | Symbol | yes |  |
| artist | Symbol | yes |  |
| kind | Symbol |  | Song, Album, Artist, Score, Sample, Live recording or Mix |
| year | Integer |  |  |
| note | Symbol |  | Why it’s here, in a line |
| spotifyUrl | Symbol |  | An open.spotify.com link |
| link | Symbol |  | Any other http or https link |

### Playlist (`playlist`)

Playlists: an editorial playlist of musical references. Not read by the site yet; created by `scripts/contentful/create-playlists.ts`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | Symbol | yes |  |
| slug | Symbol | yes | Unique; lowercase words joined by hyphens |
| description | Text |  |  |
| cover | Link → Asset |  |  |
| genre | Symbol |  | One of Hip-Hop, Pop, R&B, Electronic, Rock, Indie, Jazz, Country |
| references | Array → Entry (musicalReference, song, runwaySong) | yes | In play order, 1 to 100 |
| order | Integer |  | Lowest first |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run contentful:model` | Reads the live model and checks it (read-only) |
| `npx tsx --env-file-if-exists=.env.local scripts/contentful/seed-stories.ts` | Creates `story` and publishes the Hip-Hop stories from `src/data/home.ts` |
| `npx tsx --env-file-if-exists=.env.local scripts/contentful/create-good-reads.ts` | Creates `goodRead`, or adds the fields it lacks |
| `npx tsx --env-file-if-exists=.env.local scripts/contentful/seed-song-looks.ts` | Creates `genre`, `styleTag`, `artist`, `clothingItem` and `song`, then seeds the Autumn Mix |
| `npx tsx --env-file-if-exists=.env.local scripts/contentful/extend-clothing-items.ts` | Adds `colorway` and the product-card fields on `clothingItem` |
| `npx tsx --env-file-if-exists=.env.local scripts/contentful/create-playlists.ts` | Creates `musicalReference` and `playlist`, or adds the fields they lack |
| `npx contentful-cli space migration … runway-music-archive.cjs` | Creates `runwayDesigner`, `runwayShow` and `runwaySong` |

The create scripts only add. None of them deletes or renames a field.
