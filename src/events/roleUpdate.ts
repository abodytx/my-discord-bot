// =====================================================
// لوق تعديل الرتب (roleUpdate) — اسم/لون/صلاحيات
// =====================================================

import { EmbedBuilder, AuditLogEvent, type Role } from 'discord.js';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';

export default {
    name: 'roleUpdate',
    async execute(oldRole: Role, newRole: Role) {
        if (!newRole.guild) return;

        const changes: string[] = [];
        if (oldRole.name !== newRole.name) {
            changes.push(`**الاسم:** ${oldRole.name} → ${newRole.name}`);
        }
        if (oldRole.color !== newRole.color) {
            changes.push(`**اللون:** \`${oldRole.hexColor}\` → \`${newRole.hexColor}\``);
        }
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
            changes.push('**الصلاحيات:** تم تعديلها');
        }
        if (oldRole.position !== newRole.position) {
            changes.push('**الترتيب:** تم تعديله');
        }
        if (changes.length === 0) return;

        // محاولة جلب منفذ التعديل من سجل التدقيق
        let executor = '';
        try {
            const audit = await newRole.guild.fetchAuditLogs({
                type: AuditLogEvent.RoleUpdate,
                limit: 5
            });
            const entry = audit.entries.find(
                (e) => e.targetId === newRole.id && e.createdTimestamp > Date.now() - 10_000
            );
            if (entry) executor = `\n**بواسطة:** ${entry.executor?.tag || 'غير معروف'}`;
        } catch {
            /* سجل التدقيق غير متاح */
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle('✏️ تم تعديل رتبة')
            .setDescription(`الرتبة: ${newRole} (${newRole.name})\n\n${changes.join('\n')}${executor}`)
            .setTimestamp();
        await modLog(newRole.guild, embed);
    }
};
