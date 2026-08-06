// =====================================================
// sharding.ts — تشغيل البوت عبر ShardingManager
// يقسم البوت على عدة عمليات حسب عدد سيرفرات البوت
// مع إعادة إقلاع تلقائية عند السقوط (respawn)
// =====================================================

import 'dotenv/config';
import * as path from 'path';
import { ShardingManager } from 'discord.js';
import { logger } from './utils/logger';

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
if (!token) {
    logger.error('❌ لم يتم العثور على توكن البوت! ضع DISCORD_TOKEN في ملف .env.');
    process.exit(1);
}

const manager = new ShardingManager(path.join(__dirname, 'index.js'), {
    token,
    totalShards: 'auto',
    respawn: true,
    shardArgs: []
});

manager.on('shardCreate', (shard) => {
    logger.info(`🚀 تم تشغيل الشارد رقم #${shard.id}`);

    // متابعة حالة الشارد وإعادة الإقلاع تلقائياً عند السقوط
    shard.on('error', (err) => {
        logger.error(`خطأ في الشارد #${shard.id}:`, err);
    });
    shard.on('disconnect', () => {
        logger.warn(`الشارد #${shard.id} انقطع الاتصال — سيُعاد تشغيله تلقائياً.`);
    });
    shard.on('reconnecting', () => {
        logger.warn(`الشارد #${shard.id} يعيد الاتصال...`);
    });
});

manager
    .spawn()
    .then(() => {
        logger.info(`✅ تم تشغيل البوت بعدد شاردز: ${manager.totalShards}`);
    })
    .catch((err) => {
        logger.error('❌ فشل تشغيل الـ ShardingManager:', err);
        process.exit(1);
    });
