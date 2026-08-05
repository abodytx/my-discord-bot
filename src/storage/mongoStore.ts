// =====================================================
// تنفيذ التخزين على MongoDB (Mongoose)
// يُستخدم عند ضبط DB_URI في ملف .env — التخزين الإنتاجي
// =====================================================

import { Schema, model, connect, Connection, Model } from 'mongoose';
import type { DataStore } from './types';
import type { EconomyRow, GuildSettings, LevelRow, WarningData } from '../types';
import { DEFAULT_SETTINGS, mergeSettings } from '../utils/defaults';

// ==================== الموديلات ====================
const GuildSettingSchema = new Schema<{ guildId: string; settings: GuildSettings }>({
    guildId: { type: String, required: true, unique: true },
    settings: { type: Schema.Types.Mixed, default: {} }
});

const LevelSchema = new Schema<{ guildId: string; userId: string; totalXp: number }>({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    totalXp: { type: Number, default: 0 }
});
LevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const WarningEntrySchema = new Schema<WarningData>({
    reason: { type: String, required: true },
    moderatorId: { type: String, required: true },
    date: { type: String, required: true },
    points: { type: Number }
});

const WarningSchema = new Schema<{ guildId: string; userId: string; warnings: WarningData[] }>({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    warnings: { type: [WarningEntrySchema], default: [] }
});
WarningSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const EconomySchema = new Schema<EconomyRow & { guildId: string }>({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    balance: { type: Number, default: 0 },
    lastDaily: { type: Number, default: 0 },
    games: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 }
    }
});
EconomySchema.index({ guildId: 1, userId: 1 }, { unique: true });

// ==================== الكيان ====================
export class MongoStore implements DataStore {
    readonly kind = 'mongo' as const;
    private conn: Connection | null = null;

    private get GuildSetting(): Model<{ guildId: string; settings: GuildSettings }> {
        return model('GuildSetting', GuildSettingSchema);
    }
    private get Level(): Model<{ guildId: string; userId: string; totalXp: number }> {
        return model('Level', LevelSchema);
    }
    private get Warning(): Model<{ guildId: string; userId: string; warnings: WarningData[] }> {
        return model('Warning', WarningSchema);
    }
    private get Economy(): Model<EconomyRow & { guildId: string }> {
        return model('Economy', EconomySchema);
    }

    async connect(uri: string): Promise<void> {
        await connect(uri, { serverSelectionTimeoutMS: 10_000 });
    }

    async disconnect(): Promise<void> {
        if (this.conn) await this.conn.close();
    }

    // ==================== الإعدادات ====================
    async getGuildSettings(guildId: string): Promise<GuildSettings> {
        const doc = await this.GuildSetting.findOne({ guildId }).lean();
        if (!doc) {
            const merged = mergeSettings(DEFAULT_SETTINGS, {});
            await this.GuildSetting.create({ guildId, settings: merged });
            return merged;
        }
        return mergeSettings(DEFAULT_SETTINGS, (doc.settings as Partial<GuildSettings>) ?? {});
    }

    async saveGuildSettings(guildId: string, settings: GuildSettings): Promise<void> {
        await this.GuildSetting.updateOne({ guildId }, { $set: { settings } }, { upsert: true });
    }

    async removeGuildSettings(guildId: string): Promise<void> {
        await this.GuildSetting.deleteOne({ guildId });
    }

    // ==================== المستويات ====================
    async getXp(guildId: string, userId: string): Promise<number> {
        const doc = await this.Level.findOne({ guildId, userId }).lean();
        return doc?.totalXp ?? 0;
    }

    async saveXp(guildId: string, userId: string, xp: number): Promise<void> {
        await this.Level.updateOne({ guildId, userId }, { $set: { totalXp: xp } }, { upsert: true });
    }

    async getAllLevels(guildId: string): Promise<LevelRow[]> {
        const docs = await this.Level.find({ guildId }).lean();
        return docs.map((d) => ({
            userId: d.userId,
            totalXp: d.totalXp,
            level: Math.floor(Math.sqrt(d.totalXp / 50))
        }));
    }

    // ==================== التحذيرات ====================
    async getWarnings(guildId: string, userId: string): Promise<WarningData[]> {
        const doc = await this.Warning.findOne({ guildId, userId }).lean();
        return (doc?.warnings as WarningData[]) ?? [];
    }

    async saveWarnings(guildId: string, userId: string, warnings: WarningData[]): Promise<void> {
        await this.Warning.updateOne({ guildId, userId }, { $set: { warnings } }, { upsert: true });
    }

    // ==================== الاقتصاد ====================
    async getEconomy(guildId: string, userId: string): Promise<EconomyRow | null> {
        const doc = await this.Economy.findOne({ guildId, userId }).lean();
        if (!doc) return null;
        return { userId: doc.userId, balance: doc.balance, lastDaily: doc.lastDaily, games: doc.games };
    }

    async saveEconomy(guildId: string, userId: string, data: EconomyRow): Promise<void> {
        await this.Economy.updateOne({ guildId, userId }, { $set: data }, { upsert: true });
    }

    async getAllEconomy(guildId: string): Promise<EconomyRow[]> {
        const docs = await this.Economy.find({ guildId }).lean();
        return docs.map((d) => ({
            userId: d.userId,
            balance: d.balance,
            lastDaily: d.lastDaily,
            games: d.games
        }));
    }
}
