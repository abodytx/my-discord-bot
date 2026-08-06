import { logger, modActionLog } from '../../utils/logger';
// =====================================================
// أمر /slowmode - ضبط الوضع البطيء للقناة
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits, type TextChannel } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('ضبط الوضع البطيء (Slowmode) للقناة')
        .addIntegerOption((opt) =>
            opt
                .setName('الثواني')
                .setDescription('المدة بالثواني (0 لإيقافه)')
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    cooldown: 3,

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة القنوات" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const seconds = interaction.options.getInteger('الثواني')!;
        const channel = interaction.channel as TextChannel | null;
        if (!channel || !('setRateLimitPerUser' in channel)) return;

        try {
            await channel.setRateLimitPerUser(seconds);
            await interaction.reply({
                embeds: [
                    successEmbed(
                        seconds === 0 ? 'تم إيقاف الوضع البطيء' : 'تم ضبط الوضع البطيء',
                        seconds === 0
                            ? `تم إلغاء الوضع البطيء في ${channel}.`
                            : `تم ضبط الوضع البطيء على **${seconds} ثانية** في ${channel}.`
                    )
                ]
            });
            await modActionLog(interaction.guild, 'slowmode', {
                detail: `🐢 القناة: ${channel.name} — ${seconds === 0 ? 'إيقاف' : `${seconds} ثانية`}`,
                moderator: interaction.user.tag
            });
        } catch (err) {
            logger.error(err);
            await interaction.reply({
                embeds: [errorEmbed('فشلت العملية', 'تعذر ضبط الوضع البطيء.')],
                ephemeral: true
            });
        }
    }
} satisfies CommandModule;
