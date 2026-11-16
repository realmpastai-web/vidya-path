#!/usr/bin/env node
// For every channel in catalog/channels.json that has no channelId yet, looks the name up on
// YouTube and writes the best matches to catalog/channel-suggestions.md for a person to review.
// Nothing is approved here. Each lookup costs about 101 of the 10,000 daily quota units.
// Usage: YOUTUBE_API_KEY=... node scripts/suggest-channels.mjs
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadCatalog } from './lib/catalog.mjs';
import { createClient } from './lib/youtube.mjs';

const { channels } = loadCatalog();
const pending = channels.filter((c) => !c.channelId && c.status === 'candidate');
const client = createClient({ key: process.env.YOUTUBE_API_KEY });

const lines = [
  '# Channel suggestions',
  '',
  'Written by `scripts/suggest-channels.mjs`. These are search results, not approvals.',
  'For each name, pick the row that is the real channel, watch a sample, then copy its id into',
  '`catalog/channels.json` and set `"status": "approved"`.',
  ''
];

for (const channel of pending) {
  lines.push(`## ${channel.name} (${channel.lang})`, '');
  let results = [];
  try {
    results = await client.searchChannels(channel.name);
  } catch (err) {
    lines.push(`Lookup failed: ${err.message}`, '');
    console.error(`${channel.name}: ${err.message}`);
    if (err.status === 403 || err.status === 400) break; // bad key or quota spent; stop early
    continue;
  }
  if (!results.length) {
    lines.push('No channels found.', '');
    continue;
  }
  lines.push('| Channel id | Title | Handle | Country | Subscribers | Videos |', '|---|---|---|---|---|---|');
  for (const r of results) {
    const title = r.title.replace(/\|/g, '/');
    const link = `[${title}](https://www.youtube.com/channel/${r.channelId})`;
    lines.push(`| \`${r.channelId}\` | ${link} | ${r.handle} | ${r.country || '--'} | ` +
      `${r.subscribers.toLocaleString('en-IN')} | ${r.videos} |`);
  }
  lines.push('');
  console.log(`${channel.name}: ${results.length} matches`);
}

if (!pending.length) lines.push('Every channel already has an id.', '');
writeFileSync(path.join(ROOT, 'catalog', 'channel-suggestions.md'), lines.join('\n'));
console.log(`\nAPI quota used: about ${client.stats.units} units.`);
