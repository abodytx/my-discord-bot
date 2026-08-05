// =====================================================
// الملف الرئيسي - لوحة التحكم الأسطورية الشاملة
// =====================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection, ActivityType } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// إدارة الإعدادات الشاملة
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {
    welcome: { enabled: false, channel: '', message: 'أهلاً بك {user}!' },
    logs: { enabled: false, channel: '', events: ['messageDelete', 'roleUpdate'] },
    bot: { status: 'online', activityText: 'لوحة التحكم الأسطورية' }
};

if (fs.existsSync(CONFIG_FILE)) {
    try {
        config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    } catch (e) { console.error("خطأ في الإعدادات:", e); }
}

function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// إعداد البوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // ضروري للموسيقى لاحقاً
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.spamTracker = new Collection();

// تحميل الأوامر والأحداث
function loadFiles(dir, collection, isEvent = false) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) loadFiles(fullPath, collection, isEvent);
        else if (item.name.endsWith('.js')) {
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
// واجهة لوحة التحكم الأسطورية (HTML/CSS/JS)
// =====================================================

app.get('/', (req, res) => {
    if (!client.readyAt) return res.send(`<html dir="rtl"><body style="background:#0f172a; color:#fff; text-align:center; padding:50px;"><h2>🔄 جاري التشغيل... حدث الصفحة.</h2></body></html>`);

    const stats = {
        servers: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
        ping: Math.round(client.ws.ping),
        ram: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    };

    let channelsOptions = '<option value="">-- اختر القناة --</option>';
    client.channels.cache.filter(c => c.isTextBased() && c.type === 0).forEach(c => {
        channelsOptions += `<option value="${c.id}">#${c.name} (${c.guild.name})</option>`;
    });

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
            .glass-panel { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
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
        </style>
    </head>
    <body class="flex h-screen overflow-hidden">
        
        <!-- Sidebar -->
        <aside class="w-64 glass-panel flex flex-col p-5 shadow-2xl z-10">
            <div class="text-center mb-8">
                <img src="${client.user.displayAvatarURL()}" class="w-20 h-20 rounded-full mx-auto border-2 border-blue-500 mb-3 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <h2 class="text-xl font-bold text-blue-400">${client.user.username}</h2>
                <span class="text-xs text-green-400">🟢 متصل ومستقر</span>
            </div>
            <nav class="flex-1 space-y-2">
                <div class="nav-item active p-3 rounded-lg font-medium" onclick="switchTab('dashboard')"><i class="fa-solid fa-chart-line ml-2"></i> الإحصائيات</div>
                <div class="nav-item p-3 rounded-lg font-medium" onclick="switchTab('welcome')"><i class="fa-solid fa-handshake ml-2"></i> نظام الترحيب</div>
                <div class="nav-item p-3 rounded-lg font-medium" onclick="switchTab('logs')"><i class="fa-solid fa-file-shield ml-2"></i> نظام اللوقات</div>
                <div class="nav-item p-3 rounded-lg font-medium" onclick="switchTab('music')"><i class="fa-solid fa-music ml-2"></i> مشغل الموسيقى</div>
                <div class="nav-item p-3 rounded-lg font-medium" onclick="switchTab('control')"><i class="fa-solid fa-robot ml-2"></i> تحكم البوت والرسائل</div>
            </nav>
            <div class="text-xs text-center text-gray-500 mt-auto">V 2.0.0 • Master Dashboard</div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto p-8 relative">
            
            <!-- Dashboard Tab -->
            <section id="dashboard" class="tab-content active">
                <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">📊 الإحصائيات الحية</h1>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="glass-panel p-6 rounded-2xl text-center shadow-lg">
                        <i class="fa-solid fa-server text-4xl text-blue-500 mb-3"></i>
                        <h3 class="text-gray-400">السيرفرات</h3>
                        <p class="text-3xl font-bold">${stats.servers}</p>
                    </div>
                    <div class="glass-panel p-6 rounded-2xl text-center shadow-lg">
                        <i class="fa-solid fa-users text-4xl text-green-500 mb-3"></i>
                        <h3 class="text-gray-400">الأعضاء</h3>
                        <p class="text-3xl font-bold">${stats.users}</p>
                    </div>
                    <div class="glass-panel p-6 rounded-2xl text-center shadow-lg">
                        <i class="fa-solid fa-network-wired text-4xl text-yellow-500 mb-3"></i>
                        <h3 class="text-gray-400">الاستجابة (Ping)</h3>
                        <p class="text-3xl font-bold">${stats.ping} ms</p>
                    </div>
                    <div class="glass-panel p-6 rounded-2xl text-center shadow-lg">
                        <i class="fa-solid fa-memory text-4xl text-purple-500 mb-3"></i>
                        <h3 class="text-gray-400">استهلاك الرام</h3>
                        <p class="text-3xl font-bold">${stats.ram} MB</p>
                    </div>
                </div>
            </section>

            <!-- Welcome Tab -->
            <section id="welcome" class="tab-content">
                <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">👋 إعدادات الترحيب</h1>
                <form action="/api/settings/welcome" method="POST" class="glass-panel p-6 rounded-2xl max-w-2xl mx-auto shadow-lg">
                    <div class="mb-4 flex items-center justify-between">
                        <label class="font-bold text-lg">تفعيل الترحيب:</label>
                        <select name="enabled" class="w-32">
                            <option value="true" ${config.welcome.enabled ? 'selected' : ''}>مفعل ✅</option>
                            <option value="false" ${!config.welcome.enabled ? 'selected' : ''}>معطل ❌</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <label>قناة الترحيب:</label>
                        <select name="channel" required>${channelsOptions}</select>
                    </div>
                    <div class="mb-6">
                        <label>نص رسالة الترحيب (استخدم {user} لعمل منشن):</label>
                        <textarea name="message" rows="4" required>${config.welcome.message}</textarea>
                    </div>
                    <button type="submit" class="btn"><i class="fa-solid fa-floppy-disk ml-2"></i> حفظ الإعدادات</button>
                </form>
            </section>

            <!-- Logs Tab -->
            <section id="logs" class="tab-content">
                <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">🛡️ نظام اللوقات (السجلات)</h1>
                <form action="/api/settings/logs" method="POST" class="glass-panel p-6 rounded-2xl max-w-2xl mx-auto shadow-lg">
                    <div class="mb-4">
                        <label>قناة إرسال اللوقات:</label>
                        <select name="channel" required>${channelsOptions}</select>
                    </div>
                    <div class="mb-6">
                        <label class="block mb-2">الأحداث المراد مراقبتها:</label>
                        <div class="grid grid-cols-2 gap-3 bg-slate-900 p-4 rounded-lg">
                            <label><input type="checkbox" name="events" value="msgDelete" checked> حذف الرسائل</label>
                            <label><input type="checkbox" name="events" value="msgEdit" checked> تعديل الرسائل</label>
                            <label><input type="checkbox" name="events" value="roleUpdate" checked> تغيير الرتب</label>
                            <label><input type="checkbox" name="events" value="vcJoin" checked> الدخول للصوتي</label>
                        </div>
                    </div>
                    <button type="submit" class="btn"><i class="fa-solid fa-shield-halved ml-2"></i> حفظ وتفعيل الحماية</button>
                </form>
            </section>

            <!-- Music Tab -->
            <section id="music" class="tab-content">
                <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">🎵 مشغل الموسيقى المركزي</h1>
                <div class="glass-panel p-6 rounded-2xl max-w-2xl mx-auto shadow-lg text-center">
                    <div class="w-32 h-32 bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-4 border-4 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        <i class="fa-solid fa-compact-disc text-6xl text-blue-400 animate-spin" style="animation-duration: 3s;"></i>
                    </div>
                    <form action="/api/music/play" method="POST" class="mb-6">
                        <label class="text-right block mb-2">اسم الأغنية أو الرابط (يوتيوب/سبوتيفاي):</label>
                        <div class="flex gap-2">
                            <input type="text" name="song" placeholder="اكتب هنا..." required>
                            <button type="submit" class="btn w-32"><i class="fa-solid fa-play"></i> تشغيل</button>
                        </div>
                    </form>
                    <div class="flex justify-center gap-4">
                        <button class="btn btn-danger w-32"><i class="fa-solid fa-stop"></i> إيقاف</button>
                        <button class="btn w-32" style="background:#8b5cf6;"><i class="fa-solid fa-forward-step"></i> تخطي</button>
                    </div>
                    <p class="text-xs text-gray-400 mt-4">* ملاحظة: يتطلب تثبيت حزمة discord-player لتعمل الأزرار بالكامل.</p>
                </div>
            </section>

            <!-- Control Tab -->
            <section id="control" class="tab-content">
                <h1 class="text-3xl font-bold mb-6 text-white border-b border-slate-700 pb-3">🎛️ تحكم البوت الشامل</h1>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Send Message -->
                    <form action="/api/bot/say" method="POST" class="glass-panel p-6 rounded-2xl shadow-lg">
                        <h2 class="text-xl font-bold mb-4 text-blue-400"><i class="fa-solid fa-bullhorn"></i> إرسال رسالة كـ البوت</h2>
                        <select name="channel" required class="mb-3">${channelsOptions}</select>
                        <textarea name="message" rows="3" placeholder="نص الرسالة..." required class="mb-3"></textarea>
                        <button type="submit" class="btn"><i class="fa-solid fa-paper-plane"></i> إرسال</button>
                    </form>

                    <!-- Change Status -->
                    <form action="/api/bot/status" method="POST" class="glass-panel p-6 rounded-2xl shadow-lg">
                        <h2 class="text-xl font-bold mb-4 text-blue-400"><i class="fa-solid fa-gamepad"></i> تغيير حالة البوت (Activity)</h2>
                        <select name="type" class="mb-3">
                            <option value="Playing">يلعب (Playing)</option>
                            <option value="Watching">يشاهد (Watching)</option>
                            <option value="Listening">يستمع إلى (Listening)</option>
                        </select>
                        <input type="text" name="text" placeholder="مثال: يخدم السيرفر بكل حب..." value="${config.bot.activityText}" required class="mb-3">
                        <button type="submit" class="btn"><i class="fa-solid fa-arrows-rotate"></i> تحديث الحالة</button>
                    </form>
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
    </html>
    `;
    res.send(html);
});

// =====================================================
// مسارات الاستقبال (API Routes)
// =====================================================

function handlePost(req, res, successMsg) {
    saveConfig();
    res.send(`<script>alert('✅ ${successMsg}'); window.location.href='/';</script>`);
}

// 1. الترحيب
app.post('/api/settings/welcome', (req, res) => {
    config.welcome = { enabled: req.body.enabled === 'true', channel: req.body.channel, message: req.body.message };
    handlePost(req, res, 'تم حفظ إعدادات الترحيب!');
});

// 2. اللوقات
app.post('/api/settings/logs', (req, res) => {
    config.logs = { enabled: true, channel: req.body.channel, events: req.body.events || [] };
    handlePost(req, res, 'تم حفظ إعدادات اللوقات!');
});

// 3. إرسال رسالة
app.post('/api/bot/say', async (req, res) => {
    try {
        const channel = await client.channels.fetch(req.body.channel);
        if (channel) await channel.send(req.body.message);
        handlePost(req, res, 'تم إرسال الرسالة بنجاح!');
    } catch (e) {
        res.send(`<script>alert('❌ خطأ: ${e.message}'); window.location.href='/';</script>`);
    }
});

// 4. تحديث الحالة
app.post('/api/bot/status', (req, res) => {
    const { type, text } = req.body;
    const types = { Playing: ActivityType.Playing, Watching: ActivityType.Watching, Listening: ActivityType.Listening };
    client.user.setPresence({ activities: [{ name: text, type: types[type] }], status: 'online' });
    config.bot.activityText = text;
    handlePost(req, res, 'تم تغيير حالة البوت!');
});

// 5. الموسيقى (أساس الاستقبال)
app.post('/api/music/play', (req, res) => {
    // هنا سيتم ربط مكتبة الموسيقى لاحقاً
    res.send(`<script>alert('🎵 تم استلام طلب الأغنية! (يحتاج البوت لتفعيل نظام الموسيقى الداخلي لتعمل)'); window.location.href='/';</script>`);
});

app.listen(PORT, () => console.log(`🌐 اللوحة الأسطورية تعمل على منفذ: ${PORT}`));
client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);