// =====================================================
// مساعد بحث الموسيقى مع فال باك تلقائي
// - إذا كانت الكوكيز غير مضبوطة، يستخدم SoundCloud بدلاً من YouTube
//   لأن يوتيوب يمنع البث المجهول مؤخراً
// =====================================================

import { Player, QueryType } from 'discord-player';

const YT_URL = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i;

export const YOUTUBE_NEEDS_COOKIE = 'youtube_needs_cookie';

export function hasYouTubeCookie(): boolean {
    return Boolean(process.env.YOUTUBE_COOKIE && process.env.YOUTUBE_COOKIE.trim());
}

type SearchOptions = NonNullable<Parameters<Player['search']>[1]>;

/**
 * يبحث عن مقطع موسيقي مع إعادة التوجيه تلقائياً إلى SoundCloud
 * عند غياب كوكيز يوتيوب.
 */
export async function searchMusic(player: Player, query: string, options: SearchOptions = {}): Promise<unknown> {
    const trimmed = String(query || '').trim();
    if (!trimmed) throw new Error('بحث فارغ');

    // لو الكوكيز موجودة: سلوك عادي (بحث ذكي على يوتيوب)
    if (hasYouTubeCookie()) {
        return player.search(trimmed, options);
    }

    // بلا كوكيز:
    // - رابط يوتيوب مباشر لا يمكن تشغيله (يحتاج تسجيل دخول) → نعيد رسالة واضحة
    if (YT_URL.test(trimmed)) {
        const err = new Error('youtube_needs_cookie');
        (err as Error & { code: string }).code = YOUTUBE_NEEDS_COOKIE;
        throw err;
    }

    // - رابط SoundCloud أو اسم أغنية → نبحث على SoundCloud مباشرة
    const isUrl = /^https?:\/\//i.test(trimmed);
    return player.search(trimmed, {
        ...options,
        searchEngine: isUrl ? undefined : QueryType.SOUNDCLOUD_SEARCH
    });
}

export { YT_URL };
