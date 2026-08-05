// =====================================================
// أمر /setprotection - تفعيل/تعطيل أنظمة الحماية من السبام والروابط
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { updateGuildSettings } = require('../../utils/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprotection')
        .setDescription('تفعيل أو تعطيل أنظمة الحماية في السيرفر')
        .addStringOption(opt =>
            opt.setName('النظام')
                .setDescription('النظام المراد تعديله')
                .setRequired(true)
                .addChoices(
                    { name: 'الحماية من السبام (Anti-Spam)', value: 'antiSpam' },
                    { name: 'الحماية من الروابط (Anti-Link)', value: 'antiLink' },
                    { name: 'الحماية من التدمير (Anti-Nuke)', value: 'antiNuke' }
                )
        )
        .addBooleanOption(opt => opt.setName('تفعيل').setDescription('تفعيل أو تعطيل').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة السيرفر" لتنفيذ هذا الأمر.')], ephemeral: true });
        }

        const system = interaction.options.getString('النظام');
        const enabled = interaction.options.getBoolean('تفعيل');
        const systemName = {
            antiSpam: 'الحماية من السبام',
            antiLink: 'الحماية من الروابط',
            antiNuke: 'الحماية من التدمير (Anti-Nuke)'
        }[system];

        updateGuildSettings(interaction.guild.id, { [system]: enabled });

        const hint = system === 'antiNuke' && enabled
            ? '\n\n> 💡 يمكنك ضبط **الحد الأقصى** والقائمة البيضاء من لوحة التحكم (تبويب الحماية) أو عبر أمر `/antinuke`.'
            : '';

        await interaction.reply({
            embeds: [successEmbed('تم التحديث', `تم ${enabled ? 'تفعيل' : 'تعطيل'} نظام **${systemName}** بنجاح.${hint}`)]
        });
    }
};
