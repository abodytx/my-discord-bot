// =====================================================
// الملف الرئيسي لتشغيل البوت ولوحة التحكم التفاعلية
// =====================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد Express لاستقبال البيانات من النماذج (Forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ملف حفظ إعدادات البوت محلية
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = { welcomeMessage: 'أهلاً بك في السيرفر!' };

if (fs.existsSync(CONFIG_FILE)) {
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
        console.error("خطأ في قراءة ملف config.json:", e);
    }
}

function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// إنشاء عميل البوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,      // لازم لنظام الترحيب والرتب التلقائية
        GatewayIntentBits.GuildMessages,     // لازم لنظام الحماية (Anti-Spam/Anti-Link)
        GatewayIntentBits.MessageContent,    // لازم لقراءة محتوى الرسائل
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.spamTracker = new Collection();

// ----------------------------------------------------
// تحميل كل ملفات الأوامر من مجلد commands
// ----------------------------------------------------
function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            loadCommands(fullPath);
        } else if (item.name.endsWith('.js')) {
            const command = require(fullPath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.warn(`⚠️ الأمر في ${fullPath} ناقص خاصية data أو execute`);
            }
        }
    }
}
loadCommands(path.join(__dirname, 'commands'));

// ----------------------------------------------------
// تحميل كل ملفات الأحداث من مجلد events
// ----------------------------------------------------
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// ----------------------------------------------------
// لوحة التحكم التفاعلية (Web Dashboard)
// ----------------------------------------------------

// عرض اللوحة الرئيسية
app.get('/', (req, res) => {
    if (!client.readyAt) {
        return res.send(`
            <html lang="ar" dir="rtl">
            <body style="font-family: sans-serif; background-color: #0f172a; color: #fff; text-align: center; padding: 50px;">
                <h2>🔄 جاري تشغيل البوت والاتصال بـ Discord... يرجى تحديث الصفحة بعد قليل.</h2>
            </body>
            </html>
        `);
    }

    const totalServers = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
    const ping = Math.round(client.ws.ping);
    
    const totalSeconds = Math.floor(client.uptime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    // تجميع قائمة القنوات النصية المتاحة في السيرفرات
    let channelsOptions = '';
    client.channels.cache.forEach(channel => {
        if (channel.isTextBased() && channel.type === 0) {
            channelsOptions += `<option value="${channel.id}">#${channel.name} (${channel.guild.name})</option>`;
        }
    });

    const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>لوحة التحكم الكاملة بالبوت</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 30px 15px; }
            .container { max-width: 900px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #38bdf8; margin-bottom: 5px; font-size: 2.2rem; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; }
            .card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 20px; }
            .card h2 { margin-top: 0; color: #38bdf8; font-size: 1.2rem; border-bottom: 1px solid #334155; padding-bottom: 10px; }
            .stat-box { text-align: center; background: #0f172a; padding: 15px; border-radius: 10px; border: 1px solid #334155; }
            .stat-box h3 { margin: 0; font-size: 0.9rem; color: #94a3b8; }
            .stat-box p { margin: 10px 0 0; font-size: 1.8rem; font-weight: bold; color: #38bdf8; }
            label { display: block; margin: 12px 0 6px; color: #cbd5e1; font-weight: 500; }
            input[type="text"], select, textarea { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; font-size: 0.95rem; }
            button { background: #0284c7; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 15px; width: 100%; font-size: 1rem; transition: 0.2s; }
            button:hover { background: #0369a1; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎛️ لوحة التحكم الكاملة بالبوت</h1>
                <p>إدارة البوت، الإعدادات، وإرسال الرسائل مباشرة</p>
            </div>

            <!-- قسم الإحصائيات -->
            <div class="grid">
                <div class="stat-box"><h3>السيرفرات</h3><p>${totalServers}</p></div>
                <div class="stat-box"><h3>إجمالي الأعضاء</h3><p>${totalUsers}</p></div>
                <div class="stat-box"><h3>السرعة (Ping)</h3><p>${ping} ms</p></div>
                <div class="stat-box"><h3>مدة التشغيل</h3><p>${hours}س ${minutes}د</p></div>
            </div>

            <!-- قسم إرسال الرسائل عبر البوت -->
            <div class="card">
                <h2>📢 إرسال رسالة مباشرة من البوت</h2>
                <form action="/send-message" method="POST">
                    <label>اختر القناة/الروم:</label>
                    <select name="channelId" required>
                        ${channelsOptions || '<option value="">لا توجد قنوات نصية متاحة</option>'}
                    </select>

                    <label>نص الرسالة:</label>
                    <textarea name="message" rows="3" placeholder="اكتب النص الذي تريد أن يرسله البوت..." required></textarea>

                    <button type="submit">إرسال الرسالة الآن 🚀</button>
                </form>
            </div>

            <!-- قسم تعديل الإعدادات العامة -->
            <div class="card">
                <h2>⚙️ إعدادات البوت العامة</h2>
                <form action="/update-config" method="POST">
                    <label>رسالة الترحيب التلقائية:</label>
                    <input type="text" name="welcomeMessage" value="${config.welcomeMessage || ''}">

                    <button type="submit">حفظ التغييرات 💾</button>
                </form>
            </div>
        </div>
    </body>
    </html>
    `;

    res.send(html);
});

// استقبال طلب إرسال رسالة من اللوحة
app.post('/send-message', async (req, res) => {
    const { channelId, message } = req.body;
    try {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
            await channel.send(message);
            res.send("<script>alert('✅ تم إرسال الرسالة بنجاح!'); window.location.href='/';</script>");
        } else {
            res.send("<script>alert('❌ تعذر الوصول للقناة المحدد!'); window.location.href='/';</script>");
        }
    } catch (err) {
        res.send(`<script>alert('❌ حدث خطأ أثناء الإرسال: ${err.message}'); window.location.href='/';</script>`);
    }
});

// استقبال طلب حفظ الإعدادات
app.post('/update-config', (req, res) => {
    config.welcomeMessage = req.body.welcomeMessage;
    saveConfig();
    res.send("<script>alert('✅ تم حفظ الإعدادات بنجاح!'); window.location.href='/';</script>");
});

app.listen(PORT, () => {
    console.log(`🌐 لوحة التحكم التفاعلية تعمل على المنفذ: ${PORT}`);
});

const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
client.login(token);