// =====================================================
// أمر /skip - تخطي المقطع الحالي
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('تخطي المقطع الحالي'),

    async execute(interaction, client) {
        const queue = client.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')], ephemeral: true });
        }

        const current = queue.currentTrack;
        const skipped = queue.node.skip();
        if (!skipped) queue.node.stop();

        await interaction.reply({
            embeds: [infoEmbed('⏭️ تم التخطي', `تم تخطي مقطع **${current?.title || 'غير معروف'}**.`)]
        });
    }
};
