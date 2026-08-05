// =====================================================
// حدث "ready": يعمل مرة واحدة عند نجاح تسجيل دخول البوت
// =====================================================

import { ActivityType } from 'discord.js';
import type { ExtendedClient } from '../types';

export default {
    name: 'ready',
    once: true,
    execute(client: ExtendedClient) {
        console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user?.tag}`);
        console.log(`📊 البوت يعمل حالياً على ${client.guilds.cache.size} سيرفر`);
        console.log(`🌐 لوحة التحكم: http://localhost:${process.env.PORT || 3000}`);

        const updatePresence = () => {
            const serverCount = client.guilds.cache.size;
            client.user?.setPresence({
                activities: [
                    {
                        name: `${serverCount} سيرفر | /help`,
                        type: ActivityType.Watching
                    }
                ],
                status: 'online'
            });
        };

        updatePresence();
        setInterval(updatePresence, 10 * 60 * 1000);
    }
};
