// =====================================================
// لوق حذف الرسائل الجماعي (messageDeleteBulk)
// - مهمة لأن /clear تحذف بالدفعات ولا تُطلق messageDelete
// =====================================================

import { EmbedBuilder, type Collection, type Message, type GuildTextBasedChannel } from 'discord.js';
import { COLORS } from '../utils/embeds';
import { modLog } from '../utils/logger';

export default {
    name: 'messageDeleteBulk',
    async execute(messages: Collection<string, Message>, channel: GuildTextBasedChannel) {
        const guild = channel.guild;
        if (!guild || messages.size === 0) return;

        const sample = messages.first();
        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('🧹 حذف رسائل جماعي')
            .setDescription(`تم حذف **${messages.size}** رسالة من ${channel}`)
            .addFields({
                name: '👤 مؤلف أول رسالة',
                value: sample?.author ? `${sample.author.tag}` : 'غير معروف',
                inline: true
            })
            .setTimestamp();
        await modLog(guild, embed);
    }
};
