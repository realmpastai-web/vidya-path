#!/usr/bin/env node
// Builds site/data from the approved playlists in catalog/playlists.json.
// Usage: YOUTUBE_API_KEY=... node scripts/build-index.mjs [--include-candidates]
import { mkdirSync, writeFileSync, rmSync, renameSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, taxonomy, loadCatalog, validateCatalog } from './lib/catalog.mjs';
import { createClient } from './lib/youtube.mjs';
import { parseDuration, rejectReason, buildShards } from './lib/transform.mjs';

export async function fetchPlaylists(entries, client, blocklist, log = console.log) {
  const fetched = new Map();
  const dropped = {};
  for (const entry of entries) {
    if (fetched.has(entry.playlistId)) continue;
    try {
      const meta = await client.playlist(entry.playlistId);
      if (!meta) {
        log(`skip  ${entry.playlistId}: playlist not found`);
        continue;
      }
      if (entry.channelId && meta.channelId !== entry.channelId) {
        // A playlist that moved to another channel has not been vetted.
        log(`skip  ${entry.playlistId}: now owned by a different channel`);
        continue;
      }
      const ids = await client.playlistVideoIds(entry.playlistId);
      const byId = new Map((await client.videos(ids)).map((v) => [v.id, v]));
      const videos = [];
      for (const id of ids) {
        const v = byId.get(id);
        const reason = v ? rejectReason(v, { blocklist }) : 'removed';
        if (reason) {
          dropped[reason] = (dropped[reason] || 0) + 1;
          continue;
        }
        videos.push({ id, title: v.snippet.title, seconds: parseDuration(v.contentDetails.duration) });
      }
      fetched.set(entry.playlistId, { title: meta.title, channel: meta.channel, videos });
      log(`ok    ${entry.playlistId}: ${videos.length}/${ids.length} videos  ${meta.title}`);
    } catch (err) {
      if (err.status === 404) {
        log(`skip  ${entry.playlistId}: not found`);
        continue;
      }
      throw err;
    }
  }
  return { fetched, dropped };
}

export function writeShards(files, outDir) {
  const tmp = outDir + '.tmp';
  rmSync(tmp, { recursive: true, force: true });
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(tmp, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(content));
  }
  // Swap in one step so a failed build never leaves a half-written index.
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  renameSync(tmp, outDir);
}

async function main() {
  const includeCandidates = process.argv.includes('--include-candidates');
  const catalog = loadCatalog();
  const errors = validateCatalog(catalog);
  if (errors.length) {
    console.error('Catalog problems:\n  ' + errors.join('\n  '));
    process.exit(1);
  }

  const entries = catalog.playlists.filter((p) =>
    p.status === 'approved' ||
    (includeCandidates && p.status === 'candidate' && p.level !== 'TODO' && p.subject !== 'TODO'));
  if (!entries.length) {
    console.error('No approved playlists in catalog/playlists.json yet. Nothing to build.');
    process.exit(1);
  }

  const client = createClient({ key: process.env.YOUTUBE_API_KEY });
  const blocklist = new Set(catalog.blocklist.map((b) => b.videoId));
  const { fetched, dropped } = await fetchPlaylists(entries, client, blocklist);
  const files = buildShards(entries, fetched, taxonomy, new Date().toISOString());

  const total = Object.values(files['manifest.json'].languages).reduce((n, l) => n + l.videos, 0);
  if (!total) {
    console.error('The build found no playable videos; keeping the existing index.');
    process.exit(1);
  }
  writeShards(files, path.join(ROOT, 'site', 'data'));

  console.log(`\nWrote ${Object.keys(files).length} files, ${total} videos.`);
  for (const [code, l] of Object.entries(files['manifest.json'].languages)) {
    console.log(`  ${code}: ${l.videos} videos in ${l.playlists} playlists`);
  }
  if (Object.keys(dropped).length) console.log('Dropped:', dropped);
  console.log(`API quota used: about ${client.stats.units} of 10,000 daily units.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
