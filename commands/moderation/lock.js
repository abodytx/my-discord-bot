// =====================================================
// أمر /lock - قفل القناة الحالية عن الأعضاء
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('قفل القناة الحالية منعاً للإرسال')
        .addStringOption(opt => opt.setName('السبب').setDescription('سبب القفل').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة القنوات" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const reason = interaction.options.getString('السبب') || 'لا يوجد سبب محدد';
        const channel = interaction.channel;

        try {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                SendMessages: false
            });
            await interaction.reply({
                embeds: [successEmbed('🔒 تم قفل القناة', `تم قفل ${channel}.\n**السبب:** ${reason}`)]
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({ embeds: [errorEmbed('فشلت العملية', 'تعذر قفل القناة. تأكد من صلاحيات البوت.')], ephemeral: true });
        }
    }
};
