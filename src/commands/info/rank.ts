// =====================================================
// أمر /rank - عرض مستوى عضو مع بطاقة Rank مخصصة
// =====================================================

import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed } from '../../utils/embeds';
import { getLevelInfo, getLeaderboard } from '../../utils/levels';
import { generateRankCard } from '../../modules/rankCards';
import { logger } from '../../utils/logger';

export default {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('عرض مستوى وخبرة عضو')
        .addUserOption((opt) =>
            opt.setName('العضو').setDescription('العضو (اتركه فارغاً لعرض مستواك)').setRequired(false)
        ),
    category: 'info',
    cooldown: 3,

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        const guild = interaction.guild;
        const target = interaction.options.getUser('العضو') || interaction.user;
        const info = await getLevelInfo(guild.id, target.id);
        const leaderboard = await getLeaderboard(guild.id, 99999);
        const rank = leaderboard.findIndex((e) => e.userId === target.id) + 1 || 0;

        try {
            const buffer = await generateRankCard({
                username: target.displayName || target.username,
                avatarURL: target.displayAvatarURL({ extension: 'png', size: 512 }),
                level: info.level,
                rank,
                xpInLevel: info.xpInLevel,
                xpForNextLevel: info.xpForNextLevel,
                totalXp: info.totalXp,
                progress: info.progress
            });
            const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });

            const embed = baseEmbed()
                .setTitle(`📈 رتبة ${target.username}`)
                .setImage('attachment://rank.png')
                .addFields(
                    { name: '⭐ المستوى', value: `**${info.level}**`, inline: true },
                    { name: '🏆 الترتيب', value: rank ? `**#${rank}**` : '—', inline: true },
                    { name: '✨ إجمالي الخبرة', value: `**${info.totalXp} XP**`, inline: true }
                );

            await interaction.reply({ embeds: [embed], files: [attachment] });
        } catch (err) {
            logger.error('خطأ في توليد بطاقة الرتبة:', err);
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
                    { name: 'التقدم للمستوى التالي', value: `${bar} \`${info.xpInLevel}/${info.xpForNextLevel}\`` }
                );

            await interaction.reply({ embeds: [embed] });
        }
    }
} satisfies CommandModule;
