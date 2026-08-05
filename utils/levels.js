// =====================================================
// نظام المستويات (XP / Levels) - تخزين JSON بسيط
// الصيغة: level = floor(sqrt(totalXp / 50))
// =====================================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEVELS_FILE = path.join(DATA_DIR, 'levels.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LEVELS_FILE)) fs.writeFileSync(LEVELS_FILE, JSON.stringify({}, null, 2));

function readAll() {
    try {
        return JSON.parse(fs.readFileSync(LEVELS_FILE, 'utf8') || '{}');
    } catch (err) {
        console.error('خطأ في قراءة ملف المستويات:', err);
        return {};
    }
}

function writeAll(data) {
    try {
        fs.writeFileSync(LEVELS_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('خطأ في حفظ ملف المستويات:', err);
    }
}

function key(guildId, userId) {
    return `${guildId}-${userId}`;
}

function levelFromXp(xp) {
    return Math.floor(Math.sqrt(xp / 50));
}

// XP المطلوبة للوصول إلى مستوى معين (إجمالي تراكمي)
function xpToReachLevel(level) {
    return 50 * level * level;
}

function getLevelInfo(guildId, userId) {
    const all = readAll();
    const totalXp = all[key(guildId, userId)] || 0;
    const level = levelFromXp(totalXp);
    const currentLevelXp = xpToReachLevel(level);
    const xpInLevel = totalXp - currentLevelXp;
    const xpForNextLevel = 100 * level + 50;
    return { totalXp, level, xpInLevel, xpForNextLevel, progress: Math.min(1, xpInLevel / xpForNextLevel) };
}

function addXp(guildId, userId, amount) {
    const all = readAll();
    const id = key(guildId, userId);
    const oldXp = all[id] || 0;
    const newXp = oldXp + amount;
    all[id] = newXp;
    writeAll(all);
    return {
        leveledUp: levelFromXp(newXp) > levelFromXp(oldXp),
        oldLevel: levelFromXp(oldXp),
        newLevel: levelFromXp(newXp)
    };
}

function getLeaderboard(guildId, limit = 10) {
    const all = readAll();
    return Object.entries(all)
        .filter(([id]) => id.startsWith(`${guildId}-`))
        .map(([id, totalXp]) => ({ userId: id.split('-')[1], totalXp, level: levelFromXp(totalXp) }))
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, limit);
}

module.exports = { addXp, getLevelInfo, getLeaderboard, levelFromXp, xpToReachLevel };
