#!/usr/bin/env node
// Lists the playlists of every approved channel and proposes a level and subject for each.
// New playlists are appended to catalog/playlists.json as "candidate" for a person to review.
// Usage: YOUTUBE_API_KEY=... node scripts/discover.mjs
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadCatalog, validateCatalog } from './lib/catalog.mjs';
import { createClient } from './lib/youtube.mjs';
import { guess } from './lib/guess.mjs';

const catalog = loadCatalog();
const errors = validateCatalog(catalog);
if (errors.length) {
  console.error('Catalog problems:\n  ' + errors.join('\n  '));
  process.exit(1);
}

const channels = catalog.channels.filter((c) => c.status === 'approved');
if (!channels.length) {
  console.error('No approved channels yet. Approve some in catalog/channels.json first.');
  process.exit(1);
}

const client = createClient({ key: process.env.YOUTUBE_API_KEY });
const known = new Set(catalog.playlists.map((p) => `${p.lang}/${p.playlistId}`));
let added = 0;

for (const channel of channels) {
  const lists = await client.channelPlaylists(channel.channelId);
  for (const pl of lists) {
    if (!pl.videos || known.has(`${channel.lang}/${pl.playlistId}`)) continue;
    const g = guess(pl.title);
    catalog.playlists.push({
      playlistId: pl.playlistId,
      channelId: channel.channelId,
      lang: channel.lang,
      level: g.level || 'TODO',
      subject: g.subject || 'TODO',
      status: 'candidate',
      note: `${channel.name}: ${pl.title} (${pl.videos} videos)`
    });
    added++;
  }
  console.log(`${channel.name}: ${lists.length} playlists`);
}

writeFileSync(path.join(ROOT, 'catalog', 'playlists.json'), JSON.stringify(catalog.playlists, null, 2) + '\n');
console.log(`\nAdded ${added} candidate playlists. Review them, fix any TODO, and set status to "approved".`);
console.log(`API quota used: about ${client.stats.units} units.`);
