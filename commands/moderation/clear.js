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
    cooldown: 5,

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الرسائل" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const amount = interaction.options.getInteger('العدد');
        const targetUser = interaction.options.getUser('من_عضو');

        await interaction.deferReply({ ephemeral: true });

        try {
            const collected = [];
            let lastId = null;

            // جلب الرسائل على دفعات حتى الوصول للعدد المطلوب
            while (collected.length < amount) {
                const options = { limit: Math.min(100, amount - collected.length) };
                if (lastId) options.before = lastId;

                const batch = await interaction.channel.messages.fetch(options);
                if (!batch.size) break;

                const usable = targetUser
                    ? batch.filter(m => m.author.id === targetUser.id)
                    : batch;

                collected.push(...usable.values());
                lastId = batch.last().id;
            }

            const toDelete = collected.slice(0, amount);
            const deleted = await interaction.channel.bulkDelete(toDelete, true);

            await interaction.editReply({
                embeds: [successEmbed(
                    'تم التنظيف',
                    targetUser
                        ? `تم حذف **${deleted.size}** رسالة من **${targetUser.tag}**.`
                        : `تم حذف **${deleted.size}** رسالة بنجاح.`
                )]
            });
        } catch (err) {
            console.error(err);
            await interaction.editReply({
                embeds: [errorEmbed('فشلت العملية', 'تعذر حذف الرسائل. قد تكون بعضها أقدم من 14 يوماً (لا يمكن حذفها دفعة واحدة).')]
            });
        }
    }
};
