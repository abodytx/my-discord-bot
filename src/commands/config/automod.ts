// =====================================================
// أمر /automod - إدارة نظام AutoMod المتقدم
// - كلمات ممنوعة (إضافة/حذف/عرض)
// - تفعيل/تعطيل فلترة الكلمات الممنوعة
// - حدود: الإشارات، الإيموجي، الحروف الكبيرة
// - الإجراءات التلقائية عند تراكم التحذيرات (warnActions)
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient, GuildSettings } from '../../types';
import { getGuildSettings, updateGuildSettings } from '../../utils/settings';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds';
import { logger } from '../../utils/logger';

export default {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('إدارة نظام AutoMod المتقدم (كلمات/حدود/إجراءات)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((sub) =>
            sub
                .setName('words')
                .setDescription('إدارة قائمة الكلمات الممنوعة')
                .addStringOption((opt) =>
                    opt.setName('add').setDescription('كلمة لإضافتها إلى القائمة الممنوعة').setRequired(false)
                )
                .addStringOption((opt) =>
                    opt.setName('remove').setDescription('كلمة لحذفها من القائمة الممنوعة').setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('toggle')
                .setDescription('تفعيل أو تعطيل فلترة الكلمات الممنوعة')
                .addStringOption((opt) =>
                    opt
                        .setName('حالة')
                        .setDescription('تفعيل أو تعطيل')
                        .setRequired(true)
                        .addChoices({ name: 'تفعيل', value: 'on' }, { name: 'تعطيل', value: 'off' })
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('limits')
                .setDescription('ضبط حدود الإشارات والإيموجي والحروف الكبيرة')
                .addIntegerOption((opt) =>
                    opt
                        .setName('mentions')
                        .setDescription('الحد الأقصى للإشارات لكل رسالة (0 = تعطيل)')
                        .setMinValue(0)
                        .setMaxValue(50)
                        .setRequired(false)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('emoji')
                        .setDescription('الحد الأقصى للإيموجي لكل رسالة (0 = تعطيل)')
                        .setMinValue(0)
                        .setMaxValue(50)
                        .setRequired(false)
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('caps')
                        .setDescription('نسبة الحروف الكبيرة المسموحة (0-100، 0 = تعطيل)')
                        .setMinValue(0)
                        .setMaxValue(100)
                        .setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('actions')
                .setDescription('إدارة الإجراءات التلقائية عند تراكم التحذيرات')
                .addIntegerOption((opt) =>
                    opt
                        .setName('points')
                        .setDescription('عدد نقاط التحذيرات التي يُفعَّل عندها الإجراء')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(false)
                )
                .addStringOption((opt) =>
                    opt
                        .setName('action')
                        .setDescription('الإجراء المطلوب')
                        .setRequired(false)
                        .addChoices(
                            { name: 'كتم مؤقت', value: 'timeout' },
                            { name: 'طرد', value: 'kick' },
                            { name: 'حظر', value: 'ban' }
                        )
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('duration')
                        .setDescription('مدة الكتم المؤقت بالدقائق (للإجراء timeout فقط)')
                        .setMinValue(1)
                        .setMaxValue(10080)
                        .setRequired(false)
                )
                .addStringOption((opt) =>
                    opt
                        .setName('clear')
                        .setDescription('مسح كل الإجراءات التلقائية')
                        .setRequired(false)
                        .addChoices({ name: 'نعم، امسح الكل', value: 'yes' })
                )
        ),
    category: 'config',
    cooldown: 3,
    adminOnly: true,

    async execute(interaction: ChatInputCommandInteraction, _client: ExtendedClient) {
        if (!interaction.guild) return;

        const sub = interaction.options.getSubcommand();
        let settings: GuildSettings = await getGuildSettings(interaction.guild.id);

        // ---------- إدارة الكلمات الممنوعة ----------
        if (sub === 'words') {
            const addWord = interaction.options.getString('add');
            const removeWord = interaction.options.getString('remove');

            if (addWord) {
                const words = [...(settings.badWords || []), addWord.toLowerCase().trim()];
                const unique = [...new Set(words.filter(Boolean))];
                settings = await updateGuildSettings(interaction.guild.id, { badWords: unique });
                logger.info(`[AutoMod] أُضيفت كلمة ممنوعة "${addWord}" في سيرفر ${interaction.guild.id}`);
                await interaction.reply({
                    embeds: [successEmbed('تمت الإضافة', `أُضيفت كلمة **${addWord}** إلى القائمة الممنوعة.`)]
                });
                return;
            }

            if (removeWord) {
                const words = (settings.badWords || []).filter((w) => w !== removeWord.toLowerCase().trim());
                settings = await updateGuildSettings(interaction.guild.id, { badWords: words });
                logger.info(`[AutoMod] حُذفت كلمة ممنوعة "${removeWord}" من سيرفر ${interaction.guild.id}`);
                await interaction.reply({
                    embeds: [successEmbed('تم الحذف', `حُذفت كلمة **${removeWord}** من القائمة الممنوعة.`)]
                });
                return;
            }

            const list = (settings.badWords || []).length
                ? (settings.badWords || []).map((w) => `\`${w}\``).join(' ')
                : 'القائمة فارغة.';
            await interaction.reply({
                embeds: [
                    infoEmbed(
                        '📋 الكلمات الممنوعة',
                        `${list}\n\n**الحالة:** ${settings.badWordsEnabled ? '🟢 مفعّل' : '🔴 معطّل'}`
                    )
                ]
            });
            return;
        }

        // ---------- تفعيل/تعطيل ----------
        if (sub === 'toggle') {
            const state = interaction.options.getString('حالة') === 'on';
            settings = await updateGuildSettings(interaction.guild.id, { badWordsEnabled: state });
            logger.info(`[AutoMod] تم ${state ? 'تفعيل' : 'تعطيل'} فلترة الكلمات في سيرفر ${interaction.guild.id}`);
            await interaction.reply({
                embeds: [
                    successEmbed(
                        'تم التحديث',
                        state ? 'تم تفعيل فلترة الكلمات الممنوعة. 🟢' : 'تم تعطيل فلترة الكلمات الممنوعة. 🔴'
                    )
                ]
            });
            return;
        }

        // ---------- الحدود ----------
        if (sub === 'limits') {
            const updates: Partial<GuildSettings> = {};
            const mentions = interaction.options.getInteger('mentions');
            const emoji = interaction.options.getInteger('emoji');
            const caps = interaction.options.getInteger('caps');
            if (mentions !== null) updates.mentionLimit = mentions;
            if (emoji !== null) updates.emojiLimit = emoji;
            if (caps !== null) updates.capsLimit = caps;

            if (Object.keys(updates).length) {
                settings = await updateGuildSettings(interaction.guild.id, updates);
                logger.info(`[AutoMod] تحديث الحدود في سيرفر ${interaction.guild.id}:`, updates);
                await interaction.reply({
                    embeds: [
                        successEmbed(
                            'تم تحديث الحدود',
                            `📌 الإشارات: **${settings.mentionLimit}**\n😀 الإيموجي: **${settings.emojiLimit}**\n🔠 الحروف الكبيرة: **${settings.capsLimit}%**`
                        )
                    ]
                });
            } else {
                await interaction.reply({
                    embeds: [
                        infoEmbed(
                            '🛡️ حدود AutoMod الحالية',
                            `📌 الإشارات: **${settings.mentionLimit}** لكل رسالة\n😀 الإيموجي: **${settings.emojiLimit}** لكل رسالة\n🔠 الحروف الكبيرة: **${settings.capsLimit}%** (0 = معطل)`
                        )
                    ]
                });
            }
            return;
        }

        // ---------- الإجراءات التلقائية ----------
        if (sub === 'actions') {
            const clear = interaction.options.getString('clear');
            if (clear === 'yes') {
                settings = await updateGuildSettings(interaction.guild.id, { warnActions: [] });
                logger.info(`[AutoMod] مسح كل الإجراءات التلقائية في سيرفر ${interaction.guild.id}`);
                await interaction.reply({ embeds: [successEmbed('تم المسح', 'حُذفت كل الإجراءات التلقائية.')] });
                return;
            }

            const points = interaction.options.getInteger('points');
            const action = interaction.options.getString('action');
            if (points === null || !action) {
                const list = (settings.warnActions || []).length
                    ? (settings.warnActions || [])
                          .map(
                              (a) =>
                                  `• **${a.points}** نقطة → **${a.action}**${
                                      a.action === 'timeout' ? ` (${a.durationMin || 60} دقيقة)` : ''
                                  }`
                          )
                          .join('\n')
                    : 'لا توجد إجراءات تلقائية بعد.';
                await interaction.reply({
                    embeds: [
                        infoEmbed(
                            '⚡ الإجراءات التلقائية',
                            `تُنفَّذ عند تراكم نقاط التحذيرات:\n\n${list}\n\n_الإجراء الأعلى نقاطاً هو الذي يُطبَّق._`
                        )
                    ]
                });
                return;
            }

            const durationMin = action === 'timeout' ? (interaction.options.getInteger('duration') ?? 60) : undefined;
            const actions = [
                ...(settings.warnActions || []),
                { points, action, durationMin }
            ] as GuildSettings['warnActions'];
            settings = await updateGuildSettings(interaction.guild.id, { warnActions: actions });
            logger.info(`[AutoMod] إجراء تلقائي جديد (${points} نقطة → ${action}) في سيرفر ${interaction.guild.id}`);
            await interaction.reply({
                embeds: [
                    successEmbed(
                        'تمت الإضافة',
                        `عند وصول العضو إلى **${points}** نقطة تحذير سيُطبَّق عليه **${action}**${
                            action === 'timeout' ? ` لمدة ${durationMin} دقيقة` : ''
                        }.`
                    )
                ]
            });
            return;
        }

        await interaction.reply({
            embeds: [errorEmbed('خطأ', 'أمر غير معروف.')],
            ephemeral: true
        });
    }
} satisfies CommandModule;
