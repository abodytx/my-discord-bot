// =====================================================
// أمر /setlogs - تحديد قنوات اللوقات
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { updateGuildSettings } = require('../../utils/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('تحديد قنوات اللوقات (الإدارة والأعضاء)')
        .addSubcommand(sub =>
            sub.setName('mod')
                .setDescription('قناة لوقات الإدارة (حذف/تعديل رسائل، قنوات، رتب)')
                .addChannelOption(opt => opt.setName('القناة').setDescription('قناة اللوقات').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('members')
                .setDescription('قناة لوقات الأعضاء (انضمام/مغادرة)')
                .addChannelOption(opt => opt.setName('القناة').setDescription('قناة اللوقات').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة السيرفر" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('القناة');

        if (subcommand === 'mod') {
            updateGuildSettings(interaction.guild.id, { modLogChannelId: channel.id });
            await interaction.reply({
                embeds: [successEmbed('تم الحفظ', `سيتم إرسال لوقات الإدارة إلى ${channel}.`)]
            });
        } else {
            updateGuildSettings(interaction.guild.id, { memberLogChannelId: channel.id });
            await interaction.reply({
                embeds: [successEmbed('تم الحفظ', `سيتم إرسال لوقات الأعضاء إلى ${channel}.`)]
            });
        }
    }
};
