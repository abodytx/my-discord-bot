import { logger } from '../utils/logger';
// =====================================================
// Dashboard Server - لوحة التحكم السحابية Enterprise
// - مصادقة بالكوكيز + SSE Live (metrics + live console)
// - APIs كاملة: settings / protection / economy / tickets / welcome / moderation / music
// - واجهة SPA ثابتة في dashboard/public
// =====================================================

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { spawn } from 'child_process';
import express, { type Request, type Response, type NextFunction } from 'express';
import {
    ActivityType,
    PermissionFlagsBits,
    ChannelType,
    type TextChannel,
    type VoiceChannel,
    type GuildTextBasedChannel
} from 'discord.js';
import { Track, type Player } from 'discord-player';

import { getGuildSettings, updateGuildSettings } from '../utils/settings';
import { infoEmbed } from '../utils/embeds';
import { ytDlpResolve, ytDlpSearch, formatDurationMs } from '../utils/ytdlp';
import { isYouTubeUrl, hasYouTubeCookie } from '../utils/musicSearch';
import { hub, getBuffer, emit } from '../modules/liveHub';
import * as economy from '../modules/economy';
import { guildBackgroundPath, hasCustomBackground } from '../modules/welcomeCards';
import type { ExtendedClient } from '../types';

const PUBLIC_DIR = path.resolve(process.cwd(), 'dashboard', 'public');
const CONFIG_FILE = path.resolve(process.cwd(), 'config.json');

interface AppConfig {
    bot: { activityText: string };
}

function loadConfig(): AppConfig {
    const config: AppConfig = { bot: { activityText: 'لوحة التحكم الشاملة' } };
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            config.bot = { ...config.bot, ...(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as AppConfig).bot };
        } catch {
            /* ignore */
        }
    }
    return config;
}

function saveConfig(config: AppConfig): void {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch {
        /* ignore */
    }
}

// ---------- مقاييس النظام ----------
function sampleCpu(): Promise<number> {
    const cpus1 = os.cpus();
    return new Promise((resolve) => {
        setTimeout(() => {
            const cpus2 = os.cpus();
            let idle = 0;
            let total = 0;
            for (let i = 0; i < cpus2.length; i++) {
                const t1 = cpus1[i].times;
                const t2 = cpus2[i].times;
                idle += t2.idle - t1.idle;
                total +=
                    t2.user -
                    t1.user +
                    (t2.nice - t1.nice) +
                    (t2.sys - t1.sys) +
                    (t2.irq - t1.irq) +
                    (t2.idle - t1.idle);
            }
            resolve(total ? Math.min(100, Math.max(0, (1 - idle / total) * 100)) : 0);
        }, 300);
    });
}

function getMetrics(cpuPct: number): Record<string, unknown> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
        servers: client.guilds.cache.size,
        members: client.guilds.cache.reduce((a: number, g) => a + (g.memberCount || 0), 0),
        ping: Math.round(client.ws.ping) || 0,
        cpu: Number((cpuPct || 0).toFixed(1)),
        memPercent: Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)),
        heapMB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
        uptimeSec: Math.floor(process.uptime()),
        ready: Boolean(client.readyAt)
    };
}

// ---------- مرشحات مساعدة ----------

// =====================================================
// إنشاء الخادم
// =====================================================
let client: ExtendedClient;
let player: Player;

export interface DashboardOptions {
    client: ExtendedClient;
    player: Player;
}

export function createDashboard({ client: _client, player: _player }: DashboardOptions): ReturnType<typeof buildApp> {
    client = _client;
    player = _player;
    return buildApp();
}

