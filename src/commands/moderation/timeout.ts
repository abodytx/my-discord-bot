import { logger, modActionLog } from '../../utils/logger';
// =====================================================
// أمر /mute - إسكات عضو مؤقتاً باستخدام نظام Timeout المدمج في ديسكورد
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

// تحويل النص المدخل (مثل 10m أو 1h أو 2d) إلى مللي ثانية
function parseDuration(input: string): number | null {
    const match = input.match(/^(\d+)(m|h|d)$/i);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return value * multipliers[unit];
}

export default {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('إسكات عضو مؤقتاً (Timeout)')
        .addUserOption((opt) => opt.setName('العضو').setDescription('العضو المراد إسكاته').setRequired(true))
        .addStringOption((opt) =>
            opt.setName('المدة').setDescription('مثال: 10m (دقائق) / 1h (ساعات) / 2d (أيام)').setRequired(true)
        )
        .addStringOption((opt) => opt.setName('السبب').setDescription('سبب الإسكات').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الأعضاء المؤقتة" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('العضو')!;
        const durationInput = interaction.options.getString('المدة')!;
        const reason = interaction.options.getString('السبب') || 'لم يتم تحديد سبب';

        const durationMs = parseDuration(durationInput);
        if (!durationMs || durationMs > 28 * 24 * 60 * 60 * 1000) {
            return interaction.reply({
                embeds: [errorEmbed('صيغة مدة خاطئة', 'استخدم صيغة صحيحة مثل: 10m / 1h / 2d (الحد الأقصى 28 يوم).')],
                ephemeral: true
            });
        }

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return interaction.reply({
                embeds: [errorEmbed('لم يتم العثور على العضو', 'هذا العضو غير موجود في السيرفر.')],
                ephemeral: true
            });
        }

        if (!targetMember.moderatable) {
            return interaction.reply({
                embeds: [errorEmbed('لا يمكن الإسكات', 'لا أستطيع إسكات هذا العضو، ربما تكون رتبته أعلى مني.')],
                ephemeral: true
            });
        }

        try {
            await targetMember.timeout(durationMs, reason);
            await interaction.reply({
                embeds: [
                    successEmbed(
                        'تم الإسكات',
                        `تم إسكات **${targetUser.tag}** لمدة **${durationInput}**.\n**السبب:** ${reason}`
                    )
                ]
            });
            await modActionLog(interaction.guild, 'timeout', {
                target: `${targetUser.tag} (${targetUser.id})`,
                reason,
                detail: `⏱️ المدة: **${durationInput}**`,
                moderator: interaction.user.tag
            });
        } catch (err) {
            logger.error(err);
            await interaction.reply({
                embeds: [errorEmbed('فشلت العملية', 'حدث خطأ أثناء محاولة إسكات هذا العضو.')],
                ephemeral: true
            });
        }
    }
} satisfies CommandModule;
