// =====================================================
// أمر /ban - حظر عضو من السيرفر
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر')
        .addUserOption((opt) => opt.setName('العضو').setDescription('العضو المراد حظره').setRequired(true))
        .addStringOption((opt) => opt.setName('السبب').setDescription('سبب الحظر').setRequired(false))
        .addIntegerOption((opt) =>
            opt
                .setName('حذف_الرسائل')
                .setDescription('حذف رسائل آخر كم يوم (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        // التحقق من صلاحية المستخدم الذي ينفذ الأمر
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "حظر الأعضاء" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('العضو')!;
        const reason = interaction.options.getString('السبب') || 'لم يتم تحديد سبب';
        const deleteDays = interaction.options.getInteger('حذف_الرسائل') || 0;

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // التحقق من صلاحية البوت مقارنة بالعضو المستهدف
        if (targetMember) {
            if (!targetMember.bannable) {
                return interaction.reply({
                    embeds: [
                        errorEmbed(
                            'لا يمكن الحظر',
                            'لا أستطيع حظر هذا العضو، ربما تكون رتبته أعلى مني أو هو مالك السيرفر.'
                        )
                    ],
                    ephemeral: true
                });
            }
            // منع حظر عضو برتبة أعلى من أو تساوي رتبة منفذ الأمر
            if (
                targetMember.roles.highest.position >= (interaction.member as GuildMember).roles.highest.position &&
                interaction.guild.ownerId !== interaction.user.id
            ) {
                return interaction.reply({
                    embeds: [errorEmbed('غير مسموح', 'لا يمكنك حظر عضو برتبة أعلى منك أو تساويك.')],
                    ephemeral: true
                });
            }
        }

        try {
            await interaction.guild.members.ban(targetUser.id, { deleteMessageSeconds: deleteDays * 86400, reason });
            await interaction.reply({
                embeds: [successEmbed('تم الحظر', `تم حظر **${targetUser.tag}**.\n**السبب:** ${reason}`)]
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({
                embeds: [errorEmbed('فشلت العملية', 'حدث خطأ أثناء محاولة حظر هذا العضو.')],
                ephemeral: true
            });
        }
    }
} satisfies CommandModule;
