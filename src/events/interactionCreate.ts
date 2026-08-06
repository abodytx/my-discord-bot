import { logger } from '../utils/logger';
// =====================================================
// حدث "interactionCreate": يعالج كل التفاعلات
// - تنفيذ Slash Commands (مع نظام Middleware + Cooldowns)
// - الاقتراحات التلقائية (Autocomplete)
// - أزرار التذاكر (فتح / إغلاق / استلام)
// - أزرار تأكيد الرتب الجماعية (Mass Role)
// - أزرار التحكم بالموسيقى
// =====================================================

import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType,
    type Interaction,
    type ButtonInteraction,
    type TextChannel
} from 'discord.js';
import type { ExtendedClient, GuildSettings } from '../types';
import { errorEmbed, successEmbed, infoEmbed, COLORS } from '../utils/embeds';
import { getGuildSettings } from '../utils/settings';
import { formatTime } from '../utils/musicUI';
import { ticketLog } from '../utils/logger';
import { runCommandMiddleware } from '../utils/middleware';
import { handleGiveawayButton } from '../modules/giveaway';
import { buildTicketTranscript } from '../modules/ticketTranscript';

export default {
    name: 'interactionCreate',
    async execute(interaction: Interaction, client: ExtendedClient) {
        // ============ 0) الاقتراحات التلقائية (Autocomplete) ============
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (command?.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                } catch (err) {
                    logger.error(`خطأ في Autocomplete للأمر ${interaction.commandName}:`, err);
                }
            }
            return;
        }

        // ============ 1) أوامر Slash ============
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            // نظام الـ Middleware (الصلاحيات + الـ Cooldowns + الطبقات المخصصة)
            const allowed = await runCommandMiddleware(command, interaction, client);
            if (!allowed) return;

            try {
                await command.execute(interaction, client);
            } catch (err) {
                logger.error(`خطأ أثناء تنفيذ الأمر ${interaction.commandName}:`, err);
                const embed = errorEmbed('حدث خطأ', 'حدث خطأ غير متوقع أثناء تنفيذ هذا الأمر. حاول مرة أخرى لاحقاً.');
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {});
                } else {
                    await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
                }
            }
            return;
        }

        // ============ 2) الأزرار ============
        if (interaction.isButton()) {
            if (!interaction.guild) return;

            const { customId } = interaction;

            // ---- التحكم بالموسيقى ----
            if (customId.startsWith('music_')) {
                return handleMusicButton(interaction, client, customId);
            }

            // ---- نظام السحوبات (Giveaways) ----
            if (customId.startsWith('giveaway_')) {
                const handled = await handleGiveawayButton(interaction, client);
                if (handled) return;
            }

            // ---- نظام التذاكر ----
            if (customId === 'ticket_open') {
                return handleTicketOpen(interaction, client);
            }
            if (customId === 'ticket_close') {
                return handleTicketClose(interaction);
            }
            if (customId === 'ticket_claim') {
                return handleTicketClaim(interaction);
            }

            // ---- الرتب الجماعية ----
            if (customId.startsWith('massrole_')) {
                return handleMassRole(interaction, customId);
            }
        }
    }
};

// ==================== الموسيقى ====================

async function handleMusicButton(interaction: ButtonInteraction, client: ExtendedClient, customId: string) {
    if (!interaction.guild) return;

    const queue = client.player?.nodes.get(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
        return interaction.reply({
            embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يعمل حالياً في هذا السيرفر.')],
            ephemeral: true
        });
    }

    switch (customId) {
        case 'music_pause_resume': {
            const paused = queue.node.isPaused();
            if (paused) queue.node.resume();
            else queue.node.pause();
            return interaction.reply({
                embeds: [infoEmbed('تم', paused ? 'تم استئناف التشغيل ▶️' : 'تم الإيقاف المؤقت ⏸️')],
                ephemeral: true
            });
        }
        case 'music_skip': {
            const skipped = queue.node.skip();
            if (!skipped) queue.node.stop();
            return interaction.reply({
                embeds: [infoEmbed('تم التخطي', 'تم تخطي المقطع الحالي. ⏭️')],
                ephemeral: true
            });
        }
        case 'music_queue': {
            const tracks = queue.tracks.toArray().slice(0, 10);
            const desc = tracks.length
                ? tracks
                      .map((t, i) => `**${i + 1}.** [${t.title}](${t.url || ''}) - ${formatTime(t.durationMS)}`)
                      .join('\n')
                : 'القائمة فارغة.';
            return interaction.reply({ embeds: [infoEmbed('📜 قائمة التشغيل', desc)], ephemeral: true });
        }
        case 'music_stop': {
            queue.delete();
            return interaction.reply({
                embeds: [infoEmbed('تم الإيقاف', 'تم إيقاف الموسيقى ومغادرة الروم الصوتي. ⏹️')],
                ephemeral: true
            });
        }
    }
}

