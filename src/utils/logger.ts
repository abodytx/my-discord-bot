// =====================================================
// نظام Logging احترافي (winston + Daily Rotate)
// + إرسال الأحداث لقنوات اللوقات داخل ديسكورد
// + حماية الأسرار من التسرب في السجلات
// =====================================================

import * as path from 'path';
import * as fs from 'fs';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { EmbedBuilder, type EmbedData, type Guild } from 'discord.js';
import { getGuildSettings } from './settings';
import { COLORS } from './embeds';

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

// ---------------- واجهة موحّدة تحل محل console ----------------
function toText(value: unknown): string {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/** واجهة تسجيل موحّدة (بديل console.log/error/warn) */
export const logger = {
    info: (...args: unknown[]) => log.info(args.map(toText).join(' ')),
    warn: (...args: unknown[]) => log.warn(args.map(toText).join(' ')),
    error: (...args: unknown[]) => log.error(args.map(toText).join(' ')),
    debug: (...args: unknown[]) => log.debug(args.map(toText).join(' ')),
    child: (meta: Record<string, unknown>) => log.child(meta)
};

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

/** إرسال إلى قناة لوقات التذاكر (ticket log) مع تراجع لقناة لوقات الإدارة */
export async function ticketLog(guild: Guild | null, embed: EmbedBuilder | EmbedData): Promise<boolean> {
    if (!guild) return false;
    const settings = await getGuildSettings(guild.id);
    const channelId = settings.ticketLogChannelId || settings.modLogChannelId;
    return sendToChannel(guild, channelId, { embeds: [embed] });
}

// ---------------- لوقات الإجراءات الإدارية ----------------

export type ModActionKind =
    'ban' | 'kick' | 'unban' | 'warn' | 'unwarn' | 'timeout' | 'lock' | 'unlock' | 'slowmode' | 'clear';

const MOD_ACTION_META: Record<ModActionKind, { emoji: string; title: string; color: number }> = {
    ban: { emoji: '🚫', title: 'تم حظر عضو', color: COLORS.ERROR },
    kick: { emoji: '👢', title: 'تم طرد عضو', color: COLORS.WARNING },
    unban: { emoji: '🔓', title: 'تم فك الحظر', color: COLORS.SUCCESS },
    warn: { emoji: '⚠️', title: 'تحذير عضو', color: COLORS.WARNING },
    unwarn: { emoji: '✅', title: 'إزالة تحذير', color: COLORS.SUCCESS },
    timeout: { emoji: '🔇', title: 'كتم مؤقت لعضو', color: COLORS.WARNING },
    lock: { emoji: '🔒', title: 'تم قفل القناة', color: COLORS.ERROR },
    unlock: { emoji: '🔓', title: 'تم فتح القناة', color: COLORS.SUCCESS },
    slowmode: { emoji: '🐢', title: 'تغيير الوضع البطيء', color: COLORS.INFO },
    clear: { emoji: '🧹', title: 'حذف رسائل', color: COLORS.INFO }
};

export interface ModActionLogOptions {
    target?: string;
    reason?: string;
    detail?: string;
    moderator: string;
}

/** إرسال لوق إجراء إداري (حظر/طرد/تحذير/كتم/قفل...) إلى قناة لوقات الإدارة */
export async function modActionLog(
    guild: Guild | null,
    kind: ModActionKind,
    opts: ModActionLogOptions
): Promise<boolean> {
    if (!guild) return false;
    const meta = MOD_ACTION_META[kind];
    const lines: string[] = [];
    if (opts.target) lines.push(`**العضو:** ${opts.target}`);
    if (opts.reason) lines.push(`**السبب:** ${opts.reason}`);
    if (opts.detail) lines.push(opts.detail);
    lines.push(`**بواسطة:** ${opts.moderator}`);
    const embed = new EmbedBuilder()
        .setColor(meta.color)
        .setTitle(`${meta.emoji} ${meta.title}`)
        .setDescription(lines.join('\n'))
        .setTimestamp();
    return modLog(guild, embed);
}

export { sendToChannel };
