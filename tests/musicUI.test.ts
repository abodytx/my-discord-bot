import { describe, it, expect } from 'vitest';
import { formatTime } from '../src/utils/musicUI';

describe('formatTime', () => {
    it('returns "مباشر" for falsy or NaN input', () => {
        expect(formatTime(undefined)).toBe('مباشر');
        expect(formatTime(null)).toBe('مباشر');
        expect(formatTime(0)).toBe('مباشر');
        expect(formatTime(Number.NaN)).toBe('مباشر');
    });

    it('formats minutes and seconds with padding', () => {
        expect(formatTime(65_000)).toBe('1:05');
        expect(formatTime(90_000)).toBe('1:30');
    });

    it('formats hours when the duration exceeds one hour', () => {
        expect(formatTime(3_600_000)).toBe('1:00:00');
        expect(formatTime(7_305_000)).toBe('2:01:45');
    });

    it('rounds milliseconds down', () => {
        expect(formatTime(99_999)).toBe('1:39');
    });
});
