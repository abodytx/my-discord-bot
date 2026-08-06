# 🤖 بوت ديسكورد شامل (منافس ProBot) — مجاني 100%

بوت متكامل مبني بـ **Discord.js v14** + **discord-player v7** يشمل: الإدارة والحماية (Anti-Spam/Anti-Link/Anti-Nuke)، الترحيب التفاعلي ببطاقات Canvas، الرتبة التلقائية، الرتب الجماعية، نظام التذاكر، نظام المستويات (XP)، نظام الاقتصاد والألعاب المصغرة، اللوقات الكاملة، مشغل موسيقى احترافي (YouTube / Spotify / SoundCloud...)، ولوحة تحكم سحابية **Enterprise** بمظهر Cyberpunk/Glassmorphism مع كونسول حي ورسوم لحظية — كل ذلك عبر Slash Commands و Embeds احترافية.

---

## ✨ المميزات

| النظام | الوصف |
|---|---|
| 🛡️ الإدارة | ban, kick, mute/timeout, unban, clear, lock, unlock, slowmode, warn, warnings, unwarn — **كلها تُسجل في Mod Log** |
| 🤖 AutoMod | فلترة تلقائية: كلمات ممنوعة، حروف كبيرة، إشارات، إيموجي + نظام نقاط تحذير (كتم/طرد/حظر) + لوحة تحكم كاملة |
| 🚨 الحماية الذكية | **Anti-Nuke** (حظر/استعادة تلقائية عند حذف القنوات/الرتب أو الحظر الجماعي) + Anti-Spam (كتم تلقائي) + Anti-Link |
| 🎵 الموسيقى | play, skip, stop, pause, resume, nowplaying, queue, volume + أزرار تحكم تفاعلية + فال باك تلقائي لـ SoundCloud |
| 🎫 التذاكر | فتح/إغلاق/استلام + تأكيد إغلاق + **نسخة نصية DM** + لوقات + صلاحيات فريق الدعم + إدارة من اللوحة |
| 🎉 السحوبات | start/end/reroll بأزرار مشاركة وعداد حي + حفظ واسترجاع عند إعادة التشغيل |
| 🪙 الاقتصاد | /daily /balance /coinflip /slots /ecotop + تعديل الأرصدة من اللوحة |
| 📈 المستويات | نظام XP تلقائي + **بطاقة Rank رسمية (Canvas)** + leaderboard + رسائل ترقي |
| 👋 الترحيب | بطاقات **Canvas** بخلفيات مخصصة (رفع من اللوحة) + ترحيب ووداع مخصصان + رتبة تلقائية |
| 🌐 اللغة | دعم **العربية والإنجليزية** عبر `/locale` (رسائل وأزرار AutoMod والسحوبات) |
| 📝 اللوقات | حذف/تعديل الرسائل، إنشاء/حذف القنوات والرتب، انضمام/مغادرة، حظر/فك حظر، ويب هوك |
| 🌐 لوحة تحكم | SPA بمظهر Cyberpunk + **Live Console** (SSE) + رسوم لحظية + **تبويب AutoMod** + إعداد اللغة + مصادقة |
| 🛡️ Crash Guard | منع توقف البوت نهائياً عند أي خطأ

---

## 📁 هيكل المشروع

```
discord-bot/
├── src/                    ← كود المصدر الكامل (TypeScript)
│   ├── index.ts            ← نقطة الانطلاق (CrashGuard + تحميل آمن للأوامر/الأحداث)
│   ├── deploy-commands.ts  ← تسجيل الأوامر لدى ديسكورد
│   ├── commands/           ← 42 أمراً مقسمة: moderation, economy, music, roles, info, ticket, config, fun
│   ├── events/             ← 17 حدثاً (محمّلة آمنة عبر CrashGuard)
│   ├── modules/            ← antiNuke, autoMod, giveaway, welcomeCards, rankCards, ticketTranscript, liveHub, crashGuard
│   ├── i18n/               ← الترجمات (عربية/إنجليزية) + getLocale/t
│   ├── storage/            ← طبقة تخزين موحدة (MongoDB / JSON + Cache)
│   │   ├── mongoStore.ts   ← التنفيذ الإنتاجي (Mongoose)
│   │   ├── jsonStore.ts    ← التنفيذ المتوافق مع البيانات القديمة
│   │   └── cache.ts        ← طبقة ذاكرة مؤقتة NodeCache
│   ├── utils/              ← settings, levels, warnings, logger, musicUI, musicSearch, embeds, defaults
│   ├── dashboard/          ← لوحة التحكم (server.ts) + dashboard/public (SPA)
│   └── types/              ← الأنواع الموحدة
├── tests/                  ← اختبارات Vitest (منطق المستويات/الموسيقى/الإعدادات)
├── scripts/
│   └── migrate-json-to-mongo.ts ← ترحيل بيانات JSON القديمة إلى MongoDB
├── dashboard/public/       ← واجهة SPA (index.html + style.css + app.js)
├── data/                   ← ملفات JSON للتوافق (تُنشأ تلقائياً)
├── tsconfig.json
├── eslint.config.mjs
└── vitest.config.mts
```

