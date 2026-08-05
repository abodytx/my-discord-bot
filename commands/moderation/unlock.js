// =====================================================
// أمر /unlock - فتح القناة بعد قفلها
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('فتح القناة للسماح بالإرسال')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة القنوات" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const channel = interaction.channel;

        try {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                SendMessages: null
            });
            await interaction.reply({
                embeds: [successEmbed('🔓 تم فتح القناة', `تم فتح ${channel} للسماح بالإرسال.`)]
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({ embeds: [errorEmbed('فشلت العملية', 'تعذر فتح القناة. تأكد من صلاحيات البوت.')], ephemeral: true });
        }
    }
};