function buildApp() {
    const app = express();
    const PORT = process.env.PORT || 3000;
    const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin';
    const SESSION_SECRET = process.env.DASHBOARD_SECRET || crypto.randomBytes(16).toString('hex');
    const AUTH_COOKIE = 'auth_token';
    const AUTH_HASH = crypto
        .createHash('sha256')
        .update(DASHBOARD_PASSWORD + SESSION_SECRET)
        .digest('hex');

    if (!process.env.DASHBOARD_PASSWORD) {
        logger.warn('⚠️ لم يتم ضبط DASHBOARD_PASSWORD — تم استخدام الافتراضي "admin". غيّرها في .env!');
    }

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json({ limit: '2mb' }));
    app.use('/api/welcome/background', express.raw({ type: ['image/*', 'application/octet-stream'], limit: '10mb' }));

    function parseCookies(req: Request): Record<string, string> {
        const out: Record<string, string> = {};
        const header = req.headers.cookie;
        if (!header) return out;
        for (const part of header.split(';')) {
            const idx = part.indexOf('=');
            if (idx === -1) continue;
            out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
        }
        return out;
    }
    const isAuthed = (req: Request): boolean => parseCookies(req)[AUTH_COOKIE] === AUTH_HASH;

    function requirePageAuth(req: Request, res: Response, next: NextFunction): void {
        if (isAuthed(req)) return next();
        res.redirect('/login');
    }
    function requireApiAuth(req: Request, res: Response, next: NextFunction): void {
        if (isAuthed(req)) return next();
        res.status(401).json({ error: 'غير مصرح' });
    }

    function pageShell(body: string, title = 'لوحة التحكم'): string {
        return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head><body>${body}</body></html>`;
    }

    // ---------- المصادقة ----------
    app.get('/login', (req, res) => {
        if (isAuthed(req)) return res.redirect('/');
        res.send(
            pageShell(
                `<style>body{background:#070b1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Segoe UI,sans-serif;margin:0}
            form{background:rgba(20,30,60,.6);backdrop-filter:blur(14px);border:1px solid rgba(0,240,255,.3);border-radius:20px;padding:40px;width:360px;box-shadow:0 0 60px rgba(0,240,255,.15)}
            h1{color:#00f0ff;text-align:center;margin-bottom:24px}input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #233;background:#0b1120;color:#fff;margin-bottom:16px}
            button{width:100%;padding:12px;border-radius:10px;border:none;background:linear-gradient(90deg,#00f0ff,#ff2ec4);color:#000;font-weight:bold;font-size:16px;cursor:pointer}</style>
            <form method="POST" action="/login">
                <h1>🔐 لوحة التحكم</h1>
                <input type="password" name="password" placeholder="كلمة المرور" required>
                <button type="submit">دخول</button>
            </form>`,
                'تسجيل الدخول'
            )
        );
    });

    app.post('/login', (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = (req.body || {}) as Record<string, any>;
        if (body.password === DASHBOARD_PASSWORD) {
            res.setHeader('Set-Cookie', `${AUTH_COOKIE}=${AUTH_HASH}; Path=/; HttpOnly; Max-Age=86400`);
            return res.redirect('/');
        }
        res.send(
            pageShell(
                `<h2 style="color:#ff2e2e;text-align:center;padding-top:40vh">❌ كلمة المرور خاطئة</h2><p style="text-align:center"><a href="/login">إعادة المحاولة</a></p>`
            )
        );
    });

    app.get('/logout', (_req, res) => {
        res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
        res.redirect('/login');
    });

    // ---------- فحص الصحة (Healthcheck لـ Render) ----------
    app.get('/healthz', (_req, res) => {
        res.json({
            status: 'ok',
            engine: 'ytdlp',
            bot: Boolean(client.readyAt),
            uptime: Math.floor(process.uptime()),
            guilds: client.guilds.cache.size
        });
    });

    // ---------- تشخيص الموسيقى (اختبار حقيقي على الخادم، سريع) ----------
    let lastDiag = 0;
    app.get('/diag/music', async (_req, res) => {
        const now = Date.now();
        if (now - lastDiag < 10_000) return res.status(429).json({ error: 'مهلاً — انتظر 10 ثوانٍ بين الفحوصات' });
        lastDiag = now;
        const out: Record<string, unknown> = { time: new Date().toISOString(), platform: process.platform };
        const timeout = <T>(ms: number, p: Promise<T>, fallback: T): Promise<T> =>
            Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
        try {
            logger.info('[DIAG] بدء فحص الموسيقى...');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const yt = require('youtube-dl-exec') as { constants: { YOUTUBE_DL_PATH: string } };
            out.ytDlpBinary = yt.constants.YOUTUBE_DL_PATH;
            out.ytDlpExists = fs.existsSync(yt.constants.YOUTUBE_DL_PATH);
            logger.info(`[DIAG] yt-dlp: ${out.ytDlpBinary} (موجود: ${out.ytDlpExists})`);

            let ffmpegPath: string | null = null;
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                ffmpegPath = require('ffmpeg-static') as string | null;
                out.ffmpegStaticExists = ffmpegPath ? fs.existsSync(ffmpegPath) : false;
                logger.info(`[DIAG] ffmpeg-static: ${ffmpegPath} (موجود: ${out.ffmpegStaticExists})`);
            } catch (e) {
                out.ffmpegStatic = `غير متاح: ${(e as Error).message}`;
            }
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { FFmpeg } = require('@discord-player/ffmpeg') as {
                    FFmpeg: { resolve: (force?: boolean) => { path: string } };
                };
                out.ffmpegResolved = FFmpeg.resolve().path;
                logger.info(`[DIAG] ffmpeg (discord-player): ${out.ffmpegResolved}`);
            } catch (e) {
                out.ffmpegResolveError = (e as Error).message;
            }

            logger.info('[DIAG] فحص الاتصال العام بالإنترنت عبر IPv4 (facebook.com)...');
            const t0 = Date.now();
            const egress = await timeout(
                12_000,
                new Promise((resolve) => {
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    const https = require('https');
                    const req = https.get(
                        {
                            host: 'www.google.com',
                            path: '/',
                            family: 4,
                            timeout: 10_000,
                            headers: { 'user-agent': 'diagnostic' }
                        },
                        (r: { statusCode?: number; resume: () => void }) => {
                            r.resume();
                            resolve({ code: r.statusCode ?? 'unknown' });
                        }
                    );
                    req.on('timeout', () => {
                        req.destroy();
                        resolve({ code: 'timeout' });
                    });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    req.on('error', (e: any) => resolve({ code: 'error', error: String(e?.message || e) }));
                }),
                { code: 'overall-timeout' }
            );
            out.egress = { ms: Date.now() - t0, result: egress };
            logger.info(`[DIAG] اتصال عام IPv4: ${JSON.stringify(out.egress)}`);

            logger.info('[DIAG] البحث عبر yt-dlp (SoundCloud)...');
            const track = await timeout(18_000, ytDlpSearch('Ana Mosh Anany Amr Diab', 'soundcloud'), null);
            out.track = track ? { title: track.title, url: track.url } : null;
            logger.info(`[DIAG] نتيجة البحث: ${track ? 'نجح — ' + track.title : 'فشل/مهلة'}`);

            if (!track) {
                logger.info('[DIAG] تشخيص سبب فشل البحث...');
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const bin = require('youtube-dl-exec').constants.YOUTUBE_DL_PATH as string;
                const rawSearch = await timeout(
                    25_000,
                    new Promise((resolve) => {
                        const proc = spawn(
                            bin,
                            ['-j', '--force-ipv4', '--socket-timeout', '15', 'scsearch1:Ana Mosh Anany'],
                            { shell: false }
                        );
                        let so = '';
                        let se = '';
                        proc.stdout.on('data', (d) => (so += d));
                        proc.stderr.on('data', (d) => (se += d));
                        proc.on('error', (e) => resolve({ error: e.message }));
                        proc.on('close', (code) =>
                            resolve({ code, stdout: so.slice(0, 200), stderr: se.slice(0, 800) })
                        );
                    }),
                    { code: 'timeout' }
                );
                out.searchError = rawSearch;
                logger.info(`[DIAG] تفاصيل فشل البحث: ${JSON.stringify(rawSearch).slice(0, 300)}`);

                const KNOWN_SC = 'https://soundcloud.com/joseph-yossry-862654400/ana-mosh-anany-amr-diab-slowed';
                logger.info('[DIAG] اختبار الـ resolve على رابط SoundCloud معروف...');
                const resolved = await timeout(25_000, ytDlpResolve(KNOWN_SC), null);
                out.resolve = resolved ? { title: resolved.title, url: resolved.url } : null;
                logger.info(`[DIAG] نتيجة resolve: ${resolved ? 'نجح — ' + resolved.url.slice(0, 80) : 'فشل/مهلة'}`);

                if (resolved) {
                    const fbin = ffmpegPath || (out.ffmpegResolved as string | undefined) || null;
                    if (!fbin) {
                        out.ffmpegTest = { error: 'لا يوجد ffmpeg' };
                    } else {
                        logger.info('[DIAG] اختبار تنزيل رابط البث عبر ffmpeg (5 ثوانٍ)...');
                        out.ffmpegTest = await timeout(
                            15_000,
                            new Promise((resolve) => {
                                const proc = spawn(
                                    fbin,
                                    ['-v', 'error', '-i', resolved.url, '-t', '5', '-f', 'null', '-'],
                                    { shell: false }
                                );
                                let err = '';
                                proc.stderr.on('data', (d) => (err += d));
                                const timer = setTimeout(() => {
                                    proc.kill('SIGKILL');
                                    resolve({ code: 'timeout-5s', stderr: err.slice(0, 400) });
                                }, 14_000);
                                proc.on('error', (e) => {
                                    clearTimeout(timer);
                                    resolve({ code: 'spawn-error', error: e.message });
                                });
                                proc.on('close', (code) => {
                                    clearTimeout(timer);
                                    resolve({ code, stderr: err.slice(0, 600) });
                                });
                            }),
                            { code: 'overall-timeout', stderr: '' }
                        );
                        logger.info(`[DIAG] اختبار ffmpeg: ${JSON.stringify(out.ffmpegTest).slice(0, 200)}`);
                    }
                }
            } else {
                const bin = ffmpegPath || (out.ffmpegResolved as string | undefined) || null;
                if (!bin) {
                    out.ffmpegTest = { error: 'لا يوجد ffmpeg' };
                } else {
                    logger.info('[DIAG] اختبار تنزيل رابط البث عبر ffmpeg (5 ثوانٍ)...');
                    out.ffmpegTest = await timeout(
                        15_000,
                        new Promise((resolve) => {
                            const proc = spawn(bin, ['-v', 'error', '-i', track.url, '-t', '5', '-f', 'null', '-'], {
                                shell: false
                            });
                            let err = '';
                            proc.stderr.on('data', (d) => (err += d));
                            const timer = setTimeout(() => {
                                proc.kill('SIGKILL');
                                resolve({ code: 'timeout-5s', stderr: err.slice(0, 400) });
                            }, 14_000);
                            proc.on('error', (e) => {
                                clearTimeout(timer);
                                resolve({ code: 'spawn-error', error: e.message });
                            });
                            proc.on('close', (code) => {
                                clearTimeout(timer);
                                resolve({ code, stderr: err.slice(0, 600) });
                            });
                        }),
                        { code: 'overall-timeout', stderr: '' }
                    );
                    logger.info(`[DIAG] اختبار ffmpeg: ${JSON.stringify(out.ffmpegTest).slice(0, 200)}`);
                }
            }
            res.json(out);
        } catch (e) {
            res.status(500).json({ error: (e as Error).message });
        }
    });

    // ---------- SSE Live ----------
    app.get('/api/live', requireApiAuth, (req: Request, res: Response) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        res.write('retry: 2000\n\n');

        const send = (event: string, data: unknown): void => {
            try {
                res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            } catch {
                /* ignore */
            }
        };

        // بث الأحداث القديمة للمشترك الجديد
        for (const p of getBuffer()) send(p.type === 'log' ? 'log' : p.type, p.data);
        send('connected', { ok: true, label: 'مرحباً بك في الـ Live Console' });

        const onHub = (p: { type: string; data: Record<string, unknown> }): void =>
            send(p.type === 'log' ? 'log' : p.type, p.data);
        hub.on('event', onHub);

        const timer = setInterval(async () => {
            try {
                const cpu = await sampleCpu();
                send('metrics', getMetrics(cpu));
            } catch {
                /* ignore */
            }
        }, 1500);

        req.on('close', () => {
            clearInterval(timer);
            hub.removeListener('event', onHub);
            res.end();
        });
    });

    // ---------- القوائم ----------
    app.get('/api/me', requireApiAuth, (_req, res) => {
        res.json({
            username: client.user?.username,
            avatar: client.user?.displayAvatarURL({ size: 128 })
        });
    });

    app.get('/api/guilds', requireApiAuth, (_req, res) => {
        const list = client.guilds.cache.map((g) => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL({ size: 64 }) || null,
            memberCount: g.memberCount,
            ownerId: g.ownerId
        }));
        res.json(list);
    });

    app.get('/api/guild', requireApiAuth, async (req, res) => {
        const guild = client.guilds.cache.get(String(req.query.guild || ''));
        if (!guild) return res.status(404).json({ error: 'سيرفر غير موجود' });
        const settings = await getGuildSettings(guild.id);
        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 256 }),
            banner: guild.bannerURL({ size: 256 }),
            memberCount: guild.memberCount,
            channels: guild.channels.cache
                .filter(
                    (c) =>
                        c.type === ChannelType.GuildText ||
                        c.type === ChannelType.GuildVoice ||
                        c.type === ChannelType.GuildCategory
                )
                .map((c) => ({ id: c.id, name: c.name, type: c.type })),
            roles: guild.roles.cache.map((r) => ({ id: r.id, name: r.name })),
            settings,
            customBackground: hasCustomBackground(guild.id)
        });
    });

    // ---------- إعدادات الترحيب ----------
    app.post('/api/settings/welcome', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = (req.body || {}) as Record<string, any>;
        const { guildId, channel, goodbyeChannel, message, goodbyeMessage, enabled } = body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        await updateGuildSettings(guildId, {
            welcomeChannelId: enabled === 'true' ? channel || null : null,
            goodbyeChannelId: goodbyeChannel || null,
            welcomeMessage: message || undefined,
            goodbyeMessage: goodbyeMessage || undefined
        });
        emit('log', {
            level: 'success',
            source: 'dashboard',
            message: `تم تحديث إعدادات الترحيب في ${client.guilds.cache.get(guildId)?.name}`
        });
        res.json({ ok: true });
    });

    app.post('/api/settings/rules', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, channel } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        await updateGuildSettings(guildId, { rulesChannelId: channel || null });
        res.json({ ok: true });
    });

    app.post('/api/settings/roles', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, autoRoleId } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        await updateGuildSettings(guildId, { autoRoleId: autoRoleId || null });
        res.json({ ok: true });
    });

    // ---------- اللوقات ----------
    app.post('/api/settings/logs', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, modLog: modLogId, memberLog: memberLogId } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        await updateGuildSettings(guildId, {
            modLogChannelId: modLogId || null,
            memberLogChannelId: memberLogId || null
        });
        res.json({ ok: true });
    });

    // ---------- الحماية (Anti-Spam / Anti-Link / Anti-Nuke) ----------
    app.post('/api/settings/protection', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, antiSpam, antiLink, antiNuke, maxNukeActions } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const max = Math.max(2, Math.min(20, parseInt(maxNukeActions) || 3));
        await updateGuildSettings(guildId, {
            antiSpam: antiSpam === 'true' || antiSpam === true,
            antiLink: antiLink === 'true' || antiLink === true,
            antiNuke: antiNuke === 'true' || antiNuke === true,
            maxNukeActions: max
        });
        emit('log', {
            level: 'success',
            source: 'dashboard',
            message: `تم تحديث إعدادات الحماية (Anti-Nuke: ${antiNuke}) في ${client.guilds.cache.get(guildId)?.name}`
        });
        res.json({ ok: true });
    });

    app.post('/api/settings/whitelist', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, type, id } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const settings = await getGuildSettings(guildId);
        const key = type === 'role' ? 'whitelistedRoles' : 'whitelistedUsers';
        const list = Array.isArray(settings[key]) ? [...(settings[key] as string[])] : [];
        if (id && !list.includes(String(id))) {
            list.push(String(id));
            await updateGuildSettings(guildId, { [key]: list });
        }
        res.json({ ok: true, list });
    });

    app.post('/api/settings/whitelist/remove', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, type, id } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const key = type === 'role' ? 'whitelistedRoles' : 'whitelistedUsers';
        const settings = await getGuildSettings(guildId);
        const list = (Array.isArray(settings[key]) ? (settings[key] as string[]) : []).filter((x) => x !== String(id));
        await updateGuildSettings(guildId, { [key]: list });
        res.json({ ok: true, list });
    });

    // ---------- AutoMod ----------
    app.post('/api/settings/automod', requireApiAuth, async (req, res) => {
        const { guildId, badWordsEnabled, mentionLimit, emojiLimit, capsLimit, warnActions } = (req.body ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        await updateGuildSettings(guildId, {
            badWordsEnabled: badWordsEnabled === 'true' || badWordsEnabled === true,
            mentionLimit: Math.max(0, parseInt(mentionLimit) || 0),
            emojiLimit: Math.max(0, parseInt(emojiLimit) || 0),
            capsLimit: Math.max(0, parseInt(capsLimit) || 0),
            warnActions: Array.isArray(warnActions) ? warnActions : []
        });
        emit('log', {
            level: 'success',
            source: 'dashboard',
            message: `تم تحديث إعدادات AutoMod في ${client.guilds.cache.get(guildId)?.name}`
        });
        res.json({ ok: true });
    });

    app.post('/api/settings/automod/words', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, word, remove } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        if (!word || typeof word !== 'string') return res.status(400).json({ error: 'كلمة غير صالحة' });
        const settings = await getGuildSettings(guildId);
        const words = Array.isArray(settings.badWords) ? [...settings.badWords] : [];
        const index = words.findIndex((w) => w.toLowerCase() === word.trim().toLowerCase());
        if (remove) {
            if (index >= 0) words.splice(index, 1);
        } else if (index < 0 && word.trim()) {
            words.push(word.trim());
        }
        await updateGuildSettings(guildId, { badWords: words });
        res.json({ ok: true, list: words });
    });

    // ---------- اللغة ----------
    app.post('/api/settings/locale', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, locale } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const value = locale === 'en' ? 'en' : 'ar';
        await updateGuildSettings(guildId, { locale: value });
        res.json({ ok: true, locale: value });
    });

    // ---------- المستويات ----------
    app.post('/api/settings/levels', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, enabled, channel } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        await updateGuildSettings(guildId, {
            levelSystem: enabled === 'true' || enabled === true,
            levelUpChannelId: channel || null
        });
        res.json({ ok: true });
    });

    // ---------- خلفية الترحيب (رفع صورة) ----------
    app.post('/api/welcome/background', requireApiAuth, (req, res) => {
        const guildId = String(req.query.guild || '');
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        if (!req.body || (req.body as Buffer).length < 100) return res.status(400).json({ error: 'ملف غير صالح' });
        try {
            fs.writeFileSync(guildBackgroundPath(guildId), req.body as Buffer);
            emit('log', {
                level: 'success',
                source: 'dashboard',
                message: `تم رفع خلفية ترحيب جديدة في ${client.guilds.cache.get(guildId)?.name}`
            });
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: (err as Error).message });
        }
    });

    app.post('/api/welcome/background/reset', requireApiAuth, (req, res) => {
        const guildId = String((req.body || {}).guildId || '');
        const p = guildBackgroundPath(guildId);
        if (fs.existsSync(p)) {
            try {
                fs.unlinkSync(p);
            } catch {
                /* ignore */
            }
        }
        res.json({ ok: true });
    });

    // ---------- الاقتصاد ----------
    app.get('/api/economy', requireApiAuth, async (req, res) => {
        const guild = client.guilds.cache.get(String(req.query.guild || ''));
        if (!guild) return res.status(404).json({ error: 'سيرفر غير موجود' });
        const rows = await economy.leaderboard(guild.id, 100);
        const enriched = rows.map((r) => {
            const m = guild.members.cache.get(r.userId);
            return {
                ...r,
                id: r.userId,
                tag: m?.user?.tag || r.userId,
                username: m?.user?.username || r.userId
            };
        });
        res.json(enriched);
    });

    app.post('/api/economy/adjust', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, userId, amount } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const amt = parseInt(amount);
        if (Number.isNaN(amt)) return res.status(400).json({ error: 'مبلغ غير صالح' });
        const balance = await economy.addBalance(guildId, String(userId), amt);
        res.json({ ok: true, balance });
    });

    app.post('/api/economy/set', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, userId, amount } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const amt = parseInt(amount);
        if (Number.isNaN(amt) || amt < 0) return res.status(400).json({ error: 'مبلغ غير صالح' });
        const balance = await economy.setBalance(guildId, String(userId), amt);
        res.json({ ok: true, balance });
    });

    // ---------- التذاكر ----------
    app.post('/api/tickets/config', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, categoryId, logChannelId, staffRoleId } = (req.body || {}) as Record<string, any>;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        await updateGuildSettings(guildId, {
            ticketCategoryId: categoryId || null,
            ticketLogChannelId: logChannelId || null,
            staffRoleId: staffRoleId || null
        });
        res.json({ ok: true });
    });

    app.post('/api/tickets/open', requireApiAuth, async (req, res) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { guildId, userId } = (req.body || {}) as Record<string, any>;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return res.status(400).json({ error: 'سيرفر غير صالح' });
            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) return res.status(400).json({ error: 'العضو غير موجود في السيرفر' });
            const settings = await getGuildSettings(guild.id);

            const existing = guild.channels.cache.find(
                (ch) =>
                    ch.name === `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || member.id}`
            );
            if (existing) return res.json({ ok: false, message: `تذكرة موجودة بالفعل: ${existing}` });

            const staffRole = settings.staffRoleId ? guild.roles.cache.get(settings.staffRoleId) : null;
            const botId = client.user?.id;
            if (!botId) return res.status(500).json({ error: 'البوت غير جاهز' });
            const overwrites = [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                {
                    id: member.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: botId,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ];
            if (staffRole)
                overwrites.push({
                    id: staffRole.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                });

            const name = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || member.id}`;
            const channel = await guild.channels.create({
                name,
                type: ChannelType.GuildText,
                parent: settings.ticketCategoryId || null,
                permissionOverwrites: overwrites
            });

            await channel.send({
                content: `${member} — قناة دعم مخصصة لك. اشرح مشكلتك وسيصل إليك فريق الدعم قريباً.`,
                embeds: [infoEmbed('🎫 تذكرة دعم', 'يرجى وصف مشكلتك بالتفصيل.')]
            });

            emit('log', {
                level: 'success',
                source: 'dashboard',
                message: `تم فتح تذكرة لـ ${member.user.tag} في ${guild.name}`
            });
            res.json({ ok: true, channelId: channel.id });
        } catch (err) {
            res.status(500).json({ error: (err as Error).message });
        }
    });

    app.post('/api/tickets/close', requireApiAuth, async (req, res) => {
        try {
            const channel = client.channels.cache.get(String((req.body || {}).channelId || ''));
            if (!channel || !channel.isTextBased()) return res.status(400).json({ error: 'قناة غير صالحة' });
            await channel.delete('أغلقتها لوحة التحكم');
            emit('log', { level: 'info', source: 'dashboard', message: 'تم إغلاق تذكرة' });
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // ---------- إدارة الأعضاء (Moderation) ----------
    app.get('/api/members', requireApiAuth, async (req, res) => {
        const guild = client.guilds.cache.get(String(req.query.guild || ''));
        if (!guild) return res.status(404).json({ error: 'سيرفر غير موجود' });
        await guild.members.fetch().catch(() => {});
        const list = guild.members.cache.map((m) => ({
            id: m.id,
            tag: m.user.tag,
            bot: m.user.bot,
            nickname: m.nickname,
            joinedAt: m.joinedTimestamp,
            roles: m.roles.cache
                .filter((r) => r.id !== guild.id)
                .map((r) => r.name)
                .slice(0, 8)
        }));
        res.json(list);
    });

    app.post('/api/moderation/ban', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, userId, reason } = (req.body || {}) as Record<string, any>;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(400).json({ error: 'سيرفر غير صالح' });
        try {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
                await member.ban({ reason: reason || 'من لوحة التحكم' });
            } else {
                await guild.bans.create(userId, { reason: reason || 'من لوحة التحكم' });
            }
            emit('log', { level: 'warn', source: 'dashboard', message: `تم حظر ${userId} في ${guild.name}` });
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: (err as Error).message });
        }
    });

    app.post('/api/moderation/kick', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, userId, reason } = (req.body || {}) as Record<string, any>;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(400).json({ error: 'سيرفر غير صالح' });
        try {
            const member = await guild.members.fetch(userId);
            await member.kick(reason || 'من لوحة التحكم');
            emit('log', { level: 'warn', source: 'dashboard', message: `تم طرد ${member.user.tag} في ${guild.name}` });
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: (err as Error).message });
        }
    });

    app.post('/api/moderation/timeout', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { guildId, userId, minutes, reason } = (req.body || {}) as Record<string, any>;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(400).json({ error: 'سيرفر غير صالح' });
        try {
            const member = await guild.members.fetch(userId);
            const ms = Math.min(28 * 24 * 60 * 60 * 1000, (parseInt(minutes) || 10) * 60 * 1000);
            await member.timeout(ms, reason || 'من لوحة التحكم');
            emit('log', {
                level: 'warn',
                source: 'dashboard',
                message: `تم كتم ${member.user.tag} لمدة ${minutes} د`
            });
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: (err as Error).message });
        }
    });

    app.post('/api/moderation/clear', requireApiAuth, async (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { channelId, amount } = (req.body || {}) as Record<string, any>;
        const ch = client.channels.cache.get(String(channelId || ''));
        if (!ch || !ch.isTextBased()) return res.status(400).json({ error: 'قناة غير صالحة' });
        const channel = ch as TextChannel;
        try {
            const n = Math.min(100, Math.max(1, parseInt(amount) || 10));
            const messages = await channel.bulkDelete(n, true);
            emit('log', {
                level: 'info',
                source: 'dashboard',
                message: `حذف ${messages.size} رسالة من #${channel.name}`
            });
            res.json({ ok: true, deleted: messages.size });
        } catch (err) {
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // ---------- الموسيقى ----------
    app.post('/api/music/play', requireApiAuth, async (req, res) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body = (req.body || {}) as Record<string, any>;
            const guild = client.guilds.cache.get(body.guildId);
            if (!guild) throw new Error('السيرفر غير موجود');
            const vc = guild.channels.cache.get(body.voiceChannel);
            if (!vc) throw new Error('الروم الصوتي غير موجود');
            const textChannel =
                guild.channels.cache.get(body.textChannel) || guild.channels.cache.find((c) => c.isTextBased());

            const song = String(body.song || '').trim();
            if (!song) throw new Error('الاسم/الرابط فارغ');

            const isYt = isYouTubeUrl(song);
            if (isYt && !hasYouTubeCookie())
                throw new Error('يوتيوب محجوب حالياً — استخدم اسم أغنية أو رابط SoundCloud');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const info: any = isYt
                ? await ytDlpResolve(song)
                : ((await ytDlpSearch(song, 'soundcloud')) ?? (await ytDlpResolve(song)));
            if (!info) throw new Error('لم يتم العثور على نتائج');

            const dpTrack = new Track(player, {
                title: info.title,
                url: info.url,
                duration: formatDurationMs(info.durationMs),
                thumbnail: info.thumbnail || undefined,
                author: info.author,
                source: isYt ? 'youtube' : 'soundcloud'
            });

            await player.play(vc as VoiceChannel, dpTrack, {
                nodeOptions: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    metadata: { channel: textChannel as any },
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300_000,
                    leaveOnEnd: false,
                    selfDeaf: true
                }
            });
            emit('log', { level: 'info', source: 'music', message: `تشغيل: ${body.song}` });
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: (e as Error).message });
        }
    });

    app.post('/api/music/:action', requireApiAuth, (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = (req.body || {}) as Record<string, any>;
        const queue = player.nodes.get(body.guildId);
        const action = req.params.action;
        if (!queue) return res.status(400).json({ error: 'لا توجد موسيقى' });
        try {
            switch (action) {
                case 'skip':
                    queue.node.skip();
                    break;
                case 'pause':
                    queue.node.pause();
                    break;
                case 'resume':
                    queue.node.resume();
                    break;
                case 'stop':
                    queue.delete();
                    break;
                case 'volume':
                    queue.node.setVolume(Math.min(100, Math.max(1, parseInt(body.volume) || 50)));
                    break;
                default:
                    return res.status(400).json({ error: 'إجراء غير معروف' });
            }
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // ---------- تحكم البوت ----------
    app.post('/api/bot/say', requireApiAuth, async (req, res) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body = (req.body || {}) as Record<string, any>;
            const ch = await client.channels.fetch(body.channel);
            if (ch) await (ch as GuildTextBasedChannel).send(body.message);
            res.json({ ok: true });
        } catch {
            res.status(500).json({ error: 'تعذر الإرسال' });
        }
    });

    app.post('/api/bot/status', requireApiAuth, (req, res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { type, text } = (req.body || {}) as Record<string, any>;
        const types: Record<string, ActivityType> = {
            Playing: ActivityType.Playing,
            Watching: ActivityType.Watching,
            Listening: ActivityType.Listening,
            Competing: ActivityType.Competing,
            Custom: ActivityType.Custom
        };
        client.user?.setPresence({
            activities: [{ name: text, type: types[type] || ActivityType.Playing }],
            status: 'online'
        });
        const config = loadConfig();
        config.bot.activityText = text;
        saveConfig(config);
        emit('log', { level: 'info', source: 'dashboard', message: `تم تحديث حالة البوت: ${text}` });
        res.json({ ok: true });
    });

    // ---------- الواجهة (SPA) ----------
    app.use('/', requirePageAuth, express.static(PUBLIC_DIR, { index: 'index.html' }));

    // ---------- تشغيل ----------
    const server = app.listen(PORT, () => {
        logger.info(`🌐 لوحة التحكم تعمل على: http://localhost:${PORT}`);
    });

    return { app, server };
}
