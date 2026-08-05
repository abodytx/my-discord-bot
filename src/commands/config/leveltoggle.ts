// =====================================================
// أمر /leveltoggle - تفعيل أو تعطيل نظام المستويات
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { updateGuildSettings } from '../../utils/settings';

export default {
    data: new SlashCommandBuilder()
        .setName('leveltoggle')
        .setDescription('تفعيل أو تعطيل نظام المستويات (XP) في السيرفر')
        .addBooleanOption((opt) => opt.setName('تفعيل').setDescription('تفعيل أو تعطيل').setRequired(true))
        .addChannelOption((opt) =>
            opt
                .setName('قناة_الترقي')
                .setDescription('قناة رسائل الترقي (اختياري)')
                .addChannelTypes(ChannelType.GuildText)
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

        const enabled = interaction.options.getBoolean('تفعيل')!;
        const channel = interaction.options.getChannel('قناة_الترقي');

        await updateGuildSettings(interaction.guild.id, {
            levelSystem: enabled,
            levelUpChannelId: channel ? channel.id : null
        });

        await interaction.reply({
            embeds: [
                successEmbed(
                    'تم التحديث',
                    enabled
                        ? `تم **تفعيل** نظام المستويات${channel ? ` وستصلك رسائل الترقي في ${channel}` : ''}.`
                        : 'تم **تعطيل** نظام المستويات.'
                )
            ]
        });
    }
} satisfies CommandModule;
