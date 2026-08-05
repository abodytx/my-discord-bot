// =====================================================
// حدث "channelDelete": لوق + حماية Anti-Nuke مع استعادة القناة
// =====================================================

const { EmbedBuilder, ChannelType, AuditLogEvent } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const { modLog } = require('../utils/logger');
const { emit } = require('../modules/liveHub');

module.exports = {
    name: 'channelDelete',
    async execute(channel, client) {
        if (!channel.guild) return;

        emit('log', { level: 'warn', source: 'channels', message: `تم حذف قناة: ${channel.name}` });

        // ------------------ حماية Anti-Nuke ------------------
        if (client.antiNuke?.isEnabled(channel.guild.id)) {
            const executorId = await client.antiNuke.findExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
            const member = executorId ? await channel.guild.members.fetch(executorId).catch(() => null) : null;
            if (member && !client.antiNuke.isWhitelisted(channel.guild, member)) {
                const result = client.antiNuke.record(channel.guild.id, executorId);
                if (result.tripped) {
                    await client.antiNuke.punish(channel.guild, member, 'حذف قنوات');
                    await client.antiNuke.restoreChannel(channel);
                    return;
                }
                if (result.count === result.max) {
                    await modLog(channel.guild, {
                        color: 0xffa500,
                        title: '⚠️ نشاط مشبوه',
                        description: `${member.user.tag} يحذف قنوات بكثرة (${result.count}/${result.max}).`,
                        timestamp: new Date()
                    }).catch(() => {});
                }
            }
        }

        // ------------------ اللوق ------------------
        const typeName = channel.type === ChannelType.GuildVoice ? 'صوتية' : 'نصية';
        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('🗑️ تم حذف قناة')
            .setDescription(`تم حذف قناة **${typeName}**: ${channel.name}`)
            .addFields({ name: '🆔 المعرف', value: channel.id, inline: true })
            .setTimestamp();
        await modLog(channel.guild, embed);
    }
};
