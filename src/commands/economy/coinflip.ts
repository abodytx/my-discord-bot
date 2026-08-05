// =====================================================
// أمر /coinflip - لعبة عملة معدنية (مضاعفة النقود)
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import * as economy from '../../modules/economy';

export default {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('القِ العملة واربح ضعف مبلغك!')
        .addStringOption((opt) =>
            opt
                .setName('اختيار')
                .setDescription('وجه أو كتابة')
                .setRequired(true)
                .addChoices({ name: 'وجه 🪙', value: 'heads' }, { name: 'كتابة ✍️', value: 'tails' })
        )
        .addIntegerOption((opt) =>
            opt.setName('المبلغ').setDescription('المبلغ الذي تراهن به').setRequired(true).setMinValue(10)
        ),
    cooldown: 3,
    category: 'economy',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        const guild = interaction.guild;
        const choice = interaction.options.getString('اختيار');
        const bet = interaction.options.getInteger('المبلغ')!;
        const balance = await economy.getBalance(guild.id, interaction.user.id);

        if (bet > balance) {
            return interaction.reply({
                embeds: [
                    errorEmbed('رصيد غير كافٍ', `لديك **${balance}** 🪙 فقط، ولا يمكنك المراهنة بـ **${bet}** 🪙.`)
                ]
            });
        }

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = choice === result;

        await economy.recordGame(guild.id, interaction.user.id, won, bet);
        const newBalance = await economy.getBalance(guild.id, interaction.user.id);

        const embed = (
            won
                ? successEmbed(
                      '🎉 لقد فزت!',
                      `ظهرت العملة: **${result === 'heads' ? 'وجه 🪙' : 'كتابة ✍️'}**\nحصلت على **${bet * 2}** 🪙`
                  )
                : errorEmbed(
                      '😞 خسرت...',
                      `ظهرت العملة: **${result === 'heads' ? 'وجه 🪙' : 'كتابة ✍️'}**\nخسرت **${bet}** 🪙`
                  )
        ).addFields({ name: '💰 رصيدك الآن', value: `${newBalance} 🪙`, inline: true });

        return interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
