// =====================================================
// وحدة AutoMod المتقدمة — نظام حماية شامل للرسائل
// - فلترة الكلمات الممنوعة (badWords)
// - فلترة الحروف الكبيرة (capsLimit)
// - الحد من الإشارات (mentionLimit)
// - الحد من الإيموجي (emojiLimit)
// - الإجراءات التلقائية عند تراكم التحذيرات (warnActions)
// =====================================================

import { PermissionFlagsBits, EmbedBuilder, type Message, type GuildTextBasedChannel } from 'discord.js';
import type { ExtendedClient, GuildSettings } from '../types';
import { getWarnings } from '../utils/warnings';
import { addWarning } from '../utils/warnings';
import { logger, modLog } from '../utils/logger';
import { errorEmbed, COLORS } from '../utils/embeds';
import { getLocale, t } from '../i18n';

interface AutoModResult {
    action: 'delete' | 'warn' | 'timeout' | 'kick' | 'ban';
    reason: string;
}

/** حساب نسبة الحروف الكبيرة في النص */
function capsRatio(text: string): number {
    const letters = [...text].filter((ch) => /[a-zA-Z]/.test(ch));
    if (letters.length === 0) return 0;
    const upper = letters.filter((ch) => ch === ch.toUpperCase()).length;
    return upper / letters.length;
}

/** إرسال رد تحذيري يُحذف تلقائياً بعد 5 ثوانٍ */
async function sendAutoModNotice(message: Message, content: string): Promise<void> {
    try {
        const notice = await (message.channel as GuildTextBasedChannel).send({
            content: `${message.author}`,
            embeds: [errorEmbed('🛡️ AutoMod', content)]
        });
        setTimeout(() => notice.delete().catch(() => {}), 5000);
    } catch {
        /* تجاهل أخطاء الإرسال */
    }
}

/**
 * تنفيذ فحص AutoMod على رسالة.
 * تُرجع نتيجة الإجراء إن وُجدت، أو null إذا كانت الرسالة سليمة.
 */
export async function checkAutoMod(
    message: Message,
    settings: Partial<GuildSettings>,
    _client: ExtendedClient
): Promise<AutoModResult | null> {
    if (message.author.bot || !message.guild) return null;
    const member = message.member;
    if (!member) return null;
    // أعضاء الإدارة معفيون من أنظمة AutoMod
    if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return null;

    const locale = await getLocale(message.guild.id);
    const text = message.content;
    const result: AutoModResult = { action: 'delete', reason: '' };

    // ---------- الكلمات الممنوعة ----------
    if (settings.badWordsEnabled && Array.isArray(settings.badWords) && settings.badWords.length > 0) {
        const lower = text.toLowerCase();
        const hit = settings.badWords.find((word) => word && lower.includes(word.toLowerCase()));
        if (hit) {
            result.reason = t(locale, 'autoModReasonBadWord', { word: hit });
            return applyAutoMod(message, settings, result);
        }
    }

    // ---------- الحروف الكبيرة المفرطة ----------
    const capsLimit = settings.capsLimit || 0;
    if (capsLimit > 0 && text.length >= 10 && capsRatio(text) > 0.7) {
        result.reason = t(locale, 'autoModReasonCaps', { percent: Math.round(capsRatio(text) * 100) });
        return applyAutoMod(message, settings, result);
    }

    // ---------- الإشارات (Mentions) ----------
    const mentionLimit = settings.mentionLimit || 0;
    if (mentionLimit > 0 && message.mentions.users.size > mentionLimit) {
        result.reason = t(locale, 'autoModReasonMentions', { limit: mentionLimit });
        return applyAutoMod(message, settings, result);
    }

    // ---------- الإيموجي المفرط ----------
    const emojiLimit = settings.emojiLimit || 0;
    if (emojiLimit > 0) {
        const emojiCount = (text.match(/<a?:\w+:\d+>|[\u{1F300}-\u{1FAFF}]/gu) || []).length;
        if (emojiCount > emojiLimit) {
            result.reason = t(locale, 'autoModReasonEmojis', { limit: emojiLimit });
            return applyAutoMod(message, settings, result);
        }
    }

    return null;
}

/**
 * تطبيق نتيجة AutoMod: حذف الرسالة، ثم تسجيل تحذير،
 * ثم تطبيق الإجراءات التلقائية حسب تراكم النقاط (warnActions).
 */
async function applyAutoMod(
    message: Message,
    settings: Partial<GuildSettings>,
    result: AutoModResult
): Promise<AutoModResult> {
    if (message.deletable) {
        await message.delete().catch(() => {});
    }

    const locale = await getLocale(message.guildId!).catch(() => 'ar' as const);

    // تسجيل تحذير تلقائي من البوت
    const member = message.member;
    if (member) {
        try {
            await addWarning(message.guildId!, member.id, {
                reason: `[AutoMod] ${result.reason}`,
                moderatorId: message.client.user?.id || 'automod'
            });
        } catch (err) {
            logger.error('خطأ في تسجيل تحذير AutoMod:', err);
        }
    }

    await sendAutoModNotice(message, t(locale, 'autoModFlagged') + `\n*${result.reason}*`);

    // لوق المخالفة في قناة لوقات الإدارة
    try {
        const modEmbed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('🛡️ AutoMod')
            .setDescription(
                `${message.author} — ${result.reason}\n**القناة:** ${message.channel}\n**الإجراء:** ${result.action}`
            )
            .setTimestamp();
        await modLog(message.guild, modEmbed);
    } catch {
        /* تجاهل أخطاء اللوق */
    }

    // ---------- الإجراءات التلقائية (warnActions) ----------
    if (Array.isArray(settings.warnActions) && settings.warnActions.length > 0 && member) {
        try {
            const warnings = await getWarnings(message.guildId!, member.id);
            const totalPoints = warnings.reduce((sum, w) => sum + (w.points || 1), 0);

            // اختيار أعلى إجراء لم يتجاوز المجموع الحالي للنقاط
            const action = [...settings.warnActions]
                .sort((a, b) => a.points - b.points)
                .filter((a) => totalPoints >= a.points)
                .pop();

            if (action) {
                result.action = action.action;
                if (action.action === 'timeout' && member.moderatable) {
                    const ms = (action.durationMin || 60) * 60 * 1000;
                    await member.timeout(ms, `AutoMod: ${result.reason}`).catch(() => {});
                } else if (action.action === 'kick' && member.kickable) {
                    await member.kick(`AutoMod: ${result.reason}`).catch(() => {});
                } else if (action.action === 'ban' && member.bannable) {
                    await member.ban({ reason: `AutoMod: ${result.reason}` }).catch(() => {});
                }
            }
        } catch (err) {
            logger.error('خطأ في تطبيق warnActions:', err);
        }
    }

    return result;
}
