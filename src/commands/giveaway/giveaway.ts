// =====================================================
// أمر /giveaway - إدارة السحوبات
// - start: بدء سحب جديد
// - end: إنهاء سحب موجود يدوياً
// - reroll: إعادة سحب
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { startGiveaway, endGiveaway, rerollGiveaway, listGiveaways } from '../../modules/giveaway';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('إدارة السحوبات في السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName('start')
                .setDescription('بدء سحب جديد')
                .addStringOption((opt) =>
                    opt.setName('جائزة').setDescription('الجائزة (مثال: Nitro لمدة شهر)').setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('مدة')
                        .setDescription('مدة السحب بالدقائق')
                        .setMinValue(1)
                        .setMaxValue(10080)
                        .setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('فائزون')
                        .setDescription('عدد الفائزين')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('end')
                .setDescription('إنهاء سحب موجود يدوياً')
                .addStringOption((opt) => opt.setName('رسالة').setDescription('معرف رسالة السحب').setRequired(true))
        )
        .addSubcommand((sub) =>
            sub
                .setName('reroll')
                .setDescription('إعادة سحب بجائزة جديدة')
                .addStringOption((opt) => opt.setName('جائزة').setDescription('الجائزة الجديدة').setRequired(true))
                .addIntegerOption((opt) =>
                    opt
                        .setName('فائزون')
                        .setDescription('عدد الفائزين')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false)
                )
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('عرض السحوبات النشطة في السيرفر')),
    category: 'giveaway',
    cooldown: 5,
    adminOnly: true,

    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        if (!interaction.guild || !interaction.channel) return;

        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const prize = interaction.options.getString('جائزة')!;
            const durationMin = interaction.options.getInteger('مدة')!;
            const winners = interaction.options.getInteger('فائزون') ?? 1;

            const giveaway = await startGiveaway(client, interaction.guild.id, interaction.channel.id, {
                prize,
                durationMin,
                winners,
                hostId: interaction.user.id
            });

            if (!giveaway) {
                await interaction.reply({
                    embeds: [errorEmbed('خطأ', 'تعذر إنشاء السحب — تأكد من أن القناة نصية.')],
                    ephemeral: true
                });
                return;
            }

            await interaction.reply({
                embeds: [
                    successEmbed(
                        '🎁 تم إنشاء السحب',
                        `بدأ سحب **${prize}** لمدة **${durationMin} دقيقة** بعدد **${winners}** فائز.`
                    )
                ],
                ephemeral: true
            });
            return;
        }

        if (sub === 'end') {
            const messageId = interaction.options.getString('رسالة')!;
            const giveaway = await endGiveaway(client, messageId, true);
            if (!giveaway) {
                await interaction.reply({
                    embeds: [errorEmbed('خطأ', 'لم يتم العثور على سحب نشط بهذا المعرّف.')],
                    ephemeral: true
                });
                return;
            }
            await interaction.reply({
                embeds: [successEmbed('🏁 أُنهي السحب', `تم إنهاء سحب **${giveaway.prize}** وإعلان الفائزين.`)],
                ephemeral: true
            });
            return;
        }

        if (sub === 'reroll') {
            const prize = interaction.options.getString('جائزة')!;
            const winners = interaction.options.getInteger('فائزون') ?? 1;
            const giveaway = await rerollGiveaway(client, interaction.guild.id, interaction.channel.id, {
                prize,
                hostId: interaction.user.id,
                winners
            });
            if (!giveaway) {
                await interaction.reply({ embeds: [errorEmbed('خطأ', 'تعذر إعادة السحب.')], ephemeral: true });
                return;
            }
            await interaction.reply({
                embeds: [
                    successEmbed('🎲 إعادة سحب', `تم إعادة السحب بجائزة **${prize}** — اضغط زر الانضمام للمشاركة.`)
                ],
                ephemeral: true
            });
            return;
        }

        if (sub === 'list') {
            const active = listGiveaways(interaction.guild.id);
            if (!active.length) {
                await interaction.reply({
                    embeds: [infoEmbed('🎁 السحوبات النشطة', 'لا توجد سحوبات نشطة حالياً.')],
                    ephemeral: true
                });
                return;
            }
            const desc = active
                .map(
                    (g) =>
                        `• **${g.prize}** — <t:${Math.floor(g.endsAt / 1000)}:R> — المشاركون: **${g.entrants.length}**`
                )
                .join('\n');
            await interaction.reply({
                embeds: [infoEmbed('🎁 السحوبات النشطة', desc)],
                ephemeral: true
            });
            return;
        }

        await interaction.reply({ embeds: [errorEmbed('خطأ', 'أمر غير معروف.')], ephemeral: true });
    }
} satisfies CommandModule;
