// =====================================================
// ملفات الترجمة (i18n) — عربية / إنجليزية
// القواميس متمركزة هنا بدل النصوص المضمّنة في الأكواد
// =====================================================

export type Locale = 'ar' | 'en';

export const translations = {
    ar: {
        // ---------- AutoMod ----------
        autoModFlagged: 'تم حذف رسالتك بسبب مخالفة قواعد السيرفر.',
        autoModReasonBadWord: 'استخدام كلمة ممنوعة: **{word}**',
        autoModReasonCaps: 'الإفراط في استخدام الحروف الكبيرة ({percent}%).',
        autoModReasonMentions: 'إرسال أكثر من **{limit}** إشارة في رسالة واحدة.',
        autoModReasonEmojis: 'إرسال أكثر من **{limit}** إيموجي في رسالة واحدة.',
        autoModTimeout: 'وصلت إلى الحد الأقصى من التحذيرات وتم فرض كتم مؤقت عليك.',
        autoModKick: 'وصلت إلى الحد الأقصى من التحذيرات وتم طردك من السيرفر.',
        autoModBan: 'وصلت إلى الحد الأقصى من التحذيرات وتم حظرك من السيرفر.',

        // ---------- Giveaways ----------
        giveawayNotFound: '❌ هذا السحب غير موجود أو انتهى.',
        giveawayJoined: '🎉 تم انضمامك للسحب!',
        giveawayLeft: 'تم انسحابك من السحب.',
        giveawayCount: 'عدد المشاركين الآن: **{count}**',
        giveawayCannotJoin: '❌ لا يمكن المشاركة في هذا السحب الآن.',

        // ---------- أمر اللغة ----------
        localeCurrent: '🌐 لغة السيرفر الحالية: **{locale}**',
        localeUpdated: '✅ تم تحديث لغة السيرفر إلى: **{locale}**',
        localeArName: 'العربية',
        localeEnName: 'الإنجليزية',

        // ---------- رسائل عامة ----------
        unknownCommand: '❌ أمر غير معروف.'
    },
    en: {
        autoModFlagged: 'Your message was removed for violating the server rules.',
        autoModReasonBadWord: 'Using a banned word: **{word}**',
        autoModReasonCaps: 'Excessive use of capital letters ({percent}%).',
        autoModReasonMentions: 'Sending more than **{limit}** mentions in one message.',
        autoModReasonEmojis: 'Sending more than **{limit}** emojis in one message.',
        autoModTimeout: 'You reached the warning limit and have been temporarily muted.',
        autoModKick: 'You reached the warning limit and have been kicked from the server.',
        autoModBan: 'You reached the warning limit and have been banned from the server.',

        giveawayNotFound: '❌ This giveaway does not exist or has ended.',
        giveawayJoined: '🎉 You have joined the giveaway!',
        giveawayLeft: 'You left the giveaway.',
        giveawayCount: 'Participants now: **{count}**',
        giveawayCannotJoin: '❌ You cannot join this giveaway right now.',

        localeCurrent: '🌐 Current server language: **{locale}**',
        localeUpdated: '✅ Server language updated to: **{locale}**',
        localeArName: 'Arabic',
        localeEnName: 'English',

        unknownCommand: '❌ Unknown command.'
    }
} as const;

export type TranslationKey = keyof (typeof translations)['ar'];
