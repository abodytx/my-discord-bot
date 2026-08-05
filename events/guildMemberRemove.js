// =====================================================
// حدث "guildMemberRemove": رسالة وداع + لوق مغادرة
// =====================================================

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getGuildSettings } = require('../utils/settings');
const { COLORS } = require('../utils/embeds');
const { memberLog, modLog } = require('../utils/logger');
const { emit } = require('../modules/liveHub');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        const settings = getGuildSettings(member.guild.id) || {};

        emit('log', { level: 'info', source: 'members', message: `غادر عضو: ${member.user?.tag || member.id}` });

        // ------------------ 0) حماية Mass Kick ------------------
        if (client.antiNuke?.isEnabled(member.guild.id)) {
            try {
                const executorId = await client.antiNuke.findExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
                if (executorId) {
                    const executor = await member.guild.members.fetch(executorId).catch(() => null);
                    if (executor && !client.antiNuke.isWhitelisted(member.guild, executor)) {
                        const result = client.antiNuke.record(member.guild.id, executorId);
                        if (result.tripped) {
                            await client.antiNuke.punish(member.guild, executor, 'طرد جماعي (Mass Kick)');
                        }
                    }
                }
            } catch { /* audit log may be unavailable */ }
        }

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
