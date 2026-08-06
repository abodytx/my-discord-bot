// =====================================================
// أمر /volume - ضبط مستوى الصوت
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed, infoEmbed } from '../../utils/embeds';

// مستويات الصوت المقترحة في الاقتراحات التلقائية
const VOLUME_PRESETS = [25, 50, 75, 100];

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
                .setAutocomplete(true)
        ),
    category: 'music',

    // اقتراحات تلقائية لمستويات الصوت
    async autocomplete(interaction: AutocompleteInteraction) {
        const focused = interaction.options.getFocused(true);
        if (focused.name !== 'المستوى') return;
        const matches = VOLUME_PRESETS.map((v) => ({ name: `${v}%`, value: v }));
        await interaction.respond(matches);
    },

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
