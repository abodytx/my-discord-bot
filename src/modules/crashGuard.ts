// =====================================================
// Crash Guard - منع توقف البوت نهائياً
// يلف تنفيذ الأوامر والأحداث بـ try/catch ويرصد الأخطاء
// العالمية مع إعادة محاولة ذكية للرئيسية (ready).
// =====================================================

import { emit } from './liveHub';
import { log, sanitize } from '../utils/logger';

/** ملفوف آمن لأي دالة (async) يمنع أي خطأ من إسقاط العملية */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safe<T extends (...args: any[]) => Promise<unknown> | unknown>(fn: T): T {
    return (async (...args: unknown[]) => {
        try {
            return await fn(...args);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('⚠️ [CrashGuard] خطأ محتوى:');
            console.error(err);
            log.error(`[CrashGuard] خطأ محتوى: ${sanitize(message)}`);
            emit('log', { level: 'error', source: 'module', message: `خطأ محتوى: ${sanitize(message)}` });
            return undefined;
        }
    }) as T;
}

/** تثبيت الحمايات العالمية على مستوى العملية */
export function install(): void {
    process.on('unhandledRejection', (reason: unknown) => {
        const message = reason instanceof Error ? reason.message : String(reason);
        console.error('⚠️ [CrashGuard] Unhandled Rejection:');
        console.error(reason);
        log.error(`[CrashGuard] Unhandled Rejection: ${sanitize(message)}`);
        emit('log', { level: 'error', source: 'process', message: `Unhandled Rejection: ${sanitize(message)}` });
    });

    process.on('uncaughtException', (err: Error) => {
        console.error('💥 [CrashGuard] Uncaught Exception — البوت مستمر بالعمل:');
        console.error(err);
        log.error(`[CrashGuard] Uncaught Exception: ${sanitize(err.message)}`);
        emit('log', { level: 'error', source: 'process', message: `Uncaught Exception: ${sanitize(err.message)}` });
    });

    process.on('warning', (warning: Error) => {
        if (warning.name === 'DeprecationWarning') return;
        console.warn('⚠️', warning.message);
    });

    console.log('🛡️ [CrashGuard] تم تفعيل الحماية من الأعطال.');
}
