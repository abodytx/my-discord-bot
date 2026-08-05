// =====================================================
// حدث "guildMemberRemove": رسالة وداع + لوق مغادرة
// =====================================================

const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/settings');
const { COLORS } = require('../utils/embeds');
const { memberLog } = require('../utils/logger');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        const settings = getGuildSettings(member.guild.id) || {};

        // ------------------ 1) رسالة الوداع ------------------
        if (settings.goodbyeChannelId) {
            try {
                const goodbyeChannel = await member.guild.channels.fetch(settings.goodbyeChannelId);
                if (goodbyeChannel) {
                    const rawMessage = settings.goodbyeMessage || 'وداعاً {user}، سنشتاق إليك في **{server}**. 👋';
                    const description = rawMessage
                        .replace(/{user}/g, `<@${member.id}>`)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{memberCount}/g, member.guild.memberCount);

                    const goodbyeEmbed = new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle(`👋 وداعاً ${member.user.tag}!`)
                        .setDescription(description)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        .setTimestamp();

                    await goodbyeChannel.send({ embeds: [goodbyeEmbed] });
                }
            } catch (err) {
                console.error('خطأ في إرسال رسالة الوداع:', err);
            }
        }

        // ------------------ 2) لوق المغادرة ------------------
        const leaveEmbed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setAuthor({ name: `غادر عضو: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${member.user} (${member.user.id})`)
            .addFields(
                { name: '👥 عدد الأعضاء الآن', value: `${member.guild.memberCount}`, inline: true },
                { name: '📅 تاريخ الانضمام', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : 'غير معروف', inline: true }
            )
            .setTimestamp();
        await memberLog(member.guild, leaveEmbed);
    }
};
