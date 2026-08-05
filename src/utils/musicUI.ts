// =====================================================
// عناصر واجهة الموسيقى: Embeds وأزرار التحكم الموحدة
// =====================================================

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { GuildQueue, Track } from 'discord-player';
import { COLORS } from './embeds';

export function formatTime(ms?: number | null): string {
    if (!ms || Number.isNaN(ms)) return 'مباشر';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function nowPlayingEmbed(queue: GuildQueue, track: Track): EmbedBuilder {
    const progress = queue.node.createProgressBar({ timecodes: true }) || '';
    return new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('🎵 جارٍ التشغيل الآن')
        .setDescription(`**[${track.title}](${track.url || ''})**`)
        .addFields(
            { name: '👤 طلب بواسطة', value: `${track.requestedBy || 'غير معروف'}`, inline: true },
            { name: '⏱️ المدة', value: formatTime(track.durationMS), inline: true },
            { name: '📻 المصدر', value: `${track.source || 'غير معروف'}`, inline: true },
            { name: '🗂️ باقي القائمة', value: `${queue.tracks.size || 0} أغنية`, inline: true }
        )
        .setThumbnail(track.thumbnail || null)
        .addFields({ name: '🎛️ التقدم', value: progress || 'جارٍ المعالجة...' })
        .setTimestamp();
}

export function controlRow(queue: GuildQueue): ActionRowBuilder<ButtonBuilder> {
    const paused = queue.node.isPaused();
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('music_pause_resume')
            .setLabel(paused ? 'استئناف' : 'إيقاف مؤقت')
            .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji(paused ? '▶️' : '⏸️'),
        new ButtonBuilder().setCustomId('music_skip').setLabel('تخطي').setStyle(ButtonStyle.Primary).setEmoji('⏭️'),
        new ButtonBuilder()
            .setCustomId('music_queue')
            .setLabel('القائمة')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📜'),
        new ButtonBuilder().setCustomId('music_stop').setLabel('إيقاف').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
    );
}
