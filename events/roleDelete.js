// =====================================================
// لوق حذف الرتب
// =====================================================

const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embeds');
const { modLog } = require('../utils/logger');

module.exports = {
    name: 'roleDelete',
    async execute(role) {
        if (!role.guild) return;
        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('🗑️ تم حذف رتبة')
            .setDescription(`تم حذف الرتبة: **${role.name}**`)
            .addFields({ name: '🆔 المعرف', value: role.id, inline: true })
            .setTimestamp();
        await modLog(role.guild, embed);
    }
};
