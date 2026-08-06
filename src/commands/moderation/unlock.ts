import { logger, modActionLog } from '../../utils/logger';
// =====================================================
// أمر /unlock - فتح القناة بعد قفلها
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits, type TextChannel } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('فتح القناة للسماح بالإرسال')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    cooldown: 3,

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة القنوات" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const channel = interaction.channel as TextChannel | null;
        if (!channel || !('permissionOverwrites' in channel)) return;

        try {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                SendMessages: null
            });
            await interaction.reply({
                embeds: [successEmbed('🔓 تم فتح القناة', `تم فتح ${channel} للسماح بالإرسال.`)]
            });
            await modActionLog(interaction.guild, 'unlock', {
                detail: `🔓 القناة: ${channel.name}`,
                moderator: interaction.user.tag
            });
        } catch (err) {
            logger.error(err);
            await interaction.reply({
                embeds: [errorEmbed('فشلت العملية', 'تعذر فتح القناة. تأكد من صلاحيات البوت.')],
                ephemeral: true
            });
        }
    }
} satisfies CommandModule;
