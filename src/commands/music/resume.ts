// =====================================================
// أمر /resume - استئناف التشغيل
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed, infoEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder().setName('resume').setDescription('استئناف الموسيقى المتوقفة'),
    category: 'music',

    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        const queue = client.player?.nodes.get(interaction.guildId!);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')],
                ephemeral: true
            });
        }

        if (!queue.node.isPaused()) {
            return interaction.reply({ embeds: [errorEmbed('ليست موقوفة', 'الموسيقى تعمل حالياً.')], ephemeral: true });
        }

        queue.node.resume();
        await interaction.reply({ embeds: [infoEmbed('▶️ تم الاستئناف', 'تم استئناف التشغيل.')] });
    }
} satisfies CommandModule;
