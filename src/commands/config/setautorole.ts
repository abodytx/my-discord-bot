// =====================================================
// أمر /setautorole - تحديد الرتبة التي تُعطى تلقائياً للأعضاء الجدد
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { updateGuildSettings } from '../../utils/settings';

export default {
    data: new SlashCommandBuilder()
        .setName('setautorole')
        .setDescription('تحديد رتبة تلقائية تُعطى لكل عضو جديد ينضم')
        .addRoleOption((opt) =>
            opt.setName('الرتبة').setDescription('الرتبة (اتركها فارغة لإيقاف الميزة)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الرتب" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('الرتبة');

        if (!role) {
            await updateGuildSettings(interaction.guild.id, { autoRoleId: null });
            return interaction.reply({ embeds: [successEmbed('تم الإيقاف', 'تم إيقاف نظام الرتبة التلقائية.')] });
        }

        const botMember = await interaction.guild.members.fetchMe();
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('لا أستطيع التنفيذ', 'رتبة البوت يجب أن تكون أعلى من هذه الرتبة في ترتيب الرتب.')],
                ephemeral: true
            });
        }

        await updateGuildSettings(interaction.guild.id, { autoRoleId: role.id });
        await interaction.reply({
            embeds: [successEmbed('تم الحفظ', `سيتم إعطاء رتبة ${role} تلقائياً لكل عضو جديد.`)]
        });
    }
} satisfies CommandModule;
