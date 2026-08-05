// =====================================================
// أمر /antinuke - التحكم الكامل بالحماية من التدمير
// subcommands: on | off | limit | whitelist | status
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const { getGuildSettings, updateGuildSettings } = require('../../utils/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antinuke')
        .setDescription('التحكم بنظام الحماية من تدمير السيرفر (Anti-Nuke)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('on').setDescription('تفعيل الحماية من التدمير'))
        .addSubcommand(sub =>
            sub.setName('off').setDescription('تعطيل الحماية من التدمير'))
        .addSubcommand(sub =>
            sub.setName('limit')
                .setDescription('ضبط الحد الأقصى للأعمال قبل الحظر')
                .addIntegerOption(opt => opt.setName('العدد').setDescription('الحد الأقصى خلال 6 ثوانٍ (2-20)').setRequired(true).setMinValue(2).setMaxValue(20)))
        .addSubcommand(sub =>
            sub.setName('whitelist')
                .setDescription('إضافة/إزالة من القائمة البيضاء (معفون من الحماية)')
                .addStringOption(opt => opt.setName('نوع').setDescription('نوع العنصر').setRequired(true).addChoices(
                    { name: 'عضو', value: 'user' },
                    { name: 'رتبة', value: 'role' }
                ))
                .addUserOption(opt => opt.setName('عضو').setDescription('العضو المراد إضافته/إزالته'))
                .addRoleOption(opt => opt.setName('رتبة').setDescription('الرتبة المراد إضافتها/إزالتها'))
                .addStringOption(opt => opt.setName('إجراء').setDescription('إضافة أو إزالة').setRequired(true).addChoices(
                    { name: 'إضافة', value: 'add' },
                    { name: 'إزالة', value: 'remove' }
                )))
        .addSubcommand(sub =>
            sub.setName('status').setDescription('عرض حالة الحماية من التدمير')),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة السيرفر".')], ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const settings = getGuildSettings(interaction.guild.id);

        switch (sub) {
            case 'on': {
                updateGuildSettings(interaction.guild.id, { antiNuke: true });
                return interaction.reply({
                    embeds: [successEmbed('🛡️ تم تفعيل Anti-Nuke', 'الآن سيتم حظر أي عضو يقوم بحذف القنوات/الرتب أو الحظر الجماعي أو سبام الويب هوك.')]
                });
            }

            case 'off': {
                updateGuildSettings(interaction.guild.id, { antiNuke: false });
                return interaction.reply({
                    embeds: [infoEmbed('تم تعطيل Anti-Nuke', 'نظام الحماية من التدمير أصبح معطلاً.')]
                });
            }

            case 'limit': {
                const max = interaction.options.getInteger('العدد');
                updateGuildSettings(interaction.guild.id, { maxNukeActions: max });
                return interaction.reply({
                    embeds: [successEmbed('تم ضبط الحد', `الحد الأقصى أصبح **${max}** أعمال خلال 6 ثوانٍ قبل الحظر التلقائي.`)]
                });
            }

            case 'whitelist': {
                const type = interaction.options.getString('نوع');
                const action = interaction.options.getString('إجراء');
                const id = type === 'user'
                    ? interaction.options.getUser('عضو')?.id
                    : interaction.options.getRole('رتبة')?.id;

                if (!id) {
                    return interaction.reply({ embeds: [errorEmbed('مفقود', `حدد ${type === 'user' ? 'العضو' : 'الرتبة'} المطلوب.`)], ephemeral: true });
                }

                const key = type === 'user' ? 'whitelistedUsers' : 'whitelistedRoles';
                const list = Array.isArray(settings[key]) ? [...settings[key]] : [];
                const exists = list.includes(id);

                if (action === 'add') {
                    if (exists) return interaction.reply({ embeds: [infoEmbed('موجود مسبقاً', 'هذا العنصر في القائمة البيضاء بالفعل.')] });
                    list.push(id);
                } else {
                    if (!exists) return interaction.reply({ embeds: [infoEmbed('غير موجود', 'هذا العنصر غير موجود في القائمة البيضاء.')] });
                    const idx = list.indexOf(id);
                    list.splice(idx, 1);
                }

                updateGuildSettings(interaction.guild.id, { [key]: list });
                return interaction.reply({
                    embeds: [successEmbed(
                        action === 'add' ? 'تمت الإضافة للقائمة البيضاء' : 'تمت الإزالة من القائمة البيضاء',
                        `${type === 'user' ? 'العضو' : 'الرتبة'} <@${id}> ${action === 'add' ? 'أصبح معفى من الحماية' : 'أصبح تحت الحماية'}.\n\nالقائمة الحالية: ${list.map(x => `<@${x}>`).join(' ') || 'فارغة'}`
                    )]
                });
            }

            case 'status': {
                const whitelisted = [...(settings.whitelistedUsers || []).map(x => `<@${x}>`), ...(settings.whitelistedRoles || []).map(x => `<@&${x}>`)];
                return interaction.reply({
                    embeds: [infoEmbed('🛡️ حالة Anti-Nuke', `**الحالة:** ${settings.antiNuke ? 'مفعلة ✅' : 'معطلة ❌'}\n**الحد الأقصى:** ${settings.maxNukeActions} أعمال / 6 ثوانٍ\n**القائمة البيضاء:** ${whitelisted.join(' ') || 'فارغة'}`)]
                });
            }
        }
    }
};
