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
        console.log(`🌐 لوحة التحكم: http://localhost:${process.env.PORT || 3000}`);

        const updatePresence = () => {
            const serverCount = client.guilds.cache.size;
            client.user.setPresence({
                activities: [{
                    name: `${serverCount} سيرفر | /help`,
                    type: ActivityType.Watching
                }],
                status: 'online'
            });
        };

        updatePresence();
        setInterval(updatePresence, 10 * 60 * 1000);
    }
};
