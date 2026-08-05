// =====================================================
// أمر /leaderboard - أفضل 10 أعضاء في السيرفر
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed } from '../../utils/embeds';
import { getLeaderboard } from '../../utils/levels';

export default {
    data: new SlashCommandBuilder().setName('leaderboard').setDescription('عرض أفضل 10 أعضاء من حيث المستوى والخبرة'),
    category: 'info',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        const guild = interaction.guild;
        const leaderboard = await getLeaderboard(guild.id, 10);

        if (!leaderboard.length) {
            return interaction.reply({
                embeds: [
                    baseEmbed()
                        .setTitle('🏆 لوحة الأبطال')
                        .setDescription('لا توجد بيانات بعد. ابدأ بالحصول على خبرة عبر إرسال الرسائل!')
                ]
            });
        }

        const medals = ['🥇', '🥈', '🥉'];
        const members = await guild.members.fetch().catch(() => new Map());

        const lines: string[] = [];
        for (let i = 0; i < leaderboard.length; i++) {
            const entry = leaderboard[i];
            const member = members.get(entry.userId);
            const name = member ? member.user.username : entry.userId;
            const medal = medals[i] || `${i + 1}.`;
            lines.push(`${medal} **${name}** — المستوى ${entry.level} (${entry.totalXp} XP)`);
        }

        const embed = baseEmbed()
            .setTitle('🏆 لوحة الأبطال')
            .setDescription(lines.join('\n'))
            .setFooter({ text: guild.name });

        await interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
