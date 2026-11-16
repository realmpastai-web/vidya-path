# Vidya Path

One place for children in rural India to learn from the best free videos in their own language,
from first letters and numbers up to computers and AI.

No video is hosted here. The site is a curated, searchable index of YouTube videos, played through
YouTube's privacy-enhanced (`youtube-nocookie.com`) embeds. "Vidya Path" is a working name; change it
in `site/config.js` and `site/index.html`.

## What a child sees

1. Pick a language (Hindi, Kannada or English to begin with).
2. Pick a level: Start (age 3–6), Class 1–2, Class 3–5, Class 6–8 or Class 9–10. Only levels with content appear.
3. Pick a subject, shown as a large icon.
4. Play one playlist in order, or press **Play TV** to play every playlist on that shelf back to back.

The pages are about 27 KB in total with no frameworks, fonts or trackers. The **Low data** button
(the turtle) turns off thumbnails; it switches on by itself on 2G/3G or when the phone's data saver is on.
The site stores only the chosen language, the low-data choice and the last video watched, on the device.

## How it works

```
catalog/channels.json    channels a person has vetted (or is considering)
catalog/playlists.json   playlists tagged with language, level and subject
catalog/blocklist.json   single videos to hide
        │  scripts/build-index.mjs  (YouTube Data API)
        ▼
site/data/               small JSON files, one per language and playlist
site/                    the static site that Hostinger serves
```

The build keeps the channel's own playlist order, and drops videos that are private, removed,
age-restricted, live, blocked in India, shorter than 45 seconds or not embeddable.
If a playlist moves to a different channel it is skipped until someone re-approves it.

## Adding content

You need a YouTube Data API key (free): create a project in Google Cloud Console, enable
"YouTube Data API v3", and create an API key restricted to that API.

```sh
export YOUTUBE_API_KEY=...            # never commit this

npm run find-channel -- "Khan Academy India Hindi"   # 1. find the channel id (about 101 quota units)
# 2. paste the id into catalog/channels.json, watch a sample of videos, set "status": "approved"
npm run discover                      # 3. proposes that channel's playlists as "candidate"
# 4. in catalog/playlists.json fix level/subject, set "status": "approved" on the good ones
npm run build                         # 5. writes site/data
npm run serve                         # 6. open http://localhost:8080
```

`npm run fixture` writes made-up data so the pages can be tried without a key (nothing will play).
`npm test` runs the unit tests.

### Vetting rules

A channel is approved only after a fluent speaker of that language has watched a sample and confirmed:

- the teaching is accurate and the language is natural, not machine-dubbed;
- no sales pitches for coaching, apps or toys; no religious or political content;
- the channel is stable and its videos allow embedding.

Prefer government and non-profit sources. The names in `catalog/channels.json` are suggestions written
from memory and have **not** been checked; every one starts as `candidate` with no channel id.

## Putting it on Hostinger

1. In the GitHub repository settings, add a secret named `YOUTUBE_API_KEY`.
2. The workflow in `.github/workflows/refresh.yml` runs the tests, rebuilds the index and pushes the
   finished site to a branch called `deploy`. It runs weekly, on every catalog change, and on demand.
3. In Hostinger hPanel open **Advanced → Git**, add this repository with branch `deploy` and install
   path `public_html`, then enable auto-deployment by adding the webhook URL Hostinger shows you to
   the repository's webhooks. (Menu names may differ slightly on your plan.)

Running cost: your existing hosting plan plus the domain. The API is free at this size; a full rebuild
of a few thousand videos uses a few hundred of the 10,000 daily quota units.

## Known limits

- YouTube may show adverts inside the player. We cannot remove them.
- Low-data mode slims our pages only. YouTube chooses the video quality itself.
- With `rel=0`, YouTube can still suggest videos from the same channel when a video is paused.
  When a video ends the site moves straight to the next one, so the end-screen suggestions do not appear.
- The Hindi and Kannada interface text in `site/taxonomy.js` needs a native-speaker check.

See [ROADMAP.md](ROADMAP.md) for what comes next.
