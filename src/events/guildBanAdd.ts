// =====================================================
// حدث "guildBanAdd": لوق + حماية Anti-Nuke من الحظر الجماعي
// =====================================================

import { EmbedBuilder, AuditLogEvent, type GuildBan } from 'discord.js';
import type { ExtendedClient } from '../types';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';
import { emit } from '../modules/liveHub';

export default {
    name: 'guildBanAdd',
    async execute(ban: GuildBan, client: ExtendedClient) {
        if (!ban.guild) return;
        const user = ban.user;

        emit('log', { level: 'warn', source: 'bans', message: `تم حظر: ${user.tag}` });

        // ------------------ حماية Mass Ban ------------------
        if (await client.antiNuke.isEnabled(ban.guild.id)) {
            const executorId = await client.antiNuke.findExecutor(ban.guild, AuditLogEvent.MemberBanAdd, user.id);
            const member = executorId ? await ban.guild.members.fetch(executorId).catch(() => null) : null;
            if (member && !(await client.antiNuke.isWhitelisted(ban.guild, member))) {
                const result = await client.antiNuke.record(ban.guild.id, executorId);
                if (result.tripped) {
                    await client.antiNuke.punish(ban.guild, member, 'حظر جماعي (Mass Ban)');
                    return;
                }
                if (result.count === result.max) {
                    await modLog(ban.guild, {
                        color: 0xffa500,
                        title: '⚠️ نشاط مشبوه',
                        description: `${member.user.tag} يقوم بالحظر بكثرة (${result.count}/${result.max}).`,
                        timestamp: new Date()
                    }).catch(() => {});
                }
            }
        }

        // ------------------ اللوق ------------------
        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('🔨 تم حظر عضو')
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setDescription(`${user} (${user.id})`)
            .addFields({ name: '📝 السبب', value: ban.reason || 'غير محدد', inline: false })
            .setTimestamp();
        await modLog(ban.guild, embed);
    }
};
