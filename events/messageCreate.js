// =====================================================
// حدث "messageCreate":
// - Anti-Spam: حذف الرسائل المتكررة من نفس العضو
// - Anti-Link: حذف الروابط غير المصرح بها
// - نظام XP: منح نقاط خبرة للأعضاء (إذا كان مفعلاً)
// =====================================================

const { PermissionFlagsBits } = require('discord.js');
const { getGuildSettings } = require('../utils/settings');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { addXp, getLevelInfo } = require('../utils/levels');

const SPAM_LIMIT = 5;
const SPAM_INTERVAL = 7000;

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const settings = getGuildSettings(message.guild.id) || {};
        const isStaff = message.member?.permissions.has(PermissionFlagsBits.ManageMessages);

        // ------------------ نظام XP ------------------
        if (settings.levelSystem && !isStaff) {
            const last = client.xpTracker.get(message.author.id) || 0;
            const now = Date.now();
            // نقاط كل 60 ثانية لكل عضو لتجنب السبام
            if (now - last > 60_000) {
                client.xpTracker.set(message.author.id, now);
                const xpGained = Math.floor(Math.random() * 10) + 5;
                const { leveledUp, oldLevel, newLevel } = addXp(message.guild.id, message.author.id, xpGained);

                if (leveledUp) {
                    try {
                        const levelChannel = settings.levelUpChannelId
                            ? (message.guild.channels.cache.get(settings.levelUpChannelId) || null)
                            : null;
                        const channel = levelChannel || message.channel;
                        const { level } = getLevelInfo(message.guild.id, message.author.id);
                        await channel.send({
                            embeds: [successEmbed('🎉 مستوى جديد!', `${message.author} وصل إلى المستوى **${level}**!`)]
                        });
                    } catch (err) {
                        console.error('خطأ في إرسال رسالة المستوى:', err);
                    }
                }
            }
        }

        // تجاهل أعضاء الإدارة من أنظمة الحماية
        if (isStaff) return;

        // ------------------ Anti-Link ------------------
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

                        // كتم تلقائي عند تكرار المخالفة
                        if (record.count >= SPAM_LIMIT + 4 && message.member && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                            const offenses = Math.floor(record.count / SPAM_LIMIT);
                            const timeoutMinutes = Math.min(60, offenses * 10);
                            await message.member.timeout(timeoutMinutes * 60 * 1000, 'Anti-Spam: إرسال رسائل متكررة')
                                .then(() => message.channel.send({
                                    embeds: [errorEmbed('🔇 تم كتم العضو', `${message.author} تم كتمه **${timeoutMinutes} دقيقة** بسبب السبام المستمر.`)]
                                })).catch(() => {});
                        }
                    } catch (err) {
                        console.error('خطأ في نظام Anti-Spam:', err);
                    }
                }
            }
        }
    }
};
