// =====================================================
// القيم الافتراضية لإعدادات السيرفر
// =====================================================

import type { GuildSettings } from '../types';

export const DEFAULT_SETTINGS: GuildSettings = {
    welcomeChannelId: null,
    welcomeMessage: 'أهلاً وسهلاً {user} في **{server}**! 🎉\nأنت العضو رقم **#{memberCount}**.',
    rulesChannelId: null,
    goodbyeChannelId: null,
    goodbyeMessage: 'وداعاً {user}، سنشتاق إليك في **{server}**. 👋',
    autoRoleId: null,
    antiSpam: false,
    antiLink: false,
    antiNuke: false,
    maxNukeActions: 3,
    whitelistedRoles: [],
    whitelistedUsers: [],
    ticketCategoryId: null,
    ticketLogChannelId: null,
    staffRoleId: null,
    modLogChannelId: null,
    memberLogChannelId: null,
    levelSystem: false,
    levelUpChannelId: null,
    badWords: [],
    badWordsEnabled: false,
    mentionLimit: 5,
    emojiLimit: 10,
    capsLimit: 0,
    warnActions: []
};

export function mergeSettings(base: GuildSettings, partial: Partial<GuildSettings>): GuildSettings {
    return { ...base, ...partial };
}
