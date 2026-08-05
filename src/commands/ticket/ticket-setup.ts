// =====================================================
// أمر /ticket-setup - إرسال رسالة فتح التذاكر بزر تفاعلي في قناة معينة
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { ChatInputCommandInteraction, GuildMember, GuildTextBasedChannel } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed, successEmbed, errorEmbed, COLORS } from '../../utils/embeds';
import { updateGuildSettings } from '../../utils/settings';

export default {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('إعداد نظام التذاكر في هذه القناة')
        .addChannelOption((opt) =>
            opt
                .setName('قسم_التذاكر')
                .setDescription('الفئة (Category) التي سيتم إنشاء التذاكر بداخلها')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    category: 'ticket',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!(interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة السيرفر" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        if (!interaction.guild) return;
        const guild = interaction.guild;

        const category = interaction.options.getChannel('قسم_التذاكر');
        if (category) {
            await updateGuildSettings(guild.id, { ticketCategoryId: category.id });
        }

        const embed = baseEmbed()
            .setColor(COLORS.PRIMARY)
            .setTitle('🎫 نظام الدعم الفني - التذاكر')
            .setDescription('اضغط على الزر أدناه لفتح تذكرة خاصة والتواصل مع فريق الإدارة.');

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_open')
                .setLabel('فتح تذكرة')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );

        await (interaction.channel as GuildTextBasedChannel).send({ embeds: [embed], components: [row] });
        await interaction.reply({
            embeds: [successEmbed('تم الإعداد', 'تم إرسال رسالة نظام التذاكر في هذه القناة بنجاح.')],
            ephemeral: true
        });
    }
} satisfies CommandModule;
