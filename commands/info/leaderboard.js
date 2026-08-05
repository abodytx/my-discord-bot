// =====================================================
// أمر /leaderboard - أفضل 10 أعضاء في السيرفر
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../utils/embeds');
const { getLeaderboard } = require('../../utils/levels');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('عرض أفضل 10 أعضاء من حيث المستوى والخبرة'),

    async execute(interaction) {
        const leaderboard = getLeaderboard(interaction.guild.id, 10);

        if (!leaderboard.length) {
            return interaction.reply({
                embeds: [baseEmbed().setTitle('🏆 لوحة الأبطال').setDescription('لا توجد بيانات بعد. ابدأ بالحصول على خبرة عبر إرسال الرسائل!')]
            });
        }

        const medals = ['🥇', '🥈', '🥉'];
        const members = await interaction.guild.members.fetch().catch(() => new Map());

        const lines = [];
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
            .setFooter({ text: interaction.guild.name });

        await interaction.reply({ embeds: [embed] });
    }
};
