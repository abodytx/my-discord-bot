// =====================================================
// حدث "guildMemberAdd": يعمل عند انضمام عضو جديد للسيرفر
// =====================================================

const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/settings');
const { COLORS } = require('../utils/embeds');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        let settings = {};
        try {
            settings = getGuildSettings(member.guild.id) || {};
        } catch (e) {
            console.warn('لم يتم العثور على ملف إعدادات محلي، سيتم استخدام الإعدادات الافتراضية.');
        }

        // ------------------ 1) البحث عن قناة الترحيب ------------------
        let channel = null;

        if (settings.welcomeChannelId) {
            try {
                channel = await member.guild.channels.fetch(settings.welcomeChannelId);
            } catch (e) {
                console.error('تعذر الوصول للقناة المحددة في الإعدادات:', e);
            }
        }

        // خيار احتياطي: إذا لم تحدد قناة في الإعدادات، يتم البحث عن أول قناة نصية يملك البوت فيها صلاحية
        if (!channel) {
            channel = member.guild.channels.cache.find(
                ch => ch.isTextBased() && ch.permissionsFor(member.guild.members.me).has('SendMessages')
            );
        }

        // ------------------ 2) إرسال رسالة الترحيب ------------------
        if (channel) {
            try {
                const rawMessage = settings.welcomeMessage || 'أهلاً بك {user} في سيرفر {server}! 🎉';
                
                const description = rawMessage
                    .replace(/{user}/g, `<@${member.id}>`)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{memberCount}/g, member.guild.memberCount);

                const welcomeEmbed = new EmbedBuilder()
                    .setColor(COLORS?.SUCCESS || '#22c55e')
                    .setTitle(`🎉 عضو جديد في ${member.guild.name}!`)
                    .setDescription(description)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .addFields(
                        { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
                        { name: '🔢 عدد الأعضاء', value: `${member.guild.memberCount}`, inline: true }
                    )
                    .setFooter({ text: `المعرف: ${member.id}` })
                    .setTimestamp();

                if (settings.rulesChannelId) {
                    welcomeEmbed.addFields({
                        name: '📜 القوانين',
                        value: `يرجى الاطلاع على القوانين في <#${settings.rulesChannelId}>`
                    });
                }

                await channel.send({ content: `${member} أهلاً بك! 👋`, embeds: [welcomeEmbed] });
            } catch (err) {
                console.error('خطأ في إرسال رسالة الترحيب:', err);
            }
        } else {
            console.error('لم يتم العثور على أي قناة نصية متاحة لإرسال الترحيب فيها.');
        }

        // ------------------ 3) الرتبة التلقائية ------------------
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