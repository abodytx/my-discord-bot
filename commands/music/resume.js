// =====================================================
// أمر /resume - استئناف التشغيل
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('استئناف الموسيقى المتوقفة'),

    async execute(interaction, client) {
        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')], ephemeral: true });
        }

        if (!queue.node.isPaused()) {
            return interaction.reply({ embeds: [errorEmbed('ليست موقوفة', 'الموسيقى تعمل حالياً.')], ephemeral: true });
        }

        queue.node.resume();
        await interaction.reply({ embeds: [infoEmbed('▶️ تم الاستئناف', 'تم استئناف التشغيل.')] });
    }
};