// ==================== التذاكر ====================

const OPEN_TICKET_COOLDOWN = 30_000;
const ticketCooldowns = new Map<string, number>();
const pendingCloses = new Set<string>();

/** توليد اسم قناة التذكرة من اسم المستخدم */
function ticketChannelName(userId: string, username: string): string {
    const safe = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `ticket-${safe || userId}`;
}

/** هل العضو من فريق الإدارة (رتبة الستاف أو صلاحيات إدارة)؟ */
function isTicketStaff(interaction: ButtonInteraction, settings: Partial<GuildSettings>): boolean {
    const perms = interaction.memberPermissions;
    if (perms?.has(PermissionFlagsBits.ManageMessages) || perms?.has(PermissionFlagsBits.ManageChannels)) return true;
    const staffRoleId = settings.staffRoleId;
    if (
        staffRoleId &&
        interaction.member &&
        typeof interaction.member.roles === 'object' &&
        'cache' in interaction.member.roles
    ) {
        return interaction.member.roles.cache.has(staffRoleId);
    }
    return false;
}

/** قراءة معرّف صاحب التذكرة من موضوع القناة */
function ticketOwnerFromTopic(channel: TextChannel): string | null {
    const match = channel.topic?.match(/^userId:(\d+)/);
    return match ? match[1] : null;
}

async function handleTicketOpen(interaction: ButtonInteraction, client: ExtendedClient) {
    if (!interaction.guild) return;
    await interaction.deferReply({ ephemeral: true });

    // منع الفتح المتكرر (Cooldown)
    const now = Date.now();
    const last = ticketCooldowns.get(interaction.user.id) || 0;
    if (now - last < OPEN_TICKET_COOLDOWN) {
        return interaction.editReply({
            embeds: [
                errorEmbed(
                    'تمهل قليلاً',
                    `يمكنك فتح تذكرة جديدة مرة كل ${Math.ceil(OPEN_TICKET_COOLDOWN / 1000)} ثانية.`
                )
            ]
        });
    }

    let settings: Partial<GuildSettings> = {};
    try {
        settings = (await getGuildSettings(interaction.guild.id)) || {};
    } catch {
        logger.warn('تعذر قراءة إعدادات التذاكر، يتم الاستمرار بالإعدادات الافتراضية.');
    }

    // منع التذاكر المتكررة (نفس الاسم الذي تُنشأ به القنوات فعلياً)
    const expectedName = ticketChannelName(interaction.user.id, interaction.user.username);
    const existing = interaction.guild.channels.cache.find((ch) => ch.name === expectedName);
    if (existing) {
        return interaction.editReply({
            embeds: [errorEmbed('لديك تذكرة مفتوحة بالفعل', `يرجى التوجه إلى ${existing} أو إغلاقها أولاً.`)]
        });
    }

    const overwrites: { id: string; allow?: bigint[]; deny?: bigint[] }[] = [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
            id: interaction.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        },
        {
            id: client.user!.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels
            ]
        }
    ];

    // السماح لفريق الستاف برؤية ودخول التذكرة
    if (settings.staffRoleId) {
        overwrites.push({
            id: settings.staffRoleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        });
    }

    let ticketChannel: TextChannel;
    try {
        ticketChannel = await interaction.guild.channels.create({
            name: expectedName,
            type: ChannelType.GuildText,
            parent: settings.ticketCategoryId || null,
            topic: `userId:${interaction.user.id}`,
            permissionOverwrites: overwrites
        });
    } catch (err) {
        logger.error('خطأ في إنشاء قناة التذكرة:', err);
        return interaction.editReply({
            embeds: [errorEmbed('فشل فتح التذكرة', 'حدث خطأ أثناء إنشاء القناة، يرجى المحاولة لاحقاً.')]
        });
    }

    ticketCooldowns.set(interaction.user.id, now);

    const ticketEmbed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('🎫 تذكرة دعم جديدة')
        .setDescription(
            `مرحباً ${interaction.user}!\nيرجى وصف مشكلتك أو استفسارك بالتفصيل، وسيقوم فريق الإدارة بالرد عليك قريباً.`
        )
        .setTimestamp();

    const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('إغلاق التذكرة')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
        new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('استلام التذكرة')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🙋')
    );

    await ticketChannel.send({ content: `${interaction.user}`, embeds: [ticketEmbed], components: [actions] });
    await interaction.editReply({ embeds: [successEmbed('تم فتح تذكرتك', `تم إنشاء ${ticketChannel} خصيصاً لك.`)] });

    // لوق فتح التذكرة
    const logEmbed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('🎫 تم فتح تذكرة')
        .setDescription(`العضو ${interaction.user} (${interaction.user.id}) فتح تذكرة في ${ticketChannel}`)
        .setTimestamp();
    await ticketLog(interaction.guild, logEmbed);
}

