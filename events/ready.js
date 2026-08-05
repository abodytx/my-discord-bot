// =====================================================
// حدث "ready": يعمل مرة واحدة عند نجاح تسجيل دخول البوت
// =====================================================

const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
        console.log(`📊 البوت يعمل حالياً على ${client.guilds.cache.size} سيرفر`);

        // تعيين حالة نشاط للبوت (تظهر تحت اسمه)
        client.user.setPresence({
            activities: [{ name: 'السيرفر | /help', type: ActivityType.Watching }],
            status: 'online'
        });
    }
};
