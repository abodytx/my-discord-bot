const { Player, QueryType } = require('discord-player');
const { Client } = require('discord.js');
const { DefaultExtractors } = require('@discord-player/extractor');

(async () => {
  const client = new Client({ intents: [] });
  const player = new Player(client);
  await player.extractors.register(DefaultExtractors);

  async function trySearch(label, query, engine) {
    try {
      const res = await player.search(query, { searchEngine: engine, requestedBy: null });
      const d = res._data || {};
      console.log(`[${label}] type=${d.queryType} tracks=${d.tracks?.length ?? 0} playlists=${d.playlists?.length ?? 0}`);
      if (d.tracks?.length) console.log('   first:', d.tracks[0].title);
      if (d.error) console.log('   error:', typeof d.error === 'object' ? JSON.stringify(d.error).slice(0, 200) : d.error);
      return d.tracks;
    } catch (e) {
      console.log(`[${label}] THREW:`, e.message);
      return null;
    }
  }

  await trySearch('SC_SEARCH keyword', 'imagine dragons believer', QueryType.SOUNDCLOUD_SEARCH);
  await trySearch('SC_AUTO keyword', 'imagine dragons believer', QueryType.AUTO);
  await trySearch('SC_URL track', 'https://soundcloud.com/imagine-dragons/believer-1', QueryType.SOUNDCLOUD);
  await trySearch('YT search', 'imagine dragons believer', QueryType.YOUTUBE_SEARCH);
  process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
