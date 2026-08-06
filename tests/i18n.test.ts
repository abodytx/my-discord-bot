import { describe, it, expect } from 'vitest';
import { translations, type Locale, type TranslationKey } from '../src/i18n/translations';
import { t } from '../src/i18n';

describe('translations', () => {
    it('ar and en dictionaries have identical keys', () => {
        const arKeys = Object.keys(translations.ar).sort();
        const enKeys = Object.keys(translations.en).sort();
        expect(enKeys).toEqual(arKeys);
    });

    it('every dictionary value is a non-empty string', () => {
        for (const locale of Object.keys(translations) as Locale[]) {
            for (const [key, value] of Object.entries(translations[locale])) {
                expect(value, `${locale}.${key} is empty`).toBeTruthy();
            }
        }
    });

    it('all variables in ar are present in en', () => {
        const varsOf = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        for (const key of Object.keys(translations.ar) as TranslationKey[]) {
            expect(varsOf(translations.en[key]), `variables mismatch in ${key}`).toEqual(varsOf(translations.ar[key]));
        }
    });
});

describe('t()', () => {
    it('returns arabic text for ar locale', () => {
        expect(t('ar', 'localeArName')).toBe('العربية');
    });

    it('returns english text for en locale', () => {
        expect(t('en', 'localeArName')).toBe('Arabic');
    });

    it('replaces {vars} placeholders', () => {
        expect(t('ar', 'autoModReasonBadWord', { word: 'سبام' })).toContain('سبام');
        expect(t('en', 'giveawayCount', { count: 7 })).toBe('Participants now: **7**');
    });

    it('falls back to ar for a missing key in en, then to the key itself', () => {
        expect(t('en', 'autoModFlagged')).toBe(translations.en.autoModFlagged);
        expect(t('en', 'doesNotExistKey' as TranslationKey)).toBe('doesNotExistKey');
    });
});
