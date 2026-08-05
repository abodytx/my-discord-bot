// =====================================================
// أمر /setautorole - تحديد الرتبة التي تُعطى تلقائياً للأعضاء الجدد
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { updateGuildSettings } = require('../../utils/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setautorole')
        .setDescription('تحديد رتبة تلقائية تُعطى لكل عضو جديد ينضم')
        .addRoleOption(opt => opt.setName('الرتبة').setDescription('الرتبة (اتركها فارغة لإيقاف الميزة)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الرتب" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const role = interaction.options.getRole('الرتبة');

        if (!role) {
            updateGuildSettings(interaction.guild.id, { autoRoleId: null });
            return interaction.reply({ embeds: [successEmbed('تم الإيقاف', 'تم إيقاف نظام الرتبة التلقائية.')] });
        }

        const botMember = await interaction.guild.members.fetchMe();
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({ embeds: [errorEmbed('لا أستطيع التنفيذ', 'رتبة البوت يجب أن تكون أعلى من هذه الرتبة في ترتيب الرتب.')], ephemeral: true });
        }

        updateGuildSettings(interaction.guild.id, { autoRoleId: role.id });
        await interaction.reply({ embeds: [successEmbed('تم الحفظ', `سيتم إعطاء رتبة ${role} تلقائياً لكل عضو جديد.`)] });
    }
};
