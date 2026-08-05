// =====================================================
// أمر /volume - ضبط مستوى الصوت
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('ضبط مستوى صوت الموسيقى')
        .addIntegerOption(opt => opt.setName('المستوى').setDescription('مستوى الصوت (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)),

    async execute(interaction, client) {
        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')], ephemeral: true });
        }

        const volume = interaction.options.getInteger('المستوى');
        queue.node.setVolume(volume);

        await interaction.reply({
            embeds: [infoEmbed('🔊 تم ضبط الصوت', `مستوى الصوت الآن **${volume}%**.`)]
        });
    }
};
