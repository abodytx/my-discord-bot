// =====================================================
// الملف الرئيسي - البوت الشامل + لوحة التحكم
// =====================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection,
    ActivityType,
    ChannelType
} = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeExtractor } = require('discord-player-youtube');

const { getGuildSettings, updateGuildSettings } = require('./utils/settings');
const { nowPlayingEmbed, controlRow } = require('./utils/musicUI');
const { infoEmbed, errorEmbed } = require('./utils/embeds');
const { searchMusic } = require('./utils/musicSearch');

// =====================================================
// الإعدادات العامة للبوت (config.json)
// =====================================================
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {
    bot: { activityText: 'لوحة التحكم الشاملة' }
};
if (fs.existsSync(CONFIG_FILE)) {
    try {
        config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    } catch (e) {
        console.error('خطأ في قراءة الإعدادات:', e);
    }
}
function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// =====================================================
// إعداد البوت
// =====================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.spamTracker = new Collection();
client.xpTracker = new Collection();

// =====================================================
// إعداد محرك الموسيقى
// =====================================================
const player = new Player(client);
client.player = player;

async function setupExtractors() {
    // تسجيل محرك اليوتيوب مع دعم الكوكيز (مطلوب لاستقرار البث)
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
    if (channel) {
        channel.send({ embeds: [infoEmbed('🎶 انتهت القائمة', 'أضف أغاني جديدة عبر الأمر `/play`.')] }).catch(() => {});
    }
});

player.events.on('emptyChannel', (queue) => {
    const { channel } = queue.metadata || {};
    if (channel) {
        channel.send({ embeds: [errorEmbed('غادر الجميع', 'غادر جميع الأعضاء الروم الصوتي، تم إيقاف التشغيل.')] }).catch(() => {});
    }
    queue.delete();
});

player.events.on('error', (queue, error) => {
    console.error('🎵 خطأ في مشغل الموسيقى:', error.message);
    notifyPlaybackError(queue, error);
});

player.events.on('playerError', (queue, error) => {
    console.error('🎵 خطأ أثناء تشغيل مقطع:', error.message);
    notifyPlaybackError(queue, error);
});

// إبلاغ قناة الدردشة بأخطاء التشغيل مع اقتراح الحل
function notifyPlaybackError(queue, error) {
    const { channel } = queue?.metadata || {};
    if (!channel) return;
    const message = String(error?.message || error || 'خطأ غير معروف');
    const hint = message.toLowerCase().includes('sign in') || message.includes('login')
        ? '\n\n> 💡 **سبب شائع:** يوتيوب أصبح يطلب تسجيل دخول للبث. أضف كوكيز يوتيوب عبر متغير `YOUTUBE_COOKIE` في ملف `.env` (انظر README).'
        : '';
    channel.send({
        embeds: [errorEmbed('فشل تشغيل المقطع', `تعذر تشغيل هذا المقطع.\n\`${message}\`${hint}`)]
    }).catch(() => {});
}

// =====================================================
// تحميل الأوامر والأحداث
// =====================================================
function loadFiles(dir, collection, isEvent = false) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            loadFiles(fullPath, collection, isEvent);
        } else if (item.name.endsWith('.js')) {
            const file = require(fullPath);
            if (isEvent) {
                if (file.once) client.once(file.name, (...args) => file.execute(...args, client));
                else client.on(file.name, (...args) => file.execute(...args, client));
            } else {
                if (file.data) collection.set(file.data.name, file);
            }
        }
    }
}
loadFiles(path.join(__dirname, 'commands'), client.commands, false);
loadFiles(path.join(__dirname, 'events'), null, true);

// =====================================================
// لوحة التحكم (Web Dashboard)
// =====================================================
const app = express();
const PORT = process.env.PORT || 3000;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin';
const SESSION_SECRET = process.env.DASHBOARD_SECRET || crypto.randomBytes(16).toString('hex');
const AUTH_COOKIE = 'auth_token';
const AUTH_HASH = crypto.createHash('sha256').update(DASHBOARD_PASSWORD + SESSION_SECRET).digest('hex');

