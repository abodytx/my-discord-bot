// =====================================================
// أمر /nowplaying - عرض المقطع الحالي
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed } from '../../utils/embeds';
import { nowPlayingEmbed, controlRow } from '../../utils/musicUI';

export default {
    data: new SlashCommandBuilder().setName('nowplaying').setDescription('عرض المقطع الذي يتم تشغيله حالياً'),
    category: 'music',

    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        const queue = client.player?.nodes.get(interaction.guildId!);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')],
                ephemeral: true
            });
        }

        await interaction.reply({
            embeds: [nowPlayingEmbed(queue, queue.currentTrack!)],
            components: [controlRow(queue)]
        });
    }
} satisfies CommandModule;
