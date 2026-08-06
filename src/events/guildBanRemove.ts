// =====================================================
// لوق فك الحظر عن عضو (guildBanRemove) — /unban
// =====================================================

import { EmbedBuilder, type GuildBan } from 'discord.js';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';

export default {
    name: 'guildBanRemove',
    async execute(ban: GuildBan) {
        const { guild, user } = ban;
        if (!guild || !user) return;

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🔓 تم فك الحظر')
            .setDescription(`تم فك الحظر عن **${user.tag}** (${user.id})`)
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .setTimestamp();
        await modLog(guild, embed);
    }
};
