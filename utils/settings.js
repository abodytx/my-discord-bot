// =====================================================
// ملف إدارة الإعدادات: يخزن إعدادات كل سيرفر في data/settings.json
// (بديل بسيط ومجاني عن قاعدة بيانات - يناسب البوتات المتوسطة)
// =====================================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// التأكد من وجود المجلد والملف عند التشغيل الأول
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SETTINGS_FILE)) fs.writeFileSync(SETTINGS_FILE, JSON.stringify({}, null, 2));

// قراءة كل الإعدادات من الملف
function readAll() {
    try {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (err) {
        console.error('خطأ في قراءة ملف الإعدادات:', err);
        return {};
    }
}

// حفظ كل الإعدادات إلى الملف
function writeAll(data) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

// جلب إعدادات سيرفر معين (مع قيم افتراضية)
function getGuildSettings(guildId) {
    const all = readAll();
    if (!all[guildId]) {
        all[guildId] = {
            welcomeChannelId: null,
            welcomeMessage: 'أهلاً وسهلاً {user} في **{server}**! 🎉\nأنت العضو رقم **#{memberCount}**.',
            rulesChannelId: null,
            autoRoleId: null,
            antiSpam: false,
            antiLink: false,
            ticketCategoryId: null,
            ticketLogChannelId: null,
            modLogChannelId: null
        };
        writeAll(all);
    }
    return all[guildId];
}

// تحديث إعداد معين لسيرفر معين
function updateGuildSettings(guildId, newValues) {
    const all = readAll();
    const current = all[guildId] || getGuildSettings(guildId);
    all[guildId] = { ...current, ...newValues };
    writeAll(all);
    return all[guildId];
}

module.exports = { getGuildSettings, updateGuildSettings };
