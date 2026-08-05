// =====================================================
// واجهة طبقة التخزين (DataStore)
// - تنفيذان: JSON (توافق مع البيانات القديمة) + MongoDB (إنتاجي)
// - الاختيار يتم عبر متغير DB_URI في ملف .env
// =====================================================

import type { EconomyRow, GuildSettings, LevelRow, WarningData } from '../types';

export interface DataStore {
    readonly kind: 'json' | 'mongo';

    // ==================== إعدادات السيرفر ====================
    getGuildSettings(guildId: string): Promise<GuildSettings>;
    saveGuildSettings(guildId: string, settings: GuildSettings): Promise<void>;
    removeGuildSettings(guildId: string): Promise<void>;

    // ==================== المستويات (XP) ====================
    getXp(guildId: string, userId: string): Promise<number>;
    saveXp(guildId: string, userId: string, xp: number): Promise<void>;
    getAllLevels(guildId: string): Promise<LevelRow[]>;

    // ==================== التحذيرات ====================
    getWarnings(guildId: string, userId: string): Promise<WarningData[]>;
    saveWarnings(guildId: string, userId: string, warnings: WarningData[]): Promise<void>;

    // ==================== الاقتصاد ====================
    getEconomy(guildId: string, userId: string): Promise<EconomyRow | null>;
    saveEconomy(guildId: string, userId: string, data: EconomyRow): Promise<void>;
    getAllEconomy(guildId: string): Promise<EconomyRow[]>;
}
