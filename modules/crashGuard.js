// =====================================================
// Crash Guard - منع توقف البوت نهائياً
// يلف تنفيذ الأوامر والأحداث بـ try/catch ويرصد الأخطاء
// العالمية مع إعادة محاولة ذكية للرئيسية (ready).
// =====================================================

const { emit } = require('./liveHub');

/** ملفوف آمن لأي دالة (async) يمنع أي خطأ من إسقاط العملية */
function safe(fn) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (err) {
            const client = args.find(a => a && a.user) || args[args.length - 1];
            console.error('⚠️ [CrashGuard] خطأ محتوى:');
            console.error(err);
            emit('log', { level: 'error', source: 'module', message: `خطأ محتوى: ${err.message}` });
            return undefined;
        }
    };
}

/** تثبيت الحمايات العالمية على مستوى العملية */
function install() {
    process.on('unhandledRejection', (reason) => {
        console.error('⚠️ [CrashGuard] Unhandled Rejection:');
        console.error(reason);
        emit('log', { level: 'error', source: 'process', message: `Unhandled Rejection: ${String(reason?.message || reason)}` });
    });

    process.on('uncaughtException', (err) => {
        console.error('💥 [CrashGuard] Uncaught Exception — البوت مستمر بالعمل:');
        console.error(err);
        emit('log', { level: 'error', source: 'process', message: `Uncaught Exception: ${err.message}` });
    });

    process.on('warning', (warning) => {
        if (warning.name === 'DeprecationWarning') return;
        console.warn('⚠️', warning.message);
    });

    console.log('🛡️ [CrashGuard] تم تفعيل الحماية من الأعطال.');
}

module.exports = { safe, install };
