// =====================================================
// لوق إنشاء الرتب
// =====================================================

const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const { modLog } = require('../utils/logger');

module.exports = {
    name: 'roleCreate',
    async execute(role) {
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
