// =====================================================
// وحدة نسخ التذاكر (Ticket Transcript)
// - جلب رسائل قناة التذكرة وبناء ملف نصي محفوظ
// - إرسال النسخة إلى العضو عبر رسالة خاصة
// =====================================================

import * as fs from 'fs';
import * as path from 'path';
import type { TextChannel } from 'discord.js';
import { logger } from '../utils/logger';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TRANSCRIPT_DIR = path.join(DATA_DIR, 'transcripts');

function ensureDir(): void {
    if (!fs.existsSync(TRANSCRIPT_DIR)) fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}

export interface TicketTranscript {
    path: string;
    messageCount: number;
}

/**
 * توليد نسخة نصية من التذكرة وحفظها في data/transcripts
 * @param channel قناة التذكرة
 * @returns مسار الملف وعدد الرسائل
 */
export async function buildTicketTranscript(channel: TextChannel): Promise<TicketTranscript> {
    ensureDir();

    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    const list = messages ? [...messages.values()].reverse() : [];

    const lines = [
        `Transcript for ticket: ${channel.name}`,
        `Server: ${channel.guild?.name || 'unknown'}`,
        `Channel ID: ${channel.id}`,
        `Generated: ${new Date().toISOString()}`,
        '='.repeat(60),
        ''
    ];

    for (const msg of list) {
        const time = msg.createdAt.toLocaleString('ar-EG');
        const author = msg.author?.tag || 'unknown';
        const content =
            msg.content ||
            (msg.attachments.size ? `[Attachment: ${[...msg.attachments.values()][0].name}]` : '[Embed]');
        lines.push(`[${time}] ${author}: ${content}`);
    }

    const fileName = `${channel.name}-${Date.now()}.txt`;
    const filePath = path.join(TRANSCRIPT_DIR, fileName);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    logger.info(`تم توليد نسخة التذكرة: ${filePath} (${list.length} رسالة)`);

    return { path: filePath, messageCount: list.length };
}
