// =====================================================
// الملف الرئيسي لتشغيل البوت
// يقوم بـ: تسجيل الدخول، تحميل الأوامر (Commands)، تحميل الأحداث (Events)
// =====================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

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
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// تسجيل الدخول بالتوكن الموجود في ملف .env
client.login(process.env.DISCORD_TOKEN);
