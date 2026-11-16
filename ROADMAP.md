# Roadmap

## Version 1 (this repository)

- Hindi, Kannada and English.
- Icon-led browsing by language, level and subject; playlist player; TV mode; search; low-data mode.
- Weekly index refresh and publishing to Hostinger.

## Next

1. **Fill the catalog.** Approve 5–8 channels per language, starting with the Start and Class 3–5 levels
   and a Computers & AI shelf.
2. **More languages.** Tamil, Telugu, Marathi, Bengali and Odia. Each needs an entry in
   `site/taxonomy.js`, interface text, and a reviewer who speaks the language.
3. **State shortcuts.** Choosing a state preselects its language and its state-board playlists.
4. **Concept-level paths.** Map playlists to chapter-level concepts so a child can follow
   "fractions" across classes and channels.
5. **Progress on the device.** Tick marks for watched videos and a "continue" tile on the home page.
6. **Installable app shell.** A service worker so the pages and index open without a connection.
7. **Volunteer intake.** A shared spreadsheet where teachers propose channels, fed into `catalog/`.

## Offline packs

Goal: a village with no connection can still learn, from an SD card, a pen drive or a small local
Wi-Fi box in a school or community centre.

YouTube's terms do not allow us to download and redistribute ordinary YouTube videos, so packs can
only contain:

- videos published under a Creative Commons licence (the API reports this, so the build can list them);
- videos whose owners give written permission; and
- open material from public sources such as government education portals, where their terms allow it.

Planned steps:

1. Record each video's licence in the index and show how much of each shelf is pack-eligible.
2. Ask the largest non-profit channels for permission to include their lessons.
3. Produce a pack per language and level: low-bitrate video files plus the same site, pointing at
   local files instead of YouTube.
4. Document a low-cost local Wi-Fi box that serves a pack to nearby phones.
