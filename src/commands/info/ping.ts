// =====================================================
// أمر /ping - قياس سرعة الاستجابة
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder().setName('ping').setDescription('قياس سرعة استجابة البوت'),
    category: 'info',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        const sent = await interaction.reply({ embeds: [baseEmbed().setTitle('🏓 جاري القياس...')], fetchReply: true });
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = baseEmbed()
            .setTitle('🏓 البنق (Ping)')
            .addFields(
                {
                    name: '📡 الاستجابة (Websocket)',
                    value: `**${Math.round(interaction.client.ws.ping)} ms**`,
                    inline: true
                },
                { name: '🔁 زمن الرحلة (Roundtrip)', value: `**${roundtrip} ms**`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    }
} satisfies CommandModule;
