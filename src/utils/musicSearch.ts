// =====================================================
// مساعدات البحث الموسيقي
// يوتيوب محجوب غالباً من يوتيوب نفسه، لذا البحث يتم عبر yt-dlp
// مع الفال باك التلقائي إلى SoundCloud.
// =====================================================

export const YOUTUBE_NEEDS_COOKIE = 'youtube_needs_cookie';

/**
 * هل توجد كوكيز يوتيوب مضبوطة في المتغيرات؟
 */
export function hasYouTubeCookie(): boolean {
    return Boolean(process.env.YOUTUBE_COOKIE && process.env.YOUTUBE_COOKIE.trim());
}

const YT_URL = /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i;

/**
 * هل الرابط يوتيوب؟
 */
export function isYouTubeUrl(query: string): boolean {
    return YT_URL.test(String(query || '').trim());
}
