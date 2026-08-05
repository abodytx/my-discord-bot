// =====================================================
// نظام Logging احترافي (winston + Daily Rotate)
// + إرسال الأحداث لقنوات اللوقات داخل ديسكورد
// + حماية الأسرار من التسرب في السجلات
// =====================================================

import * as path from 'path';
import * as fs from 'fs';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { EmbedBuilder, EmbedData, Guild } from 'discord.js';
import { getGuildSettings } from './settings';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ---------------- حماية الأسرار ----------------
const SECRET_PATTERNS: { regex: RegExp; name: string }[] = [
    { regex: /(DISCORD_TOKEN|TOKEN)=([^\s]+)/gi, name: 'TOKEN' },
    { regex: /(mfa\.[A-Za-z0-9_-]{20,})/g, name: 'MFA_TOKEN' },
    { regex: /(ghp_[A-Za-z0-9]{20,})/g, name: 'GITHUB_TOKEN' },
    { regex: /(mongodb(\+srv)?:\/\/[^\s]+)/gi, name: 'DB_URI' }
];

export function sanitize(text: string): string {
    let result = text;
    for (const { regex, name } of SECRET_PATTERNS) {
        result = result.replace(regex, `[${name}_REDACTED]`);
    }
    return result;
}

// ---------------- winston ----------------
const consoleFormat = winston.format.printf(({ level, message, timestamp, source }) => {
    return `${timestamp} [${String(level).toUpperCase()}]${source ? ` (${source})` : ''} ${sanitize(String(message))}`;
});

export const log = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        consoleFormat
    ),
    transports: [
        new winston.transports.Console(),
        new DailyRotateFile({
            dirname: LOG_DIR,
            filename: 'bot-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '10m',
            maxFiles: '14d',
            zippedArchive: true
        }),
        new DailyRotateFile({
            dirname: LOG_DIR,
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '10m',
            maxFiles: '30d',
            zippedArchive: true
        })
    ]
});

// ---------------- الإرسال لقنوات ديسكورد ----------------
async function sendToChannel(guild: Guild | null, channelId: string | null, payload: unknown): Promise<boolean> {
    if (!guild || !channelId) return false;
    try {
        const channel =
            guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
        if (!channel || !('send' in channel)) return false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (channel as any).send(payload);
        return true;
    } catch {
        return false;
    }
}

/** إرسال إلى قناة لوقات الإدارة (mod log) */
export async function modLog(guild: Guild | null, embed: EmbedBuilder | EmbedData): Promise<boolean> {
    if (!guild) return false;
    const settings = await getGuildSettings(guild.id);
    return sendToChannel(guild, settings.modLogChannelId, { embeds: [embed] });
}

/** إرسال إلى قناة لوقات الأعضاء (join/leave) */
export async function memberLog(guild: Guild | null, embed: EmbedBuilder | EmbedData): Promise<boolean> {
    if (!guild) return false;
    const settings = await getGuildSettings(guild.id);
    return sendToChannel(guild, settings.memberLogChannelId, { embeds: [embed] });
}

export { sendToChannel };
