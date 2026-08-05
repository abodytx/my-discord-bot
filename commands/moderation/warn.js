// =====================================================
// أمر /warn - تحذير عضو
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { addWarning, getWarnings } = require('../../utils/warnings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('إرسال تحذير لعضو معين')
        .addUserOption(opt => opt.setName('العضو').setDescription('العضو المراد تحذيره').setRequired(true))
        .addStringOption(opt => opt.setName('السبب').setDescription('سبب التحذير').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الأعضاء المؤقتة" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const target = interaction.options.getUser('العضو');
        const reason = interaction.options.getString('السبب');

        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed('خطأ', 'لا يمكنك تحذير نفسك.')], ephemeral: true });
        }

        const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (targetMember && !targetMember.moderatable) {
            return interaction.reply({ embeds: [errorEmbed('لا يمكن التحذير', 'لا أستطيع تحذير هذا العضو، رتبته أعلى مني.')], ephemeral: true });
        }

        const warning = addWarning(interaction.guild.id, target.id, {
            reason,
            moderatorId: interaction.user.id
        });
        const count = getWarnings(interaction.guild.id, target.id).length;

        try {
            await target.send({
                embeds: [errorEmbed('تم تحذيرك', `في سيرفر **${interaction.guild.name}**.\n**السبب:** ${reason}`)]
            }).catch(() => {});
        } catch (e) { /* تجاهل */ }

        await interaction.reply({
            embeds: [successEmbed('تم التحذير', `تم تحذير **${target.tag}**.\n**السبب:** ${reason}\n📋 عدد تحذيرات العضو: **${count}**`)]
        });
    }
};
