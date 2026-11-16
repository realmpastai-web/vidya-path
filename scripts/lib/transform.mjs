// Pure functions that turn YouTube API data into the small JSON files the site reads.

export function parseDuration(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso || '');
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

// Returns null when a video may be shown, or a short reason why it is dropped.
export function rejectReason(video, { region = 'IN', minSeconds = 45, blocklist = new Set() } = {}) {
  const status = video.status || {};
  const details = video.contentDetails || {};
  const snippet = video.snippet || {};
  if (blocklist.has(video.id)) return 'blocklisted';
  if (status.privacyStatus !== 'public') return 'not public';
  if (status.embeddable === false) return 'embedding disabled';
  if (status.uploadStatus && status.uploadStatus !== 'processed') return 'not processed';
  if (snippet.liveBroadcastContent && snippet.liveBroadcastContent !== 'none') return 'live stream';
  if (details.contentRating && details.contentRating.ytRating === 'ytAgeRestricted') return 'age restricted';
  const rr = details.regionRestriction;
  if (rr && rr.blocked && rr.blocked.includes(region)) return 'blocked in ' + region;
  if (rr && rr.allowed && !rr.allowed.includes(region)) return 'blocked in ' + region;
  if (parseDuration(details.duration) < minSeconds) return 'too short';
  return null;
}

/*
 * entries:  catalog playlist entries [{ playlistId, lang, level, subject, title? }]
 * fetched:  Map playlistId -> { title, channel, videos: [{ id, title, seconds }] }
 * Returns   { 'manifest.json': {...}, 'hi/index.json': {...}, 'hi/pl/<id>.json': {...}, 'hi/search.json': [...] }
 */
export function buildShards(entries, fetched, taxonomy, generatedAt) {
  const files = {};
  const levelOrder = taxonomy.levels.map((l) => l.id);
  const subjectOrder = taxonomy.subjects.map((s) => s.id);
  const manifest = { generatedAt, languages: {} };

  for (const { code } of taxonomy.languages) {
    const shelves = new Map();
    const search = [];
    const seen = new Set();

    for (const entry of entries) {
      const pl = fetched.get(entry.playlistId);
      if (entry.lang !== code || !pl || !pl.videos.length) continue;
      const title = entry.title || pl.title;
      const key = entry.level + '/' + entry.subject;
      if (!shelves.has(key)) shelves.set(key, { level: entry.level, subject: entry.subject, playlists: [] });
      shelves.get(key).playlists.push({ id: entry.playlistId, title, channel: pl.channel, n: pl.videos.length });
      files[`${code}/pl/${entry.playlistId}.json`] = {
        id: entry.playlistId,
        title,
        channel: pl.channel,
        videos: pl.videos.map((v) => [v.id, v.title, v.seconds])
      };
      for (const v of pl.videos) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        search.push([v.id, v.title, entry.playlistId, entry.level, entry.subject]);
      }
    }

    const ordered = [...shelves.values()].sort((a, b) =>
      levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level) ||
      subjectOrder.indexOf(a.subject) - subjectOrder.indexOf(b.subject));
    files[`${code}/index.json`] = { shelves: ordered };
    files[`${code}/search.json`] = search;
    manifest.languages[code] = { videos: seen.size, playlists: ordered.reduce((n, s) => n + s.playlists.length, 0) };
  }

  files['manifest.json'] = manifest;
  return files;
}
