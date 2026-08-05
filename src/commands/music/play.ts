// =====================================================
// أمر /play - تشغيل أغنية في الروم الصوتي
// =====================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import type { SearchResult } from 'discord-player';
import type { CommandModule, ExtendedClient } from '../../types';
import { errorEmbed, baseEmbed, infoEmbed } from '../../utils/embeds';
import { searchMusic, hasYouTubeCookie, YOUTUBE_NEEDS_COOKIE } from '../../utils/musicSearch';

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

        try {
            let searchResult: SearchResult;
            try {
                searchResult = (await searchMusic(client.player!, query, {
                    requestedBy: interaction.user
                })) as SearchResult;
            } catch (err) {
                const e = err as Error & { code?: string };
                if (e.code === YOUTUBE_NEEDS_COOKIE) {
                    return interaction.followUp({
                        embeds: [
                            infoEmbed(
                                '⚠️ يوتيوب محجوب حالياً',
                                `يوتيوب يمنع البث بدون تسجيل دخول.\nاستخدم **اسم الأغنية** أو **رابط SoundCloud**، أو أضف كوكيز يوتيوب في ملف .env (انظر README).`
                            )
                        ]
                    });
                }
                throw e;
            }

            if (!searchResult.hasTracks()) {
                return interaction.followUp({
                    embeds: [errorEmbed('لا توجد نتائج', `لم يتم العثور على أي نتائج لـ "${query}".`)]
                });
            }

            const sourceLabel = searchResult.tracks[0]?.source === 'youtube' ? 'يوتيوب' : 'SoundCloud';
            if (!hasYouTubeCookie()) {
                await interaction.followUp({
                    embeds: [
                        infoEmbed(
                            '🎧 تم التشغيل عبر SoundCloud',
                            `يوتيوب محجوب بدون كوكيز، تم البحث على **SoundCloud** بدلاً منه.\nللحصول على يوتيوب أضف \`YOUTUBE_COOKIE\` في ملف \`.env\`.`
                        )
                    ]
                });
            }

            await client.player!.play(voiceChannel, searchResult, {
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
                    embeds: [
                        baseEmbed()
                            .setTitle('🎵 تمت الإضافة')
                            .setDescription(
                                `تمت إضافة **${searchResult.tracks.length}** مقطع إلى القائمة عبر ${sourceLabel}.`
                            )
                            .setFooter({ text: 'جارٍ التشغيل...' })
                    ]
                });
            }
        } catch (err) {
            const e = err as Error;
            console.error('Play error:', err);
            await interaction.followUp({
                embeds: [errorEmbed('تعذر التشغيل', `حدث خطأ: ${e.message}`)]
            });
        }
    }
} satisfies CommandModule;
