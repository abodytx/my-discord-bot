// =====================================================
// أمر /setprotection - تفعيل/تعطيل أنظمة الحماية من السبام والروابط
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { updateGuildSettings } from '../../utils/settings';

const SYSTEM_NAMES: Record<string, string> = {
    antiSpam: 'الحماية من السبام',
    antiLink: 'الحماية من الروابط',
    antiNuke: 'الحماية من التدمير (Anti-Nuke)'
};

export default {
    data: new SlashCommandBuilder()
        .setName('setprotection')
        .setDescription('تفعيل أو تعطيل أنظمة الحماية في السيرفر')
        .addStringOption((opt) =>
            opt
                .setName('النظام')
                .setDescription('النظام المراد تعديله')
                .setRequired(true)
                .addChoices(
                    { name: 'الحماية من السبام (Anti-Spam)', value: 'antiSpam' },
                    { name: 'الحماية من الروابط (Anti-Link)', value: 'antiLink' },
                    { name: 'الحماية من التدمير (Anti-Nuke)', value: 'antiNuke' }
                )
        )
        .addBooleanOption((opt) => opt.setName('تفعيل').setDescription('تفعيل أو تعطيل').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة السيرفر" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const system = interaction.options.getString('النظام')!;
        const enabled = interaction.options.getBoolean('تفعيل')!;
        const systemName = SYSTEM_NAMES[system] || 'النظام';

        await updateGuildSettings(interaction.guild.id, { [system]: enabled });

        const hint =
            system === 'antiNuke' && enabled
                ? '\n\n> 💡 يمكنك ضبط **الحد الأقصى** والقائمة البيضاء من لوحة التحكم (تبويب الحماية) أو عبر أمر `/antinuke`.'
                : '';

        await interaction.reply({
            embeds: [
                successEmbed('تم التحديث', `تم ${enabled ? 'تفعيل' : 'تعطيل'} نظام **${systemName}** بنجاح.${hint}`)
            ]
        });
    }
} satisfies CommandModule;
