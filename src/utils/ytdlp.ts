// =====================================================
// محرك الموسيقى عبر yt-dlp (الأداة القياسية لسحب البث)
// - يدعم SoundCloud (scsearch) وYouTube (ytsearch) وروابط مباشرة
// - يستخدم الكوكيز (إن وُجدت) لتحسين يوتيوب
// =====================================================

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { constants } = require('youtube-dl-exec') as { constants: { YOUTUBE_DL_PATH: string } };
import { logger } from './logger';
import { sanitize } from './logger';

export interface YtDlpTrack {
    title: string;
    url: string;
    durationMs: number;
    thumbnail: string | null;
    author: string;
    source: string;
}

const RUN_TIMEOUT = 45_000;

function runYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        let out = '';
        let err = '';
        const proc = spawn(constants.YOUTUBE_DL_PATH, args, { shell: false });
        const timer = setTimeout(() => {
            proc.kill('SIGKILL');
            reject(new Error('yt-dlp استغرق أكثر من 45 ثانية — تم الإلغاء'));
        }, RUN_TIMEOUT);
        proc.stdout.on('data', (d) => (out += d));
        proc.stderr.on('data', (d) => (err += d));
        proc.on('error', (e) => {
            clearTimeout(timer);
            reject(e);
        });
        proc.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) resolve(out);
            else reject(new Error(err.trim() || `yt-dlp خرج برمز ${code}`));
        });
    });
}

/**
 * يكتب ملف كوكيز بصيغة Netscape من متغير YOUTUBE_COOKIE.
 * يعيد null إذا لم توجد كوكيز.
 */
function buildCookieFile(): string | null {
    const raw = String(process.env.YOUTUBE_COOKIE || '').trim();
    if (!raw) return null;
    const pairs = raw
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
            const i = s.indexOf('=');
            return { name: s.slice(0, i).trim(), value: s.slice(i + 1).trim() };
        })
        .filter((c) => c.name && c.value);
    if (!pairs.length) return null;

    const expiry = String(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30);
    const lines = ['# Netscape HTTP Cookie File'];
    for (const { name, value } of pairs) {
        lines.push(`.youtube.com\tTRUE\t/\tTRUE\t${expiry}\t${name}\t${value}`);
    }
    const file = path.join(os.tmpdir(), `yt-cookie-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    return file;
}

function parseTrack(j: Record<string, unknown>, source: string): YtDlpTrack | null {
    const url = j?.url;
    const title = j?.title;
    if (typeof url !== 'string' || !url || typeof title !== 'string' || !title) return null;
    const dur = Number(j?.duration || 0);
    return {
        title,
        url,
        durationMs: Math.round(dur) * 1000,
        thumbnail: typeof j?.thumbnail === 'string' ? j.thumbnail : null,
        author: typeof j?.uploader === 'string' ? j.uploader : 'غير معروف',
        source
    };
}

function firstJsonLine(out: string): string | null {
    return out.split('\n').find((l) => l.trim().startsWith('{')) || null;
}

/**
 * يحول المدة بالمللي ثانية إلى صيغة نصية (MM:SS أو H:MM:SS).
 */
export function formatDurationMs(ms: number): string {
    const total = Math.max(0, Math.floor((ms || 0) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    return h > 0 ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`;
}

/**
 * بحث باسم أغنية على المصدر المطلوب.
 */
export async function ytDlpSearch(query: string, source: 'soundcloud' | 'youtube'): Promise<YtDlpTrack | null> {
    const prefix = source === 'soundcloud' ? 'scsearch1:' : 'ytsearch1:';
    const raw = String(query || '').trim();
    if (!raw) return null;
    let cookieFile: string | null = null;
    try {
        const args: string[] = ['-j', '--no-playlist', '--no-warnings', '--force-ipv4', '--socket-timeout', '20'];
        cookieFile = buildCookieFile();
        if (cookieFile) args.push('--cookies', cookieFile);
        args.push(prefix + raw);
        const out = await runYtDlp(args);
        const line = firstJsonLine(out);
        if (!line) return null;
        return parseTrack(JSON.parse(line), source);
    } catch (e) {
        logger.warn(`yt-dlp بحث (${source}) فشل: ${sanitize((e as Error).message)}`);
        return null;
    } finally {
        if (cookieFile) fs.rmSync(cookieFile, { force: true });
    }
}

/**
 * حل رابط مباشر (يوتيوب/ساوند كلاود) إلى رابط بث.
 */
export async function ytDlpResolve(input: string): Promise<YtDlpTrack | null> {
    const raw = String(input || '').trim();
    if (!raw) return null;
    let cookieFile: string | null = null;
    try {
        const args: string[] = ['-j', '--no-playlist', '--no-warnings', '--force-ipv4', '--socket-timeout', '20'];
        cookieFile = buildCookieFile();
        if (cookieFile) args.push('--cookies', cookieFile);
        args.push(raw);
        const out = await runYtDlp(args);
        const line = firstJsonLine(out);
        if (!line) return null;
        const j = JSON.parse(line) as Record<string, unknown>;
        return parseTrack(j, String(j?.extractor || 'url'));
    } catch (e) {
        logger.warn(`yt-dlp حل الرابط فشل: ${sanitize((e as Error).message)}`);
        return null;
    } finally {
        if (cookieFile) fs.rmSync(cookieFile, { force: true });
    }
}