if (!process.env.DASHBOARD_PASSWORD) {
    console.warn('⚠️ لم يتم تحديد DASHBOARD_PASSWORD، تم استخدام كلمة المرور الافتراضية "admin". غيّرها من ملف .env!');
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function parseCookies(req) {
    const out = {};
    const header = req.headers.cookie;
    if (!header) return out;
    for (const part of header.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        const k = part.slice(0, idx).trim();
        out[k] = decodeURIComponent(part.slice(idx + 1).trim());
    }
    return out;
}

function requireAuth(req, res, next) {
    if (parseCookies(req)[AUTH_COOKIE] === AUTH_HASH) return next();
    return res.redirect('/login');
}

function pageShell(body, title = 'لوحة التحكم') {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center">
    ${body}
</body>
</html>`;
}

app.get('/login', (req, res) => {
    res.send(pageShell(`
        <form method="POST" action="/login" class="bg-slate-800 p-8 rounded-2xl shadow-2xl w-96">
            <h1 class="text-2xl font-bold text-center mb-6 text-blue-400">🔐 دخول لوحة التحكم</h1>
            <input type="password" name="password" placeholder="كلمة المرور" required class="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500 mb-4">
            <button type="submit" class="w-full p-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold transition">دخول</button>
        </form>
    `));
});

app.post('/login', (req, res) => {
    if (req.body.password === DASHBOARD_PASSWORD) {
        res.setHeader('Set-Cookie', `${AUTH_COOKIE}=${AUTH_HASH}; Path=/; HttpOnly; Max-Age=86400`);
        return res.redirect('/');
    }
    res.send(pageShell(`
        <div class="text-center bg-slate-800 p-8 rounded-2xl shadow-2xl w-96">
            <h1 class="text-2xl font-bold text-red-400 mb-4">❌ كلمة المرور خاطئة</h1>
            <a href="/login" class="text-blue-400 hover:underline">إعادة المحاولة</a>
        </div>
    `));
});

app.get('/logout', (req, res) => {
    res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
    res.redirect('/login');
});

function channelOptions(guild, type) {
    let options = '<option value="">-- اختر القناة --</option>';
    if (!guild) return options;
    guild.channels.cache
        .filter(c => type === 'text'
            ? (c.isTextBased() && c.type === ChannelType.GuildText)
            : c.isVoiceBased())
        .forEach(c => {
            options += `<option value="${c.id}">#${c.name}</option>`;
        });
    return options;
}

