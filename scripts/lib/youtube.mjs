// Minimal YouTube Data API v3 client. No dependencies; needs Node 18+ for fetch.

const BASE = 'https://www.googleapis.com/youtube/v3/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createClient({ key, fetchImpl = fetch, retryDelayMs = 1500 }) {
  if (!key) throw new Error('YOUTUBE_API_KEY is not set');
  const stats = { units: 0 };

  async function call(resource, params) {
    const url = new URL(BASE + resource);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
    for (let attempt = 1; ; attempt++) {
      let res;
      try {
        // The key travels in a header so it never ends up in logged URLs.
        res = await fetchImpl(url, { headers: { 'X-Goog-Api-Key': key } });
      } catch (err) {
        if (attempt >= 3) throw err;
        await sleep(retryDelayMs * attempt);
        continue;
      }
      stats.units += resource === 'search' ? 100 : 1;
      if (res.ok) return res.json();
      if (res.status >= 500 && attempt < 3) {
        await sleep(retryDelayMs * attempt);
        continue;
      }
      const body = await res.text();
      const err = new Error(`${resource} failed with ${res.status}: ${body.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
  }

  async function paged(resource, params) {
    const items = [];
    let pageToken;
    do {
      const page = await call(resource, { ...params, maxResults: 50, pageToken });
      items.push(...(page.items || []));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return items;
  }

  return {
    stats,

    async playlist(playlistId) {
      const data = await call('playlists', { part: 'snippet', id: playlistId });
      const item = (data.items || [])[0];
      if (!item) return null;
      return { title: item.snippet.title, channel: item.snippet.channelTitle, channelId: item.snippet.channelId };
    },

    // Video ids in the order the channel arranged them.
    async playlistVideoIds(playlistId) {
      const items = await paged('playlistItems', { part: 'contentDetails', playlistId });
      return items.map((i) => i.contentDetails.videoId);
    },

    async videos(ids) {
      const out = [];
      for (let i = 0; i < ids.length; i += 50) {
        const data = await call('videos', {
          part: 'snippet,contentDetails,status',
          id: ids.slice(i, i + 50).join(',')
        });
        out.push(...(data.items || []));
      }
      return out;
    },

    async channelPlaylists(channelId) {
      const items = await paged('playlists', { part: 'snippet,contentDetails', channelId });
      return items.map((i) => ({ playlistId: i.id, title: i.snippet.title, videos: i.contentDetails.itemCount }));
    },

    // Costs 100 quota units per call. Only for a person looking up a channel by name.
    async searchChannels(query) {
      const found = await call('search', { part: 'snippet', type: 'channel', q: query, maxResults: 5 });
      const ids = (found.items || []).map((i) => i.id.channelId);
      if (!ids.length) return [];
      const data = await call('channels', { part: 'snippet,statistics', id: ids.join(',') });
      return (data.items || []).map((c) => ({
        channelId: c.id,
        title: c.snippet.title,
        handle: c.snippet.customUrl || '',
        country: c.snippet.country || '',
        subscribers: Number(c.statistics.subscriberCount || 0),
        videos: Number(c.statistics.videoCount || 0)
      })).sort((a, b) => b.subscribers - a.subscribers);
    }
  };
}
