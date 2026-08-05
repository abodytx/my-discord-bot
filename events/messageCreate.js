// =====================================================
// حدث "messageCreate": نظام حماية مصغر
// - Anti-Spam: يحذف الرسائل المتكررة بسرعة من نفس العضو
// - Anti-Link: يحذف الروابط والإعلانات غير المصرح بها
// =====================================================

const { PermissionFlagsBits } = require('discord.js');
const { getGuildSettings } = require('../utils/settings');
const { errorEmbed } = require('../utils/embeds');

const SPAM_LIMIT = 5;        // عدد الرسائل المسموح بها
const SPAM_INTERVAL = 7000;  // المدة الزمنية (7 ثوانٍ)

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // تجاهل رسائل البوتات ورسائل الخاص
        if (message.author.bot || !message.guild) return;

        // تجاهل المشرفين من أنظمة الحماية
        if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

        let settings = {};
        try {
            settings = getGuildSettings(message.guild.id) || {};
        } catch (e) {
            settings = {};
        }

        // ------------------ Anti-Link ------------------
        // إنشاء regex محلي تجنباً لمشكلة lastIndex مع الفلاج g
        const linkRegex = /(https?:\/\/[^\s]+|discord\.gg\/[^\s]+|www\.[^\s]+)/i;

        if (settings.antiLink && linkRegex.test(message.content)) {
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
            return;
        }

        // ------------------ Anti-Spam ------------------
        if (settings.antiSpam && client.spamTracker) {
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