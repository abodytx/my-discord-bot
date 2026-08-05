// =====================================================
// حدث "channelCreate": لوق + كشف Raid (إنشاء قنوات جماعي)
// =====================================================

const { EmbedBuilder, ChannelType, AuditLogEvent } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const { modLog } = require('../utils/logger');
const { emit } = require('../modules/liveHub');

module.exports = {
    name: 'channelCreate',
    async execute(channel, client) {
        if (!channel.guild) return;

        emit('log', { level: 'info', source: 'channels', message: `تم إنشاء قناة: ${channel.name}` });

        // ------------------ كشف Raid (إنشاء جماعي) ------------------
        if (client.antiNuke?.isEnabled(channel.guild.id)) {
            const executorId = await client.antiNuke.findExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
            const member = executorId ? await channel.guild.members.fetch(executorId).catch(() => null) : null;
            if (member && !client.antiNuke.isWhitelisted(channel.guild, member)) {
                const result = client.antiNuke.record(channel.guild.id, executorId);
                if (result.tripped) {
                    await client.antiNuke.punish(channel.guild, member, 'إنشاء قنوات جماعي (Raid)');
                    await channel.delete('Anti-Nuke: Raid').catch(() => {});
                    return;
                }
            }
        }

        // ------------------ اللوق ------------------
        const typeName = channel.type === ChannelType.GuildVoice ? 'صوتية' : 'نصية';
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('📁 تم إنشاء قناة جديدة')
            .setDescription(`قناة **${typeName}**: ${channel} (${channel.name})`)
            .setTimestamp();
        await modLog(channel.guild, embed);
    }
};
