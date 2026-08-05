// =====================================================
// أمر /warnings - عرض تحذيرات عضو
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, infoEmbed, errorEmbed } = require('../../utils/embeds');
const { getWarnings } = require('../../utils/warnings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('عرض تحذيرات عضو معين')
        .addUserOption(opt => opt.setName('العضو').setDescription('العضو المراد عرض تحذيراته').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الأعضاء المؤقتة" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const target = interaction.options.getUser('العضو');
        const warnings = getWarnings(interaction.guild.id, target.id);

        if (!warnings.length) {
            return interaction.reply({ embeds: [infoEmbed('لا توجد تحذيرات', `**${target.tag}** ليس لديه أي تحذيرات. 🎉`)] });
        }

        const embed = baseEmbed()
            .setTitle(`📋 تحذيرات ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(`عدد التحذيرات: **${warnings.length}**`);

        warnings.slice(0, 10).forEach((w, i) => {
            const date = new Date(w.date);
            embed.addFields({
                name: `⚠️ تحذير #${i + 1}`,
                value: `**السبب:** ${w.reason}\n**بواسطة:** <@${w.moderatorId}>\n**التاريخ:** ${date.toLocaleDateString('ar')}`
            });
        });

        await interaction.reply({ embeds: [embed] });
    }
};
