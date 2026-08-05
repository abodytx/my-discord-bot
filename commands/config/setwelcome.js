// =====================================================
// أمر /setwelcome - تخصيص قناة ورسالة الترحيب
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { updateGuildSettings } = require('../../utils/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('تخصيص نظام الترحيب بالأعضاء الجدد')
        .addChannelOption(opt =>
            opt.setName('القناة').setDescription('قناة إرسال رسائل الترحيب').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('الرسالة')
                .setDescription('نص الرسالة. متغيرات متاحة: {user} {server} {memberCount}')
                .setRequired(false)
        )
        .addChannelOption(opt =>
            opt.setName('قناة_القوانين').setDescription('قناة القوانين (تظهر رابطها في رسالة الترحيب)').addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة السيرفر" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const channel = interaction.options.getChannel('القناة');
        const customMessage = interaction.options.getString('الرسالة');
        const rulesChannel = interaction.options.getChannel('قناة_القوانين');

        const newSettings = { welcomeChannelId: channel.id };
        if (customMessage) newSettings.welcomeMessage = customMessage;
        if (rulesChannel) newSettings.rulesChannelId = rulesChannel.id;

        updateGuildSettings(interaction.guild.id, newSettings);

        await interaction.reply({
            embeds: [successEmbed('تم الحفظ', `سيتم إرسال رسائل الترحيب الآن في ${channel}.`)]
        });
    }
};
