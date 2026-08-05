// =====================================================
// لوق إنشاء الرتب
// =====================================================

import { EmbedBuilder, type Role } from 'discord.js';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';

export default {
    name: 'roleCreate',
    async execute(role: Role) {
        if (!role.guild) return;
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🏷️ تم إنشاء رتبة جديدة')
            .setDescription(`الرتبة: ${role} (${role.name})`)
            .addFields({ name: '🆔 المعرف', value: role.id, inline: true })
            .setTimestamp();
        await modLog(role.guild, embed);
    }
};
