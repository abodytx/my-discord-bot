// =====================================================
// أمر /slowmode - ضبط الوضع البطيء للقناة
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('ضبط الوضع البطيء (Slowmode) للقناة')
        .addIntegerOption(opt => opt.setName('الثواني').setDescription('المدة بالثواني (0 لإيقافه)').setMinValue(0).setMaxValue(21600).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    cooldown: 3,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة القنوات" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const seconds = interaction.options.getInteger('الثواني');

        try {
            await interaction.channel.setRateLimitPerUser(seconds);
            await interaction.reply({
                embeds: [successEmbed(
                    seconds === 0 ? 'تم إيقاف الوضع البطيء' : 'تم ضبط الوضع البطيء',
                    seconds === 0
                        ? `تم إلغاء الوضع البطيء في ${interaction.channel}.`
                        : `تم ضبط الوضع البطيء على **${seconds} ثانية** في ${interaction.channel}.`
                )]
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({ embeds: [errorEmbed('فشلت العملية', 'تعذر ضبط الوضع البطيء.')], ephemeral: true });
        }
    }
};
