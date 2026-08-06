// =====================================================
// لوق تعديل القنوات (channelUpdate) — اسم/موضوع/صلاحيات
// =====================================================

import { EmbedBuilder, AuditLogEvent, type GuildChannel } from 'discord.js';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';

export default {
    name: 'channelUpdate',
    async execute(oldChannel: GuildChannel, newChannel: GuildChannel) {
        if (!newChannel.guild) return;

        const changes: string[] = [];
        if (oldChannel.name !== newChannel.name) {
            changes.push(`**الاسم:** ${oldChannel.name} → ${newChannel.name}`);
        }
        if ('topic' in oldChannel && 'topic' in newChannel && oldChannel.topic !== newChannel.topic) {
            changes.push(`**الموضوع:** تم تعديله`);
        }
        if (oldChannel.permissionOverwrites.cache.size !== newChannel.permissionOverwrites.cache.size) {
            changes.push('**الصلاحيات:** تم تعديلها');
        }
        if (changes.length === 0) return;

        let executor = '';
        try {
            const audit = await newChannel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelUpdate,
                limit: 5
            });
            const entry = audit.entries.find(
                (e) => e.targetId === newChannel.id && e.createdTimestamp > Date.now() - 10_000
            );
            if (entry) executor = `\n**بواسطة:** ${entry.executor?.tag || 'غير معروف'}`;
        } catch {
            /* سجل التدقيق غير متاح */
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle('✏️ تم تعديل قناة')
            .setDescription(`القناة: ${newChannel} (${newChannel.name})\n\n${changes.join('\n')}${executor}`)
            .setTimestamp();
        await modLog(newChannel.guild, embed);
    }
};
