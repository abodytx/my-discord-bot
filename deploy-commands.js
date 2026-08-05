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
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            collectCommands(fullPath);
        } else if (item.name.endsWith('.js')) {
            const command = require(fullPath);
            if ('data' in command) commands.push(command.data.toJSON());
        }
    }
}
collectCommands(path.join(__dirname, 'commands'));

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 جاري تسجيل ${commands.length} أمر...`);

        let data;
        if (process.env.GUILD_ID) {
            // تسجيل سريع على سيرفر واحد فقط (مفيد أثناء التطوير - يظهر فوراً)
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`✅ تم تسجيل ${data.length} أمر بنجاح على السيرفر المحدد.`);
        } else {
            // تسجيل عالمي (يظهر على كل السيرفرات، لكن قد يستغرق حتى ساعة للظهور)
            data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ تم تسجيل ${data.length} أمر بنجاح بشكل عالمي.`);
        }
    } catch (error) {
        console.error('❌ حدث خطأ أثناء تسجيل الأوامر:', error);
    }
})();
