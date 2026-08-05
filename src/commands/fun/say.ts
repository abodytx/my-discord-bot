// =====================================================
// أمر /say - إرسال رسالة باسم البوت
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction, GuildMember, GuildTextBasedChannel } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed, successEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('إرسال رسالة نصية باسم البوت')
        .addStringOption((opt) => opt.setName('الرسالة').setDescription('نص الرسالة').setRequired(true))
        .addChannelOption((opt) =>
            opt.setName('القناة').setDescription('القناة (افتراضياً الحالية)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    cooldown: 3,
    category: 'fun',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!(interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الرسائل" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const message = interaction.options.getString('الرسالة')!;
        const channel = (interaction.options.getChannel('القناة') || interaction.channel) as GuildTextBasedChannel;

        await channel.send(message);
        await interaction.reply({
            embeds: [successEmbed('تم الإرسال', `تم إرسال الرسالة إلى ${channel}.`)],
            ephemeral: true
        });
    }
} satisfies CommandModule;
