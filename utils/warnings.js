// =====================================================
// نظام التحذيرات (Warnings) - تخزين JSON
// =====================================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WARNINGS_FILE = path.join(DATA_DIR, 'warnings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(WARNINGS_FILE)) fs.writeFileSync(WARNINGS_FILE, JSON.stringify({}, null, 2));

function readAll() {
    try {
        return JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8') || '{}');
    } catch (err) {
        console.error('خطأ في قراءة ملف التحذيرات:', err);
        return {};
    }
}

function writeAll(data) {
    try {
        fs.writeFileSync(WARNINGS_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('خطأ في حفظ ملف التحذيرات:', err);
    }
}

function getWarnings(guildId, userId) {
    const all = readAll();
    const id = `${guildId}-${userId}`;
    if (!all[id]) {
        all[id] = [];
        writeAll(all);
    }
    return all[id];
}

function addWarning(guildId, userId, { reason, moderatorId, date }) {
    const all = readAll();
    const id = `${guildId}-${userId}`;
    const warning = {
        reason,
        moderatorId,
        date: date || new Date().toISOString()
    };
    if (!all[id]) all[id] = [];
    all[id].push(warning);
    writeAll(all);
    return warning;
}

function removeWarning(guildId, userId, index) {
    const all = readAll();
    const id = `${guildId}-${userId}`;
    if (!all[id] || index < 0 || index >= all[id].length) return false;
    all[id].splice(index, 1);
    writeAll(all);
    return true;
}

function clearWarnings(guildId, userId) {
    const all = readAll();
    const id = `${guildId}-${userId}`;
    const count = all[id] ? all[id].length : 0;
    delete all[id];
    writeAll(all);
    return count;
}

module.exports = { getWarnings, addWarning, removeWarning, clearWarnings };
