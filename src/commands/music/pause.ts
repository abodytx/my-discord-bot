// =====================================================
// أمر /pause - إيقاف مؤقت
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed, infoEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder().setName('pause').setDescription('إيقاف الموسيقى مؤقتاً'),
    category: 'music',

    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        const queue = client.player?.nodes.get(interaction.guildId!);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')],
                ephemeral: true
            });
        }

        if (queue.node.isPaused()) {
            return interaction.reply({
                embeds: [errorEmbed('موقوفة بالفعل', 'الموسيقى متوقفة مؤقتاً من قبل.')],
                ephemeral: true
            });
        }

        queue.node.pause();
        await interaction.reply({
            embeds: [infoEmbed('⏸️ تم الإيقاف المؤقت', 'تم إيقاف الموسيقى مؤقتاً. استخدم `/resume` للاستئناف.')]
        });
    }
} satisfies CommandModule;
