// =====================================================
// أمر /stop - إيقاف الموسيقى ومغادرة الروم
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('إيقاف الموسيقى ومغادرة الروم الصوتي'),

    async execute(interaction, client) {
        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue) {
            return interaction.reply({ embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')], ephemeral: true });
        }

        queue.delete();

        await interaction.reply({
            embeds: [infoEmbed('⏹️ تم الإيقاف', 'تم إيقاف الموسيقى ومغادرة الروم الصوتي.')]
        });
    }
};
