// =====================================================
// أمر /pause - إيقاف مؤقت
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('إيقاف الموسيقى مؤقتاً'),

    async execute(interaction, client) {
        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')], ephemeral: true });
        }

        if (queue.node.isPaused()) {
            return interaction.reply({ embeds: [errorEmbed('موقوفة بالفعل', 'الموسيقى متوقفة مؤقتاً من قبل.')], ephemeral: true });
        }

        queue.node.pause();
        await interaction.reply({ embeds: [infoEmbed('⏸️ تم الإيقاف المؤقت', 'تم إيقاف الموسيقى مؤقتاً. استخدم `/resume` للاستئناف.')] });
    }
};
