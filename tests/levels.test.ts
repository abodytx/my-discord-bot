import { describe, it, expect } from 'vitest';
import { levelFromXp, xpToReachLevel } from '../src/utils/levels';

describe('levelFromXp', () => {
    it('returns level 0 for no XP', () => {
        expect(levelFromXp(0)).toBe(0);
    });

    it('returns level 1 at exactly 50 XP', () => {
        expect(levelFromXp(50)).toBe(1);
    });

    it('applies the floor formula: level = floor(sqrt(xp/50))', () => {
        expect(levelFromXp(49)).toBe(0);
        expect(levelFromXp(50)).toBe(1);
        expect(levelFromXp(199)).toBe(1);
        expect(levelFromXp(200)).toBe(2);
        expect(levelFromXp(450)).toBe(3);
    });

    it('handles very large XP without NaN', () => {
        const level = levelFromXp(1_000_000);
        expect(level).toBe(141);
    });
});

describe('xpToReachLevel', () => {
    it('computes the XP threshold for a given level', () => {
        expect(xpToReachLevel(0)).toBe(0);
        expect(xpToReachLevel(1)).toBe(50);
        expect(xpToReachLevel(2)).toBe(200);
        expect(xpToReachLevel(3)).toBe(450);
    });

    it('is the inverse threshold of levelFromXp', () => {
        expect(levelFromXp(xpToReachLevel(5))).toBe(5);
        expect(levelFromXp(xpToReachLevel(5) - 1)).toBe(4);
    });
});
