// =====================================================
// Extractory بسيط يبث أي رابط مباشر (http/https) عبر ffmpeg
// يُستخدم مع الروابط التي يولّدها yt-dlp لـ SoundCloud/YouTube
// =====================================================

import { BaseExtractor, Track, QueryType, type ExtractorInfo, type ExtractorSearchContext } from 'discord-player';

export class DirectUrlExtractor extends BaseExtractor {
    static identifier = 'com.bot.direct-url';

    async activate(): Promise<void> {
        this.protocols = ['http', 'https'];
    }

    async validate(query: string): Promise<boolean> {
        return typeof query === 'string' && /^https?:\/\//i.test(query.trim());
    }

    async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
        const track = new Track(this.context.player, {
            title: query,
            url: query,
            author: 'رابط مباشر',
            duration: '0:00',
            queryType: QueryType.AUTO,
            requestedBy: context.requestedBy || null
        });
        return this.createResponse(null, [track]);
    }

    async stream(track: Track): Promise<string> {
        return track.url;
    }
}
