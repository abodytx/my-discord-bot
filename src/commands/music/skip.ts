// =====================================================
// أمر /skip - تخطي المقطع الحالي
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed, infoEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder().setName('skip').setDescription('تخطي المقطع الحالي'),
    category: 'music',

    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        const queue = client.player?.nodes.get(interaction.guildId!);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يتم تشغيله حالياً.')],
                ephemeral: true
            });
        }

        const current = queue.currentTrack;
        const skipped = queue.node.skip();
        if (!skipped) queue.node.stop();

        await interaction.reply({
            embeds: [infoEmbed('⏭️ تم التخطي', `تم تخطي مقطع **${current?.title || 'غير معروف'}**.`)]
        });
    }
} satisfies CommandModule;
