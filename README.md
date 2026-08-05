# 🤖 بوت ديسكورد شامل (منافس ProBot) — مجاني 100%

بوت متكامل مبني بـ **Discord.js v14** + **discord-player v7** يشمل: الإدارة والحماية (Anti-Spam/Anti-Link/Anti-Nuke)، الترحيب التفاعلي ببطاقات Canvas، الرتبة التلقائية، الرتب الجماعية، نظام التذاكر، نظام المستويات (XP)، نظام الاقتصاد والألعاب المصغرة، اللوقات الكاملة، مشغل موسيقى احترافي (YouTube / Spotify / SoundCloud...)، ولوحة تحكم سحابية **Enterprise** بمظهر Cyberpunk/Glassmorphism مع كونسول حي ورسوم لحظية — كل ذلك عبر Slash Commands و Embeds احترافية.

---

## ✨ المميزات

| النظام | الوصف |
|---|---|
| 🛡️ الإدارة | ban, kick, mute/timeout, unban, clear, lock, unlock, slowmode, warn, warnings, unwarn |
| 🚨 الحماية الذكية | **Anti-Nuke** (حظر/استعادة تلقائية عند حذف القنوات/الرتب أو الحظر الجماعي) + Anti-Spam (كتم تلقائي) + Anti-Link |
| 🎵 الموسيقى | play, skip, stop, pause, resume, nowplaying, queue, volume + أزرار تحكم تفاعلية + فال باك تلقائي لـ SoundCloud |
| 🎫 التذاكر | فتح/إغلاق/استلام التذاكر + إدارة كاملة من لوحة التحكم |
| 🪙 الاقتصاد | /daily /balance /coinflip /slots /ecotop + تعديل الأرصدة من اللوحة |
| 📈 المستويات | نظام XP تلقائي + rank + leaderboard + رسائل ترقي |
| 👋 الترحيب | بطاقات **Canvas** بخلفيات مخصصة (رفع من اللوحة) + ترحيب ووداع مخصصان + رتبة تلقائية |
| 📝 اللوقات | حذف/تعديل الرسائل، إنشاء/حذف القنوات والرتب، انضمام/مغادرة، حظر، ويب هوك |
| 🌐 لوحة تحكم | SPA بمظهر Cyberpunk + **Live Console** (SSE) + رسوم لحظية (CPU/RAM/Ping) + مصادقة |
| 🛡️ Crash Guard | منع توقف البوت نهائياً عند أي خطأ

---

## 📁 هيكل المشروع

```
discord-bot/
├── index.js               ← الملف الرئيسي (Modular: البوت + اللوحة + الموسيقى + الحماية)
├── deploy-commands.js      ← ملف تسجيل الأوامر لدى ديسكورد
├── package.json
├── .env.example            ← انسخه وأعد تسميته .env
├── commands/
│   ├── moderation/         (ban, kick, timeout, unban, clear, lock, unlock, slowmode, warn, warnings, unwarn)
│   ├── economy/            (balance, daily, coinflip, slots, ecotop)
│   ├── music/              (play, skip, stop, pause, resume, nowplaying, queue, volume)
│   ├── roles/              (massrole)
│   ├── info/               (serverinfo, userinfo, botinfo, ping, help, rank, leaderboard)
│   ├── ticket/             (ticket-setup)
│   ├── config/             (setwelcome, setgoodbye, setautorole, setlogs, setprotection, leveltoggle)
│   └── fun/                (say, embed)
├── events/                 ← كلها آمنة عبر CrashGuard
│   ├── ready.js
│   ├── interactionCreate.js  ← الأوامر + الأزرار (تذاكر/موسيقى/رتب جماعية)
│   ├── messageCreate.js      ← Anti-Spam (كتم تلقائي) / Anti-Link + نظام XP
│   ├── guildMemberAdd.js     ← بطاقة ترحيب Canvas + الرتبة التلقائية + لوق
│   ├── guildMemberRemove.js  ← الوداع + كشف الطرد الجماعي
│   ├── guildBanAdd.js        ← لوق + حماية Mass Ban
│   ├── webhookCreate.js      ← لوق + حماية سبام الويب هوك
│   ├── messageDelete.js / messageUpdate.js   ← لوقات الرسائل
│   ├── channelCreate.js / channelDelete.js   ← لوق + كشف Raid + استعادة القنوات
│   └── roleCreate.js / roleDelete.js         ← لوق + استعادة الرتب
├── modules/
│   ├── antiNuke.js          ← محرك الحماية الذكية (نافذة زمنية + استعادة)
│   ├── economy.js           ← نظام الاقتصاد (data/economy.json)
│   ├── welcomeCards.js      ← توليد بطاقات الترحيب (Canvas)
│   ├── liveHub.js           ← بث الأحداث للوحة (SSE)
│   └── crashGuard.js        ← منع توقف البوت نهائياً
├── dashboard/
│   ├── server.js            ← خادم اللوحة (مصادقة + SSE + APIs)
│   └── public/              ← واجهة SPA (index.html + style.css + app.js)
├── utils/
│   ├── settings.js          ← إعدادات كل سيرفر (JSON)
│   ├── levels.js            ← نظام المستويات
│   ├── warnings.js          ← نظام التحذيرات
│   ├── logger.js            ← تسجيل الأحداث في قنوات اللوقات
│   ├── musicUI.js           ← عناصر واجهة الموسيقى
│   ├── musicSearch.js       ← فال باك تلقائي لـ SoundCloud
│   └── embeds.js            ← قوالب Embeds موحدة
└── data/                    ← ملفات البيانات (تُنشأ تلقائياً)
```

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

### 4️⃣ تسجيل الأوامر وتشغيل البوت

```bash
node deploy-commands.js   # تسجيل الأوامر (استخدم GUILD_ID للتسجيل الفوري أثناء التجربة)
node index.js             # تشغيل البوت
```

لوحة التحكم تفتح على: `http://localhost:3000`

---

## ⚙️ أوامر الإعداد داخل السيرفر

| الأمر | الوظيفة |
|---|---|
| `/setwelcome القناة:#ترحيب` | تفعيل رسائل الترحيب |
| `/setgoodbye القناة:#وداع` | تفعيل رسائل الوداع |
| `/setautorole الرتبة:@عضو` | الرتبة التلقائية للأعضاء الجدد |
| `/setlogs mod القناة:#لوقات` | قناة لوقات الإدارة |
| `/setlogs members القناة:#أعضاء` | قناة لوقات الأعضاء |
| `/setprotection النظام:Anti-Spam تفعيل:true` | تفعيل الحماية من السبام |
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
pm2 start index.js --name "my-bot"
pm2 save
```

⚠️ لا ترفع ملف `.env` إلى GitHub — تمت إضافته إلى `.gitignore`.

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