app.get('/', requireAuth, (req, res) => {
    if (!client.readyAt) {
        return res.send(pageShell('<h2 class="text-2xl">🔄 جاري التشغيل... حدث الصفحة.</h2>', 'جارٍ التشغيل'));
    }

    const stats = {
        servers: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
        ping: Math.round(client.ws.ping),
        ram: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    };

    const guildId = req.query.guild || client.guilds.cache.first()?.id || '';
    const guild = client.guilds.cache.get(guildId) || null;
    const settings = guild ? getGuildSettings(guild.id) : null;

    const guildSelector = client.guilds.cache
        .map(g => `<option value="${g.id}" ${g.id === guildId ? 'selected' : ''}>${g.name}</option>`)
        .join('');

    const textOptions = channelOptions(guild, 'text');
    const voiceOptions = channelOptions(guild, 'voice');

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم الشاملة</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b1120; color: #e2e8f0; }
        .glass-panel { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); }
        .nav-item { cursor: pointer; transition: all 0.3s ease; }
        .nav-item:hover, .nav-item.active { background: #3b82f6; color: white; transform: translateX(-5px); }
        .tab-content { display: none; animation: fadeIn 0.3s ease-in-out; }
        .tab-content.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        input, select, textarea { background: #0f172a; border: 1px solid #334155; color: white; padding: 10px; border-radius: 8px; width: 100%; margin-top: 5px; outline: none; }
        input:focus, select:focus, textarea:focus { border-color: #3b82f6; }
        .btn { background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; border: none; width: 100%; }
        .btn:hover { background: #2563eb; }
        .btn-danger { background: #ef4444; } .btn-danger:hover { background: #dc2626; }
        .btn-green { background: #22c55e; } .btn-green:hover { background: #16a34a; }
    </style>
</head>
<body class="flex h-screen overflow-hidden">

    <aside class="w-64 glass-panel flex flex-col p-5 shadow-2xl z-10">
        <div class="text-center mb-6">
            <img src="${client.user.displayAvatarURL()}" class="w-20 h-20 rounded-full mx-auto border-2 border-blue-500 mb-3 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <h2 class="text-xl font-bold text-blue-400">${client.user.username}</h2>
            <span class="text-xs text-green-400">🟢 متصل ومستقر</span>
        </div>
        <div class="mb-5">
            <label class="text-xs text-gray-400 block mb-1">اختر السيرفر:</label>
            <select onchange="window.location.href='/?guild='+this.value" class="!mt-1">${guildSelector}</select>
        </div>
        <nav class="flex-1 space-y-2">
            <div class="nav-item active p-3 rounded-lg font-medium" onclick="switchTab('dashboard')"><i class="fa-solid fa-chart-line ml-2"></i> الإحصائيات</div>
            <div class="nav-item p-3 rounded-lg font-medium" onclick="switchTab('welcome')"><i class="fa-solid fa-handshake ml-2"></i> الترحيب والوداع</div>
            <div class="nav-item p-3 rounded-lg font-medium" onclick="switchTab('logs')"><i class="fa-solid fa-file-shield ml-2"></i> اللوقات والحماية</div>
            <div class="nav-item p-3 rounded-lg font-medium" onclick="switchTab('levels')"><i class="fa-solid fa-chart-simple ml-2"></i> نظام المستويات</div>
            <div class="nav-item p-3 rounded-lg font-medium" onclick="switchTab('music')"><i class="fa-solid fa-music ml-2"></i> مشغل الموسيقى</div>
            <div class="nav-item p-3 rounded-lg font-medium" onclick="switchTab('control')"><i class="fa-solid fa-robot ml-2"></i> تحكم البوت</div>
        </nav>
        <a href="/logout" class="text-center text-red-400 hover:text-red-300 mt-4 text-sm"><i class="fa-solid fa-power-off ml-1"></i> تسجيل الخروج</a>
    </aside>

    <main class="flex-1 overflow-y-auto p-8 relative">

        <section id="dashboard" class="tab-content active">
            <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">📊 الإحصائيات الحية</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="glass-panel p-6 rounded-2xl text-center shadow-lg"><h3 class="text-gray-400">السيرفرات</h3><p class="text-3xl font-bold">${stats.servers}</p></div>
                <div class="glass-panel p-6 rounded-2xl text-center shadow-lg"><h3 class="text-gray-400">الأعضاء</h3><p class="text-3xl font-bold">${stats.users}</p></div>
                <div class="glass-panel p-6 rounded-2xl text-center shadow-lg"><h3 class="text-gray-400">الاستجابة (Ping)</h3><p class="text-3xl font-bold">${stats.ping} ms</p></div>
                <div class="glass-panel p-6 rounded-2xl text-center shadow-lg"><h3 class="text-gray-400">الرام</h3><p class="text-3xl font-bold">${stats.ram} MB</p></div>
            </div>
        </section>

        <section id="welcome" class="tab-content">
            <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">👋 الترحيب والوداع</h1>
            <form action="/api/settings/welcome" method="POST" class="glass-panel p-6 rounded-2xl max-w-2xl mx-auto shadow-lg">
                <input type="hidden" name="guildId" value="${guildId}">
                <div class="mb-4 flex items-center justify-between">
                    <label class="font-bold text-lg">تفعيل الترحيب:</label>
                    <select name="enabled" class="w-32"><option value="true" ${settings?.welcomeChannelId ? 'selected' : ''}>مفعل ✅</option><option value="false" ${!settings?.welcomeChannelId ? 'selected' : ''}>معطل ❌</option></select>
                </div>
                <div class="mb-4"><label>قناة الترحيب:</label><select name="channel" required>${textOptions.replace('<option value="">-- اختر القناة --</option>', `<option value="${settings?.welcomeChannelId || ''}">#${guild?.channels.cache.get(settings?.welcomeChannelId)?.name || 'حالية'}</option>`)}</select></div>
                <div class="mb-4"><label>قناة الوداع:</label><select name="goodbyeChannel">${textOptions.replace('<option value="">-- اختر القناة --</option>', `<option value="${settings?.goodbyeChannelId || ''}">#${guild?.channels.cache.get(settings?.goodbyeChannelId)?.name || 'حالية'}</option>`)}</select></div>
                <div class="mb-4"><label>نص الترحيب:</label><textarea name="message" rows="3" required>${(settings?.welcomeMessage || '').replace(/</g, '&lt;')}</textarea></div>
                <div class="mb-6"><label>نص الوداع:</label><textarea name="goodbyeMessage" rows="3">${(settings?.goodbyeMessage || '').replace(/</g, '&lt;')}</textarea></div>
                <button type="submit" class="btn">حفظ الإعدادات</button>
            </form>
        </section>

        <section id="logs" class="tab-content">
            <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">🛡️ اللوقات والحماية</h1>
            <form action="/api/settings/logs" method="POST" class="glass-panel p-6 rounded-2xl max-w-2xl mx-auto shadow-lg">
                <input type="hidden" name="guildId" value="${guildId}">
                <div class="mb-4"><label>قناة لوقات الإدارة:</label><select name="modLog">${textOptions.replace('<option value="">-- اختر القناة --</option>', `<option value="${settings?.modLogChannelId || ''}">#${guild?.channels.cache.get(settings?.modLogChannelId)?.name || 'حالية'}</option>`)}</select></div>
                <div class="mb-4"><label>قناة لوقات الأعضاء:</label><select name="memberLog">${textOptions.replace('<option value="">-- اختر القناة --</option>', `<option value="${settings?.memberLogChannelId || ''}">#${guild?.channels.cache.get(settings?.memberLogChannelId)?.name || 'حالية'}</option>`)}</select></div>
                <button type="submit" class="btn">حفظ</button>
            </form>
            <form action="/api/settings/protection" method="POST" class="glass-panel p-6 rounded-2xl max-w-2xl mx-auto mt-6 shadow-lg">
                <input type="hidden" name="guildId" value="${guildId}">
                <div class="mb-4 flex items-center justify-between">
                    <label class="font-bold text-lg">Anti-Spam:</label>
                    <select name="antiSpam" class="w-32"><option value="true" ${settings?.antiSpam ? 'selected' : ''}>مفعل ✅</option><option value="false" ${!settings?.antiSpam ? 'selected' : ''}>معطل ❌</option></select>
                </div>
                <div class="mb-6 flex items-center justify-between">
                    <label class="font-bold text-lg">Anti-Link:</label>
                    <select name="antiLink" class="w-32"><option value="true" ${settings?.antiLink ? 'selected' : ''}>مفعل ✅</option><option value="false" ${!settings?.antiLink ? 'selected' : ''}>معطل ❌</option></select>
                </div>
                <button type="submit" class="btn">حفظ الحماية</button>
            </form>
        </section>

        <section id="levels" class="tab-content">
            <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">📈 نظام المستويات</h1>
            <form action="/api/settings/levels" method="POST" class="glass-panel p-6 rounded-2xl max-w-2xl mx-auto shadow-lg">
                <input type="hidden" name="guildId" value="${guildId}">
                <div class="mb-4 flex items-center justify-between">
                    <label class="font-bold text-lg">تفعيل نظام المستويات:</label>
                    <select name="enabled" class="w-32"><option value="true" ${settings?.levelSystem ? 'selected' : ''}>مفعل ✅</option><option value="false" ${!settings?.levelSystem ? 'selected' : ''}>معطل ❌</option></select>
                </div>
                <div class="mb-6"><label>قناة رسائل الترقي:</label><select name="channel">${textOptions.replace('<option value="">-- اختر القناة --</option>', `<option value="${settings?.levelUpChannelId || ''}">#${guild?.channels.cache.get(settings?.levelUpChannelId)?.name || 'حالية'}</option>`)}</select></div>
                <button type="submit" class="btn">حفظ</button>
            </form>
        </section>

        <section id="music" class="tab-content">
            <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">🎵 مشغل الموسيقى المركزي</h1>
            <div class="glass-panel p-6 rounded-2xl max-w-2xl mx-auto shadow-lg">
                <form action="/api/music/play" method="POST" class="mb-6 text-right">
                    <input type="hidden" name="guildId" value="${guildId}">
                    <label class="block mb-2 font-bold text-blue-400">1. الروم الصوتي:</label>
                    <select name="voiceChannel" required class="mb-4">${voiceOptions}</select>
                    <label class="block mb-2 font-bold text-blue-400">2. قناة الرسائل:</label>
                    <select name="textChannel" required class="mb-4">${textOptions}</select>
                    <label class="block mb-2 font-bold text-blue-400">3. اسم الأغنية أو الرابط:</label>
                    <input type="text" name="song" placeholder="ابحث عن مقطع أو ضع رابطاً..." required class="mb-4">
                    <button type="submit" class="btn"><i class="fa-solid fa-play"></i> تشغيل</button>
                </form>
                <hr class="border-slate-700 mb-6">
                <div class="grid grid-cols-2 gap-4">
                    <form action="/api/music/skip" method="POST" class="m-0"><input type="hidden" name="guildId" value="${guildId}"><button type="submit" class="btn w-full"><i class="fa-solid fa-forward"></i> تخطي</button></form>
                    <form action="/api/music/pause" method="POST" class="m-0"><input type="hidden" name="guildId" value="${guildId}"><button type="submit" class="btn w-full"><i class="fa-solid fa-pause"></i> إيقاف مؤقت</button></form>
                    <form action="/api/music/resume" method="POST" class="m-0"><input type="hidden" name="guildId" value="${guildId}"><button type="submit" class="btn btn-green w-full"><i class="fa-solid fa-play"></i> استئناف</button></form>
                    <form action="/api/music/stop" method="POST" class="m-0"><input type="hidden" name="guildId" value="${guildId}"><button type="submit" class="btn btn-danger w-full"><i class="fa-solid fa-stop"></i> إيقاف نهائي</button></form>
                </div>
                <form action="/api/music/volume" method="POST" class="mt-6 text-right">
                    <input type="hidden" name="guildId" value="${guildId}">
                    <label class="block font-bold text-blue-400">مستوى الصوت (1-100):</label>
                    <div class="flex gap-2">
                        <input type="number" name="volume" min="1" max="100" value="50" required>
                        <button type="submit" class="btn w-32">تطبيق</button>
                    </div>
                </form>
            </div>
        </section>

        <section id="control" class="tab-content">
            <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">🎛️ تحكم البوت</h1>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form action="/api/bot/say" method="POST" class="glass-panel p-6 rounded-2xl"><h2 class="text-xl font-bold mb-4">إرسال رسالة</h2><select name="channel" required class="mb-3">${textOptions}</select><textarea name="message" rows="3" required class="mb-3"></textarea><button type="submit" class="btn">إرسال</button></form>
                <form action="/api/bot/status" method="POST" class="glass-panel p-6 rounded-2xl"><h2 class="text-xl font-bold mb-4">حالة البوت</h2><select name="type" class="mb-3"><option value="Playing">يلعب</option><option value="Watching">يشاهد</option><option value="Listening">يستمع</option><option value="Competing">يتنافس</option></select><input type="text" name="text" value="${config.bot.activityText.replace(/"/g, '&quot;')}" required class="mb-3"><button type="submit" class="btn">تحديث</button></form>
            </div>
        </section>

    </main>
    <script>
        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            event.currentTarget.classList.add('active');
        }
    </script>
</body>
</html>`;
    res.send(html);
});

// =====================================================
// API - مساعدات عامة
// =====================================================
function handlePost(res, successMsg) {
    saveConfig();
    res.send(`<script>alert('✅ ${successMsg}'); window.location.href='/';</script>`);
}

function alertBack(res, msg) {
    res.send(`<script>alert('❌ ${String(msg).replace(/'/g, "\\'").replace(/"/g, '&quot;')}'); window.location.href='/';</script>`);
}

app.post('/api/settings/welcome', requireAuth, (req, res) => {
    const { guildId, channel, goodbyeChannel, message, goodbyeMessage, enabled } = req.body;
    if (!guildId || !client.guilds.cache.has(guildId)) return alertBack(res, 'سيرفر غير صالح');
    updateGuildSettings(guildId, {
        welcomeChannelId: enabled === 'true' ? (channel || null) : null,
        goodbyeChannelId: goodbyeChannel || null,
        welcomeMessage: message || undefined,
        goodbyeMessage: goodbyeMessage || undefined
    });
    handlePost(res, 'تم حفظ إعدادات الترحيب!');
});

app.post('/api/settings/logs', requireAuth, (req, res) => {
    const { guildId, modLog, memberLog } = req.body;
    if (!guildId || !client.guilds.cache.has(guildId)) return alertBack(res, 'سيرفر غير صالح');
    updateGuildSettings(guildId, { modLogChannelId: modLog || null, memberLogChannelId: memberLog || null });
    handlePost(res, 'تم حفظ اللوقات!');
});

app.post('/api/settings/protection', requireAuth, (req, res) => {
    const { guildId, antiSpam, antiLink } = req.body;
    if (!guildId || !client.guilds.cache.has(guildId)) return alertBack(res, 'سيرفر غير صالح');
    updateGuildSettings(guildId, { antiSpam: antiSpam === 'true', antiLink: antiLink === 'true' });
    handlePost(res, 'تم حفظ إعدادات الحماية!');
});

app.post('/api/settings/levels', requireAuth, (req, res) => {
    const { guildId, enabled, channel } = req.body;
    if (!guildId || !client.guilds.cache.has(guildId)) return alertBack(res, 'سيرفر غير صالح');
    updateGuildSettings(guildId, { levelSystem: enabled === 'true', levelUpChannelId: channel || null });
    handlePost(res, 'تم حفظ إعدادات المستويات!');
});

app.post('/api/bot/say', requireAuth, async (req, res) => {
    try {
        const ch = await client.channels.fetch(req.body.channel);
        if (ch) await ch.send(req.body.message);
        handlePost(res, 'تم الإرسال!');
    } catch (e) {
        alertBack(res, 'تعذر الإرسال');
    }
});

app.post('/api/bot/status', requireAuth, (req, res) => {
    const { type, text } = req.body;
    const types = {
        Playing: ActivityType.Playing,
        Watching: ActivityType.Watching,
        Listening: ActivityType.Listening,
        Competing: ActivityType.Competing
    };
    client.user.setPresence({
        activities: [{ name: text, type: types[type] || ActivityType.Playing }],
        status: 'online'
    });
    config.bot.activityText = text;
    handlePost(res, 'تم تحديث الحالة!');
});

// =====================================================
// API - الموسيقى
// =====================================================
app.post('/api/music/play', requireAuth, async (req, res) => {
    try {
        const guild = client.guilds.cache.get(req.body.guildId);
        if (!guild) throw new Error('السيرفر غير موجود');

        const vc = guild.channels.cache.get(req.body.voiceChannel);
        if (!vc) throw new Error('الروم الصوتي غير موجود');

        const textChannel = guild.channels.cache.get(req.body.textChannel)
            || guild.channels.cache.find(c => c.isTextBased());

        const searchResult = await searchMusic(player, req.body.song, { requestedBy: client.user });

        if (!searchResult.hasTracks()) {
            throw new Error('لم يتم العثور على نتائج');
        }

        await player.play(vc, searchResult, {
            nodeOptions: {
                metadata: { channel: textChannel },
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 300_000,
                leaveOnEnd: false,
                selfDeaf: true
            }
        });

        handlePost(res, 'جاري التشغيل!');
    } catch (e) {
        console.error('Music Error:', e);
        alertBack(res, e.message);
    }
});

app.post('/api/music/skip', requireAuth, (req, res) => {
    const queue = player.nodes.get(req.body.guildId);
    if (queue && queue.isPlaying()) {
        queue.node.skip();
        handlePost(res, 'تم التخطي!');
    } else {
        alertBack(res, 'لا توجد موسيقى');
    }
});

app.post('/api/music/pause', requireAuth, (req, res) => {
    const queue = player.nodes.get(req.body.guildId);
    if (queue && queue.isPlaying()) {
        queue.node.pause();
        handlePost(res, 'تم الإيقاف المؤقت!');
    } else {
        alertBack(res, 'لا توجد موسيقى');
    }
});

app.post('/api/music/resume', requireAuth, (req, res) => {
    const queue = player.nodes.get(req.body.guildId);
    if (queue && queue.isPlaying()) {
        queue.node.resume();
        handlePost(res, 'تم الاستئناف!');
    } else {
        alertBack(res, 'لا توجد موسيقى');
    }
});

app.post('/api/music/stop', requireAuth, (req, res) => {
    const queue = player.nodes.get(req.body.guildId);
    if (queue) {
        queue.delete();
        handlePost(res, 'تم إيقاف الموسيقى.');
    } else {
        alertBack(res, 'لا توجد موسيقى');
    }
});

app.post('/api/music/volume', requireAuth, (req, res) => {
    const queue = player.nodes.get(req.body.guildId);
    const volume = Math.min(100, Math.max(1, parseInt(req.body.volume) || 50));
    if (queue) {
        queue.node.setVolume(volume);
        handlePost(res, `تم ضبط الصوت على ${volume}%`);
    } else {
        alertBack(res, 'لا توجد موسيقى');
    }
});

// =====================================================
// التشغيل
// =====================================================
app.listen(PORT, () => console.log(`🌐 لوحة التحكم تعمل على: http://localhost:${PORT}`));

async function boot() {
    try {
        await setupExtractors();
        if (!process.env.YOUTUBE_COOKIE) {
            console.warn('⚠️ لم يتم ضبط YOUTUBE_COOKIE: قد يمنع يوتيوب البث مؤخراً. أضف كوكيز يوتيوب في ملف .env لضمان عمل الموسيقى (انظر README).');
        }
        const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
        if (!token) {
            console.error('❌ لم يتم العثور على توكن البوت! انسخ ملف .env.example إلى .env وضع التوكن فيه.');
            process.exit(1);
        }
        await client.login(token);
    } catch (err) {
        console.error('❌ فشل تشغيل البوت:', err);
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

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ خطأ غير معالج:', reason);
});