> ملاحظة: المشروع كامل بـ **TypeScript** ويُبنى إلى `dist/`. ملفات `.js` القديمة أُزيلت.

---

## 🚀 خطوات التشغيل الكاملة

### 1️⃣ إنشاء البوت في Discord Developer Portal

1. اذهب إلى: https://discord.com/developers/applications
2. **New Application** ثم **Bot** → **Add Bot**.
3. فعّل **Privileged Gateway Intents**:
   - ✅ `SERVER MEMBERS INTENT`
   - ✅ `MESSAGE CONTENT INTENT`
4. **Reset Token** وانسخ التوكن.
5. من **OAuth2 → General** انسخ **Client ID**.

### 2️⃣ دعوة البوت للسيرفر

- **OAuth2 → URL Generator** → Scopes: `bot` + `applications.commands`.
- صلاحيات: `Administrator` (الأسهل) أو: `Manage Roles`, `Manage Channels`, `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Messages`, `Send Messages`, `Embed Links`, `Read Message History`, `View Channels`.
- **مهم:** ارفع رتبة البوت **فوق** الرتب التي تريد إدارتها.

### 3️⃣ التثبيت والإعداد

```bash
cd discord-bot
npm install
cp .env.example .env   # ثم عدّل .env وضع بياناتك
```

> ⚠️ ضع كلمة مرور قوية في `DASHBOARD_PASSWORD` لحماية لوحة التحكم.
>
> 💾 **التخزين:** اترك `DB_URI` فارغاً لاستخدام JSON (للتوافق)، أو اضبط `DB_URI=mongodb://...` لاستخدام **MongoDB** الإنتاجي. لترحيل بياناتك القديمة من JSON إلى MongoDB: `npm run migrate`.

### 4️⃣ البناء وتسجيل الأوامر وتشغيل البوت

```bash
npm run build            # ترجمة TypeScript إلى dist/
npm run deploy           # تسجيل الأوامر (استخدم GUILD_ID للتسجيل الفوري أثناء التجربة)
npm start                # تشغيل البوت (يعمل من dist/)
```

أثناء التطوير استخدم: `npm run dev` (تشغيل مباشر مع إعادة تحميل تلقائي).

لوحة التحكم تفتح على: `http://localhost:3000`

### 🧪 الاختبارات والجودة

```bash
npm run typecheck        # فحص الأنواع (tsc --noEmit)
npm run lint             # فحص الكود (ESLint)
npm test                 # تشغيل اختبارات Vitest
```

> يتم تشغيل `lint-staged` + الاختبارات تلقائياً عند كل commit عبر **Husky**.

---

## ⚙️ أوامر الإعداد داخل السيرفر

| الأمر | الوظيفة |
|---|---|
| `/setwelcome القناة:#ترحيب` | تفعيل رسائل الترحيب |
| `/setgoodbye القناة:#وداع` | تفعيل رسائل الوداع |
| `/setautorole الرتبة:@عضو` | الرتبة التلقائية للأعضاء الجدد |
| `/setlogs mod القناة:#لوقات` | قناة لوقات الإدارة |
| `/setlogs members القناة:#أعضاء` | قناة لوقات الأعضاء |
| `/setlogs ticket القناة:#لوقات` | قناة لوقات التذاكر |
| `/setprotection النظام:Anti-Spam تفعيل:true` | تفعيل الحماية من السبام |
| `/automod` | إعداد AutoMod (كلمات/حدود/إجراءات) |
| `/giveaway start` | بدء سحب بجائزة ومدة وفائزين |
| `/locale` | تغيير لغة السيرفر (عربية/إنجليزية) |
| `/leveltoggle تفعيل:true` | تفعيل نظام المستويات (XP) |
| `/ticket-setup` | إرسال رسالة فتح التذاكر في القناة الحالية |
| `/daily` | مكافأة يومية (200 🪙) |
| `/balance` | عرض رصيدك أو رصيد عضو آخر |
| `/coinflip` | لعبة عملة معدنية (مضاعفة النقود) |
| `/slots` | ماكينة الحظ |
| `/ecotop` | قائمة أغنى 10 أعضاء |
| `/help` | عرض كل الأوامر |

---

## 🎵 أوامر الموسيقى

`/play` (اسم أو رابط) • `/skip` • `/stop` • `/pause` • `/resume` • `/nowplaying` • `/queue` • `/volume`

> يدعم YouTube و Spotify و SoundCloud و Apple Music. كل رسالة تشغيل تحتوي أزرار تحكم تفاعلية.

### ⚠️ مهم: ضبط الكوكيز لتشغيل يوتيوب

يوتيوب أصبح يطلب تسجيل دخول للبث (2026). إذا دخل البوت الروم الصوتي لكن ما شغّل أغاني يوتيوب، الحل إضافة كوكيز:

1. سجّل دخول بحساب يوتيوب احتياطي في متصفحك.
2. افتح أدوات المطور `F12` → **Application** → **Cookies** → `https://www.youtube.com`.
3. انسخ قيم الكوكيز `SID`, `HSID`, `SSID` وضعها في `.env`:
   ```
   YOUTUBE_COOKIE=SID=...; HSID=...; SSID=...
   ```
