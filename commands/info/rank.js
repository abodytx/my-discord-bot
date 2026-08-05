// =====================================================
// أمر /rank - عرض مستوى عضو
// =====================================================

const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../utils/embeds');
const { getLevelInfo, getLeaderboard } = require('../../utils/levels');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('عرض مستوى وخبرة عضو')
        .addUserOption(opt => opt.setName('العضو').setDescription('العضو (اتركه فارغاً لعرض مستواك)').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('العضو') || interaction.user;
        const info = getLevelInfo(interaction.guild.id, target.id);
        const leaderboard = getLeaderboard(interaction.guild.id, 99999);
        const rank = leaderboard.findIndex(e => e.userId === target.id) + 1 || 0;

        const barLength = 10;
        const filled = Math.round(info.progress * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

        const embed = baseEmbed()
            .setTitle(`📈 مستوى ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '⭐ المستوى', value: `**${info.level}**`, inline: true },
                { name: '🏆 الترتيب', value: rank ? `**#${rank}**` : '—', inline: true },
                { name: '✨ إجمالي الخبرة', value: `**${info.totalXp} XP**`, inline: true },
                { name: `التقدم للمستوى التالي`, value: `${bar} \`${info.xpInLevel}/${info.xpForNextLevel}\`` }
            );

        await interaction.reply({ embeds: [embed] });
    }
};
