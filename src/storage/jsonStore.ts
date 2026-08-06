import { logger } from '../utils/logger';
// =====================================================
// تنفيذ التخزين على ملفات JSON (التوافق مع البيانات القديمة)
// يُستخدم تلقائياً عند غياب DB_URI، أو كاحتياطي تطوير
// =====================================================

import * as fs from 'fs';
import * as path from 'path';
import type { DataStore } from './types';
import type { EconomyRow, GuildSettings, LevelRow, WarningData } from '../types';
import { DEFAULT_SETTINGS, mergeSettings } from '../utils/defaults';

const DATA_DIR = path.resolve(process.cwd(), 'data');

function ensureFile(file: string): void {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}, null, 2));
}

function readJson<T>(file: string, fallback: T): T {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8') || '{}') as T;
    } catch {
        return fallback;
    }
}

function writeJson(file: string, data: unknown): void {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        logger.error('خطأ في حفظ ملف البيانات:', err);
    }
}

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const LEVELS_FILE = path.join(DATA_DIR, 'levels.json');
const WARNINGS_FILE = path.join(DATA_DIR, 'warnings.json');
const ECONOMY_FILE = path.join(DATA_DIR, 'economy.json');

ensureFile(SETTINGS_FILE);
ensureFile(LEVELS_FILE);
ensureFile(WARNINGS_FILE);
ensureFile(ECONOMY_FILE);

function levelKey(guildId: string, userId: string): string {
    return `${guildId}-${userId}`;
}

export const JsonStore: DataStore = {
    kind: 'json',

    // ==================== الإعدادات ====================
    async getGuildSettings(guildId: string): Promise<GuildSettings> {
        const all = readJson<Record<string, Partial<GuildSettings>>>(SETTINGS_FILE, {});
        const existing = all[guildId] ?? {};
        const merged = mergeSettings(DEFAULT_SETTINGS, existing);
        if (!all[guildId]) {
            all[guildId] = merged;
            writeJson(SETTINGS_FILE, all);
        }
        return merged;
    },

    async saveGuildSettings(guildId: string, settings: GuildSettings): Promise<void> {
        const all = readJson<Record<string, Partial<GuildSettings>>>(SETTINGS_FILE, {});
        all[guildId] = settings;
        writeJson(SETTINGS_FILE, all);
    },

    async removeGuildSettings(guildId: string): Promise<void> {
        const all = readJson<Record<string, unknown>>(SETTINGS_FILE, {});
        delete all[guildId];
        writeJson(SETTINGS_FILE, all);
    },

    // ==================== المستويات ====================
    async getXp(guildId: string, userId: string): Promise<number> {
        const all = readJson<Record<string, number>>(LEVELS_FILE, {});
        return all[levelKey(guildId, userId)] || 0;
    },

    async saveXp(guildId: string, userId: string, xp: number): Promise<void> {
        const all = readJson<Record<string, number>>(LEVELS_FILE, {});
        all[levelKey(guildId, userId)] = xp;
        writeJson(LEVELS_FILE, all);
    },

    async getAllLevels(guildId: string): Promise<LevelRow[]> {
        const all = readJson<Record<string, number>>(LEVELS_FILE, {});
        return Object.entries(all)
            .filter(([id]) => id.startsWith(`${guildId}-`))
            .map(([id, totalXp]) => ({
                userId: id.slice(guildId.length + 1),
                totalXp,
                level: Math.floor(Math.sqrt(totalXp / 50))
            }));
    },

    // ==================== التحذيرات ====================
    async getWarnings(guildId: string, userId: string): Promise<WarningData[]> {
        const all = readJson<Record<string, WarningData[]>>(WARNINGS_FILE, {});
        return all[levelKey(guildId, userId)] ?? [];
    },

    async saveWarnings(guildId: string, userId: string, warnings: WarningData[]): Promise<void> {
        const all = readJson<Record<string, WarningData[]>>(WARNINGS_FILE, {});
        all[levelKey(guildId, userId)] = warnings;
        writeJson(WARNINGS_FILE, all);
    },

    // ==================== الاقتصاد ====================
    async getEconomy(guildId: string, userId: string): Promise<EconomyRow | null> {
        const all = readJson<Record<string, Record<string, EconomyRow>>>(ECONOMY_FILE, {});
        const user = all[guildId]?.[userId];
        if (!user) return null;
        return { ...user, userId };
    },

    async saveEconomy(guildId: string, userId: string, data: EconomyRow): Promise<void> {
        const all = readJson<Record<string, Record<string, EconomyRow>>>(ECONOMY_FILE, {});
        if (!all[guildId]) all[guildId] = {};
        all[guildId][userId] = data;
        writeJson(ECONOMY_FILE, all);
    },

    async getAllEconomy(guildId: string): Promise<EconomyRow[]> {
        const all = readJson<Record<string, Record<string, EconomyRow>>>(ECONOMY_FILE, {});
        const guild = all[guildId] ?? {};
        return Object.entries(guild).map(([userId, data]) => ({ ...data, userId }));
    }
};
