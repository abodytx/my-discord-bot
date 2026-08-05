// =====================================================
// أمر /rank - عرض مستوى عضو
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed } from '../../utils/embeds';
import { getLevelInfo, getLeaderboard } from '../../utils/levels';

export default {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('عرض مستوى وخبرة عضو')
        .addUserOption((opt) =>
            opt.setName('العضو').setDescription('العضو (اتركه فارغاً لعرض مستواك)').setRequired(false)
        ),
    category: 'info',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        const guild = interaction.guild;
        const target = interaction.options.getUser('العضو') || interaction.user;
        const info = await getLevelInfo(guild.id, target.id);
        const leaderboard = await getLeaderboard(guild.id, 99999);
        const rank = leaderboard.findIndex((e) => e.userId === target.id) + 1 || 0;

        const barLength = 10;
        const filled = Math.round(info.progress * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

        const embed = baseEmbed()
            .setTitle(`📈 مستوى ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '⭐ المستوى', value: `**${info.level}**`, inline: true },
                { name: '🏆 الترتيب', value: rank ? `**#${rank}**` : '—', inline: true },
                { name: '✨ إجمالي الخبرة', value: `**${info.totalXp} XP**`, inline: true },
                { name: `التقدم للمستوى التالي`, value: `${bar} \`${info.xpInLevel}/${info.xpForNextLevel}\`` }
            );

        await interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
