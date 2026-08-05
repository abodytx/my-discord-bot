// =====================================================
// حدث "guildMemberAdd": يعمل عند انضمام عضو جديد للسيرفر
// المسؤوليات: 1) إرسال رسالة ترحيب احترافية  2) إعطاء رتبة تلقائية
// =====================================================

const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/settings');
const { COLORS } = require('../utils/embeds');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const settings = getGuildSettings(member.guild.id);

        // ------------------ 1) رسالة الترحيب ------------------
        if (settings.welcomeChannelId) {
            try {
                const channel = await member.guild.channels.fetch(settings.welcomeChannelId);
                if (channel) {
                    // استبدال المتغيرات الديناميكية في نص الرسالة المخصص
                    const description = settings.welcomeMessage
                        .replace(/{user}/g, `<@${member.id}>`)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{memberCount}/g, member.guild.memberCount);

                    const welcomeEmbed = new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle(`🎉 عضو جديد في ${member.guild.name}!`)
                        .setDescription(description)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        .addFields(
                            { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
                            { name: '🔢 عدد الأعضاء', value: `${member.guild.memberCount}`, inline: true }
                        )
                        .setImage(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                        .setFooter({ text: `المعرف: ${member.id}` })
                        .setTimestamp();

                    // إضافة رابط القوانين إذا كان محدداً
                    if (settings.rulesChannelId) {
                        welcomeEmbed.addFields({
                            name: '📜 القوانين',
                            value: `يرجى الاطلاع على القوانين في <#${settings.rulesChannelId}>`
                        });
                    }

                    await channel.send({ content: `${member} أهلاً بك! 👋`, embeds: [welcomeEmbed] });
                }
            } catch (err) {
                console.error('خطأ في إرسال رسالة الترحيب:', err);
            }
        }

        // ------------------ 2) الرتبة التلقائية ------------------
        if (settings.autoRoleId) {
            try {
                const role = await member.guild.roles.fetch(settings.autoRoleId);
                if (role) {
                    await member.roles.add(role);
                }
            } catch (err) {
                console.error('خطأ في إعطاء الرتبة التلقائية (تأكد أن رتبة البوت أعلى من الرتبة المستهدفة):', err);
            }
        }
    }
};
