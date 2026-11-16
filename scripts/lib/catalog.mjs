// Loads and checks the hand-edited catalog files.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const taxonomy = require(path.join(ROOT, 'site', 'taxonomy.js'));

export const STATUSES = ['candidate', 'approved', 'rejected'];
const PLAYLIST_ID = /^[A-Za-z0-9_-]{13,}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function readJson(name) {
  return JSON.parse(readFileSync(path.join(ROOT, 'catalog', name), 'utf8'));
}

export function loadCatalog() {
  return {
    channels: readJson('channels.json'),
    playlists: readJson('playlists.json'),
    blocklist: readJson('blocklist.json')
  };
}

// Returns a list of human-readable problems; empty means the catalog is valid.
export function validateCatalog({ channels, playlists, blocklist }, tax = taxonomy) {
  const errors = [];
  const langs = new Set(tax.languages.map((l) => l.code));
  const levels = new Set(tax.levels.map((l) => l.id));
  const subjects = new Set(tax.subjects.map((s) => s.id));

  channels.forEach((c, i) => {
    const at = `channels[${i}] (${c.name || '?'})`;
    if (!c.name) errors.push(`${at}: missing name`);
    if (!langs.has(c.lang)) errors.push(`${at}: unknown lang "${c.lang}"`);
    if (!STATUSES.includes(c.status)) errors.push(`${at}: unknown status "${c.status}"`);
    if (c.channelId && !CHANNEL_ID.test(c.channelId)) errors.push(`${at}: channelId is not a YouTube channel id`);
    if (c.status === 'approved' && !c.channelId) errors.push(`${at}: approved channels need a channelId`);
  });

  const approvedChannels = new Set(channels.filter((c) => c.status === 'approved').map((c) => c.channelId));
  const seen = new Set();
  playlists.forEach((p, i) => {
    const at = `playlists[${i}] (${p.playlistId || '?'})`;
    if (!PLAYLIST_ID.test(p.playlistId || '')) errors.push(`${at}: playlistId is not a YouTube playlist id`);
    if (!langs.has(p.lang)) errors.push(`${at}: unknown lang "${p.lang}"`);
    // Proposals from discover.mjs may carry "TODO" until a person fills them in.
    const todoOk = p.status !== 'approved';
    if (!levels.has(p.level) && !(todoOk && p.level === 'TODO')) errors.push(`${at}: unknown level "${p.level}"`);
    if (!subjects.has(p.subject) && !(todoOk && p.subject === 'TODO')) errors.push(`${at}: unknown subject "${p.subject}"`);
    if (!STATUSES.includes(p.status)) errors.push(`${at}: unknown status "${p.status}"`);
    if (p.status === 'approved' && !approvedChannels.has(p.channelId)) {
      errors.push(`${at}: approved playlists must belong to an approved channel`);
    }
    const key = `${p.lang}/${p.playlistId}`;
    if (seen.has(key)) errors.push(`${at}: listed twice for "${p.lang}"`);
    seen.add(key);
  });

  blocklist.forEach((b, i) => {
    if (!VIDEO_ID.test(b.videoId || '')) errors.push(`blocklist[${i}]: videoId is not a YouTube video id`);
  });
  return errors;
}
