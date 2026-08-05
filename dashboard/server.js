// =====================================================
// Dashboard Server - لوحة التحكم السحابية Enterprise
// - مصادقة بالكوكيز + SSE Live (metrics + live console)
// - APIs كاملة: settings / protection / economy / tickets / welcome / moderation / music
// - واجهة SPA ثابتة في dashboard/public
// =====================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const express = require('express');
const { ActivityType, PermissionFlagsBits, ChannelType } = require('discord.js');

const { getGuildSettings, updateGuildSettings } = require('../utils/settings');
const { infoEmbed } = require('../utils/embeds');
const { searchMusic } = require('../utils/musicSearch');
const { hub, getBuffer } = require('../modules/liveHub');
const { emit } = require('../modules/liveHub');
const economy = require('../modules/economy');
const { guildBackgroundPath, hasCustomBackground } = require('../modules/welcomeCards');

const PUBLIC_DIR = path.join(__dirname, 'public');
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

function loadConfig() {
    let config = { bot: { activityText: 'لوحة التحكم الشاملة' } };
    if (fs.existsSync(CONFIG_FILE)) {
        try { config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) }; } catch { /* ignore */ }
    }
    return config;
}

function saveConfig(config) {
    try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2)); } catch { /* ignore */ }
}

// ---------- مقاييس النظام ----------
function sampleCpu() {
    const cpus1 = os.cpus();
    return new Promise((resolve) => {
        setTimeout(() => {
            const cpus2 = os.cpus();
            let idle = 0, total = 0;
            for (let i = 0; i < cpus2.length; i++) {
                const t1 = cpus1[i].times, t2 = cpus2[i].times;
                idle += (t2.idle - t1.idle);
                total += (t2.user - t1.user) + (t2.nice - t1.nice) + (t2.sys - t1.sys) + (t2.irq - t1.irq) + (t2.idle - t1.idle);
            }
            resolve(total ? Math.min(100, Math.max(0, (1 - idle / total) * 100)) : 0);
        }, 300);
    });
}

function getMetrics(cpuPct) {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
        servers: client.guilds.cache.size,
        members: client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
        ping: Math.round(client.ws.ping) || 0,
        cpu: Number((cpuPct || 0).toFixed(1)),
        memPercent: Number(((totalMem - freeMem) / totalMem * 100).toFixed(1)),
        heapMB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
        uptimeSec: Math.floor(process.uptime()),
        ready: Boolean(client.readyAt)
    };
}

// ---------- مرشحات مساعدة ----------
function channelOptionsHTML(guild, type, current) {
    let options = `<option value="">-- اختر القناة --</option>`;
    if (!guild) return options;
    const channels = guild.channels.cache
        .filter(c => type === 'text'
            ? (c.isTextBased() && c.type === ChannelType.GuildText)
            : c.isVoiceBased())
        .sort((a, b) => a.rawPosition - b.rawPosition);
    for (const c of channels.values()) {
        const sel = current === c.id ? ' selected' : '';
        options += `<option value="${c.id}"${sel}>#${c.name}</option>`;
    }
    return options;
}

function roleOptionsHTML(guild, current) {
    let options = '<option value="">-- اختر الرتبة --</option>';
    if (!guild) return options;
    for (const r of guild.roles.cache.sort((a, b) => b.position - a.position).values()) {
        const sel = current === r.id ? ' selected' : '';
        options += `<option value="${r.id}"${sel}>${r.name}</option>`;
    }
    return options;
}

// =====================================================
// إنشاء الخادم
// =====================================================
let client;
let player;

