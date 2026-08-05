const { Player, QueryType } = require('discord-player');
const { Client } = require('discord.js');
const { DefaultExtractors } = require('@discord-player/extractor');

(async () => {
  const client = new Client({ intents: [] });
  const player = new Player(client);
  await player.extractors.register(DefaultExtractors);
  const query = 'test track';
  const res = await player.search(query, { searchEngine: QueryType.SOUNDCLOUD_SEARCH, requestedBy: null });
  console.log('Search result keys:', Object.keys(res));
  console.log('_data keys:', Object.keys(res._data), '| error?', res._data.error);
  const d = res._data;
  console.log('queryType:', d.queryType, '| tracks len:', d.tracks?.length, '| error?', d.error);
  if (d.error) console.log('SEARCH ERROR:', typeof d.error === 'object' ? JSON.stringify(d.error).slice(0, 300) : d.error);
  if (d.tracks?.length) console.log('first track:', d.tracks[0]?.title);
  process.exit(0);
  const track = res.tracks[0];
  console.log('Track:', track.title, '|', track.author, '| source:', track.source, '| ext:', track.extractor.identifier);

  // Simulate the player's createGenericStream: run extractors until stream returns non-false
  const ctx = player.extractors.getContext();
  const streamInfo = await player.extractors.run(async (extractor) => {
    const canStream = await extractor.validate(track.url, QueryResolverFallback(track.url));
    if (!canStream) return false;
    return await extractor.stream(track);
  }, false);

  console.log('streamInfo.extractor:', streamInfo?.extractor?.identifier);
  console.log('result type:', typeof streamInfo?.result, Array.isArray(streamInfo?.result) ? 'array' : (streamInfo?.result ? streamInfo.result.constructor?.name : ''));
  const result = streamInfo?.result;
  if (typeof result === 'string') {
    console.log('STREAM URL (first 160):', result.slice(0, 160));
    try {
      const head = await fetch(result, { method: 'HEAD' });
      console.log('HEAD status:', head.status, head.statusText);
      console.log('content-type:', head.headers.get('content-type'));
    } catch (e) {
      console.log('HEAD fetch ERROR:', e.message);
    }
  } else if (result && typeof result.stream !== 'undefined') {
    console.log('OBJECT stream type:', result.type, '| stream ctor:', result.stream?.constructor?.name);
  } else {
    console.log('UNEXPECTED result:', JSON.stringify(result)?.slice(0, 200));
  }
  process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });

function QueryResolverFallback(url) {
  return /soundcloud\.com/i.test(url) ? QueryType.SOUNDCLOUD : QueryType.AUTO;
}
