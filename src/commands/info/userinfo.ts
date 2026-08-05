// =====================================================
// أمر /userinfo - عرض معلومات تفصيلية عن عضو معين
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('عرض معلومات عن عضو معين')
        .addUserOption((opt) =>
            opt
                .setName('العضو')
                .setDescription('العضو المراد عرض معلوماته (اتركه فارغاً لعرض معلوماتك)')
                .setRequired(false)
        ),
    category: 'info',

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        const guild = interaction.guild;
        const targetUser = interaction.options.getUser('العضو') || interaction.user;
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '⚠️ لم يتم العثور على هذا العضو في السيرفر.', ephemeral: true });
        }

        const roles = targetMember.roles.cache
            .filter((r) => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map((r) => `${r}`)
            .slice(0, 15);

        const embed = baseEmbed()
            .setTitle(`👤 معلومات ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '🏷️ الاسم الكامل', value: `${targetUser.tag}`, inline: true },
                { name: '🆔 المعرف', value: `${targetUser.id}`, inline: true },
                { name: '🤖 بوت؟', value: targetUser.bot ? 'نعم' : 'لا', inline: true },
                {
                    name: '📅 تاريخ إنشاء الحساب',
                    value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:D>`,
                    inline: true
                },
                {
                    name: '📥 تاريخ الانضمام للسيرفر',
                    value: `<t:${Math.floor((targetMember.joinedTimestamp ?? 0) / 1000)}:D>`,
                    inline: true
                },
                { name: '🎨 اللون', value: `${targetMember.displayHexColor || 'بدون'}`, inline: true },
                { name: `🎭 الرتب (${roles.length})`, value: roles.length ? roles.join(', ') : 'لا يوجد رتب' }
            )
            .setFooter({ text: `طلب بواسطة ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
