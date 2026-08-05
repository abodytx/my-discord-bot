// =====================================================
// أمر /kick - طرد عضو من السيرفر
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد عضو من السيرفر')
        .addUserOption(opt => opt.setName('العضو').setDescription('العضو المراد طرده').setRequired(true))
        .addStringOption(opt => opt.setName('السبب').setDescription('سبب الطرد').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "طرد الأعضاء" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('العضو');
        const reason = interaction.options.getString('السبب') || 'لم يتم تحديد سبب';
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ embeds: [errorEmbed('لم يتم العثور على العضو', 'هذا العضو غير موجود في السيرفر.')], ephemeral: true });
        }

        if (!targetMember.kickable) {
            return interaction.reply({ embeds: [errorEmbed('لا يمكن الطرد', 'لا أستطيع طرد هذا العضو، ربما تكون رتبته أعلى مني.')], ephemeral: true });
        }

        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed('غير مسموح', 'لا يمكنك طرد عضو برتبة أعلى منك أو تساويك.')], ephemeral: true });
        }

        try {
            await targetMember.kick(reason);
            await interaction.reply({ embeds: [successEmbed('تم الطرد', `تم طرد **${targetUser.tag}**.\n**السبب:** ${reason}`)] });
        } catch (err) {
            console.error(err);
            await interaction.reply({ embeds: [errorEmbed('فشلت العملية', 'حدث خطأ أثناء محاولة طرد هذا العضو.')], ephemeral: true });
        }
    }
};
