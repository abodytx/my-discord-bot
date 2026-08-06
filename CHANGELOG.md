# 📋 سجل التغييرات (Changelog)

يتبع المشروع ترقيماً وصفياً حسب المراحل (Phase). كل مرحلة تضيف ميزات قابلة للتشغيل فوراً.

---

## v2.1.0 — الترقية الإنتاجية الشاملة (Phase 1→5)

### 🧪 الجودة والبنية
- **استبدال `console.*` بالكامل** بنظام تسجيل احترافي `winston` (ملفات دوّارة يومياً + مستويات + **إخفاء الأسرار** `TOKEN/KEY/DB_URI`) في `src/utils/logger.ts`.
- نظام **Middlewares** موحد (`src/utils/middleware.ts`): `ownerOnly` (عبر `OWNER_ID`)، `adminOnly`، `cooldown`، وmiddlewares مخصصة.
- **ShardingManager** مع respawn تلقائي (`src/sharding.ts`).
- **CrashGuard** لتأمين تحميل الأوامر/الأحداث.
- **GitHub Actions CI** (lint + typecheck + tests + build) في `.github/workflows/ci.yml`.

### 🛡️ AutoMod — الفلترة التلقائية (Phase 3a)
- `src/modules/autoMod.ts`: كلمات ممنوعة، حد الحروف الكبيرة (%), حد الإشارات، حد الإيموجي.
- تحذير تلقائي + **warnActions** (timeout/kick/ban حسب نقاط التحذير).
- لوق AutoMod في قناة Mod Log + إشعار للمخالف (5 ثوانٍ).
- `/automod` لإدارة كل الإعدادات من السيرفر.

### 🎉 السحوبات (Giveaways) (Phase 3b)
- `src/modules/giveaway.ts`: سحوبات بجائزة/فائزين/مدة، أزرار مشاركة/انسحاب، حفظ تلقائي في `data/giveaways.json`، استرجاع عند إعادة التشغيل.
- `/giveaway start|end|reroll`.

### 📈 بطاقات الرتبة (Rank Cards) (Phase 3c)
- `src/modules/rankCards.ts`: بطاقة Rank رسمية 1200×420 (تدرّج + توهج + صورة رمزية دائرية + شريط XP).
- `/rank` يعرض الآن صورة PNG مع fallback شكلي عند فشل canvas.

### 🌐 الترجمة i18n (Phase 3d)
- `src/i18n/`: قواميس **عربية/إنجليزية** + `getLocale(guildId)` + دالة `t()` مع استبدال المتغيرات.
- `/locale` لتغيير لغة السيرفر، وربط الرسائل في AutoMod والسحوبات.

### 📝 اللوقات والتذاكر (Phase 3e)
- **لوقات كل أعمال الإدارة**: ban/kick/warn/unwarn/timeout/unban/lock/unlock/slowmode/clear عبر `modActionLog`.
- **نظام تذاكر متكامل**: cooldown 30s، منع القنوات المكررة، صلاحيات فريق الدعم (`/setlogs ticket` + `/setrole staff`)، مالك التذكرة في الموضوع، إغلاق بتأكيد 10 ثوانٍ وزر إلغاء، **نسخة نصية DM + حفظ في `data/transcripts/`**، لوقات فتح/إغلاق/استلام.
- أحداث لوق جديدة: `messageDeleteBulk`, `roleUpdate`, `channelUpdate`, `guildBanRemove`.

### 🖥️ لوحة التحكم (Dashboard) (Phase 4)
- تبويب **AutoMod** كامل: تفعيل الكلمات، إضافة/حذف الكلمات، الحدود، warnActions.
- **إعداد اللغة** في تبويب الإعدادات.
- إصلاح: قوائم فئات القنوات (Categories) كانت فارغة — الآن `/api/guild` تُرجع الفئات.

### 🐳 النشر (Phase 5)
- **Dockerfile** متعدد المراحل (build + runtime) مع دعم canvas/الخطوط.
- **docker-compose.yml** مع volumes للبيانات واللوقات + healthcheck عبر `/healthz`.
- **.dockerignore** لتقليل حجم الصورة.

### 🧪 الاختبارات (Phase 5)
- اختبارات جديدة: **i18n** (تكافؤ القواميس + المتغيرات + fallback) و**rankCards** (صحة PNG والحالات الحدّية).
- الإجمالي: **24 اختباراً ناجحاً**.

---

## v2.0.0 — الأساس الشامل
- بوت Discord.js v14 كامل: إدارة، حماية (Anti-Nuke/Anti-Spam/Anti-Link)، موسيقى (discord-player v7)، تذاكر، مستويات XP، اقتصاد وألعاب، ترحيب ببطاقات Canvas، لوحة تحكم SPA بـ SSE live console، تخزين JSON/MongoDB مع ترحيل.

## v1.x — النسخة الأولية
- أوامر أساسية + تشغيل بـ `node bot.js`.
