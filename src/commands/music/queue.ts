// =====================================================
// أمر /queue - عرض قائمة التشغيل
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed, infoEmbed } from '../../utils/embeds';
import { formatTime } from '../../utils/musicUI';

export default {
    data: new SlashCommandBuilder().setName('queue').setDescription('عرض قائمة التشغيل الحالية'),
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
        const tracks = queue.tracks.toArray().slice(0, 15);
        const totalDuration = queue.tracks.toArray().reduce((a, t) => a + (t.durationMS || 0), 0);

        const list = tracks.length
            ? tracks
                  .map((t, i) => `**${i + 1}.** [${t.title}](${t.url || ''}) - ${formatTime(t.durationMS)}`)
                  .join('\n')
            : 'القائمة فارغة.';

        const embed = infoEmbed(
            '📜 قائمة التشغيل',
            `**الآن:** [${current?.title || ''}](${current?.url || ''}) - ${formatTime(current?.durationMS)}`
        ).addFields(
            { name: '⬇️ التالي', value: list },
            { name: 'ℹ️ إجمالي الوقت المتبقي', value: formatTime(totalDuration), inline: true },
            { name: '🎵 عدد المقاطع', value: `${queue.tracks.size}`, inline: true }
        );

        await interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
