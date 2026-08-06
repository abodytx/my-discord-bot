// =====================================================
// نظام Middleware لأوامر البوت — طبقة وسيطة مركزية
// تدير: صلاحيات المالك/المدير، نظام الـ Cooldown الموحد،
// والـ middlewares المخصصة لكل أمر قبل تنفيذه.
// =====================================================

import { PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import type { CommandModule, ExtendedClient } from '../types';
import { errorEmbed } from './embeds';
import { logger } from './logger';

export interface MiddlewareContext {
    interaction: ChatInputCommandInteraction;
    client: ExtendedClient;
}

/** توقيع دالة Middleware — إرجاع false يوقف التنفيذ */
export type Middleware = (ctx: MiddlewareContext) => Promise<boolean | void> | boolean | void;

/** هل المستخدم مالك البوت؟ */
export function isBotOwner(userId: string): boolean {
    const ownerId = process.env.OWNER_ID;
    return !!ownerId && userId === ownerId;
}

/**
 * تنفيذ كل طبقات الـ middleware قبل تشغيل الأمر.
 * تُرجع true إذا كان التنفيذ مسموحاً به، false إذا مُنع مع رد توضيحي.
 */
export async function runCommandMiddleware(
    command: CommandModule,
    interaction: ChatInputCommandInteraction,
    client: ExtendedClient
): Promise<boolean> {
    // ---------- المالك فقط ----------
    if (command.ownerOnly) {
        if (!isBotOwner(interaction.user.id)) {
            await interaction.reply({
                embeds: [errorEmbed('غير مسموح', 'هذا الأمر مخصص لمالك البوت فقط.')],
                ephemeral: true
            });
            return false;
        }
    }

    // ---------- المدير فقط ----------
    if (command.adminOnly) {
        const hasAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
        if (!hasAdmin) {
            await interaction.reply({
                embeds: [errorEmbed('غير مسموح', 'هذا الأمر يتطلب صلاحية "مدير السيرفر".')],
                ephemeral: true
            });
            return false;
        }
    }

    // ---------- نظام الـ Cooldown الموحد ----------
    const cooldownSec = command.cooldown ?? 3;
    const cooldownKey = `${interaction.user.id}-${interaction.commandName}`;
    const now = Date.now();
    const last = client.cooldowns.get(cooldownKey) ?? 0;
    if (last && now - last < cooldownSec * 1000) {
        const remaining = Math.ceil((cooldownSec * 1000 - (now - last)) / 1000);
        await interaction.reply({
            embeds: [errorEmbed('تمهل قليلاً', `انتظر **${remaining}** ثانية قبل استخدام هذا الأمر مرة أخرى.`)],
            ephemeral: true
        });
        return false;
    }
    client.cooldowns.set(cooldownKey, now);

    // ---------- الـ middlewares المخصصة لكل أمر ----------
    if (Array.isArray(command.middlewares)) {
        for (const middleware of command.middlewares) {
            try {
                const result = await middleware({ interaction, client });
                if (result === false) return false;
            } catch (err) {
                logger.error(`Middleware فشل في الأمر ${interaction.commandName}:`, err);
                await interaction.reply({
                    embeds: [errorEmbed('حدث خطأ', 'حدث خطأ غير متوقع أثناء التحقق من صلاحيات هذا الأمر.')],
                    ephemeral: true
                });
                return false;
            }
        }
    }

    return true;
}
