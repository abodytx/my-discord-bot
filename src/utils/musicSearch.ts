// =====================================================
// مساعد بحث الموسيقى مع فال باك تلقائي
// - إذا كانت الكوكيز غير مضبوطة/مرفوضة، يستخدم SoundCloud بدلاً من YouTube
//   لأن يوتيوب يمنع البث المجهول مؤخراً
// =====================================================

import { Player, QueryType } from 'discord-player';
import { Innertube } from 'youtubei.js';

const YT_URL = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i;

export const YOUTUBE_NEEDS_COOKIE = 'youtube_needs_cookie';

// بعد التحقق من الكوكيز عند الإقلاع: null = لم يُفحص بعد، true/false = النتيجة.
// يوتيوب يحجب البث حتى مع كوكيز صالحة أحياناً، لذا الفحص يدل على أن الحساب معرّف فعلاً.
let _youtubeCookieValid: boolean | null = null;

export function setYouTubeCookieValid(valid: boolean): void {
    _youtubeCookieValid = valid;
}

/**
 * هل لدينا كوكيز يوتيوب صالحة (تم التحقق منها عند الإقلاع)؟
 * إذا لم يُفحص بعد نتعامل مع وجود الكوكيز كافتراضية أصلية (تفاؤلية).
 */
export function hasYouTubeCookie(): boolean {
    if (_youtubeCookieValid === false) return false;
    return Boolean(process.env.YOUTUBE_COOKIE && process.env.YOUTUBE_COOKIE.trim());
}

/**
 * يتحقق فعلياً من صلاحية الكوكيز عبر محاولة جلب بيانات الحساب من يوتيوب.
 * يعيد true فقط إذا نجح يوتيوب في التعرف على الحساب.
 */
export async function validateYouTubeCookie(): Promise<boolean> {
    const raw = String(process.env.YOUTUBE_COOKIE || '').trim();
    if (!raw) return false;
    try {
        const tube = await Innertube.create({ cookie: raw, retrieve_player: false });
        await tube.account.getInfo();
        return true;
    } catch {
        return false;
    }
}

type SearchOptions = NonNullable<Parameters<Player['search']>[1]>;

/**
 * يبحث عن مقطع موسيقي مع إعادة التوجيه تلقائياً إلى SoundCloud
 * عند غياب كوكيز يوتيوب.
 */
export function isYouTubeUrl(query: string): boolean {
    return YT_URL.test(String(query || '').trim());
}

/**
 * يبحث على SoundCloud مباشرة (اسم أغنية أو رابط).
 */
export async function searchSoundCloud(player: Player, query: string, options: SearchOptions = {}): Promise<unknown> {
    const trimmed = String(query || '').trim();
    if (!trimmed) throw new Error('بحث فارغ');

    const isUrl = /^https?:\/\//i.test(trimmed);
    return player.search(trimmed, {
        ...options,
        searchEngine: isUrl ? undefined : QueryType.SOUNDCLOUD_SEARCH
    });
}

export async function searchMusic(player: Player, query: string, options: SearchOptions = {}): Promise<unknown> {
    const trimmed = String(query || '').trim();
    if (!trimmed) throw new Error('بحث فارغ');

    // لو الكوكيز موجودة: سلوك عادي (بحث ذكي على يوتيوب)
    if (hasYouTubeCookie()) {
        return player.search(trimmed, options);
    }

    // بلا كوكيز:
    // - رابط يوتيوب مباشر لا يمكن تشغيله (يحتاج تسجيل دخول) → نعيد رسالة واضحة
    if (isYouTubeUrl(trimmed)) {
        const err = new Error('youtube_needs_cookie');
        (err as Error & { code: string }).code = YOUTUBE_NEEDS_COOKIE;
        throw err;
    }

    // - رابط SoundCloud أو اسم أغنية → نبحث على SoundCloud مباشرة
    return searchSoundCloud(player, trimmed, options);
}

export { YT_URL };
