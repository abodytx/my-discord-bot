import { logger } from './utils/logger';
// =====================================================
// index.ts — نقطة الانطلاق الرئيسية (Enterprise Edition)
// الهيكلية:
//   - client + player (discord-player)
//   - تحميل آمن للأوامر والأحداث (CrashGuard)
//   - محرك Anti-Nuke
//   - طبقة التخزين (MongoDB / JSON)
//   - لوحة التحكم السحابية (SSE + SPA)
// =====================================================

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Client, GatewayIntentBits, Partials, Collection, type ClientEvents } from 'discord.js';
import { Player, type GuildQueue, type Track } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeExtractor } from 'discord-player-youtube';

import { safe, install as installCrashGuard } from './modules/crashGuard';
import { emit } from './modules/liveHub';
import { AntiNukeEngine } from './modules/antiNuke';
import { createDashboard } from './dashboard/server';
import { nowPlayingEmbed, controlRow } from './utils/musicUI';
import { infoEmbed, errorEmbed } from './utils/embeds';
import { sanitize } from './utils/logger';
import { setYouTubeCookieValid, validateYouTubeCookie, hasYouTubeCookie } from './utils/musicSearch';
import { initStore } from './storage';
import { restoreGiveaways } from './modules/giveaway';
import type { CommandModule, EventModule, ExtendedClient } from './types';

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
}) as ExtendedClient;

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

async function setupExtractors(): Promise<void> {
    // تحقق من صلاحية كوكيز يوتيوب مرة واحدة عند الإقلاع.
    // إذا كانت مرفوضة (يوتيوب يحجب البث غالباً مؤخراً) نُفعّل SoundCloud مباشرة.
    if (process.env.YOUTUBE_COOKIE && process.env.YOUTUBE_COOKIE.trim()) {
        const valid = await validateYouTubeCookie();
        setYouTubeCookieValid(valid);
        if (valid) {
            logger.info('✅ كوكيز يوتيوب صالحة — تم تفعيل البث عبر يوتيوب.');
        } else {
            logger.warn('⚠️ كوكيز يوتيوب مرفوضة من يوتيوب — سيتم البحث عبر SoundCloud للأغاني.');
        }
    }

    // ملاحظة: تسجيل الـ extractors الافتراضية (SoundCloud...) أولاً
    // حتى لا يلوث YoutubeExtractor نتائج البحث (سبق إصلاحه)
    for (const ext of DefaultExtractors) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (player.extractors.register as any)(ext);
    }

    // تسجيل يوتيوب فقط عند توفر كوكيز صالحة، لأن الإنشاط ينشئ كائن Innertube
    // ضخم (يستهلك ذاكرة كبيرة على الخطة المجانية) حتى لو كان يوتيوب محجوباً.
    if (hasYouTubeCookie()) {
        await player.extractors.register(YoutubeExtractor, {
            cookie: process.env.YOUTUBE_COOKIE || undefined,
            disableYTJSLog: true
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        logger.info('🎵 تم تفعيل محرك يوتيوب.');
    } else {
        logger.info('🎵 يوتيوب معطّل (محجوب) — تم توفير الذاكرة، SoundCloud هو المصدر.');
    }
    logger.info('🎵 تم تحميل محركات الموسيقى بنجاح');
}

player.events.on('playerStart', (queue: GuildQueue, track: Track) => {
    const { channel } = (queue.metadata as { channel?: { send: (payload: unknown) => Promise<unknown> } }) || {};
    if (channel) {
        channel.send({ embeds: [nowPlayingEmbed(queue, track)], components: [controlRow(queue)] }).catch(() => {});
    }
});

player.events.on('emptyQueue', (queue: GuildQueue) => {
    const { channel } = (queue.metadata as { channel?: { send: (payload: unknown) => Promise<unknown> } }) || {};
    if (channel)
        channel.send({ embeds: [infoEmbed('🎶 انتهت القائمة', 'أضف أغاني جديدة عبر `/play`.')] }).catch(() => {});
});

player.events.on('emptyChannel', (queue: GuildQueue) => {
    const { channel } = (queue.metadata as { channel?: { send: (payload: unknown) => Promise<unknown> } }) || {};
    if (channel)
        channel
            .send({ embeds: [errorEmbed('غادر الجميع', 'غادر جميع الأعضاء الروم الصوتي، تم إيقاف التشغيل.')] })
            .catch(() => {});
    queue.delete();
});

function notifyPlaybackError(queue: GuildQueue | null, error: Error): void {
    const mem = process.memoryUsage();
    const memInfo = ` (الذاكرة: ${(mem.rss / 1024 / 1024).toFixed(0)}MB / حد 512MB)`;
    logger.error(`🎵 فشل تشغيل المقطع: ${error?.message}${memInfo}`);
    const { channel } = (queue?.metadata as { channel?: { send: (payload: unknown) => Promise<unknown> } }) || {};
    if (!channel) return;
    const message = String(error?.message || error || 'خطأ غير معروف');
    const hint =
        message.toLowerCase().includes('sign in') || message.includes('login')
            ? '\n\n> 💡 **السبب الشائع:** يوتيوب أصبح يطلب تسجيل دخول للبث. أضف كوكيز يوتيوب عبر متغير `YOUTUBE_COOKIE` في ملف `.env`، أو استخدم رابط SoundCloud مباشرة.'
            : '';
    channel
        .send({
            embeds: [errorEmbed('فشل تشغيل المقطع', `تعذر تشغيل هذا المقطع.\n\`${sanitize(message)}\`${hint}`)]
        })
        .catch(() => {});
    emit('log', { level: 'error', source: 'music', message: `فشل تشغيل: ${sanitize(message)}` });
}

player.events.on('error', (queue: GuildQueue, error: Error) => {
    logger.error('🎵 خطأ في مشغل الموسيقى:', error.message);
    notifyPlaybackError(queue, error);
});
player.events.on('playerError', (queue: GuildQueue, error: Error) => {
    logger.error('🎵 خطأ أثناء تشغيل مقطع:', error.message);
    notifyPlaybackError(queue, error);
});

// =====================================================
// تحميل الأوامر والأحداث (آمن من الأعطال)
// =====================================================
function loadFiles(dir: string, collection: Collection<string, CommandModule> | null, isEvent = false): void {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            loadFiles(fullPath, collection, isEvent);
        } else if (item.name.endsWith('.js') || item.name.endsWith('.ts')) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const raw = require(fullPath) as { default?: EventModule | CommandModule } & (
                    EventModule | CommandModule
                );
                const file = (raw.default || raw) as EventModule | CommandModule;
                if (isEvent) {
                    const ev = file as EventModule;
                    const wrapped = safe((...args: unknown[]) =>
                        (ev.execute as (...a: unknown[]) => Promise<unknown>)(...args, client)
                    );
                    if (ev.once) client.once(ev.name as keyof ClientEvents, wrapped as never);
                    else client.on(ev.name as keyof ClientEvents, wrapped as never);
                } else if ('data' in file) {
                    collection?.set((file as CommandModule).data.name, file as CommandModule);
                }
            } catch (err) {
                logger.error(`❌ فشل تحميل ${fullPath}:`, (err as Error).message);
            }
        }
    }
}

