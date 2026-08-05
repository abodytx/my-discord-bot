// =====================================================
// هذا الملف مسؤول عن "تسجيل" الأوامر (Slash Commands) لدى ديسكورد
// يجب تشغيله مرة واحدة بعد كل تعديل/إضافة أمر جديد
// تشغيله: node deploy-commands.js
// =====================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];

function collectCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            collectCommands(fullPath);
        } else if (item.name.endsWith('.js')) {
            try {
                const command = require(fullPath);
                if ('data' in command) commands.push(command.data.toJSON());
            } catch (err) {
                console.error(`⚠️ تعذر تحميل أمر ${fullPath}:`, err.message);
            }
        }
    }
}
collectCommands(path.join(__dirname, 'commands'));

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
    console.error('❌ تأكد من وجود DISCORD_TOKEN و CLIENT_ID في ملف .env');
    process.exit(1);
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`🔄 جاري تسجيل ${commands.length} أمر...`);

        let data;
        if (guildId) {
            // تسجيل سريع على سيرفر واحد فقط (يظهر فوراً)
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
            console.log(`✅ تم تسجيل ${data.length} أمر بنجاح على السيرفر المحدد.`);
        } else {
            // تسجيل عالمي (قد يستغرق حتى ساعة للظهور)
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            console.log(`✅ تم تسجيل ${data.length} أمر بنجاح بشكل عالمي.`);
        }
    } catch (error) {
        console.error('❌ حدث خطأ أثناء تسجيل الأوامر:', error);
        process.exit(1);
    }
})();