function createDashboard({ client: _client, player: _player }) {
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
    const AUTH_HASH = crypto.createHash('sha256').update(DASHBOARD_PASSWORD + SESSION_SECRET).digest('hex');

    if (!process.env.DASHBOARD_PASSWORD) {
        console.warn('⚠️ لم يتم ضبط DASHBOARD_PASSWORD — تم استخدام الافتراضي "admin". غيّرها في .env!');
    }

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json({ limit: '2mb' }));
    app.use('/api/welcome/background', express.raw({ type: ['image/*', 'application/octet-stream'], limit: '10mb' }));

    function parseCookies(req) {
        const out = {};
        const header = req.headers.cookie;
        if (!header) return out;
        for (const part of header.split(';')) {
            const idx = part.indexOf('=');
            if (idx === -1) continue;
            out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
        }
        return out;
    }
    const isAuthed = (req) => parseCookies(req)[AUTH_COOKIE] === AUTH_HASH;

    function requirePageAuth(req, res, next) {
        if (isAuthed(req)) return next();
        return res.redirect('/login');
    }
    function requireApiAuth(req, res, next) {
        if (isAuthed(req)) return next();
        return res.status(401).json({ error: 'غير مصرح' });
    }

    function pageShell(body, title = 'لوحة التحكم') {
        return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head><body>${body}</body></html>`;
    }

    // ---------- المصادقة ----------
    app.get('/login', (req, res) => {
        if (isAuthed(req)) return res.redirect('/');
        res.send(pageShell(`
            <style>body{background:#070b1a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Segoe UI,sans-serif;margin:0}
            form{background:rgba(20,30,60,.6);backdrop-filter:blur(14px);border:1px solid rgba(0,240,255,.3);border-radius:20px;padding:40px;width:360px;box-shadow:0 0 60px rgba(0,240,255,.15)}
            h1{color:#00f0ff;text-align:center;margin-bottom:24px}input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #233;background:#0b1120;color:#fff;margin-bottom:16px}
            button{width:100%;padding:12px;border-radius:10px;border:none;background:linear-gradient(90deg,#00f0ff,#ff2ec4);color:#000;font-weight:bold;font-size:16px;cursor:pointer}</style>
            <form method="POST" action="/login">
                <h1>🔐 لوحة التحكم</h1>
                <input type="password" name="password" placeholder="كلمة المرور" required>
                <button type="submit">دخول</button>
            </form>
        `, 'تسجيل الدخول'));
    });

    app.post('/login', (req, res) => {
        if (req.body.password === DASHBOARD_PASSWORD) {
            res.setHeader('Set-Cookie', `${AUTH_COOKIE}=${AUTH_HASH}; Path=/; HttpOnly; Max-Age=86400`);
            return res.redirect('/');
        }
        res.send(pageShell(`<h2 style="color:#ff2e2e;text-align:center;padding-top:40vh">❌ كلمة المرور خاطئة</h2><p style="text-align:center"><a href="/login">إعادة المحاولة</a></p>`));
    });

    app.get('/logout', (req, res) => {
        res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
        res.redirect('/login');
    });

    // ---------- فحص الصحة (Healthcheck لـ Render) ----------
    app.get('/healthz', (req, res) => {
        res.json({
            status: 'ok',
            bot: Boolean(client.readyAt),
            uptime: Math.floor(process.uptime()),
            guilds: client.guilds.cache.size
        });
    });

    // ---------- SSE Live ----------
    app.get('/api/live', requireApiAuth, (req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        res.write('retry: 2000\n\n');

        const send = (event, data) => {
            try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* ignore */ }
        };

        // بث الأحداث القديمة للمشترك الجديد
        for (const p of getBuffer()) send(p.type === 'log' ? 'log' : p.type, p.data);
        send('connected', { ok: true, label: 'مرحباً بك في الـ Live Console' });

        const onHub = (p) => send(p.type === 'log' ? 'log' : p.type, p.data);
        hub.on('event', onHub);

        const timer = setInterval(async () => {
            try {
                const cpu = await sampleCpu();
                send('metrics', getMetrics(cpu));
            } catch { /* ignore */ }
        }, 1500);

        req.on('close', () => {
            clearInterval(timer);
            hub.removeListener('event', onHub);
            res.end();
        });
    });

    // ---------- القوائم ----------
    app.get('/api/me', requireApiAuth, (req, res) => {
        res.json({
            username: client.user?.username,
            avatar: client.user?.displayAvatarURL({ size: 128 })
        });
    });

    app.get('/api/guilds', requireApiAuth, (req, res) => {
        const list = client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL({ size: 64 }) || null,
            memberCount: g.memberCount,
            ownerId: g.ownerId
        }));
        res.json(list);
    });

    app.get('/api/guild', requireApiAuth, (req, res) => {
        const guild = client.guilds.cache.get(String(req.query.guild || ''));
        if (!guild) return res.status(404).json({ error: 'سيرفر غير موجود' });
        const settings = getGuildSettings(guild.id);
        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 256 }),
            banner: guild.bannerURL({ size: 256 }),
            memberCount: guild.memberCount,
            channels: guild.channels.cache
                .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice)
                .map(c => ({ id: c.id, name: c.name, type: c.type })),
            roles: guild.roles.cache.map(r => ({ id: r.id, name: r.name })),
            settings,
            customBackground: hasCustomBackground(guild.id)
        });
    });

    // ---------- إعدادات الترحيب ----------
    app.post('/api/settings/welcome', requireApiAuth, (req, res) => {
        const { guildId, channel, goodbyeChannel, message, goodbyeMessage, enabled } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        updateGuildSettings(guildId, {
            welcomeChannelId: enabled === 'true' ? (channel || null) : null,
            goodbyeChannelId: goodbyeChannel || null,
            welcomeMessage: message || undefined,
            goodbyeMessage: goodbyeMessage || undefined
        });
        emit('log', { level: 'success', source: 'dashboard', message: `تم تحديث إعدادات الترحيب في ${client.guilds.cache.get(guildId).name}` });
        res.json({ ok: true });
    });

    app.post('/api/settings/rules', requireApiAuth, (req, res) => {
        const { guildId, channel } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        updateGuildSettings(guildId, { rulesChannelId: channel || null });
        res.json({ ok: true });
    });

    app.post('/api/settings/roles', requireApiAuth, (req, res) => {
        const { guildId, autoRoleId } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        updateGuildSettings(guildId, { autoRoleId: autoRoleId || null });
        res.json({ ok: true });
    });

    // ---------- اللوقات ----------
    app.post('/api/settings/logs', requireApiAuth, (req, res) => {
        const { guildId, modLog: modLogId, memberLog: memberLogId } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        updateGuildSettings(guildId, { modLogChannelId: modLogId || null, memberLogChannelId: memberLogId || null });
        res.json({ ok: true });
    });

    // ---------- الحماية (Anti-Spam / Anti-Link / Anti-Nuke) ----------
    app.post('/api/settings/protection', requireApiAuth, (req, res) => {
        const { guildId, antiSpam, antiLink, antiNuke, maxNukeActions } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const max = Math.max(2, Math.min(20, parseInt(maxNukeActions) || 3));
        updateGuildSettings(guildId, {
            antiSpam: antiSpam === 'true' || antiSpam === true,
            antiLink: antiLink === 'true' || antiLink === true,
            antiNuke: antiNuke === 'true' || antiNuke === true,
            maxNukeActions: max
        });
        emit('log', { level: 'success', source: 'dashboard', message: `تم تحديث إعدادات الحماية (Anti-Nuke: ${antiNuke}) في ${client.guilds.cache.get(guildId).name}` });
        res.json({ ok: true });
    });

    app.post('/api/settings/whitelist', requireApiAuth, async (req, res) => {
        const { guildId, type, id } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const settings = getGuildSettings(guildId);
        const key = type === 'role' ? 'whitelistedRoles' : 'whitelistedUsers';
        const list = Array.isArray(settings[key]) ? settings[key] : [];
        if (!list.includes(id)) {
            list.push(id);
            updateGuildSettings(guildId, { [key]: list });
        }
        res.json({ ok: true, list });
    });

    app.post('/api/settings/whitelist/remove', requireApiAuth, (req, res) => {
        const { guildId, type, id } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const key = type === 'role' ? 'whitelistedRoles' : 'whitelistedUsers';
        const settings = getGuildSettings(guildId);
        const list = (Array.isArray(settings[key]) ? settings[key] : []).filter(x => x !== id);
        updateGuildSettings(guildId, { [key]: list });
        res.json({ ok: true, list });
    });

    // ---------- المستويات ----------
    app.post('/api/settings/levels', requireApiAuth, (req, res) => {
        const { guildId, enabled, channel } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        updateGuildSettings(guildId, { levelSystem: enabled === 'true' || enabled === true, levelUpChannelId: channel || null });
        res.json({ ok: true });
    });

    // ---------- خلفية الترحيب (رفع صورة) ----------
    app.post('/api/welcome/background', requireApiAuth, (req, res) => {
        const guildId = String(req.query.guild || '');
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        if (!req.body || req.body.length < 100) return res.status(400).json({ error: 'ملف غير صالح' });
        try {
            fs.writeFileSync(guildBackgroundPath(guildId), req.body);
            emit('log', { level: 'success', source: 'dashboard', message: `تم رفع خلفية ترحيب جديدة في ${client.guilds.cache.get(guildId).name}` });
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/welcome/background/reset', requireApiAuth, (req, res) => {
        const guildId = String(req.body.guildId || '');
        const p = guildBackgroundPath(guildId);
        if (fs.existsSync(p)) {
            try { fs.unlinkSync(p); } catch { /* ignore */ }
        }
        res.json({ ok: true });
    });

    // ---------- الاقتصاد ----------
    app.get('/api/economy', requireApiAuth, (req, res) => {
        const guild = client.guilds.cache.get(String(req.query.guild || ''));
        if (!guild) return res.status(404).json({ error: 'سيرفر غير موجود' });
        const rows = economy.leaderboard(guild.id, 100);
        const enriched = rows.map(r => {
            const m = guild.members.cache.get(r.id);
            return { ...r, tag: m?.user?.tag || r.id, username: m?.user?.username || r.id };
        });
        res.json(enriched);
    });

    app.post('/api/economy/adjust', requireApiAuth, (req, res) => {
        const { guildId, userId, amount } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const amt = parseInt(amount);
        if (isNaN(amt)) return res.status(400).json({ error: 'مبلغ غير صالح' });
        const balance = economy.addBalance(guildId, String(userId), amt);
        res.json({ ok: true, balance });
    });

    app.post('/api/economy/set', requireApiAuth, (req, res) => {
        const { guildId, userId, amount } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        const amt = parseInt(amount);
        if (isNaN(amt) || amt < 0) return res.status(400).json({ error: 'مبلغ غير صالح' });
        const balance = economy.setBalance(guildId, String(userId), amt);
        res.json({ ok: true, balance });
    });

    // ---------- التذاكر ----------
    app.post('/api/tickets/config', requireApiAuth, (req, res) => {
        const { guildId, categoryId, logChannelId, staffRoleId } = req.body;
        if (!guildId || !client.guilds.cache.has(guildId)) return res.status(400).json({ error: 'سيرفر غير صالح' });
        updateGuildSettings(guildId, {
            ticketCategoryId: categoryId || null,
            ticketLogChannelId: logChannelId || null,
            staffRoleId: staffRoleId || null
        });
        res.json({ ok: true });
    });

    app.post('/api/tickets/open', requireApiAuth, async (req, res) => {
        try {
            const { guildId, userId } = req.body;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return res.status(400).json({ error: 'سيرفر غير صالح' });
            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) return res.status(400).json({ error: 'العضو غير موجود في السيرفر' });
            const settings = getGuildSettings(guild.id);

            const existing = guild.channels.cache.find(ch => ch.name === `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || member.id}`);
            if (existing) return res.json({ ok: false, message: `تذكرة موجودة بالفعل: ${existing}` });

            const staffRole = settings.staffRoleId ? guild.roles.cache.get(settings.staffRoleId) : null;
            const overwrites = [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ];
            if (staffRole) overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

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

            emit('log', { level: 'success', source: 'dashboard', message: `تم فتح تذكرة لـ ${member.user.tag} في ${guild.name}` });
            res.json({ ok: true, channelId: channel.id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/tickets/close', requireApiAuth, async (req, res) => {
        try {
            const channel = client.channels.cache.get(String(req.body.channelId || ''));
            if (!channel || !channel.isTextBased()) return res.status(400).json({ error: 'قناة غير صالحة' });
            await channel.delete('أغلقتها لوحة التحكم');
            emit('log', { level: 'info', source: 'dashboard', message: `تم إغلاق تذكرة` });
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ---------- إدارة الأعضاء (Moderation) ----------
    app.get('/api/members', requireApiAuth, async (req, res) => {
        const guild = client.guilds.cache.get(String(req.query.guild || ''));
        if (!guild) return res.status(404).json({ error: 'سيرفر غير موجود' });
        await guild.members.fetch().catch(() => {});
        const list = guild.members.cache.map(m => ({
            id: m.id,
            tag: m.user.tag,
            bot: m.user.bot,
            nickname: m.nickname,
            joinedAt: m.joinedTimestamp,
            roles: m.roles.cache.filter(r => r.id !== guild.id).map(r => r.name).slice(0, 8)
        }));
        res.json(list);
    });

    app.post('/api/moderation/ban', requireApiAuth, async (req, res) => {
        const { guildId, userId, reason } = req.body;
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
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/moderation/kick', requireApiAuth, async (req, res) => {
        const { guildId, userId, reason } = req.body;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(400).json({ error: 'سيرفر غير صالح' });
        try {
            const member = await guild.members.fetch(userId);
            await member.kick(reason || 'من لوحة التحكم');
            emit('log', { level: 'warn', source: 'dashboard', message: `تم طرد ${member.user.tag} في ${guild.name}` });
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/moderation/timeout', requireApiAuth, async (req, res) => {
        const { guildId, userId, minutes, reason } = req.body;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(400).json({ error: 'سيرفر غير صالح' });
        try {
            const member = await guild.members.fetch(userId);
            const ms = Math.min(28 * 24 * 60 * 60 * 1000, (parseInt(minutes) || 10) * 60 * 1000);
            await member.timeout(ms, reason || 'من لوحة التحكم');
            emit('log', { level: 'warn', source: 'dashboard', message: `تم كتم ${member.user.tag} لمدة ${minutes} د` });
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/moderation/clear', requireApiAuth, async (req, res) => {
        const { channelId, amount } = req.body;
        const channel = client.channels.cache.get(String(channelId || ''));
        if (!channel || !channel.isTextBased()) return res.status(400).json({ error: 'قناة غير صالحة' });
        try {
            const n = Math.min(100, Math.max(1, parseInt(amount) || 10));
            const messages = await channel.bulkDelete(n, true);
            emit('log', { level: 'info', source: 'dashboard', message: `حذف ${messages.size} رسالة من #${channel.name}` });
            res.json({ ok: true, deleted: messages.size });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ---------- الموسيقى ----------
    app.post('/api/music/play', requireApiAuth, async (req, res) => {
        try {
            const guild = client.guilds.cache.get(req.body.guildId);
            if (!guild) throw new Error('السيرفر غير موجود');
            const vc = guild.channels.cache.get(req.body.voiceChannel);
            if (!vc) throw new Error('الروم الصوتي غير موجود');
            const textChannel = guild.channels.cache.get(req.body.textChannel) || guild.channels.cache.find(c => c.isTextBased());

            const searchResult = await searchMusic(player, req.body.song, { requestedBy: client.user });
            if (!searchResult.hasTracks()) throw new Error('لم يتم العثور على نتائج');

            await player.play(vc, searchResult, {
                nodeOptions: {
                    metadata: { channel: textChannel },
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300_000,
                    leaveOnEnd: false,
                    selfDeaf: true
                }
            });
            emit('log', { level: 'info', source: 'music', message: `تشغيل: ${req.body.song}` });
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/music/:action', requireApiAuth, (req, res) => {
        const queue = player.nodes.get(req.body.guildId);
        const action = req.params.action;
        if (!queue) return res.status(400).json({ error: 'لا توجد موسيقى' });
        try {
            switch (action) {
                case 'skip': queue.node.skip(); break;
                case 'pause': queue.node.pause(); break;
                case 'resume': queue.node.resume(); break;
                case 'stop': queue.delete(); break;
                case 'volume': queue.node.setVolume(Math.min(100, Math.max(1, parseInt(req.body.volume) || 50))); break;
                default: return res.status(400).json({ error: 'إجراء غير معروف' });
            }
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ---------- تحكم البوت ----------
    app.post('/api/bot/say', requireApiAuth, async (req, res) => {
        try {
            const ch = await client.channels.fetch(req.body.channel);
            if (ch) await ch.send(req.body.message);
            res.json({ ok: true });
        } catch {
            res.status(500).json({ error: 'تعذر الإرسال' });
        }
    });

    app.post('/api/bot/status', requireApiAuth, (req, res) => {
        const { type, text } = req.body;
        const types = {
            Playing: ActivityType.Playing,
            Watching: ActivityType.Watching,
            Listening: ActivityType.Listening,
            Competing: ActivityType.Competing,
            Custom: ActivityType.Custom
        };
        client.user.setPresence({
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
        console.log(`🌐 لوحة التحكم تعمل على: http://localhost:${PORT}`);
    });

    return { app, server };
}

module.exports = { createDashboard };
