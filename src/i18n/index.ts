// =====================================================
// وحدة i18n — دالة الترجمة مع استرجاع لغة السيرفر
// الاستخدام:
//   const locale = await getLocale(guildId);
//   t(locale, 'autoModFlagged')
// =====================================================

import { getGuildSettings } from '../utils/settings';
import { translations, type Locale, type TranslationKey } from './translations';

export type { Locale, TranslationKey };

/** جلب لغة السيرفر المفضلة (افتراضي: العربية) */
export async function getLocale(guildId: string): Promise<Locale> {
    try {
        const settings = await getGuildSettings(guildId);
        return settings.locale || 'ar';
    } catch {
        return 'ar';
    }
}

/** ترجمة مفتاح مع استبدال المتغيرات {key} */
export function t(locale: Locale, key: TranslationKey, vars: Record<string, string | number> = {}): string {
    const dict = translations[locale] ?? translations.ar;
    let text = (dict as Record<TranslationKey, string>)[key] ?? translations.ar[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
        text = text.split(`{${k}}`).join(String(v));
    }
    return text;
}
