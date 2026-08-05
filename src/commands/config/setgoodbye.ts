// =====================================================
// أمر /setgoodbye - تخصيص رسالة الوداع
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { updateGuildSettings } from '../../utils/settings';

export default {
    data: new SlashCommandBuilder()
        .setName('setgoodbye')
        .setDescription('تخصيص نظام رسائل الوداع للمغادرين')
        .addChannelOption((opt) =>
            opt
                .setName('القناة')
                .setDescription('قناة رسائل الوداع')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption((opt) =>
            opt
                .setName('الرسالة')
                .setDescription('نص الرسالة. متغيرات: {user} {server} {memberCount}')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    cooldown: 3,

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة السيرفر" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('القناة')!;
        const customMessage = interaction.options.getString('الرسالة');

        const newSettings: { goodbyeChannelId: string; goodbyeMessage?: string } = { goodbyeChannelId: channel.id };
        if (customMessage) newSettings.goodbyeMessage = customMessage;

        await updateGuildSettings(interaction.guild.id, newSettings);

        await interaction.reply({
            embeds: [successEmbed('تم الحفظ', `سيتم إرسال رسائل الوداع الآن في ${channel}.`)]
        });
    }
} satisfies CommandModule;
