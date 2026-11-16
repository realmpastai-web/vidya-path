import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, rejectReason, buildShards } from '../scripts/lib/transform.mjs';
import { guess } from '../scripts/lib/guess.mjs';
import { taxonomy, loadCatalog, validateCatalog } from '../scripts/lib/catalog.mjs';
import { createClient } from '../scripts/lib/youtube.mjs';
import { fetchPlaylists } from '../scripts/build-index.mjs';

const video = (id, over = {}) => ({
  id,
  snippet: { title: 'Title ' + id, liveBroadcastContent: 'none', ...over.snippet },
  contentDetails: { duration: 'PT5M', ...over.contentDetails },
  status: { privacyStatus: 'public', embeddable: true, uploadStatus: 'processed', ...over.status }
});

test('parseDuration reads ISO 8601 durations', () => {
  assert.equal(parseDuration('PT1H2M3S'), 3723);
  assert.equal(parseDuration('PT45S'), 45);
  assert.equal(parseDuration('P1DT1S'), 86401);
  assert.equal(parseDuration('P0D'), 0);
  assert.equal(parseDuration(undefined), 0);
});

test('rejectReason keeps only videos a child in India can play in an embed', () => {
  assert.equal(rejectReason(video('a')), null);
  assert.equal(rejectReason(video('a', { status: { embeddable: false } })), 'embedding disabled');
  assert.equal(rejectReason(video('a', { status: { privacyStatus: 'private' } })), 'not public');
  assert.equal(rejectReason(video('a', { snippet: { liveBroadcastContent: 'live' } })), 'live stream');
  assert.equal(rejectReason(video('a', { contentDetails: { duration: 'PT20S' } })), 'too short');
  assert.equal(rejectReason(video('a', { contentDetails: { contentRating: { ytRating: 'ytAgeRestricted' } } })), 'age restricted');
  assert.equal(rejectReason(video('a', { contentDetails: { regionRestriction: { blocked: ['IN'] } } })), 'blocked in IN');
  assert.equal(rejectReason(video('a', { contentDetails: { regionRestriction: { allowed: ['US'] } } })), 'blocked in IN');
  assert.equal(rejectReason(video('a', { contentDetails: { regionRestriction: { allowed: ['IN'] } } })), null);
  assert.equal(rejectReason(video('a'), { blocklist: new Set(['a']) }), 'blocklisted');
});

test('buildShards groups playlists into ordered shelves per language', () => {
  const entries = [
    { playlistId: 'PLmaths', lang: 'hi', level: 'primary', subject: 'maths' },
    { playlistId: 'PLstory', lang: 'hi', level: 'start', subject: 'stories', title: 'My title' },
    { playlistId: 'PLempty', lang: 'hi', level: 'start', subject: 'maths' },
    { playlistId: 'PLen', lang: 'en', level: 'start', subject: 'stories' }
  ];
  const fetched = new Map([
    ['PLmaths', { title: 'Maths', channel: 'C1', videos: [{ id: 'v1', title: 'Add', seconds: 60 }, { id: 'v2', title: 'Subtract', seconds: 90 }] }],
    ['PLstory', { title: 'Stories', channel: 'C2', videos: [{ id: 'v3', title: 'Fox', seconds: 120 }] }],
    ['PLempty', { title: 'Empty', channel: 'C2', videos: [] }],
    ['PLen', { title: 'Rhymes', channel: 'C3', videos: [{ id: 'v4', title: 'Rain', seconds: 80 }] }]
  ]);
  const files = buildShards(entries, fetched, taxonomy, '2026-01-01T00:00:00Z');

  const hi = files['hi/index.json'].shelves;
  assert.deepEqual(hi.map((s) => s.level + '/' + s.subject), ['start/stories', 'primary/maths']);
  assert.deepEqual(hi[0].playlists, [{ id: 'PLstory', title: 'My title', channel: 'C2', n: 1 }]);
  assert.deepEqual(files['hi/pl/PLmaths.json'].videos, [['v1', 'Add', 60], ['v2', 'Subtract', 90]]);
  assert.equal(files['hi/pl/PLempty.json'], undefined);
  assert.deepEqual(files['hi/search.json'][0], ['v1', 'Add', 'PLmaths', 'primary', 'maths']);
  assert.deepEqual(files['manifest.json'].languages.hi, { videos: 3, playlists: 2 });
  assert.deepEqual(files['manifest.json'].languages.kn, { videos: 0, playlists: 0 });
  assert.deepEqual(files['kn/index.json'], { shelves: [] });
});

