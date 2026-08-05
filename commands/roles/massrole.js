// =====================================================
// أمر /mass-role - إعطاء أو سحب رتبة من كل أعضاء السيرفر دفعة واحدة
// يستخدم زر تأكيد لتجنب الأخطاء الكارثية غير المقصودة
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mass-role')
        .setDescription('إدارة الرتب الجماعية لكل أعضاء السيرفر')
        .addSubcommand(sub =>
            sub.setName('give')
                .setDescription('إعطاء رتبة معينة لجميع الأعضاء')
                .addRoleOption(opt => opt.setName('الرتبة').setDescription('الرتبة المراد إعطاؤها').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('سحب رتبة معينة من جميع الأعضاء')
                .addRoleOption(opt => opt.setName('الرتبة').setDescription('الرتبة المراد سحبها').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الرتب" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const role = interaction.options.getRole('الرتبة');

        // التأكد أن رتبة البوت أعلى من الرتبة المستهدفة حتى يقدر يعدلها
        const botMember = await interaction.guild.members.fetchMe();
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('لا أستطيع التنفيذ', 'رتبة البوت يجب أن تكون أعلى من الرتبة المستهدفة في ترتيب الرتب بالسيرفر.')],
                ephemeral: true
            });
        }

        const actionLabel = subcommand === 'give' ? 'إعطاء' : 'سحب';
        const memberCount = interaction.guild.memberCount;

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`massrole_confirm_${subcommand}_${role.id}_${interaction.user.id}`)
                .setLabel('تأكيد')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`massrole_cancel_${subcommand}_${role.id}_${interaction.user.id}`)
                .setLabel('إلغاء')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );

        await interaction.reply({
            embeds: [infoEmbed(
                'تأكيد العملية',
                `هل أنت متأكد أنك تريد **${actionLabel}** رتبة ${role} لجميع أعضاء السيرفر؟\n\n` +
                `👥 عدد الأعضاء التقريبي: **${memberCount}**\n` +
                `⚠️ قد تستغرق هذه العملية بعض الوقت حسب عدد الأعضاء (لتجنب حظر Rate Limit من ديسكورد).`
            )],
            components: [confirmRow]
        });
    }
};
