// =====================================================
// نظام المستويات (XP / Levels) عبر طبقة التخزين
// الصيغة: level = floor(sqrt(totalXp / 50))
// =====================================================

import { getStore } from '../storage';
import type { LevelInfo, LevelRow } from '../types';

/** حساب المستوى من إجمالي النقاط */
export function levelFromXp(xp: number): number {
    return Math.floor(Math.sqrt(xp / 50));
}

/** إجمالي النقاط المطلوبة للوصول لمستوى معين */
export function xpToReachLevel(level: number): number {
    return 50 * level * level;
}

/** جلب معلومات المستوى الكاملة لعضو */
export async function getLevelInfo(guildId: string, userId: string): Promise<LevelInfo> {
    const totalXp = await getStore().getXp(guildId, userId);
    const level = levelFromXp(totalXp);
    const currentLevelXp = xpToReachLevel(level);
    const xpInLevel = totalXp - currentLevelXp;
    const xpForNextLevel = 100 * level + 50;
    return {
        totalXp,
        level,
        xpInLevel,
        xpForNextLevel,
        progress: Math.min(1, xpInLevel / Math.max(1, xpForNextLevel))
    };
}

/** إضافة نقاط خبرة لعضو وإرجاع حالة الترقي */
export async function addXp(
    guildId: string,
    userId: string,
    amount: number
): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number }> {
    const oldXp = await getStore().getXp(guildId, userId);
    const newXp = oldXp + amount;
    await getStore().saveXp(guildId, userId, newXp);
    const oldLevel = levelFromXp(oldXp);
    const newLevel = levelFromXp(newXp);
    return { leveledUp: newLevel > oldLevel, oldLevel, newLevel };
}

/** لوحة الصدارة */
export async function getLeaderboard(guildId: string, limit = 10): Promise<LevelRow[]> {
    const rows = await getStore().getAllLevels(guildId);
    return rows
        .map((r) => ({ userId: r.userId, totalXp: r.totalXp, level: levelFromXp(r.totalXp) }))
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, limit);
}
