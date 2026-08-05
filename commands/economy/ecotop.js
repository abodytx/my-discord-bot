// =====================================================
// أمر /ecotop - قائمة أغنى الأعضاء في الاقتصاد
// =====================================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../modules/economy');
const { COLORS } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ecotop')
        .setDescription('قائمة أغنى 10 أعضاء في السيرفر'),
    cooldown: 5,

    async execute(interaction) {
        const rows = economy.leaderboard(interaction.guild.id, 10);
        if (!rows.length) {
            return interaction.reply({ embeds: [{ color: COLORS.WARNING, description: 'لا توجد بيانات بعد.' }] });
        }

        const medals = ['🥇', '🥈', '🥉'];
        const lines = rows.map((r, i) => {
            const m = interaction.guild.members.cache.get(r.id);
            const name = m?.user?.tag || r.id;
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
};
