// =====================================================
// Economy Engine - نظام النقاط والاقتصاد (data/economy.json)
// يدعم ربط مباشر مع لوحة التحكم لتعديل الرصيد
// =====================================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ECON_FILE = path.join(DATA_DIR, 'economy.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ECON_FILE)) fs.writeFileSync(ECON_FILE, JSON.stringify({}, null, 2));

function readAll() {
    try {
        return JSON.parse(fs.readFileSync(ECON_FILE, 'utf8') || '{}');
    } catch {
        return {};
    }
}

function writeAll(data) {
    try {
        fs.writeFileSync(ECON_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('خطأ في حفظ الاقتصاد:', err);
    }
}

function ensureUser(guildId, userId) {
    const all = readAll();
    if (!all[guildId]) all[guildId] = {};
    if (!all[guildId][userId]) {
        all[guildId][userId] = { balance: 0, lastDaily: 0, games: { wins: 0, losses: 0 } };
        writeAll(all);
    }
    return all[guildId][userId];
}

function getBalance(guildId, userId) {
    const user = ensureUser(guildId, userId);
    return user.balance || 0;
}

function addBalance(guildId, userId, amount) {
    const all = readAll();
    if (!all[guildId]) all[guildId] = {};
    if (!all[guildId][userId]) all[guildId][userId] = { balance: 0, lastDaily: 0, games: { wins: 0, losses: 0 } };
    all[guildId][userId].balance = Math.max(0, (all[guildId][userId].balance || 0) + amount);
    writeAll(all);
    return all[guildId][userId].balance;
}

function setBalance(guildId, userId, amount) {
    return addBalance(guildId, userId, amount - getBalance(guildId, userId));
}

function claimDaily(guildId, userId, amount = 200) {
    const all = readAll();
    if (!all[guildId]) all[guildId] = {};
    if (!all[guildId][userId]) all[guildId][userId] = { balance: 0, lastDaily: 0, games: { wins: 0, losses: 0 } };
    const now = Date.now();
    const user = all[guildId][userId];
    const cooldown = 24 * 60 * 60 * 1000;
    const remaining = user.lastDaily + cooldown - now;
    if (remaining > 0) return { ok: false, remaining };
    user.balance = (user.balance || 0) + amount;
    user.lastDaily = now;
    writeAll(all);
    return { ok: true, amount, balance: user.balance };
}

function recordGame(guildId, userId, won, bet) {
    const user = ensureUser(guildId, userId);
    user.games = user.games || { wins: 0, losses: 0 };
    if (won) user.games.wins++;
    else user.games.losses++;
    if (won) user.balance += bet * 2;
    else user.balance = Math.max(0, (user.balance || 0) - bet);
    writeAll(readAll());
    return user;
}

function leaderboard(guildId, limit = 10) {
    const all = readAll();
    const guild = all[guildId] || {};
    const rows = Object.entries(guild)
        .map(([id, u]) => ({ id, balance: u.balance || 0, games: u.games || {} }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, limit);
    return rows;
}

module.exports = {
    getBalance,
    addBalance,
    setBalance,
    claimDaily,
    recordGame,
    leaderboard,
    ensureUser
};
