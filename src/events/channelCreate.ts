// =====================================================
// حدث "channelCreate": لوق + كشف Raid (إنشاء قنوات جماعي)
// =====================================================

import { EmbedBuilder, ChannelType, AuditLogEvent, type GuildChannel } from 'discord.js';
import type { ExtendedClient } from '../types';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';
import { emit } from '../modules/liveHub';

export default {
    name: 'channelCreate',
    async execute(channel: GuildChannel, client: ExtendedClient) {
        if (!channel.guild) return;

        emit('log', { level: 'info', source: 'channels', message: `تم إنشاء قناة: ${channel.name}` });

        // ------------------ كشف Raid (إنشاء جماعي) ------------------
        if (await client.antiNuke.isEnabled(channel.guild.id)) {
            const executorId = await client.antiNuke.findExecutor(
                channel.guild,
                AuditLogEvent.ChannelCreate,
                channel.id
            );
            const member = executorId ? await channel.guild.members.fetch(executorId).catch(() => null) : null;
            if (member && !(await client.antiNuke.isWhitelisted(channel.guild, member))) {
                const result = await client.antiNuke.record(channel.guild.id, executorId);
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
