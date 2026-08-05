// =====================================================
// أمر /balance - رصيد المستخدم في نظام الاقتصاد
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed } from '../../utils/embeds';
import * as economy from '../../modules/economy';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('عرض رصيدك أو رصيد عضو آخر')
        .addUserOption((opt) => opt.setName('العضو').setDescription('العضو الذي تريد رصيده (اختياري)')),
    cooldown: 3,
    category: 'economy',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        const guild = interaction.guild;
        const target = interaction.options.getUser('العضو') || interaction.user;
        const balance = await economy.getBalance(guild.id, target.id);

        const embed = baseEmbed()
            .setTitle('🪙 رصيد النقود')
            .setDescription(
                `${target === interaction.user ? 'رصيدك الحالي' : `رصيد **${target.username}**`} هو: **${balance}** 🪙`
            )
            .setThumbnail(target.displayAvatarURL({ size: 128 }))
            .setFooter({ text: 'اربح المزيد عبر /daily أو /coinflip' });

        return interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
