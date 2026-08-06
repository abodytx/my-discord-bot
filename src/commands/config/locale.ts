// =====================================================
// أمر /locale - تعيين لغة السيرفر (عربية / إنجليزية)
// =====================================================

import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../../types';
import { updateGuildSettings } from '../../utils/settings';
import { successEmbed, infoEmbed } from '../../utils/embeds';
import { getLocale, t } from '../../i18n';
import { translations } from '../../i18n/translations';
import { logger } from '../../utils/logger';

export default {
    data: new SlashCommandBuilder()
        .setName('locale')
        .setDescription('تعيين لغة السيرفر (العربية / الإنجليزية)')
        .addStringOption((opt) =>
            opt
                .setName('اللغة')
                .setDescription('اللغة المطلوبة')
                .setRequired(false)
                .addChoices(
                    { name: translations.ar.localeArName, value: 'ar' },
                    { name: translations.en.localeEnName, value: 'en' }
                )
        ),
    category: 'config',
    adminOnly: true,
    cooldown: 5,

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;

        const selected = interaction.options.getString('اللغة');
        const current = await getLocale(interaction.guild.id);

        if (!selected) {
            await interaction.reply({
                embeds: [
                    infoEmbed(
                        '🌐 اللغة الحالية',
                        t(current, 'localeCurrent', {
                            locale: current === 'ar' ? translations.ar.localeArName : translations.en.localeEnName
                        })
                    )
                ]
            });
            return;
        }

        const next = selected === 'en' ? 'en' : 'ar';
        await updateGuildSettings(interaction.guild.id, { locale: next });
        logger.info(`[i18n] تم تغيير لغة السيرفر ${interaction.guild.id} إلى ${next}`);

        await interaction.reply({
            embeds: [
                successEmbed(
                    '✅ تم التحديث',
                    t(next, 'localeUpdated', {
                        locale: next === 'ar' ? translations.ar.localeArName : translations.en.localeEnName
                    })
                )
            ]
        });
    }
} satisfies CommandModule;
