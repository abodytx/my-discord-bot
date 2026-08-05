// =====================================================
// مساعد بحث الموسيقى مع فال باك تلقائي
// - إذا كانت الكوكيز غير مضبوطة، يستخدم SoundCloud بدلاً من YouTube
//   لأن يوتيوب يمنع البث المجهول مؤخراً
// =====================================================

const { QueryType } = require('discord-player');

const YT_URL = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i;

function hasYouTubeCookie() {
    return Boolean(process.env.YOUTUBE_COOKIE && process.env.YOUTUBE_COOKIE.trim());
}

/**
 * يبحث عن مقطع موسيقي مع إعادة التوجيه تلقائياً إلى SoundCloud
 * عند غياب كوكيز يوتيوب.
 * @param {import('discord-player').Player} player
 * @param {string} query
 * @param {object} options
 */
async function searchMusic(player, query, options = {}) {
    const trimmed = String(query || '').trim();
    if (!trimmed) throw new Error('بحث فارغ');

    // لو الكوكيز موجودة: سلوك عادي (بحث ذكي على يوتيوب)
    if (hasYouTubeCookie()) {
        return player.search(trimmed, options);
    }

    // بلا كوكيز:
    // - رابط يوتيوب مباشر لا يمكن تشغيله (يحتاج تسجيل دخول) → نعيد رسالة واضحة
    if (YT_URL.test(trimmed)) {
        const e = new Error('youtube_needs_cookie');
        e.code = 'YOUTUBE_NEEDS_COOKIE';
        throw e;
    }

    // - رابط SoundCloud أو اسم أغنية → نبحث على SoundCloud مباشرة
    const isUrl = /^https?:\/\//i.test(trimmed);
    return player.search(trimmed, {
        ...options,
        searchEngine: isUrl ? undefined : QueryType.SOUNDCLOUD_SEARCH
    });
}

module.exports = { searchMusic, hasYouTubeCookie, YT_URL };
