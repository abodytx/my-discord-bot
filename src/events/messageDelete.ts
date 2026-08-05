// =====================================================
// حدث "messageDelete": لوق حذف الرسائل
// =====================================================

import { EmbedBuilder, type Message, type PartialMessage } from 'discord.js';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';

export default {
    name: 'messageDelete',
    async execute(message: Message | PartialMessage) {
        if (!message.guild) return;
        const author = message.author;
        if (!author || author.bot) return;

        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setAuthor({ name: '🗑️ حذف رسالة', iconURL: author.displayAvatarURL() })
            .setDescription(`في ${message.channel}`)
            .addFields(
                { name: '👤 الكاتب', value: `${author} (${author.id})`, inline: true },
                {
                    name: '📝 المحتوى',
                    value: message.content ? message.content.slice(0, 1000) || 'بدون محتوى' : '(رسالة بدون نص)'
                }
            )
            .setTimestamp();
        await modLog(message.guild, embed);
    }
};
