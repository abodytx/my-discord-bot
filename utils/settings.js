// =====================================================
// إدارة إعدادات كل سيرفر (data/settings.json)
// =====================================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SETTINGS_FILE)) fs.writeFileSync(SETTINGS_FILE, JSON.stringify({}, null, 2));

const DEFAULT_SETTINGS = {
    welcomeChannelId: null,
    welcomeMessage: 'أهلاً وسهلاً {user} في **{server}**! 🎉\nأنت العضو رقم **#{memberCount}**.',
    rulesChannelId: null,
    goodbyeChannelId: null,
    goodbyeMessage: 'وداعاً {user}، سنشتاق إليك في **{server}**. 👋',
    autoRoleId: null,
    antiSpam: false,
    antiLink: false,
    ticketCategoryId: null,
    ticketLogChannelId: null,
    modLogChannelId: null,
    memberLogChannelId: null,
    levelSystem: false,
    levelUpChannelId: null
};

function readAll() {
    try {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (err) {
        console.error('خطأ في قراءة ملف الإعدادات:', err);
        return {};
    }
}

function writeAll(data) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('خطأ في حفظ ملف الإعدادات:', err);
    }
}

function getGuildSettings(guildId) {
    const all = readAll();
    if (!all[guildId]) {
        all[guildId] = { ...DEFAULT_SETTINGS };
        writeAll(all);
    }
    return { ...DEFAULT_SETTINGS, ...all[guildId] };
}

function updateGuildSettings(guildId, newValues) {
    const all = readAll();
    all[guildId] = { ...DEFAULT_SETTINGS, ...(all[guildId] || {}), ...newValues };
    writeAll(all);
    return { ...DEFAULT_SETTINGS, ...all[guildId] };
}

function resetGuildSettings(guildId) {
    const all = readAll();
    delete all[guildId];
    writeAll(all);
    return { ...DEFAULT_SETTINGS };
}

function removeGuild(guildId) {
    const all = readAll();
    if (all[guildId]) {
        delete all[guildId];
        writeAll(all);
    }
}

module.exports = {
    DEFAULT_SETTINGS,
    getGuildSettings,
    updateGuildSettings,
    resetGuildSettings,
    removeGuild
};
