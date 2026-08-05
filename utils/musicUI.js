// =====================================================
// عناصر واجهة الموسيقى: Embeds وأزرار التحكم الموحدة
// =====================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('./embeds');

function formatTime(ms) {
    if (!ms || isNaN(ms)) return 'مباشر';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function nowPlayingEmbed(queue, track) {
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

function controlRow(queue) {
    const paused = queue.node.isPaused();
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_pause_resume')
            .setLabel(paused ? 'استئناف' : 'إيقاف مؤقت')
            .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setEmoji(paused ? '▶️' : '⏸️'),
        new ButtonBuilder()
            .setCustomId('music_skip')
            .setLabel('تخطي')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⏭️'),
        new ButtonBuilder()
            .setCustomId('music_queue')
            .setLabel('القائمة')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📜'),
        new ButtonBuilder()
            .setCustomId('music_stop')
            .setLabel('إيقاف')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⏹️')
    );
}

module.exports = { formatTime, nowPlayingEmbed, controlRow };
