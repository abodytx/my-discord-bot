// =====================================================
// ??? /slots - ?????? ???? ???????
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import * as economy from '../../modules/economy';

const EMOJIS = ['??', '??', '??', '??', '7??', '?'];

export default {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('???? ??? ?? ?????? ????')
        .addIntegerOption((opt) =>
            opt.setName('??????').setDescription('?????? ???? ????? ??').setRequired(true).setMinValue(10)
        ),
    cooldown: 3,
    category: 'economy',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        const guild = interaction.guild;
        const bet = interaction.options.getInteger('??????')!;
        const balance = await economy.getBalance(guild.id, interaction.user.id);

        if (bet > balance) {
            return interaction.reply({
                embeds: [errorEmbed('???? ??? ????', `???? **${balance}** ?? ???.`)]
            });
        }

        const r1 = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        const r2 = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        const r3 = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

        let multiplier = 0;
        if (r1 === r2 && r2 === r3) multiplier = r1 === '7??' ? 10 : 6;
        else if (r1 === r2 || r2 === r3 || r1 === r3) multiplier = 2;

        const won = multiplier > 0;
        const winnings = won ? bet * multiplier : 0;

        await economy.recordGame(guild.id, interaction.user.id, won, bet);
        const newBalance = await economy.getBalance(guild.id, interaction.user.id);

        const desc = `**[ ${r1} | ${r2} | ${r3} ]**\n\n${won ? `?? **??? ${winnings}** ?? (×${multiplier})` : '?? ?? ??? ??? ?????'}\n\n?? ????? ????: **${newBalance}** ??`;

        const embed = won ? successEmbed('?? ?????? ????', desc) : errorEmbed('?? ?????? ????', desc);
        return interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
