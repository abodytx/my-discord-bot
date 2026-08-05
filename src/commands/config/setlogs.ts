// =====================================================
// أمر /setlogs - تحديد قنوات اللوقات
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';
import { updateGuildSettings } from '../../utils/settings';

export default {
    data: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('تحديد قنوات اللوقات (الإدارة والأعضاء)')
        .addSubcommand((sub) =>
            sub
                .setName('mod')
                .setDescription('قناة لوقات الإدارة (حذف/تعديل رسائل، قنوات، رتب)')
                .addChannelOption((opt) =>
                    opt
                        .setName('القناة')
                        .setDescription('قناة اللوقات')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('members')
                .setDescription('قناة لوقات الأعضاء (انضمام/مغادرة)')
                .addChannelOption((opt) =>
                    opt
                        .setName('القناة')
                        .setDescription('قناة اللوقات')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
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

        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('القناة')!;

        if (subcommand === 'mod') {
            await updateGuildSettings(interaction.guild.id, { modLogChannelId: channel.id });
            await interaction.reply({
                embeds: [successEmbed('تم الحفظ', `سيتم إرسال لوقات الإدارة إلى ${channel}.`)]
            });
        } else {
            await updateGuildSettings(interaction.guild.id, { memberLogChannelId: channel.id });
            await interaction.reply({
                embeds: [successEmbed('تم الحفظ', `سيتم إرسال لوقات الأعضاء إلى ${channel}.`)]
            });
        }
    }
} satisfies CommandModule;
