// =====================================================
// أمر /nowplaying - عرض المقطع الحالي
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const { nowPlayingEmbed, controlRow } = require('../../utils/musicUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('عرض المقطع الذي يتم تشغيله حالياً'),

    async execute(interaction, client) {
        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')], ephemeral: true });
        }

        await interaction.reply({
            embeds: [nowPlayingEmbed(queue, queue.currentTrack)],
            components: [controlRow(queue)]
        });
    }
};
