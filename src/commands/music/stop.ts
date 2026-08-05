// =====================================================
// أمر /stop - إيقاف الموسيقى ومغادرة الروم
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed, infoEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder().setName('stop').setDescription('إيقاف الموسيقى ومغادرة الروم الصوتي'),
    category: 'music',

    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        const queue = client.player?.nodes.get(interaction.guildId!);
        if (!queue) {
            return interaction.reply({
                embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')],
                ephemeral: true
            });
        }

        queue.delete();

        await interaction.reply({
            embeds: [infoEmbed('⏹️ تم الإيقاف', 'تم إيقاف الموسيقى ومغادرة الروم الصوتي.')]
        });
    }
} satisfies CommandModule;
