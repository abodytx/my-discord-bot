// =====================================================
// الملف الرئيسي لتشغيل البوت ولوحة التحكم
// =====================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// إنشاء عميل البوت مع تحديد الصلاحيات (Intents) اللازمة فقط
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

// مجموعة لتخزين كل الأوامر (Slash Commands)
client.commands = new Collection();

// مجموعة بسيطة لتتبع الرسائل لأجل نظام الحماية من السبام (Anti-Spam)
client.spamTracker = new Collection();

// ----------------------------------------------------
// تحميل كل ملفات الأوامر من مجلد commands (وكل المجلدات الفرعية بداخله)
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
// لوحة التحكم (Express Web Server)
// ----------------------------------------------------
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
    
    // حساب مدة التشغيل
    const totalSeconds = Math.floor(client.uptime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>لوحة إحصائيات البوت</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .header h1 { color: #38bdf8; margin-bottom: 5px; font-size: 2.2rem; }
            .header p { color: #94a3b8; font-size: 1rem; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; max-width: 1000px; margin: 0 auto; }
            .card { background: #1e293b; border-radius: 16px; padding: 25px; text-align: center; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); transition: transform 0.2s; }
            .card:hover { transform: translateY(-3px); }
            .card h3 { margin: 0; font-size: 1rem; color: #94a3b8; font-weight: 500; }
            .card p { margin: 15px 0 0 0; font-size: 2.2rem; font-weight: bold; color: #38bdf8; }
            .status-badge { display: inline-block; background-color: #064e3b; color: #34d399; padding: 6px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; margin-top: 15px; border: 1px solid #059669; }
            .footer { text-align: center; margin-top: 40px; color: #64748b; font-size: 0.85rem; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 لوحة إحصائيات البوت</h1>
            <p>متابعة أداء وحالة البوت في الوقت الفعلي</p>
            <div class="status-badge">🟢 البوت متصل ومستقر</div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>عدد السيرفرات</h3>
                <p>${totalServers}</p>
            </div>
            <div class="card">
                <h3>إجمالي الأعضاء</h3>
                <p>${totalUsers}</p>
            </div>
            <div class="card">
                <h3>سرعة الاستجابة (Ping)</h3>
                <p>${ping} ms</p>
            </div>
            <div class="card">
                <h3>مدة التشغيل المستمر</h3>
                <p>${hours} س و ${minutes} د</p>
            </div>
        </div>

        <div class="footer">
            تم التحديث تلقائياً • Render & Discord.js
        </div>
    </body>
    </html>
    `;

    res.send(html);
});

app.listen(PORT, () => {
    console.log(`🌐 لوحة التحكم تعمل على المنفذ: ${PORT}`);
});

// تسجيل الدخول بالتوكن المسجل في البيئة (يدعم TOKEN أو DISCORD_TOKEN)
const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
client.login(token);