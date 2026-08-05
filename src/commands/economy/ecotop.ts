// =====================================================
// أمر /ecotop - قائمة أغنى الأعضاء في الاقتصاد
// =====================================================

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import * as economy from '../../modules/economy';
import { COLORS } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder().setName('ecotop').setDescription('قائمة أغنى 10 أعضاء في السيرفر'),
    cooldown: 5,
    category: 'economy',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        const guild = interaction.guild;
        const rows = await economy.leaderboard(guild.id, 10);
        if (!rows.length) {
            return interaction.reply({ embeds: [{ color: COLORS.WARNING, description: 'لا توجد بيانات بعد.' }] });
        }

        const medals = ['🥇', '🥈', '🥉'];
        const lines = rows.map((r, i) => {
            const m = guild.members.cache.get(r.userId);
            const name = m?.user?.tag || r.userId;
            return `${medals[i] || `${i + 1}.`} **${name}** — ${r.balance} 🪙`;
        });

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🏆 أغنى أعضاء السيرفر')
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'اربح المزيد عبر /daily و /coinflip' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
