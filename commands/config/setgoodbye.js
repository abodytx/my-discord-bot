// =====================================================
// أمر /setgoodbye - تخصيص رسالة الوداع
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { updateGuildSettings } = require('../../utils/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setgoodbye')
        .setDescription('تخصيص نظام رسائل الوداع للمغادرين')
        .addChannelOption(opt =>
            opt.setName('القناة').setDescription('قناة رسائل الوداع').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('الرسالة').setDescription('نص الرسالة. متغيرات: {user} {server} {memberCount}').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة السيرفر" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const channel = interaction.options.getChannel('القناة');
        const customMessage = interaction.options.getString('الرسالة');

        const newSettings = { goodbyeChannelId: channel.id };
        if (customMessage) newSettings.goodbyeMessage = customMessage;

        updateGuildSettings(interaction.guild.id, newSettings);

        await interaction.reply({
            embeds: [successEmbed('تم الحفظ', `سيتم إرسال رسائل الوداع الآن في ${channel}.`)]
        });
    }
};
