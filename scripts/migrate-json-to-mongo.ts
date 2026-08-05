// =====================================================
// سكربت الترحيل: JSON (data/*.json) → MongoDB
// التشغيل:  npm run migrate
// المتطلبات: ضبط DB_URI في ملف .env
// =====================================================

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Schema } from 'mongoose';

const DATA_DIR = path.resolve(process.cwd(), 'data');

function readJson<T>(file: string, fallback: T): T {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) return fallback;
    try {
        return JSON.parse(fs.readFileSync(full, 'utf8')) as T;
    } catch (err) {
        console.error(`⚠️ تعذر قراءة ${file}:`, (err as Error).message);
        return fallback;
    }
}

const GuildSettingSchema = new Schema(
    { guildId: { type: String, required: true, unique: true }, settings: { type: Schema.Types.Mixed, default: {} } },
    { collection: 'guildsettings' }
);
const LevelSchema = new Schema(
    { guildId: { type: String, required: true }, userId: { type: String, required: true }, totalXp: { type: Number, default: 0 } },
    { collection: 'levels' }
);
const WarningSchema = new Schema(
    { guildId: { type: String, required: true }, userId: { type: String, required: true }, warnings: { type: [Schema.Types.Mixed], default: [] } },
    { collection: 'warnings' }
);
const EconomySchema = new Schema(
    {
        guildId: { type: String, required: true },
        userId: { type: String, required: true },
        balance: { type: Number, default: 0 },
        lastDaily: { type: Number, default: 0 },
        games: { wins: { type: Number, default: 0 }, losses: { type: Number, default: 0 } }
    },
    { collection: 'economies' }
);
LevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
WarningSchema.index({ guildId: 1, userId: 1 }, { unique: true });
EconomySchema.index({ guildId: 1, userId: 1 }, { unique: true });

async function main(): Promise<void> {
    const uri = process.env.DB_URI;
    if (!uri) {
        console.error('❌ DB_URI غير مضبوط في .env — لا يمكن الترحيل.');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('🗄️ متصل بـ MongoDB');

    const GuildSetting = mongoose.model('GuildSetting', GuildSettingSchema);
    const Level = mongoose.model('Level', LevelSchema);
    const Warning = mongoose.model('Warning', WarningSchema);
    const Economy = mongoose.model('Economy', EconomySchema);

    // ---------- الإعدادات ----------
    const settings = readJson<Record<string, Record<string, unknown>>>('settings.json', {});
    let n = 0;
    for (const [guildId, data] of Object.entries(settings)) {
        if (!guildId || typeof data !== 'object') continue;
        await GuildSetting.updateOne({ guildId }, { $set: { guildId, settings: data } }, { upsert: true });
        n++;
    }
    console.log(`✅ الإعدادات: ${n} سيرفر`);

    // ---------- المستويات ----------
    const levels = readJson<Record<string, number>>('levels.json', {});
    n = 0;
    for (const [key, totalXp] of Object.entries(levels)) {
        const sep = key.indexOf('-');
        if (sep < 0) continue;
        const guildId = key.slice(0, sep);
        const userId = key.slice(sep + 1);
        await Level.updateOne({ guildId, userId }, { $set: { totalXp } }, { upsert: true });
        n++;
    }
    console.log(`✅ المستويات: ${n} عضو`);

    // ---------- التحذيرات ----------
    const warnings = readJson<Record<string, unknown[]>>('warnings.json', {});
    n = 0;
    for (const [key, list] of Object.entries(warnings)) {
        const sep = key.indexOf('-');
        if (sep < 0) continue;
        const guildId = key.slice(0, sep);
        const userId = key.slice(sep + 1);
        if (!Array.isArray(list)) continue;
        await Warning.updateOne({ guildId, userId }, { $set: { warnings: list } }, { upsert: true });
        n++;
    }
    console.log(`✅ التحذيرات: ${n} سجل`);

    // ---------- الاقتصاد ----------
    const economy = readJson<Record<string, Record<string, Record<string, unknown>>>>('economy.json', {});
    n = 0;
    for (const [guildId, users] of Object.entries(economy)) {
        for (const [userId, data] of Object.entries(users || {})) {
            await Economy.updateOne(
                { guildId, userId },
                {
                    $set: {
                        balance: Number(data.balance) || 0,
                        lastDaily: Number(data.lastDaily) || 0,
                        games: data.games || { wins: 0, losses: 0 }
                    }
                },
                { upsert: true }
            );
            n++;
        }
    }
    console.log(`✅ الاقتصاد: ${n} سجل`);

    await mongoose.disconnect();
    console.log('🎉 اكتمل الترحيل بنجاح.');
}

main().catch((err) => {
    console.error('❌ فشل الترحيل:', err);
    process.exit(1);
});
