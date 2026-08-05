const { Player, QueryType } = require('discord-player');
const { Client } = require('discord.js');
const { DefaultExtractors } = require('@discord-player/extractor');

(async () => {
  const client = new Client({ intents: [] });
  const player = new Player(client);
  await player.extractors.register(DefaultExtractors);

  const ctx = await player.extractors.context.provide(
    { id: 'test', attemptedExtractors: new Set(), bridgeAttemptedExtractors: new Set() },
    async () => player.extractors.getContext()
  );
  const exts = ctx.extractors || player.extractors.store.extractors || player.extractors.store.get() || [];
  console.log('store keys:', Object.keys(player.extractors.store));
  console.log('exts type:', Array.isArray(exts) ? 'array' : typeof exts);
  if (typeof exts === 'object' && !Array.isArray(exts)) console.log('store obj keys:', Object.keys(exts));

  console.log('Registered:', (Array.isArray(exts) ? exts : Object.values(exts)).map(e => e?.identifier).join(', '));

  const list = Array.isArray(exts) ? exts : Object.values(exts || {});
  for (const ex of list) {
    if (!['soundcloud', 'youtube'].includes(ex.identifier)) continue;
    try {
      console.log(`\n=== direct handle: ${ex.identifier} ===`);
      const q = ex.identifier === 'youtube'
        ? { query: 'imagine dragons believer', type: QueryType.YOUTUBE_SEARCH }
        : { query: 'imagine dragons believer', type: QueryType.SOUNDCLOUD_SEARCH };
      const out = await ex.handle(q);
      console.log('return keys:', Object.keys(out));
      if (out.entries) console.log('entries:', out.entries.length, '| first:', out.entries[0]?.title);
      if (out.pageInfo) console.log('pageInfo:', JSON.stringify(out.pageInfo).slice(0, 150));
      if (out.error) console.log('ERROR:', typeof out.error === 'object' ? JSON.stringify(out.error).slice(0, 300) : out.error);
    } catch (e) {
      console.log(`THREW ${ex.identifier}:`, e.message);
    }
  }
  process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
