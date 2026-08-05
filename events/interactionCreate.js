// =====================================================
// حدث "interactionCreate": يعالج كل التفاعلات
// - تنفيذ Slash Commands (مع نظام Cooldowns)
// - أزرار التذاكر (فتح / إغلاق / استلام)
// - أزرار تأكيد الرتب الجماعية (Mass Role)
// - أزرار التحكم بالموسيقى
// =====================================================

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const { errorEmbed, successEmbed, infoEmbed, COLORS } = require('../utils/embeds');
const { getGuildSettings } = require('../utils/settings');
const { formatTime } = require('../utils/musicUI');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // ============ 1) أوامر Slash ============
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            // نظام الـ Cooldowns
            const cooldownSec = command.cooldown || 3;
            const cooldownKey = `${interaction.user.id}-${interaction.commandName}`;
            const now = Date.now();
            const last = client.cooldowns.get(cooldownKey) || 0;
            if (last && now - last < cooldownSec * 1000) {
                const remaining = Math.ceil((cooldownSec * 1000 - (now - last)) / 1000);
                return interaction.reply({
                    embeds: [errorEmbed('تمهل قليلاً', `انتظر **${remaining}** ثانية قبل استخدام هذا الأمر مرة أخرى.`)],
                    ephemeral: true
                });
            }
            client.cooldowns.set(cooldownKey, now);

            try {
                await command.execute(interaction, client);
            } catch (err) {
                console.error(`خطأ أثناء تنفيذ الأمر ${interaction.commandName}:`, err);
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
            const { customId } = interaction;

            // ---- التحكم بالموسيقى ----
            if (customId.startsWith('music_')) {
                return handleMusicButton(interaction, client, customId);
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

async function handleMusicButton(interaction, client, customId) {
    const queue = client.player?.nodes.get(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
        return interaction.reply({ embeds: [errorEmbed('لا توجد موسيقى', 'لا يوجد شيء يعمل حالياً في هذا السيرفر.')], ephemeral: true });
    }

    switch (customId) {
        case 'music_pause_resume': {
            const paused = queue.node.isPaused();
            if (paused) queue.node.resume();
            else queue.node.pause();
            return interaction.reply({ embeds: [infoEmbed('تم', paused ? 'تم استئناف التشغيل ▶️' : 'تم الإيقاف المؤقت ⏸️')], ephemeral: true });
        }
        case 'music_skip': {
            const skipped = queue.node.skip();
            if (!skipped) queue.node.stop();
            return interaction.reply({ embeds: [infoEmbed('تم التخطي', 'تم تخطي المقطع الحالي. ⏭️')], ephemeral: true });
        }
        case 'music_queue': {
            const tracks = queue.tracks.toArray().slice(0, 10);
            const desc = tracks.length
                ? tracks.map((t, i) => `**${i + 1}.** [${t.title}](${t.url || ''}) - ${formatTime(t.durationMS)}`).join('\n')
                : 'القائمة فارغة.';
            return interaction.reply({ embeds: [infoEmbed('📜 قائمة التشغيل', desc)], ephemeral: true });
        }
        case 'music_stop': {
            queue.delete();
            return interaction.reply({ embeds: [infoEmbed('تم الإيقاف', 'تم إيقاف الموسيقى ومغادرة الروم الصوتي. ⏹️')], ephemeral: true });
        }
    }
}

// ==================== التذاكر ====================

async function handleTicketOpen(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    let settings = {};
    try {
        settings = getGuildSettings(interaction.guild.id) || {};
    } catch (e) {
        console.warn('تعذر قراءة إعدادات التذاكر، يتم الاستمرار بالإعدادات الافتراضية.');
    }

    const existing = interaction.guild.channels.cache.find(
        ch => ch.name === `ticket-${interaction.user.id}`
    );
    if (existing) {
        return interaction.editReply({
            embeds: [errorEmbed('لديك تذكرة مفتوحة بالفعل', `يرجى التوجه إلى ${existing} أو إغلاقها أولاً.`)]
        });
    }

    const overwrites = [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
            id: client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
        }
    ];

    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || interaction.user.id}`,
        type: ChannelType.GuildText,
        parent: settings.ticketCategoryId || null,
        permissionOverwrites: overwrites
    });

    const ticketEmbed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('🎫 تذكرة دعم جديدة')
        .setDescription(`مرحباً ${interaction.user}!\nيرجى وصف مشكلتك أو استفسارك بالتفصيل، وسيقوم فريق الإدارة بالرد عليك قريباً.`)
        .setTimestamp();

    const actions = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('استلام التذكرة').setStyle(ButtonStyle.Primary).setEmoji('🙋')
    );

    await ticketChannel.send({ content: `${interaction.user}`, embeds: [ticketEmbed], components: [actions] });
    await interaction.editReply({ embeds: [successEmbed('تم فتح تذكرتك', `تم إنشاء ${ticketChannel} خصيصاً لك.`)] });

    // لوق إرسال التذكرة إن كانت قناة اللوقات مفعلة
    const { modLog } = require('../utils/logger');
    if (settings.ticketLogChannelId || settings.modLogChannelId) {
        const logEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🎫 تم فتح تذكرة')
            .setDescription(`العضو ${interaction.user} فتح تذكرة في ${ticketChannel}`)
            .setTimestamp();
        await modLog(interaction.guild, logEmbed);
    }
}

async function handleTicketClose(interaction) {
    const closing = new EmbedBuilder()
        .setColor(COLORS.WARNING)
        .setDescription('🔒 سيتم إغلاق هذه التذكرة خلال 10 ثوانٍ...');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_cancel_close').setLabel('إلغاء').setStyle(ButtonStyle.Secondary).setEmoji('↩️')
    );

    await interaction.reply({ embeds: [closing], components: [row] });

    const { modLog } = require('../utils/logger');
    const settings = getGuildSettings(interaction.guild.id);
    if (settings.ticketLogChannelId || settings.modLogChannelId) {
        const logEmbed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('🔒 تم إغلاق تذكرة')
            .setDescription(`تم إغلاق التذكرة ${interaction.channel} بواسطة ${interaction.user}`)
            .setTimestamp();
        await modLog(interaction.guild, logEmbed);
    }

    // منع التنفيذ المزدوج عبر collector
    const collector = interaction.channel.createMessageComponentCollector({ time: 10_000 });
    collector.on('collect', async i => {
        if (i.customId === 'ticket_cancel_close') {
            collector.stop('cancelled');
            await i.update({ embeds: [infoEmbed('تم الإلغاء', 'أُلغيت عملية الإغلاق.')], components: [] });
        }
    });
    collector.on('end', async collected => {
        if (collected.size === 0) {
            try {
                await interaction.channel.delete();
            } catch (err) {
                console.error('خطأ في حذف قناة التذكرة:', err);
            }
        }
    });
}

async function handleTicketClaim(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ embeds: [errorEmbed('غير مسموح', 'تحتاج صلاحية "إدارة القنوات" لاستلام تذكرة.')], ephemeral: true });
    }
    if (interaction.channel.name.startsWith('claimed-')) {
        return interaction.reply({ embeds: [errorEmbed('مستلمة بالفعل', 'هذه التذكرة تم استلامها من قبل.')], ephemeral: true });
    }
    await interaction.channel.setName(`claimed-${interaction.channel.name}`);
    await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
    });
    return interaction.reply({
        embeds: [successEmbed('تم الاستلام', `تم استلام التذكرة بواسطة ${interaction.user}. سيتم الرد عليك قريباً.`)]
    });
}

// ==================== الرتب الجماعية ====================

async function handleMassRole(interaction, customId) {
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
    let success = 0, failed = 0;

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
            await new Promise(res => setTimeout(res, 300));
        } catch (err) {
            failed++;
        }
    }

    await interaction.followUp({
        embeds: [successEmbed(
            'اكتملت العملية',
            `تم ${opType === 'give' ? 'إعطاء' : 'سحب'} رتبة **${role.name}** بنجاح.\n✅ نجح: ${success}\n❌ فشل: ${failed}`
        )]
    });
}
