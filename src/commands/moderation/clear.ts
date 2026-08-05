// =====================================================
// أمر /clear - حذف عدد معين من الرسائل من القناة
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits, type TextChannel } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('حذف عدد من الرسائل من هذه القناة')
        .addIntegerOption((opt) =>
            opt.setName('العدد').setDescription('عدد الرسائل (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
        )
        .addUserOption((opt) =>
            opt.setName('من_عضو').setDescription('حذف رسائل عضو معين فقط (اختياري)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    cooldown: 5,

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الرسائل" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('العدد')!;
        const targetUser = interaction.options.getUser('من_عضو');
        const channel = interaction.channel as TextChannel | null;
        if (!channel || !('messages' in channel)) return;

        await interaction.deferReply({ ephemeral: true });

        try {
            const collected: import('discord.js').Message[] = [];
            let lastId: string | undefined = undefined;

            // جلب الرسائل على دفعات حتى الوصول للعدد المطلوب
            while (collected.length < amount) {
                const options: { limit: number; before?: string } = { limit: Math.min(100, amount - collected.length) };
                if (lastId) options.before = lastId;

                const batch = await channel.messages.fetch(options);
                if (!batch.size) break;

                const usable = targetUser ? batch.filter((m) => m.author.id === targetUser.id) : batch;

                collected.push(...usable.values());
                const last = batch.last();
                if (!last) break;
                lastId = last.id;
            }

            const toDelete = collected.slice(0, amount);
            const deleted = await channel.bulkDelete(toDelete, true);

            await interaction.editReply({
                embeds: [
                    successEmbed(
                        'تم التنظيف',
                        targetUser
                            ? `تم حذف **${deleted.size}** رسالة من **${targetUser.tag}**.`
                            : `تم حذف **${deleted.size}** رسالة بنجاح.`
                    )
                ]
            });
        } catch (err) {
            console.error(err);
            await interaction.editReply({
                embeds: [
                    errorEmbed(
                        'فشلت العملية',
                        'تعذر حذف الرسائل. قد تكون بعضها أقدم من 14 يوماً (لا يمكن حذفها دفعة واحدة).'
                    )
                ]
            });
        }
    }
} satisfies CommandModule;
