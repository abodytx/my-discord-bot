// =====================================================
// لوق تعديل الرسائل
// =====================================================

const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const { modLog } = require('../utils/logger');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage) {
        if (!newMessage.guild) return;
        if (newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setAuthor({ name: '✏️ تعديل رسالة', iconURL: newMessage.author?.displayAvatarURL({ dynamic: true }) })
            .setDescription(`في ${newMessage.channel}`)
            .addFields(
                { name: '👤 الكاتب', value: `${newMessage.author} (${newMessage.author.id})`, inline: true },
                { name: '📝 قبل', value: oldMessage.content ? oldMessage.content.slice(0, 500) : '(بدون نص)' },
                { name: '🆕 بعد', value: newMessage.content ? newMessage.content.slice(0, 500) : '(بدون نص)' }
            )
            .setTimestamp();
        await modLog(newMessage.guild, embed);
    }
};
