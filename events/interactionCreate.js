// =====================================================
// حدث "interactionCreate": يعالج كل أنواع التفاعلات
// - تنفيذ Slash Commands
// - أزرار نظام التذاكر (فتح/إغلاق)
// - أزرار تأكيد الرتب الجماعية (Mass Role)
// =====================================================

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const { errorEmbed, successEmbed, COLORS } = require('../utils/embeds');
const { getGuildSettings } = require('../utils/settings');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // ============ 1) تنفيذ أوامر Slash Commands ============
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

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

        // ============ 2) أزرار نظام التذاكر والأوامر ============
        if (interaction.isButton()) {
            const { customId } = interaction;

            // ---- فتح تذكرة جديدة ----
            if (customId === 'ticket_open') {
                await interaction.deferReply({ ephemeral: true });
                let settings = {};
                try {
                    settings = getGuildSettings(interaction.guild.id) || {};
                } catch (e) {
                    console.warn('تعذر قراءة إعدادات التذاكر، يتم الاستمرار بالإعدادات الافتراضية.');
                }

                // منع فتح أكثر من تذكرة واحدة لنفس العضو
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
                    name: `ticket-${interaction.user.id}`,
                    type: ChannelType.GuildText,
                    parent: settings.ticketCategoryId || null,
                    permissionOverwrites: overwrites
                });

                const ticketEmbed = new EmbedBuilder()
                    .setColor(COLORS?.PRIMARY || '#0284c7')
                    .setTitle('🎫 تذكرة دعم جديدة')
                    .setDescription(`مرحباً ${interaction.user}!\nيرجى وصف مشكلتك أو استفسارك بالتفصيل، وسيقوم فريق الإدارة بالرد عليك قريباً.`)
                    .setTimestamp();

                const closeButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_close').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await ticketChannel.send({ content: `${interaction.user}`, embeds: [ticketEmbed], components: [closeButton] });
                await interaction.editReply({ embeds: [successEmbed('تم فتح تذكرتك', `تم إنشاء ${ticketChannel} خصيصاً لك.`)] });
                return;
            }

            // ---- إغلاق التذكرة ----
            if (customId === 'ticket_close') {
                await interaction.reply({ embeds: [infoClosing()] });
                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                    } catch (err) {
                        console.error('خطأ في حذف قناة التذكرة:', err);
                    }
                }, 5000);
                return;
            }

            // ---- تأكيد عملية الرتب الجماعية (Mass Role) ----
            if (customId.startsWith('massrole_')) {
                // تقسيم المعرف بشكل صحيح (massrole_confirm_give_ROLEID_USERID)
                const parts = customId.split('_');
                const action = parts[1];      // confirm أو cancel
                const opType = parts[2];      // give أو remove
                const roleId = parts[3];
                const requesterId = parts[4];

                if (interaction.user.id !== requesterId) {
                    return interaction.reply({
                        embeds: [errorEmbed('غير مسموح', 'فقط الشخص الذي طلب هذه العملية يمكنه تأكيدها أو إلغاؤها.')],
                        ephemeral: true
                    });
                }

                if (action === 'cancel') {
                    return interaction.update({ embeds: [infoEmbedSimple('تم الإلغاء', 'تم إلغاء عملية تعديل الرتب الجماعية.')], components: [] });
                }

                // action === 'confirm'
                await interaction.update({ embeds: [infoEmbedSimple('جاري التنفيذ...', 'يرجى الانتظار، قد تستغرق هذه العملية بعض الوقت حسب عدد الأعضاء.')], components: [] });

                const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
                if (!role) {
                    return interaction.followUp({ embeds: [errorEmbed('خطأ', 'لم يتم العثور على الرتبة.')] });
                }

                const members = await interaction.guild.members.fetch();
                let success = 0, failed = 0;

                for (const member of members.values()) {
                    try {
                        if (opType === 'give' && !member.roles.cache.has(roleId)) {
                            await member.roles.add(role);
                            success++;
                        } else if (opType === 'remove' && member.roles.cache.has(roleId)) {
                            await member.roles.remove(role);
                            success++;
                        }
                        // تأخير بسيط لتجنب حظر Rate Limit من ديسكورد
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
                return;
            }
        }
    }
};

function infoClosing() {
    return new EmbedBuilder().setColor(COLORS?.WARNING || '#f59e0b').setDescription('🔒 سيتم إغلاق هذه التذكرة خلال 5 ثوانٍ...');
}

function infoEmbedSimple(title, desc) {
    return new EmbedBuilder().setColor(COLORS?.INFO || '#3b82f6').setTitle(title).setDescription(desc);
}