// =====================================================
// أمر /ticket-setup - إرسال رسالة فتح التذاكر بزر تفاعلي في قناة معينة
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed, COLORS } = require('../../utils/embeds');
const { updateGuildSettings } = require('../../utils/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('إعداد نظام التذاكر في هذه القناة')
        .addChannelOption(opt => opt.setName('قسم_التذاكر').setDescription('الفئة (Category) التي سيتم إنشاء التذاكر بداخلها').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة السيرفر" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const category = interaction.options.getChannel('قسم_التذاكر');
        if (category) {
            updateGuildSettings(interaction.guild.id, { ticketCategoryId: category.id });
        }

        const embed = baseEmbed()
            .setColor(COLORS.PRIMARY)
            .setTitle('🎫 نظام الدعم الفني - التذاكر')
            .setDescription('اضغط على الزر أدناه لفتح تذكرة خاصة والتواصل مع فريق الإدارة.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_open').setLabel('فتح تذكرة').setStyle(ButtonStyle.Primary).setEmoji('🎫')
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ embeds: [successEmbed('تم الإعداد', 'تم إرسال رسالة نظام التذاكر في هذه القناة بنجاح.')], ephemeral: true });
    }
};
