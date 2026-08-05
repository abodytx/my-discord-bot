// =====================================================
// أمر /say - إرسال رسالة باسم البوت
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('إرسال رسالة نصية باسم البوت')
        .addStringOption(opt => opt.setName('الرسالة').setDescription('نص الرسالة').setRequired(true))
        .addChannelOption(opt => opt.setName('القناة').setDescription('القناة (افتراضياً الحالية)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الرسائل" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const message = interaction.options.getString('الرسالة');
        const channel = interaction.options.getChannel('القناة') || interaction.channel;

        await channel.send(message);
        await interaction.reply({ embeds: [successEmbed('تم الإرسال', `تم إرسال الرسالة إلى ${channel}.`)], ephemeral: true });
    }
};