async function handleTicketClose(interaction: ButtonInteraction) {
    if (!interaction.guild || !interaction.channel) return;
    const channel = interaction.channel as TextChannel;

    // فحص الصلاحية: صاحب التذكرة أو فريق الإدارة
    const ownerId = ticketOwnerFromTopic(channel);
    const isOwner = !!ownerId && ownerId === interaction.user.id;
    if (!isOwner && !isTicketStaff(interaction, await getGuildSettings(interaction.guild.id))) {
        return interaction.reply({
            embeds: [errorEmbed('غير مسموح', 'فقط صاحب التذكرة أو فريق الإدارة يمكنه إغلاقها.')],
            ephemeral: true
        });
    }

    // منع التنفيذ المزدوج أثناء انتظار التأكيد
    if (pendingCloses.has(channel.id)) {
        return interaction.reply({
            embeds: [infoEmbed('قيد الإغلاق', 'هذه التذكرة في انتظار الإغلاق بالفعل.')],
            ephemeral: true
        });
    }
    pendingCloses.add(channel.id);

    const closing = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setDescription('🔒 سيتم إغلاق هذه التذكرة خلال 10 ثوانٍ...');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_cancel_close')
            .setLabel('إلغاء')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('↩️')
    );

    await interaction.reply({ embeds: [closing], components: [row] });

    const collector = channel.createMessageComponentCollector({ time: 10_000 });
    collector.on('collect', async (i) => {
        if (i.customId === 'ticket_cancel_close') {
            collector.stop('cancelled');
            await i.update({ embeds: [infoEmbed('تم الإلغاء', 'أُلغيت عملية الإغلاق.')], components: [] });
        }
    });
    collector.on('end', async (collected, reason) => {
        pendingCloses.delete(channel.id);
        if (reason === 'cancelled' || collected.size > 0) return;

        try {
            // توليد نسخة نصية من التذكرة وإرسالها لصاحبها قبل الحذف
            const transcript = await buildTicketTranscript(channel).catch(() => null);
            if (transcript && ownerId) {
                const owner = await interaction.guild?.members.fetch(ownerId).catch(() => null);
                if (owner) {
                    await owner
                        .send({
                            content: '📄 نسخة من تذكرتك المغلقة:',
                            files: [{ attachment: transcript.path, name: transcript.path.split('\\').pop() }]
                        })
                        .catch(() => {});
                }
            }

            const channelName = channel.name;
            await channel.delete();

            const logEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('🔒 تم إغلاق تذكرة')
                .setDescription(
                    `أُغلقت التذكرة **${channelName}** بواسطة ${interaction.user}${transcript ? `\n📄 نسخة التذكرة في: \`${transcript.path}\`` : ''}`
                )
                .setTimestamp();
            await ticketLog(interaction.guild!, logEmbed);
        } catch (err) {
            logger.error('خطأ في حذف قناة التذكرة:', err);
        }
    });
}

async function handleTicketClaim(interaction: ButtonInteraction) {
    if (!interaction.channel) return;
    const channel = interaction.channel as TextChannel;
    const settings = await getGuildSettings(interaction.guild?.id || '');

    // فريق الإدارة فقط (رتبة الستاف أو صلاحيات الإدارة)
    if (!isTicketStaff(interaction, settings)) {
        return interaction.reply({
            embeds: [errorEmbed('غير مسموح', 'تحتاج صلاحية إدارة أو رتبة الستاف لاستلام تذكرة.')],
            ephemeral: true
        });
    }
    if (channel.name.startsWith('claimed-')) {
        return interaction.reply({
            embeds: [errorEmbed('مستلمة بالفعل', 'هذه التذكرة تم استلامها من قبل.')],
            ephemeral: true
        });
    }
    if (!channel.manageable) {
        return interaction.reply({
            embeds: [errorEmbed('لا يمكن الاستلام', 'لا يمتلك البوت صلاحية إدارة هذه القناة.')],
            ephemeral: true
        });
    }
    await channel.setName(`claimed-${channel.name}`);
    await channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
    });

    const logEmbed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('🙋 تم استلام تذكرة')
        .setDescription(`استلم ${interaction.user} التذكرة ${channel}`)
        .setTimestamp();
    await ticketLog(interaction.guild, logEmbed);

    return interaction.reply({
        embeds: [successEmbed('تم الاستلام', `تم استلام التذكرة بواسطة ${interaction.user}. سيتم الرد عليك قريباً.`)]
    });
}

// ==================== الرتب الجماعية ====================

async function handleMassRole(interaction: ButtonInteraction, customId: string) {
    if (!interaction.guild) return;

    const parts = customId.split('_');
    const action = parts[1];
    const opType = parts[2];
    const roleId = parts[3];
    const requesterId = parts[4];

    if (interaction.user.id !== requesterId) {
        return interaction.reply({
            embeds: [errorEmbed('غير مسموح', 'فقط الشخص الذي طلب هذه العملية يمكنه تأكيدها أو إلغاؤها.')],
            ephemeral: true
        });
    }

    if (action === 'cancel') {
        return interaction.update({
            embeds: [infoEmbed('تم الإلغاء', 'تم إلغاء عملية تعديل الرتب الجماعية.')],
            components: []
        });
    }

    await interaction.update({
        embeds: [infoEmbed('جاري التنفيذ...', 'يرجى الانتظار، قد تستغرق هذه العملية بعض الوقت حسب عدد الأعضاء.')],
        components: []
    });

    const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
        return interaction.followUp({ embeds: [errorEmbed('خطأ', 'لم يتم العثور على الرتبة.')] });
    }

    const members = await interaction.guild.members.fetch();
    let success = 0,
        failed = 0;

    for (const member of members.values()) {
        if (member.user.bot) continue;
        try {
            if (opType === 'give' && !member.roles.cache.has(roleId)) {
                await member.roles.add(role);
                success++;
            } else if (opType === 'remove' && member.roles.cache.has(roleId)) {
                await member.roles.remove(role);
                success++;
            }
            await new Promise((res) => setTimeout(res, 300));
        } catch {
            failed++;
        }
    }

    await interaction.followUp({
        embeds: [
            successEmbed(
                'اكتملت العملية',
                `تم ${opType === 'give' ? 'إعطاء' : 'سحب'} رتبة **${role.name}** بنجاح.\n✅ نجح: ${success}\n❌ فشل: ${failed}`
            )
        ]
    });
}
