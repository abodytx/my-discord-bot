// =====================================================
// أمر /play - تشغيل أغنية في الروم الصوتي
// محرك البث: yt-dlp (SoundCloud/YouTube/روابط مباشرة)
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Track, type RawTrackData } from 'discord-player';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed, baseEmbed, infoEmbed } from '../../utils/embeds';
import { logger } from '../../utils/logger';
import { ytDlpSearch, ytDlpResolve, formatDurationMs, type YtDlpTrack } from '../../utils/ytdlp';
import { hasYouTubeCookie, isYouTubeUrl } from '../../utils/musicSearch';

const SC_URL = /^https?:\/\/([^/]+\.)?soundcloud\.com\//i;

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('تشغيل أغنية أو بلاي ليست في الروم الصوتي')
        .addStringOption((opt) => opt.setName('الأغنية').setDescription('اسم الأغنية أو الرابط').setRequired(true)),
    cooldown: 5,
    category: 'music',

    async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
        const query = interaction.options.getString('الأغنية')!;

        if (!interaction.guild) return;
        const guild = interaction.guild;

        const voiceChannel = (interaction.member as GuildMember).voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [errorEmbed('أنت لست في روم صوتي', 'انضم إلى روم صوتي أولاً لتشغيل الأغاني.')],
                ephemeral: true
            });
        }

        const botVoice = guild.members.me?.voice.channel;
        if (
            botVoice &&
            botVoice.id !== voiceChannel.id &&
            !(interaction.member as GuildMember).permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return interaction.reply({
                embeds: [errorEmbed('مشغول', 'البوت يعمل في روم صوتي آخر حالياً.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const isYtUrl = isYouTubeUrl(query);
        const isScUrl = SC_URL.test(String(query).trim());

        // يوتيوب محجوب وبدون كوكيز صالحة → رسالة واضحة
        if (isYtUrl && !hasYouTubeCookie()) {
            return interaction.followUp({
                embeds: [
                    infoEmbed(
                        '⚠️ يوتيوب محجوب حالياً',
                        `يوتيوب يمنع البث الآلي من هذه البيئة.\nاستخدم **اسم الأغنية** وسيتم البحث على **SoundCloud** بدلاً منه، أو استخدم **رابط SoundCloud** مباشرة.`
                    )
                ]
            });
        }

        let track: YtDlpTrack | null = null;
        let sourceLabel = '';
        let attemptedYt = false;

        try {
            if (isYtUrl) {
                track = await ytDlpResolve(query);
                sourceLabel = 'يوتيوب';
            } else if (isScUrl) {
                track = await ytDlpResolve(query);
                sourceLabel = 'SoundCloud';
            } else {
                if (hasYouTubeCookie()) {
                    attemptedYt = true;
                    track = await ytDlpSearch(query, 'youtube');
                    sourceLabel = 'يوتيوب';
                }
                if (!track) {
                    track = await ytDlpSearch(query, 'soundcloud');
                    sourceLabel = 'SoundCloud';
                }
            }
        } catch (err) {
            logger.error('خطأ في البحث:', err);
            return interaction.followUp({
                embeds: [errorEmbed('تعذر البحث', `حدث خطأ: ${(err as Error).message}`)]
            });
        }

        if (!track) {
            return interaction.followUp({
                embeds: [
                    errorEmbed('لا توجد نتائج', `لم يتم العثور على "${query}". جرّب صياغة أخرى أو رابطاً مباشراً.`)
                ]
            });
        }

        if (attemptedYt && sourceLabel === 'SoundCloud' && hasYouTubeCookie()) {
            await interaction.followUp({
                embeds: [
                    infoEmbed('🎧 تشغيل عبر SoundCloud', 'تعذر بث يوتيوب، تم التحويل تلقائياً إلى **SoundCloud**.')
                ]
            });
        } else if (sourceLabel === 'SoundCloud') {
            await interaction.followUp({
                embeds: [
                    infoEmbed(
                        '🎧 تم التشغيل عبر SoundCloud',
                        'يوتيوب محجوب حالياً، تم البحث على **SoundCloud** بدلاً منه.'
                    )
                ]
            });
        }

        const trackData = {
            title: track.title,
            url: track.url,
            duration: formatDurationMs(track.durationMs),
            thumbnail: track.thumbnail || undefined,
            author: track.author,
            source: sourceLabel === 'يوتيوب' ? 'youtube' : 'soundcloud'
        } as RawTrackData;

        const playOptions = {
            nodeOptions: {
                metadata: { channel: interaction.channel, requestedBy: interaction.user },
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 300_000,
                leaveOnEnd: false,
                selfDeaf: true
            }
        };

        try {
            const dpTrack = new Track(client.player!, trackData);
            await client.player!.play(voiceChannel, dpTrack, playOptions);
        } catch (err) {
            const e = err as Error;
            return interaction.followUp({
                embeds: [
                    errorEmbed('تعذر التشغيل', `حدث خطأ: ${e.message}\n\n> 💡 جرّب مرة أخرى، أو استخدم رابطاً مباشراً.`)
                ]
            });
        }

        await interaction.followUp({
            embeds: [
                baseEmbed()
                    .setTitle('🎵 تمت الإضافة')
                    .setDescription(`**${track.title}**\nبواسطة **${track.author}** عبر ${sourceLabel}.`)
                    .setFooter({ text: 'جارٍ التشغيل...' })
            ]
        });
    }
} satisfies CommandModule;
