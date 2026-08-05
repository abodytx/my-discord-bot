// =====================================================
// إدارة إعدادات كل سيرفر عبر طبقة التخزين (DataStore + Cache)
// =====================================================

import { getStore } from '../storage';
import type { GuildSettings } from '../types';
import { DEFAULT_SETTINGS } from './defaults';

export { DEFAULT_SETTINGS };

/** جلب إعدادات السيرفر مع الدمج مع القيم الافتراضية */
export async function getGuildSettings(guildId: string): Promise<GuildSettings> {
    return getStore().getGuildSettings(guildId);
}

/** تحديث جزء من إعدادات السيرفر */
export async function updateGuildSettings(guildId: string, newValues: Partial<GuildSettings>): Promise<GuildSettings> {
    const current = await getStore().getGuildSettings(guildId);
    const merged: GuildSettings = { ...current, ...newValues };
    await getStore().saveGuildSettings(guildId, merged);
    return merged;
}

/** إعادة ضبط إعدادات السيرفر للافتراضية */
export async function resetGuildSettings(guildId: string): Promise<GuildSettings> {
    const fresh: GuildSettings = { ...DEFAULT_SETTINGS };
    await getStore().saveGuildSettings(guildId, fresh);
    return fresh;
}

/** حذف بيانات السيرفر بالكامل */
export async function removeGuild(guildId: string): Promise<void> {
    await getStore().removeGuildSettings(guildId);
}
