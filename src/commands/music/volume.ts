// =====================================================
// أمر /volume - ضبط مستوى الصوت
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed, infoEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('ضبط مستوى صوت الموسيقى')
        .addIntegerOption((opt) =>
            opt
                .setName('المستوى')
                .setDescription('مستوى الصوت (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        ),
    category: 'music',

    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        const queue = client.player?.nodes.get(interaction.guildId!);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')],
                ephemeral: true
            });
        }

        const volume = interaction.options.getInteger('المستوى')!;
        queue.node.setVolume(volume);

        await interaction.reply({
            embeds: [infoEmbed('🔊 تم ضبط الصوت', `مستوى الصوت الآن **${volume}%**.`)]
        });
    }
} satisfies CommandModule;
