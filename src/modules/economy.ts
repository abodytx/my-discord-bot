// =====================================================
// Economy Engine - نظام النقاط والاقتصاد عبر طبقة التخزين
// يدعم ربط مباشر مع لوحة التحكم لتعديل الرصيد
// =====================================================

import { getStore } from '../storage';
import type { EconomyRow } from '../types';

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY = 200;

function emptyUser(userId: string): EconomyRow {
    return { userId, balance: 0, lastDaily: 0, games: { wins: 0, losses: 0 } };
}

async function ensureUser(guildId: string, userId: string): Promise<EconomyRow> {
    const existing = await getStore().getEconomy(guildId, userId);
    if (existing) return existing;
    const fresh = emptyUser(userId);
    await getStore().saveEconomy(guildId, userId, fresh);
    return fresh;
}

export async function getBalance(guildId: string, userId: string): Promise<number> {
    const user = await ensureUser(guildId, userId);
    return user.balance || 0;
}

export async function addBalance(guildId: string, userId: string, amount: number): Promise<number> {
    const user = await ensureUser(guildId, userId);
    user.balance = Math.max(0, (user.balance || 0) + amount);
    await getStore().saveEconomy(guildId, userId, user);
    return user.balance;
}

export async function setBalance(guildId: string, userId: string, amount: number): Promise<number> {
    const user = await ensureUser(guildId, userId);
    user.balance = Math.max(0, amount);
    await getStore().saveEconomy(guildId, userId, user);
    return user.balance;
}

export async function claimDaily(
    guildId: string,
    userId: string,
    amount = DEFAULT_DAILY
): Promise<{ ok: boolean; remaining?: number; amount?: number; balance?: number }> {
    const user = await ensureUser(guildId, userId);
    const now = Date.now();
    const remaining = (user.lastDaily || 0) + DAILY_COOLDOWN - now;
    if (remaining > 0) return { ok: false, remaining };
    user.balance = (user.balance || 0) + amount;
    user.lastDaily = now;
    await getStore().saveEconomy(guildId, userId, user);
    return { ok: true, amount, balance: user.balance };
}

export async function recordGame(guildId: string, userId: string, won: boolean, bet: number): Promise<EconomyRow> {
    const user = await ensureUser(guildId, userId);
    user.games = user.games || { wins: 0, losses: 0 };
    if (won) {
        user.games.wins++;
        user.balance += bet * 2;
    } else {
        user.games.losses++;
        user.balance = Math.max(0, (user.balance || 0) - bet);
    }
    await getStore().saveEconomy(guildId, userId, user);
    return user;
}

export async function leaderboard(guildId: string, limit = 10): Promise<EconomyRow[]> {
    const rows = await getStore().getAllEconomy(guildId);
    return rows.sort((a, b) => b.balance - a.balance).slice(0, limit);
}

export { ensureUser };
