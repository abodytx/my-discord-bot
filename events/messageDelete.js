// =====================================================
// لوق حذف الرسائل
// =====================================================

const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const { modLog } = require('../utils/logger');

module.exports = {
    name: 'messageDelete',
    async execute(message) {
        if (!message.guild) return;
        if (message.author?.bot) return;

        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setAuthor({ name: '🗑️ حذف رسالة', iconURL: message.author?.displayAvatarURL({ dynamic: true }) })
            .setDescription(`في ${message.channel}`)
            .addFields(
                { name: '👤 الكاتب', value: `${message.author} (${message.author.id})`, inline: true },
                { name: '📝 المحتوى', value: message.content ? message.content.slice(0, 1000) || 'بدون محتوى' : '(رسالة بدون نص)' }
            )
            .setTimestamp();
        await modLog(message.guild, embed);
    }
};
