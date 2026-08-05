// =====================================================
// أمر /unban - فك الحظر عن عضو
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('فك الحظر عن عضو ممنوع من السيرفر')
        .addStringOption((opt) => opt.setName('المعرف').setDescription('معرف العضو (ID)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    cooldown: 3,

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "حظر الأعضاء" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const userId = interaction.options.getString('المعرف')!;
        const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);

        if (!bannedUser) {
            return interaction.reply({
                embeds: [errorEmbed('غير محظور', 'لم يتم العثور على هذا العضو في قائمة المحظورين.')],
                ephemeral: true
            });
        }

        try {
            await interaction.guild.members.unban(userId, 'تم فك الحظر بواسطة أمر /unban');
            await interaction.reply({
                embeds: [
                    successEmbed('تم فك الحظر', `تم فك الحظر عن **${bannedUser.user.tag}** (${bannedUser.user.id}).`)
                ]
            });
        } catch (err) {
            console.error(err);
            await interaction.reply({
                embeds: [errorEmbed('فشلت العملية', 'حدث خطأ أثناء محاولة فك الحظر.')],
                ephemeral: true
            });
        }
    }
} satisfies CommandModule;
