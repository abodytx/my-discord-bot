// =====================================================
// حدث "roleDelete": لوق + حماية Anti-Nuke مع استعادة الرتبة
// =====================================================

import { EmbedBuilder, AuditLogEvent, type Role } from 'discord.js';
import type { ExtendedClient } from '../types';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';
import { emit } from '../modules/liveHub';

export default {
    name: 'roleDelete',
    async execute(role: Role, client: ExtendedClient) {
        if (!role.guild) return;

        emit('log', { level: 'warn', source: 'roles', message: `تم حذف رتبة: ${role.name}` });

        // ------------------ حماية Anti-Nuke ------------------
        if (await client.antiNuke.isEnabled(role.guild.id)) {
            const executorId = await client.antiNuke.findExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
            const member = executorId ? await role.guild.members.fetch(executorId).catch(() => null) : null;
            if (member && !(await client.antiNuke.isWhitelisted(role.guild, member))) {
                const result = await client.antiNuke.record(role.guild.id, executorId);
                if (result.tripped) {
                    await client.antiNuke.punish(role.guild, member, 'حذف رتب');
                    await client.antiNuke.restoreRole(role);
                    return;
                }
                if (result.count === result.max) {
                    await modLog(role.guild, {
                        color: 0xffa500,
                        title: '⚠️ نشاط مشبوه',
                        description: `${member.user.tag} يحذف رتباً بكثرة (${result.count}/${result.max}).`,
                        timestamp: new Date()
                    }).catch(() => {});
                }
            }
        }

        // ------------------ اللوق ------------------
        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('🗑️ تم حذف رتبة')
            .setDescription(`تم حذف الرتبة: **${role.name}**`)
            .addFields({ name: '🆔 المعرف', value: role.id, inline: true })
            .setTimestamp();
        await modLog(role.guild, embed);
    }
};
