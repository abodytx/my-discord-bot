// =====================================================
// طبقة التخزين المؤقت (Caching) فوق أي DataStore
// تقلّل استعلامات قاعدة البيانات المتكررة بشكل كبير
// =====================================================

import NodeCache from 'node-cache';
import type { DataStore } from './types';
import type { EconomyRow, GuildSettings, LevelRow, WarningData } from '../types';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const key = {
    settings: (g: string) => `settings:${g}`,
    xp: (g: string, u: string) => `xp:${g}:${u}`,
    warnings: (g: string, u: string) => `warnings:${g}:${u}`,
    economy: (g: string, u: string) => `economy:${g}:${u}`
};

export function withCache(store: DataStore): DataStore {
    return {
        kind: store.kind,

        // ==================== الإعدادات ====================
        async getGuildSettings(guildId: string): Promise<GuildSettings> {
            const k = key.settings(guildId);
            const hit = cache.get<GuildSettings>(k);
            if (hit) return hit;
            const value = await store.getGuildSettings(guildId);
            cache.set(k, value);
            return value;
        },

        async saveGuildSettings(guildId: string, settings: GuildSettings): Promise<void> {
            await store.saveGuildSettings(guildId, settings);
            cache.set(key.settings(guildId), settings);
        },

        async removeGuildSettings(guildId: string): Promise<void> {
            await store.removeGuildSettings(guildId);
            cache.del(key.settings(guildId));
        },

        // ==================== المستويات ====================
        async getXp(guildId: string, userId: string): Promise<number> {
            const k = key.xp(guildId, userId);
            const hit = cache.get<number>(k);
            if (hit !== undefined) return hit;
            const value = await store.getXp(guildId, userId);
            cache.set(k, value);
            return value;
        },

        async saveXp(guildId: string, userId: string, xp: number): Promise<void> {
            await store.saveXp(guildId, userId, xp);
            cache.set(key.xp(guildId, userId), xp);
        },

        async getAllLevels(guildId: string): Promise<LevelRow[]> {
            return store.getAllLevels(guildId);
        },

        // ==================== التحذيرات ====================
        async getWarnings(guildId: string, userId: string): Promise<WarningData[]> {
            const k = key.warnings(guildId, userId);
            const hit = cache.get<WarningData[]>(k);
            if (hit) return hit;
            const value = await store.getWarnings(guildId, userId);
            cache.set(k, value);
            return value;
        },

        async saveWarnings(guildId: string, userId: string, warnings: WarningData[]): Promise<void> {
            await store.saveWarnings(guildId, userId, warnings);
            cache.set(key.warnings(guildId, userId), warnings);
        },

        // ==================== الاقتصاد ====================
        async getEconomy(guildId: string, userId: string): Promise<EconomyRow | null> {
            const k = key.economy(guildId, userId);
            const hit = cache.get<EconomyRow | null>(k);
            if (hit !== undefined) return hit;
            const value = await store.getEconomy(guildId, userId);
            cache.set(k, value);
            return value;
        },

        async saveEconomy(guildId: string, userId: string, data: EconomyRow): Promise<void> {
            await store.saveEconomy(guildId, userId, data);
            cache.set(key.economy(guildId, userId), data);
        },

        async getAllEconomy(guildId: string): Promise<EconomyRow[]> {
            return store.getAllEconomy(guildId);
        }
    };
}

/** مسح ذاكرة التخزين المؤقت بالكامل (يُستخدم عند إعادة التحميل) */
export function clearCache(): void {
    cache.flushAll();
}
