// =====================================================
// أمر /unwarn - إزالة تحذير عن عضو
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getWarnings, removeWarning } = require('../../utils/warnings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('إزالة تحذير معين عن عضو')
        .addUserOption(opt => opt.setName('العضو').setDescription('العضو').setRequired(true))
        .addIntegerOption(opt => opt.setName('رقم_التحذير').setDescription('رقم التحذير المراد إزالته').setMinValue(1).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الأعضاء المؤقتة" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const target = interaction.options.getUser('العضو');
        const num = interaction.options.getInteger('رقم_التحذير');
        const warnings = getWarnings(interaction.guild.id, target.id);

        if (!warnings.length) {
            return interaction.reply({ embeds: [errorEmbed('لا توجد تحذيرات', `**${target.tag}** ليس لديه أي تحذيرات.`)], ephemeral: true });
        }

        const removed = removeWarning(interaction.guild.id, target.id, num - 1);
        if (!removed) {
            return interaction.reply({ embeds: [errorEmbed('رقم غير صالح', `لدى العضو **${warnings.length}** تحذيرات فقط.`)], ephemeral: true });
        }

        await interaction.reply({
            embeds: [successEmbed('تمت الإزالة', `تم إزالة التحذير رقم **${num}** من **${target.tag}**.`)]
        });
    }
};
