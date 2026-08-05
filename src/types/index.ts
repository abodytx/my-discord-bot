// =====================================================
// الأنواع المركزية (Types) — كل كيانات المشروع
// =====================================================

import type {
    ChatInputCommandInteraction,
    Client,
    Collection,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import type { Player } from 'discord-player';
import type { AntiNukeEngine } from '../modules/antiNuke';

// ---------------- إعدادات السيرفر ----------------
export interface GuildSettings {
    welcomeChannelId: string | null;
    welcomeMessage: string;
    rulesChannelId: string | null;
    goodbyeChannelId: string | null;
    goodbyeMessage: string;
    autoRoleId: string | null;
    antiSpam: boolean;
    antiLink: boolean;
    antiNuke: boolean;
    maxNukeActions: number;
    whitelistedRoles: string[];
    whitelistedUsers: string[];
    ticketCategoryId: string | null;
    ticketLogChannelId: string | null;
    staffRoleId: string | null;
    modLogChannelId: string | null;
    memberLogChannelId: string | null;
    levelSystem: boolean;
    levelUpChannelId: string | null;
    // --- خصائص AutoMod المتقدمة (مرحلة 3) ---
    badWords?: string[];
    badWordsEnabled?: boolean;
    mentionLimit?: number;
    emojiLimit?: number;
    capsLimit?: number;
    warnActions?: { points: number; action: 'timeout' | 'kick' | 'ban'; durationMin?: number }[];
}

// ---------------- بيانات التحذيرات ----------------
export interface WarningData {
    reason: string;
    moderatorId: string;
    date: string;
    points?: number;
}

// ---------------- بيانات المستخدم (اقتصاد/مستويات) ----------------
export interface EconomyUser {
    balance: number;
    lastDaily: number;
    games: { wins: number; losses: number };
}

export interface LevelInfo {
    totalXp: number;
    level: number;
    xpInLevel: number;
    xpForNextLevel: number;
    progress: number;
}

export interface LevelRow {
    userId: string;
    totalXp: number;
    level: number;
}

export interface EconomyRow {
    userId: string;
    balance: number;
    lastDaily: number;
    games: { wins: number; losses: number };
}

// ---------------- بيانات التذاكر ----------------
export interface TicketData {
    channelId: string;
    userId: string;
    category: string;
    openedAt: string;
    closedAt?: string;
    transcriptUrl?: string;
    assignedTo?: string;
}

// ---------------- أنماط الوحدات (Commands / Events) ----------------
export interface CommandModule {
    data:
        | SlashCommandBuilder
        | SlashCommandOptionsOnlyBuilder
        | SlashCommandSubcommandsOnlyBuilder
        | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
    cooldown?: number;
    category?: string;
    adminOnly?: boolean;
    execute(interaction: ChatInputCommandInteraction, client: ExtendedClient): Promise<unknown> | unknown;
}

export interface EventModule {
    name: string;
    once?: boolean;
    execute(...args: unknown[]): Promise<unknown> | unknown;
}

// ---------------- كائن البوت الموسّع ----------------
export interface ExtendedClient extends Client {
    commands: Collection<string, CommandModule>;
    cooldowns: Collection<string, number>;
    spamTracker: Collection<string, { count: number; firstMessageAt: number }>;
    xpTracker: Collection<string, number>;
    player?: Player;
    antiNuke: AntiNukeEngine;
}

// ---------------- سجلات لوحة التحكم (SSE) ----------------
export interface LiveLogEntry {
    level: 'info' | 'warn' | 'error' | 'success';
    source: string;
    message: string;
    timestamp: number;
}
