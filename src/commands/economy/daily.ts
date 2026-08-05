// =====================================================
// أمر /daily - مكافأة يومية في نظام الاقتصاد
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import * as economy from '../../modules/economy';

const DAILY_AMOUNT = 200;

export default {
    data: new SlashCommandBuilder().setName('daily').setDescription('احصل على مكافأتك اليومية (مرة كل 24 ساعة)'),
    cooldown: 5,
    category: 'economy',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        const guild = interaction.guild;
        const result = await economy.claimDaily(guild.id, interaction.user.id, DAILY_AMOUNT);
        if (result.ok) {
            return interaction.reply({
                embeds: [
                    successEmbed(
                        '🎁 مكافأة يومية',
                        `استلمت **${result.amount}** 🪙\nرصيدك الآن: **${result.balance}** 🪙`
                    )
                ]
            });
        }
        const remaining = result.remaining ?? 0;
        const hours = Math.floor(remaining / 3600000);
        const mins = Math.ceil((remaining % 3600000) / 60000);
        return interaction.reply({
            embeds: [
                errorEmbed('⏳ انتظر قليلاً', `يمكنك استلام المكافأة مجدداً بعد **${hours} ساعة و ${mins} دقيقة**.`)
            ]
        });
    }
} satisfies CommandModule;
