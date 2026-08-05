// =====================================================
// لوق تعديل الرسائل
// =====================================================

import { EmbedBuilder, type Message, type PartialMessage } from 'discord.js';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';

export default {
    name: 'messageUpdate',
    async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
        if (!newMessage.guild) return;
        const author = newMessage.author;
        if (!author || author.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setAuthor({ name: '✏️ تعديل رسالة', iconURL: author.displayAvatarURL() })
            .setDescription(`في ${newMessage.channel}`)
            .addFields(
                { name: '👤 الكاتب', value: `${author} (${author.id})`, inline: true },
                { name: '📝 قبل', value: oldMessage.content ? oldMessage.content.slice(0, 500) : '(بدون نص)' },
                { name: '🆕 بعد', value: newMessage.content ? newMessage.content.slice(0, 500) : '(بدون نص)' }
            )
            .setTimestamp();
        await modLog(newMessage.guild, embed);
    }
};
