// =====================================================
// حدث "messageCreate": نظام حماية مصغر
// - Anti-Spam: يحذف الرسائل المتكررة بسرعة من نفس العضو
// - Anti-Link: يحذف الروابط والإعلانات غير المصرح بها
// =====================================================

const { PermissionFlagsBits } = require('discord.js');
const { getGuildSettings } = require('../utils/settings');
const { errorEmbed } = require('../utils/embeds');

const SPAM_LIMIT = 5;        // عدد الرسائل المسموح بها
const SPAM_INTERVAL = 7000;  // خلال هذه المدة (بالمللي ثانية) = 7 ثوانٍ
const LINK_REGEX = /(https?:\/\/[^\s]+|discord\.gg\/[^\s]+|www\.[^\s]+)/gi;

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // تجاهل رسائل البوتات ورسائل الخاص
        if (message.author.bot || !message.guild) return;

        // تجاهل المشرفين (لديهم صلاحية إدارة الرسائل) من أنظمة الحماية
        if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

        const settings = getGuildSettings(message.guild.id);

        // ------------------ Anti-Link ------------------
        if (settings.antiLink && LINK_REGEX.test(message.content)) {
            try {
                await message.delete();
                const warn = await message.channel.send({
                    content: `${message.author}`,
                    embeds: [errorEmbed('الروابط ممنوعة', 'لا يُسمح بإرسال الروابط في هذا السيرفر.')]
                });
                setTimeout(() => warn.delete().catch(() => {}), 5000);
            } catch (err) {
                console.error('خطأ في نظام Anti-Link:', err);
            }
            return; // لا داعي لفحص السبام إذا تم حذف الرسالة أصلاً
        }

        // ------------------ Anti-Spam ------------------
        if (settings.antiSpam) {
            const key = `${message.guild.id}-${message.author.id}`;
            const now = Date.now();
            const record = client.spamTracker.get(key) || { count: 0, firstMessageAt: now };

            if (now - record.firstMessageAt > SPAM_INTERVAL) {
                // بدء نافذة زمنية جديدة
                client.spamTracker.set(key, { count: 1, firstMessageAt: now });
            } else {
                record.count++;
                client.spamTracker.set(key, record);

                if (record.count > SPAM_LIMIT) {
                    try {
                        await message.delete();
                        const warn = await message.channel.send({
                            content: `${message.author}`,
                            embeds: [errorEmbed('تم رصد سبام', 'يرجى التوقف عن إرسال الرسائل بشكل متكرر وسريع.')]
                        });
                        setTimeout(() => warn.delete().catch(() => {}), 5000);
                    } catch (err) {
                        console.error('خطأ في نظام Anti-Spam:', err);
                    }
                }
            }
        }
    }
};
