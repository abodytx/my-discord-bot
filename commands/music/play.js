// =====================================================
// أمر /play - تشغيل أغنية في الروم الصوتي
// =====================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, baseEmbed, infoEmbed } = require('../../utils/embeds');
const { searchMusic, hasYouTubeCookie } = require('../../utils/musicSearch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('تشغيل أغنية أو بلاي ليست في الروم الصوتي')
        .addStringOption(opt => opt.setName('الأغنية').setDescription('اسم الأغنية أو الرابط').setRequired(true)),
    cooldown: 5,

    async execute(interaction, client) {
        const query = interaction.options.getString('الأغنية');

        if (!interaction.member.voice.channel) {
            return interaction.reply({ embeds: [errorEmbed('أنت لست في روم صوتي', 'انضم إلى روم صوتي أولاً لتشغيل الأغاني.')], ephemeral: true });
        }

        const voiceChannel = interaction.member.voice.channel;

        if (interaction.guild.members.me.voice.channel
            && interaction.guild.members.me.voice.channel.id !== voiceChannel.id
            && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                embeds: [errorEmbed('مشغول', 'البوت يعمل في روم صوتي آخر حالياً.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            let searchResult;
            try {
                searchResult = await searchMusic(client.player, query, {
                    requestedBy: interaction.user
                });
            } catch (err) {
                if (err.code === 'YOUTUBE_NEEDS_COOKIE') {
                    return interaction.followUp({
                        embeds: [infoEmbed('⚠️ يوتيوب محجوب حالياً', `يوتيوب يمنع البث بدون تسجيل دخول.\nاستخدم **اسم الأغنية** أو **رابط SoundCloud**، أو أضف كوكيز يوتيوب في ملف `.env` (انظر README).`)]
                    });
                }
                throw err;
            }

            if (!searchResult.hasTracks()) {
                return interaction.followUp({
                    embeds: [errorEmbed('لا توجد نتائج', `لم يتم العثور على أي نتائج لـ "${query}".`)]
                });
            }

            const sourceLabel = searchResult.tracks[0]?.source === 'youtube' ? 'يوتيوب' : 'SoundCloud';
            if (!hasYouTubeCookie()) {
                await interaction.followUp({
                    embeds: [infoEmbed('🎧 تم التشغيل عبر SoundCloud', `يوتيوب محجوب بدون كوكيز، تم البحث على **SoundCloud** بدلاً منه.\nللحصول على يوتيوب أضف \`YOUTUBE_COOKIE\` في ملف \`.env\`.`)]
                });
            }

            await client.player.play(voiceChannel, searchResult, {
                nodeOptions: {
                    metadata: { channel: interaction.channel, requestedBy: interaction.user },
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300_000,
                    leaveOnEnd: false,
                    selfDeaf: true
                }
            });

            if (hasYouTubeCookie()) {
                await interaction.followUp({
                    embeds: [baseEmbed().setTitle('🎵 تمت الإضافة')
                        .setDescription(`تمت إضافة **${searchResult.tracks.length}** مقطع إلى القائمة عبر ${sourceLabel}.`)
                        .setFooter({ text: 'جارٍ التشغيل...' })]
                });
            }
        } catch (err) {
            console.error('Play error:', err);
            await interaction.followUp({
                embeds: [errorEmbed('تعذر التشغيل', `حدث خطأ: ${err.message}`)]
            });
        }
    }
};