loadFiles(path.join(__dirname, 'commands'), client.commands, false);
loadFiles(path.join(__dirname, 'events'), null, true);

// استعادة السحوبات النشطة عند إعادة التشغيل
restoreGiveaways(client);

// =====================================================
// أحداث عامة
// =====================================================
client.on('ready', () => {
    emit('log', { level: 'success', source: 'boot', message: `تم تشغيل البوت: ${client.user?.tag}` });
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
async function boot(): Promise<void> {
    try {
        await initStore();
        await setupExtractors();

        if (!process.env.YOUTUBE_COOKIE) {
            logger.warn('⚠️ YOUTUBE_COOKIE غير مضبوط — سيتم استخدام SoundCloud كفال باك تلقائي.');
        }

        const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
        if (!token) {
            logger.error('❌ لم يتم العثور على توكن البوت! انسخ ملف .env.example إلى .env وضع التوكن فيه.');
            process.exit(1);
        }

        // عند التشغيل عبر ShardingManager: تشغيل الداشبورد على الشارد 0 فقط
        // لتجنب تعارض المنافذ بين العمليات
        if (!client.shard || client.shard.ids[0] === 0) {
            createDashboard({ client, player });
        }
        await client.login(token);
    } catch (err) {
        logger.error('❌ فشل تشغيل البوت:', err);
        emit('log', { level: 'error', source: 'boot', message: `فشل تشغيل البوت: ${(err as Error).message}` });
        process.exit(1);
    }
}

boot();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(): void {
    logger.info('👋 إيقاف التشغيل...');
    client.destroy();
    process.exit(0);
}