test('guess proposes level and subject from playlist titles', () => {
  assert.deepEqual(guess('Class 4 Maths - Fractions'), { level: 'primary', subject: 'maths' });
  assert.deepEqual(guess('कक्षा 7 विज्ञान'), { level: 'middle', subject: 'science' });
  assert.deepEqual(guess('3ನೇ ತರಗತಿ ಗಣಿತ'), { level: 'primary', subject: 'maths' });
  assert.deepEqual(guess('10th class physics'), { level: 'secondary', subject: 'science' });
  assert.deepEqual(guess('Nursery rhymes for kids'), { level: 'start', subject: 'stories' });
  assert.deepEqual(guess('Random uploads'), { level: null, subject: null });
});

test('the committed catalog is valid', () => {
  assert.deepEqual(validateCatalog(loadCatalog()), []);
});

test('validateCatalog refuses approved playlists from unapproved channels', () => {
  const channelId = 'UC' + 'a'.repeat(22);
  const playlist = { playlistId: 'PL' + 'b'.repeat(16), channelId, lang: 'hi', level: 'start', subject: 'maths', status: 'approved' };
  const channel = { name: 'X', lang: 'hi', channelId, status: 'candidate' };
  const bad = validateCatalog({ channels: [channel], playlists: [playlist], blocklist: [] });
  assert.match(bad.join('\n'), /must belong to an approved channel/);
  const good = validateCatalog({ channels: [{ ...channel, status: 'approved' }], playlists: [playlist], blocklist: [] });
  assert.deepEqual(good, []);
  const todo = validateCatalog({ channels: [], playlists: [{ ...playlist, level: 'TODO', status: 'candidate' }], blocklist: [] });
  assert.deepEqual(todo, []);
  const todoApproved = validateCatalog({ channels: [{ ...channel, status: 'approved' }], playlists: [{ ...playlist, level: 'TODO' }], blocklist: [] });
  assert.match(todoApproved.join('\n'), /unknown level/);
});

// A fake API: one playlist of 51 videos spread over two pages.
function fakeFetch(calls) {
  const ids = Array.from({ length: 51 }, (_, i) => 'vid' + String(i).padStart(8, '0'));
  return async (url, opts) => {
    calls.push({ url: String(url), headers: opts.headers });
    const p = url.searchParams;
    const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
    if (url.pathname.endsWith('/playlists')) {
      if (p.get('id') === 'PLmissing0000000') return json({ items: [] });
      return json({ items: [{ id: p.get('id'), snippet: { title: 'Counting', channelTitle: 'Good Channel', channelId: 'UCgood' } }] });
    }
    if (url.pathname.endsWith('/playlistItems')) {
      const second = p.get('pageToken') === 'p2';
      const page = second ? ids.slice(50) : ids.slice(0, 50);
      return json({ items: page.map((videoId) => ({ contentDetails: { videoId } })), nextPageToken: second ? undefined : 'p2' });
    }
    if (url.pathname.endsWith('/videos')) {
      const wanted = p.get('id').split(',');
      return json({
        items: wanted.filter((id) => id !== ids[1]).map((id) =>
          video(id, id === ids[2] ? { status: { embeddable: false } } : {}))
      });
    }
    return json({ error: 'unexpected' }, 400);
  };
}

test('fetchPlaylists pages through a playlist, keeps order and drops unusable videos', async () => {
  const calls = [];
  const client = createClient({ key: 'test-key', fetchImpl: fakeFetch(calls) });
  const entries = [
    { playlistId: 'PLcounting000000', channelId: 'UCgood' },
    { playlistId: 'PLmissing0000000', channelId: 'UCgood' },
    { playlistId: 'PLmoved000000000', channelId: 'UCother' }
  ];
  const { fetched, dropped } = await fetchPlaylists(entries, client, new Set(['vid00000003']), () => {});

  assert.deepEqual([...fetched.keys()], ['PLcounting000000']);
  const pl = fetched.get('PLcounting000000');
  assert.equal(pl.channel, 'Good Channel');
  assert.equal(pl.videos.length, 48);
  assert.deepEqual(pl.videos.slice(0, 2).map((v) => v.id), ['vid00000000', 'vid00000004']);
  assert.deepEqual(dropped, { removed: 1, 'embedding disabled': 1, blocklisted: 1 });
  assert.ok(calls.every((c) => c.headers['X-Goog-Api-Key'] === 'test-key' && !c.url.includes('test-key')));
});
