// =====================================================
// أمر /warnings - عرض تحذيرات عضو
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { baseEmbed, infoEmbed, errorEmbed } from '../../utils/embeds';
import { getWarnings } from '../../utils/warnings';

export default {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('عرض تحذيرات عضو معين')
        .addUserOption((opt) => opt.setName('العضو').setDescription('العضو المراد عرض تحذيراته').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    cooldown: 3,

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [errorEmbed('صلاحيات غير كافية', 'تحتاج صلاحية "إدارة الأعضاء المؤقتة" لتنفيذ هذا الأمر.')],
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('العضو')!;
        const warnings = await getWarnings(interaction.guild.id, target.id);

        if (!warnings.length) {
            return interaction.reply({
                embeds: [infoEmbed('لا توجد تحذيرات', `**${target.tag}** ليس لديه أي تحذيرات. 🎉`)]
            });
        }

        const embed = baseEmbed()
            .setTitle(`📋 تحذيرات ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription(`عدد التحذيرات: **${warnings.length}**`);

        warnings.slice(0, 10).forEach((w, i) => {
            const date = new Date(w.date);
            embed.addFields({
                name: `⚠️ تحذير #${i + 1}`,
                value: `**السبب:** ${w.reason}\n**بواسطة:** <@${w.moderatorId}>\n**التاريخ:** ${date.toLocaleDateString('ar')}`
            });
        });

        await interaction.reply({ embeds: [embed] });
    }
} satisfies CommandModule;
