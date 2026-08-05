// =====================================================
// Live Hub - مركز البث اللحظي (SSE)
// ينقل أحداث السيرفر ومقاييس النظام إلى لوحة التحكم
// =====================================================

import { EventEmitter } from 'events';

export interface LiveEvent {
    type: string;
    data: Record<string, unknown>;
    at: number;
}

const hub = new EventEmitter();
hub.setMaxListeners(0);

const MAX_BUFFER = 300;
const buffer: LiveEvent[] = [];

/**
 * بث حدث جديد إلى كل مشتركي اللوحة
 * @param type نوع الحدث (log | metrics | alert)
 * @param data بيانات الحدث
 */
function emit(type: string, data: Record<string, unknown>): void {
    const payload: LiveEvent = { type, data, at: Date.now() };
    buffer.push(payload);
    if (buffer.length > MAX_BUFFER) buffer.shift();
    hub.emit('event', payload);
}

/** أرشيف الأحداث الأخيرة (للمشترك الجديد) */
function getBuffer(): LiveEvent[] {
    return buffer.slice();
}

export { hub, emit, getBuffer };
