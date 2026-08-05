# 🤖 بوت ديسكورد شامل (منافس ProBot) — مجاني 100%

بوت متكامل مبني بـ **Discord.js v14** + **discord-player v7** يشمل: الإدارة والحماية (Anti-Spam/Anti-Link)، الترحيب والوداع الاحترافي، الرتبة التلقائية، الرتب الجماعية، نظام التذاكر، نظام المستويات (XP)، اللوقات الكاملة، مشغل موسيقى احترافي (YouTube / Spotify / SoundCloud...)، ولوحة تحكم ويب كاملة — كل ذلك عبر Slash Commands و Embeds احترافية.

---

## ✨ المميزات

| النظام | الوصف |
|---|---|
| 🛡️ الإدارة | ban, kick, mute/timeout, unban, clear, lock, unlock, slowmode, warn, warnings, unwarn |
| 🎵 الموسيقى | play, skip, stop, pause, resume, nowplaying, queue, volume + أزرار تحكم تفاعلية |
| 🎫 التذاكر | فتح/إغلاق/استلام التذاكر تلقائياً داخل فئة مخصصة |
| 📈 المستويات | نظام XP تلقائي + rank + leaderboard + رسائل ترقي |
| 📝 اللوقات | حذف/تعديل الرسائل، إنشاء/حذف القنوات والرتب، انضمام/مغادرة الأعضاء |
| 👋 الترحيب | ترحيب + وداع مخصصان برسائل قابلة للتخصيص + رتبة تلقائية |
| 🛡️ الحماية | Anti-Spam و Anti-Link قابلان للتفعيل لكل سيرفر |
| 🌐 لوحة تحكم | Web Dashboard محمية بكلمة مرور للتحكم الكامل بالبوت |

---

## 📁 هيكل المشروع

```
discord-bot/
├── index.js               ← الملف الرئيسي (البوت + لوحة التحكم + الموسيقى)
├── deploy-commands.js      ← ملف تسجيل الأوامر لدى ديسكورد
├── package.json
├── .env.example            ← انسخه وأعد تسميته .env
├── commands/
│   ├── moderation/         (ban, kick, timeout, unban, clear, lock, unlock, slowmode, warn, warnings, unwarn)
│   ├── music/              (play, skip, stop, pause, resume, nowplaying, queue, volume)
│   ├── roles/              (massrole)
│   ├── info/               (serverinfo, userinfo, botinfo, ping, help, rank, leaderboard)
│   ├── ticket/             (ticket-setup)
│   ├── config/             (setwelcome, setgoodbye, setautorole, setlogs, setprotection, leveltoggle)
│   └── fun/                (say, embed)
├── events/
│   ├── ready.js
│   ├── interactionCreate.js  ← الأوامر + الأزرار (تذاكر/موسيقى/رتب جماعية)
│   ├── messageCreate.js      ← Anti-Spam / Anti-Link + نظام XP
│   ├── guildMemberAdd.js     ← الترحيب + الرتبة التلقائية + لوق انضمام
│   ├── guildMemberRemove.js  ← الوداع + لوق مغادرة
│   ├── messageDelete.js / messageUpdate.js   ← لوقات الرسائل
│   ├── channelCreate.js / channelDelete.js   ← لوقات القنوات
│   └── roleCreate.js / roleDelete.js         ← لوقات الرتب
├── utils/
│   ├── settings.js          ← إعدادات كل سيرفر (JSON)
│   ├── levels.js            ← نظام المستويات
│   ├── warnings.js          ← نظام التحذيرات
│   ├── logger.js            ← تسجيل الأحداث في قنوات اللوقات
│   ├── musicUI.js           ← عناصر واجهة الموسيقى
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
| `/help` | عرض كل الأوامر |

---

## 🎵 أوامر الموسيقى

`/play` (اسم أو رابط) • `/skip` • `/stop` • `/pause` • `/resume` • `/nowplaying` • `/queue` • `/volume`

> يدعم YouTube و Spotify و SoundCloud و Apple Music. كل رسالة تشغيل تحتوي أزرار تحكم تفاعلية.

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

## ❓ استكشاف الأخطاء الشائعة

| المشكلة | الحل |
|---|---|
| الأوامر لا تظهر | نفّذ `node deploy-commands.js` وتأكد من `CLIENT_ID` |
| Missing Permissions | رتبة البوت يجب أن تكون أعلى من الرتب المستهدفة |
| الترحيب لا يعمل | فعّل `SERVER MEMBERS INTENT` ونفّذ `/setwelcome` |
| الحماية لا تعمل | فعّل `MESSAGE CONTENT INTENT` ونفّذ `/setprotection` |
| الموسيقى لا تعمل | تأكد من `GuildVoiceStates` وتثبيت `ffmpeg-static` |
