// =====================================================
// أمر /clear - حذف عدد معين من الرسائل من القناة
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('حذف عدد من الرسائل من هذه القناة')
        .addIntegerOption(opt => opt.setName('العدد').setDescription('عدد الرسائل (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
        .addUserOption(opt => opt.setName('من_عضو').setDescription('حذف رسائل عضو معين فقط (اختياري)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الرسائل" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const amount = interaction.options.getInteger('العدد');
        const targetUser = interaction.options.getUser('من_عضو');

        await interaction.deferReply({ ephemeral: true });

        try {
            let messages = await interaction.channel.messages.fetch({ limit: 100 });

            if (targetUser) {
                messages = messages.filter(m => m.author.id === targetUser.id).first(amount);
            } else {
                messages = messages.first(amount);
            }

            // ديسكورد لا يسمح بحذف الرسائل الأقدم من 14 يوم عبر bulkDelete
            const deleted = await interaction.channel.bulkDelete(messages, true);

            await interaction.editReply({ embeds: [successEmbed('تم التنظيف', `تم حذف **${deleted.size}** رسالة بنجاح.`)] });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ embeds: [errorEmbed('فشلت العملية', 'تعذر حذف الرسائل. قد تكون بعضها أقدم من 14 يوماً.')] });
        }
    }
};
