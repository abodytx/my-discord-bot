// =====================================================
// أمر /lock - قفل القناة الحالية عن الأعضاء
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits, type TextChannel } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('قفل القناة الحالية منعاً للإرسال')
        .addStringOption((opt) => opt.setName('السبب').setDescription('سبب القفل').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    cooldown: 3,

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة القنوات" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const reason = interaction.options.getString('السبب') || 'لا يوجد سبب محدد';
        const channel = interaction.channel as TextChannel | null;
        if (!channel || !('permissionOverwrites' in channel)) return;

        try {
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
                SendMessages: false
            });
            await interaction.reply({
                embeds: [successEmbed('🔒 تم قفل القناة', `تم قفل ${channel}.\n**السبب:** ${reason}`)]
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({
                embeds: [errorEmbed('فشلت العملية', 'تعذر قفل القناة. تأكد من صلاحيات البوت.')],
                ephemeral: true
            });
        }
    }
} satisfies CommandModule;
