// =====================================================
// أمر /leveltoggle - تفعيل أو تعطيل نظام المستويات
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { updateGuildSettings } = require('../../utils/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leveltoggle')
        .setDescription('تفعيل أو تعطيل نظام المستويات (XP) في السيرفر')
        .addBooleanOption(opt => opt.setName('تفعيل').setDescription('تفعيل أو تعطيل').setRequired(true))
        .addChannelOption(opt =>
            opt.setName('قناة_الترقي').setDescription('قناة رسائل الترقي (اختياري)').addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة السيرفر" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const enabled = interaction.options.getBoolean('تفعيل');
        const channel = interaction.options.getChannel('قناة_الترقي');

        updateGuildSettings(interaction.guild.id, {
            levelSystem: enabled,
            levelUpChannelId: channel ? channel.id : null
        });

        await interaction.reply({
            embeds: [successEmbed(
                'تم التحديث',
                enabled
                    ? `تم **تفعيل** نظام المستويات${channel ? ` وستصلك رسائل الترقي في ${channel}` : ''}.`
                    : 'تم **تعطيل** نظام المستويات.'
            )]
        });
    }
};
