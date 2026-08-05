// =====================================================
// حدث "guildMemberAdd": ترحيب + رتبة تلقائية + لوق انضمام
// =====================================================

const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/settings');
const { COLORS } = require('../utils/embeds');
const { memberLog } = require('../utils/logger');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const settings = getGuildSettings(member.guild.id) || {};

        // ------------------ 1) رسالة الترحيب ------------------
        let channel = null;
        if (settings.welcomeChannelId) {
            try {
                channel = await member.guild.channels.fetch(settings.welcomeChannelId);
            } catch (e) {
                console.error('تعذر الوصول لقناة الترحيب:', e);
            }
        }
        if (!channel) {
            channel = member.guild.channels.cache.find(
                ch => ch.isTextBased() && ch.permissionsFor(member.guild.members.me).has('SendMessages')
            );
        }

        if (channel) {
            try {
                const rawMessage = settings.welcomeMessage || 'أهلاً بك {user} في سيرفر {server}! 🎉';
                const description = rawMessage
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
                        { name: '🔢 عدد الأعضاء', value: `${member.guild.memberCount}`, inline: true },
                        { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`, inline: true }
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
        }

        // ------------------ 2) الرتبة التلقائية ------------------
        if (settings.autoRoleId) {
            try {
                const role = await member.guild.roles.fetch(settings.autoRoleId);
                if (role) await member.roles.add(role);
            } catch (err) {
                console.error('خطأ في إعطاء الرتبة التلقائية (تأكد أن رتبة البوت أعلى من الرتبة المستهدفة):', err);
            }
        }

        // ------------------ 3) لوق الانضمام ------------------
        const joinEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setAuthor({ name: `انضم عضو جديد: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${member.user} (${member.user.id})`)
            .addFields(
                { name: '👥 عدد الأعضاء الآن', value: `${member.guild.memberCount}`, inline: true }
            )
            .setTimestamp();
        await memberLog(member.guild, joinEmbed);
    }
};
