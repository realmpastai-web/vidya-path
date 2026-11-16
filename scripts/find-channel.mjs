#!/usr/bin/env node
// Looks up a channel by name so a person can copy the right channelId into catalog/channels.json.
// Each run costs about 101 of the 10,000 daily quota units.
// Usage: YOUTUBE_API_KEY=... node scripts/find-channel.mjs "Khan Academy India Hindi"
import { createClient } from './lib/youtube.mjs';

const query = process.argv.slice(2).join(' ').trim();
if (!query) {
  console.error('Usage: node scripts/find-channel.mjs "channel name"');
  process.exit(1);
}

const client = createClient({ key: process.env.YOUTUBE_API_KEY });
const results = await client.searchChannels(query);
if (!results.length) console.log('No channels found.');
for (const c of results) {
  console.log(`${c.channelId}  ${c.title}  ${c.handle}  ${c.country || '--'}  ` +
    `${c.subscribers.toLocaleString('en-IN')} subscribers, ${c.videos} videos`);
}
