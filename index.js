// =====================================================
// index.js — نقطة الانطلاق الرئيسية (Enterprise Edition)
// الهيكلية:
//   - client + player (discord-player)
//   - تحميل آمن للأوامر والأحداث (CrashGuard)
//   - محرك Anti-Nuke
//   - لوحة التحكم السحابية (SSE + SPA)
// =====================================================

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection
} = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeExtractor } = require('discord-player-youtube');

const { safe, install: installCrashGuard } = require('./modules/crashGuard');
const { emit } = require('./modules/liveHub');
const AntiNukeEngine = require('./modules/antiNuke');
const { createDashboard } = require('./dashboard/server');
const { nowPlayingEmbed, controlRow } = require('./utils/musicUI');
const { infoEmbed, errorEmbed } = require('./utils/embeds');

// =====================================================
// Crash Prevention
// =====================================================
installCrashGuard();

// =====================================================
// البوت
// =====================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.spamTracker = new Collection();
client.xpTracker = new Collection();
client.antiNuke = new AntiNukeEngine(client);

// =====================================================
// محرك الموسيقى
// =====================================================
const player = new Player(client);
client.player = player;

async function setupExtractors() {
    await player.extractors.register(YoutubeExtractor, {
        cookie: process.env.YOUTUBE_COOKIE || null,
        disableYTJSLog: true
    });
    for (const ext of DefaultExtractors) {
        await player.extractors.register(ext);
    }
    console.log('🎵 تم تحميل محركات الموسيقى بنجاح');
}

player.events.on('playerStart', (queue, track) => {
    const { channel } = queue.metadata || {};
    if (channel) {
        channel.send({ embeds: [nowPlayingEmbed(queue, track)], components: [controlRow(queue)] }).catch(() => {});
    }
});

player.events.on('emptyQueue', (queue) => {
    const { channel } = queue.metadata || {};
    if (channel) channel.send({ embeds: [infoEmbed('🎶 انتهت القائمة', 'أضف أغاني جديدة عبر `/play`.')] }).catch(() => {});
});

player.events.on('emptyChannel', (queue) => {
    const { channel } = queue.metadata || {};
    if (channel) channel.send({ embeds: [errorEmbed('غادر الجميع', 'غادر جميع الأعضاء الروم الصوتي، تم إيقاف التشغيل.')] }).catch(() => {});
    queue.delete();
});

function notifyPlaybackError(queue, error) {
    const { channel } = queue?.metadata || {};
    if (!channel) return;
    const message = String(error?.message || error || 'خطأ غير معروف');
    const hint = message.toLowerCase().includes('sign in') || message.includes('login')
        ? '\n\n> 💡 **السبب الشائع:** يوتيوب أصبح يطلب تسجيل دخول للبث. أضف كوكيز يوتيوب عبر متغير `YOUTUBE_COOKIE` في ملف `.env`، أو استخدم رابط SoundCloud مباشرة.'
        : '';
    channel.send({
        embeds: [errorEmbed('فشل تشغيل المقطع', `تعذر تشغيل هذا المقطع.\n\`${message}\`${hint}`)]
    }).catch(() => {});
    emit('log', { level: 'error', source: 'music', message: `فشل تشغيل: ${message}` });
}

player.events.on('error', (queue, error) => {
    console.error('🎵 خطأ في مشغل الموسيقى:', error.message);
    notifyPlaybackError(queue, error);
});
player.events.on('playerError', (queue, error) => {
    console.error('🎵 خطأ أثناء تشغيل مقطع:', error.message);
    notifyPlaybackError(queue, error);
});

// =====================================================
// تحميل الأوامر والأحداث (آمن من الأعطال)
// =====================================================
function loadFiles(dir, collection, isEvent = false) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            loadFiles(fullPath, collection, isEvent);
        } else if (item.name.endsWith('.js')) {
            try {
                const file = require(fullPath);
                if (isEvent) {
                    const wrapped = safe((...args) => file.execute(...args, client));
                    if (file.once) client.once(file.name, wrapped);
                    else client.on(file.name, wrapped);
                } else if (file.data) {
                    collection.set(file.data.name, file);
                }
            } catch (err) {
                console.error(`❌ فشل تحميل ${fullPath}:`, err.message);
            }
        }
    }
}

loadFiles(path.join(__dirname, 'commands'), client.commands, false);
loadFiles(path.join(__dirname, 'events'), null, true);

// =====================================================
// أحداث عامة
// =====================================================
client.on('ready', () => {
    emit('log', { level: 'success', source: 'boot', message: `تم تشغيل البوت: ${client.user.tag}` });
});

client.on('guildCreate', (guild) => {
    emit('log', { level: 'success', source: 'guilds', message: `انضم البوت إلى سيرفر جديد: ${guild.name}` });
});

client.on('guildDelete', (guild) => {
    emit('log', { level: 'warn', source: 'guilds', message: `غادر البوت سيرفر: ${guild.name}` });
});

// =====================================================
// التشغيل
// =====================================================
async function boot() {
    try {
        await setupExtractors();

        if (!process.env.YOUTUBE_COOKIE) {
            console.warn('⚠️ YOUTUBE_COOKIE غير مضبوط — سيتم استخدام SoundCloud كفال باك تلقائي.');
        }

        const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
        if (!token) {
            console.error('❌ لم يتم العثور على توكن البوت! انسخ ملف .env.example إلى .env وضع التوكن فيه.');
            process.exit(1);
        }

        createDashboard({ client, player });
        await client.login(token);
    } catch (err) {
        console.error('❌ فشل تشغيل البوت:', err);
        emit('log', { level: 'error', source: 'boot', message: `فشل تشغيل البوت: ${err.message}` });
        process.exit(1);
    }
}

boot();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
    console.log('👋 إيقاف التشغيل...');
    client.destroy();
    process.exit(0);
}
