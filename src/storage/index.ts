import { logger } from '../utils/logger';
// =====================================================
// فبريك التخزين — يختار التنفيذ حسب DB_URI
//   - DB_URI موجود  → MongoDB (Mongoose) + Cache
//   - غير موجود     → JSON (توافق) + Cache
// =====================================================

import type { DataStore } from './types';
import { JsonStore } from './jsonStore';
import { MongoStore } from './mongoStore';
import { withCache } from './cache';

let store: DataStore | null = null;

export async function initStore(): Promise<DataStore> {
    if (store) return store;

    const uri = process.env.DB_URI;
    if (uri) {
        const mongo = new MongoStore();
        await mongo.connect(uri);
        store = withCache(mongo);
        logger.info('🗄️ قاعدة البيانات: MongoDB متصلة');
    } else {
        store = withCache(JsonStore);
        logger.warn('⚠️ DB_URI غير مضبوط — استخدام تخزين JSON المؤقت. اضبط DB_URI للاستخدام الإنتاجي.');
    }
    return store;
}

export function getStore(): DataStore {
    if (!store) throw new Error('لم يتم تهيئة التخزين بعد — استدعِ initStore() أولاً');
    return store;
}
