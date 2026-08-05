const { Player } = require('discord-player');
const { Client } = require('discord.js');
const { DefaultExtractors } = require('@discord-player/extractor');

(async () => {
  const client = new Client({ intents: [] });
  const player = new Player(client);
  await player.extractors.register(DefaultExtractors);

  console.log('extractors keys:', Object.keys(player.extractors));
  for (const k of Object.keys(player.extractors)) {
    const v = player.extractors[k];
    console.log(' ', k, '=>', typeof v === 'function' ? 'function' : Array.isArray(v) ? `array(${v.length})` : typeof v);
  }
  process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
