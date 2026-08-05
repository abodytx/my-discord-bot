// =====================================================
// حدث "channelDelete": لوق + حماية Anti-Nuke مع استعادة القناة
// =====================================================

import { EmbedBuilder, ChannelType, AuditLogEvent, type GuildChannel } from 'discord.js';
import type { ExtendedClient } from '../types';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';
import { emit } from '../modules/liveHub';

export default {
    name: 'channelDelete',
    async execute(channel: GuildChannel, client: ExtendedClient) {
        if (!channel.guild) return;

        emit('log', { level: 'warn', source: 'channels', message: `تم حذف قناة: ${channel.name}` });

        // ------------------ حماية Anti-Nuke ------------------
        if (await client.antiNuke.isEnabled(channel.guild.id)) {
            const executorId = await client.antiNuke.findExecutor(
                channel.guild,
                AuditLogEvent.ChannelDelete,
                channel.id
            );
            const member = executorId ? await channel.guild.members.fetch(executorId).catch(() => null) : null;
            if (member && !(await client.antiNuke.isWhitelisted(channel.guild, member))) {
                const result = await client.antiNuke.record(channel.guild.id, executorId);
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
