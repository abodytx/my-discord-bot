// =====================================================
// أمر /setwelcome - تخصيص قناة ورسالة الترحيب
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { updateGuildSettings } from '../../utils/settings';

export default {
    data: new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('تخصيص نظام الترحيب بالأعضاء الجدد')
        .addChannelOption((opt) =>
            opt
                .setName('القناة')
                .setDescription('قناة إرسال رسائل الترحيب')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption((opt) =>
            opt
                .setName('الرسالة')
                .setDescription('نص الرسالة. متغيرات متاحة: {user} {server} {memberCount}')
                .setRequired(false)
        )
        .addChannelOption((opt) =>
            opt
                .setName('قناة_القوانين')
                .setDescription('قناة القوانين (تظهر رابطها في رسالة الترحيب)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

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
        const rulesChannel = interaction.options.getChannel('قناة_القوانين');

        const newSettings: { welcomeChannelId: string; welcomeMessage?: string; rulesChannelId?: string } = {
            welcomeChannelId: channel.id
        };
        if (customMessage) newSettings.welcomeMessage = customMessage;
        if (rulesChannel) newSettings.rulesChannelId = rulesChannel.id;

        await updateGuildSettings(interaction.guild.id, newSettings);

        await interaction.reply({
            embeds: [successEmbed('تم الحفظ', `سيتم إرسال رسائل الترحيب الآن في ${channel}.`)]
        });
    }
} satisfies CommandModule;
