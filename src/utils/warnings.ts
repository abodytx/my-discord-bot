// =====================================================
// نظام التحذيرات (Warnings) عبر طبقة التخزين
// =====================================================

import { getStore } from '../storage';
import type { WarningData } from '../types';

export interface AddWarningInput {
    reason: string;
    moderatorId: string;
    date?: string;
    points?: number;
}

/** جلب تحذيرات عضو */
export async function getWarnings(guildId: string, userId: string): Promise<WarningData[]> {
    return getStore().getWarnings(guildId, userId);
}

/** إضافة تحذير لعضو */
export async function addWarning(guildId: string, userId: string, input: AddWarningInput): Promise<WarningData> {
    const warnings = await getStore().getWarnings(guildId, userId);
    const warning: WarningData = {
        reason: input.reason,
        moderatorId: input.moderatorId,
        date: input.date || new Date().toISOString(),
        points: input.points ?? 1
    };
    warnings.push(warning);
    await getStore().saveWarnings(guildId, userId, warnings);
    return warning;
}

/** إزالة تحذير بالترتيب (index) */
export async function removeWarning(guildId: string, userId: string, index: number): Promise<boolean> {
    const warnings = await getStore().getWarnings(guildId, userId);
    if (index < 0 || index >= warnings.length) return false;
    warnings.splice(index, 1);
    await getStore().saveWarnings(guildId, userId, warnings);
    return true;
}

/** مسح كل تحذيرات عضو */
export async function clearWarnings(guildId: string, userId: string): Promise<number> {
    const warnings = await getStore().getWarnings(guildId, userId);
    await getStore().saveWarnings(guildId, userId, []);
    return warnings.length;
}
