// =====================================================
// أمر /embed - إرسال رسالة إيمبد مخصصة
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, successEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('إرسال رسالة إيمبد مخصصة باسم البوت')
        .addStringOption(opt => opt.setName('العنوان').setDescription('عنوان الإيمبد').setRequired(true))
        .addStringOption(opt => opt.setName('الوصف').setDescription('وصف الإيمبد').setRequired(true))
        .addStringOption(opt => opt.setName('اللون').setDescription('لون بصيغة hex مثل #3b82f6').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الرسائل" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const title = interaction.options.getString('العنوان');
        const description = interaction.options.getString('الوصف');
        const colorInput = interaction.options.getString('اللون');

        const color = colorInput && /^#?[0-9A-Fa-f]{6}$/.test(colorInput)
            ? parseInt(colorInput.replace('#', ''), 16)
            : COLORS.PRIMARY;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: `بواسطة ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        await interaction.channel.send({ embeds: [embed] });
        await interaction.reply({ embeds: [successEmbed('تم الإرسال', 'تم إرسال الإيمبد بنجاح.')], ephemeral: true });
    }
};