4. أعد تشغيل البوت.

> المرجع الكامل: https://ytjs.dev/guide/authentication.html#cookies
>
> 💡 **بدون كوكيز:** SoundCloud و Apple Music و Vimeo تعمل مباشرة بدون أي إعداد. استخدم `/play` مع كلمات أو روابط SoundCloud كبديل فوري.

---

## 🔧 أوامر الإدارة

`/ban` `/kick` `/mute` `/unban` `/clear` `/lock` `/unlock` `/slowmode` `/warn` `/warnings` `/unwarn` `/mass-role give` `/mass-role remove`

---

## 🖥️ تشغيل 24/7

```bash
npm install -g pm2
pm2 start dist/index.js --name "my-bot"
pm2 save
```

⚠️ لا ترفع ملف `.env` إلى GitHub — تمت إضافته إلى `.gitignore`.

---

## 🐳 النشر عبر Docker (موصى به للخوادم VPS)

```bash
cp .env.example .env   # عدّل بياناتك أولاً
docker compose up -d --build
```

- يعيد التشغيل تلقائياً (`restart: unless-stopped`).
- مجلدات `data/` و`logs/` مثبتة كـ Volumes فتبقى بعد تحديث الصورة.
- فحص الصحة عبر `/healthz` تلقائياً.
- اللوحة على `http://localhost:3000`.

> البناء متعدد المراحل: يُثبت أدوات التجميع فقط في مرحلة البناء (لـ canvas)، فتخرج صورة التشغيل صغيرة وآمنة.

---

## ☁️ النشر على Render (مجاني)

يوجد ملف `render.yaml` جاهز في المشروع. خطوات النشر:

1. ارفع المشروع إلى GitHub (أول مرة: `git init` ثم `git push`).
2. في [Render.com](https://render.com) → **New** → **Blueprint** → اختر المستودع.
3. سيقرأ `render.yaml` تلقائياً وأنشئ الخدمة باسم `discord-bot-dashboard`.
4. من تبويب **Environment** في الخدمة اضبط الأسرار (Secrets):
   - `DISCORD_TOKEN` ← توكن البوت
   - `CLIENT_ID` ← معرف التطبيق
   - `DASHBOARD_PASSWORD` ← كلمة مرور قوية للوحة
   - `YOUTUBE_COOKIE` ← اختياري (لتشغيل يوتيوب)
5. يفحص Render صحة الخدمة عبر `/healthz` (مضبوط في الملف).
6. لوحة التحكم ستكون متاحة على رابط الخدمة: `https://<اسم-الخدمة>.onrender.com`

> 💡 خطط Render المجانية تنام بعد ~15 دقيقة من الخمول، وتستيقظ تلقائياً مع أول زيارة (قد يتأخر أول رد).

---

## 🛡️ أوامر الحماية المتقدمة (Anti-Nuke)

| الأمر | الوظيفة |
|---|---|
| `/antinuke on` | تفعيل الحماية من التدمير |
| `/antinuke off` | تعطيلها |
| `/antinuke limit عدد:3` | الحد الأقصى للأعمال قبل الحظر (خلال 6 ثوانٍ) |
| `/antinuke whitelist نوع:عضو إجراء:إضافة عضو:@فلان` | إعفاء عضو من الحماية |
| `/antinuke whitelist نوع:رتبة إجراء:إضافة رتبة:@رتبة` | إعفاء رتبة كاملة |
| `/antinuke status` | عرض الحالة والقائمة البيضاء |
| `/setprotection النظام:Anti-Nuke تفعيل:true` | تفعيل سريع من أمر الحماية |

> نظام Anti-Nuke يرصد: حذف القنوات/الرتب الجماعي، الحظر/الطرد الجماعي، إنشاء القنوات الجماعي (Raid)، وسبام الويب هوك — مع **استعادة تلقائية** للعناصر المحذوفة وإشعار صاحب السيرفر.

---

## ❓ استكشاف الأخطاء الشائعة

| المشكلة | الحل |
|---|---|
| الأوامر لا تظهر | نفّذ `node deploy-commands.js` وتأكد من `CLIENT_ID` |
| Missing Permissions | رتبة البوت يجب أن تكون أعلى من الرتب المستهدفة |
| الترحيب لا يعمل | فعّل `SERVER MEMBERS INTENT` ونفّذ `/setwelcome` |
| الحماية لا تعمل | فعّل `MESSAGE CONTENT INTENT` ونفّذ `/setprotection` |
| الموسيقى لا تعمل | تأكد من `GuildVoiceStates` وتثبيت `ffmpeg-static`، وإذا كان يوتيوب فقط: أضف `YOUTUBE_COOKIE` في `.env` (انظر قسم الموسيقى أعلاه) |
| البوت يدخل الروم لكن لا يوجد صوت | غالباً يوتيوب يحجب البث بدون تسجيل دخول → أضف `YOUTUBE_COOKIE` أو استخدم SoundCloud |
