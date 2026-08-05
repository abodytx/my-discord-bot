// =====================================================
// أمر /ping - قياس سرعة الاستجابة
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('قياس سرعة استجابة البوت'),

    async execute(interaction) {
        const sent = await interaction.reply({ embeds: [baseEmbed().setTitle('🏓 جاري القياس...')], fetchReply: true });
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = baseEmbed()
            .setTitle('🏓 البنق (Ping)')
            .addFields(
                { name: '📡 الاستجابة (Websocket)', value: `**${Math.round(interaction.client.ws.ping)} ms**`, inline: true },
                { name: '🔁 زمن الرحلة (Roundtrip)', value: `**${roundtrip} ms**`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    }
};
