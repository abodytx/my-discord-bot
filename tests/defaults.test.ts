import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings } from '../src/utils/defaults';

describe('DEFAULT_SETTINGS', () => {
    it('has protection systems disabled by default', () => {
        expect(DEFAULT_SETTINGS.antiSpam).toBe(false);
        expect(DEFAULT_SETTINGS.antiLink).toBe(false);
        expect(DEFAULT_SETTINGS.antiNuke).toBe(false);
        expect(DEFAULT_SETTINGS.badWordsEnabled).toBe(false);
        expect(DEFAULT_SETTINGS.levelSystem).toBe(false);
    });

    it('has empty moderation lists by default', () => {
        expect(DEFAULT_SETTINGS.whitelistedRoles).toEqual([]);
        expect(DEFAULT_SETTINGS.whitelistedUsers).toEqual([]);
        expect(DEFAULT_SETTINGS.badWords).toEqual([]);
        expect(DEFAULT_SETTINGS.warnActions).toEqual([]);
    });
});

describe('mergeSettings', () => {
    it('returns a merged copy without mutating the base', () => {
        const merged = mergeSettings(DEFAULT_SETTINGS, { antiSpam: true, antiNuke: true });
        expect(merged.antiSpam).toBe(true);
        expect(merged.antiNuke).toBe(true);
        expect(DEFAULT_SETTINGS.antiSpam).toBe(false);
        expect(DEFAULT_SETTINGS.antiNuke).toBe(false);
    });

    it('keeps base values for keys not present in the partial', () => {
        const merged = mergeSettings(DEFAULT_SETTINGS, {});
        expect(merged).toEqual(DEFAULT_SETTINGS);
    });
});
