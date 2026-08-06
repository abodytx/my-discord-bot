import { describe, it, expect } from 'vitest';
import { generateRankCard } from '../src/modules/rankCards';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const base = {
    username: 'ProBot Test',
    level: 7,
    rank: 3,
    xpInLevel: 120,
    xpForNextLevel: 200,
    totalXp: 1850,
    progress: 0.6
};

describe('generateRankCard', () => {
    it('returns a valid PNG buffer without an avatar', async () => {
        const buffer = await generateRankCard(base);
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(1000);
        expect(buffer.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    });

    it('returns a valid PNG buffer with an avatar URL', async () => {
        const buffer = await generateRankCard({ ...base, avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png' });
        expect(buffer.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    }, 15000);

    it('handles edge-case progress and rank values', async () => {
        const buffer = await generateRankCard({
            ...base,
            progress: -5,
            rank: 0,
            xpForNextLevel: 0
        });
        expect(buffer.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    });
});
