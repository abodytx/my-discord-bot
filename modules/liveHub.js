// =====================================================
// Live Hub - مركز البث اللحظي (SSE)
// ينقل أحداث السيرفر ومقاييس النظام إلى لوحة التحكم
// =====================================================

const { EventEmitter } = require('events');
const hub = new EventEmitter();
hub.setMaxListeners(0);

const MAX_BUFFER = 300;
const buffer = [];

/**
 * بث حدث جديد إلى كل مشتركي اللوحة
 * @param {string} type  نوع الحدث (log | metrics | alert)
 * @param {object} data  بيانات الحدث
 */
function emit(type, data) {
    const payload = { type, data, at: Date.now() };
    buffer.push(payload);
    if (buffer.length > MAX_BUFFER) buffer.shift();
    hub.emit('event', payload);
}

/** أرشيف الأحداث الأخيرة (للمشترك الجديد) */
function getBuffer() {
    return buffer.slice();
}

module.exports = { hub, emit, getBuffer };
