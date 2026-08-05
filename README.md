# 🤖 بوت ديسكورد شامل (منافس ProBot) — مجاني 100%

بوت متكامل مبني بـ **Discord.js v14** يدعم: الترحيب الاحترافي، الرتبة التلقائية، إدارة الرتب الجماعية، الإدارة والحماية (Anti-Spam/Anti-Link)، نظام التذاكر، ومعلومات السيرفر/الأعضاء — كل ذلك عبر Slash Commands و Embeds احترافية.

---

## 📁 هيكل المشروع

```
discord-bot/
├── index.js               ← الملف الرئيسي لتشغيل البوت
├── deploy-commands.js      ← ملف تسجيل الأوامر لدى ديسكورد
├── package.json
├── .env.example            ← انسخه وأعد تسميته .env
├── commands/
│   ├── moderation/          (ban, kick, mute, clear)
│   ├── roles/                (mass-role)
│   ├── info/                  (serverinfo, userinfo, help)
│   ├── ticket/                (ticket-setup)
│   └── config/                (setwelcome, setautorole, setprotection)
├── events/
│   ├── ready.js
│   ├── guildMemberAdd.js     ← الترحيب + الرتبة التلقائية
│   ├── interactionCreate.js  ← تنفيذ الأوامر + الأزرار
│   └── messageCreate.js      ← Anti-Spam / Anti-Link
├── utils/
│   ├── settings.js           ← تخزين إعدادات كل سيرفر (JSON)
│   └── embeds.js              ← قوالب Embeds موحدة
└── data/
    └── settings.json          ← يُنشأ تلقائياً عند أول تشغيل
```

---

## 🚀 خطوات التشغيل الكاملة

### الخطوة 1: إنشاء تطبيق البوت في Discord Developer Portal

1. اذهب إلى: https://discord.com/developers/applications
2. اضغط **New Application** وأعطه اسماً.
3. من القائمة الجانبية اذهب إلى **Bot** → اضغط **Add Bot**.
4. فعّل الخيارات التالية تحت **Privileged Gateway Intents** (مهم جداً):
   - ✅ `SERVER MEMBERS INTENT`
   - ✅ `MESSAGE CONTENT INTENT`
5. اضغط **Reset Token** ثم انسخ التوكن (لن يظهر مرة أخرى، احفظه في مكان آمن).
6. من صفحة **OAuth2 → General** انسخ **Client ID** (Application ID).

### الخطوة 2: دعوة البوت إلى سيرفرك

1. اذهب إلى **OAuth2 → URL Generator**.
2. اختر Scopes: `bot` و `applications.commands`.
3. اختر الصلاحيات (Permissions) التالية على الأقل:
   `Administrator` (الأسهل)، أو بشكل أدق:
   `Manage Roles`, `Manage Channels`, `Kick Members`, `Ban Members`,
   `Moderate Members`, `Manage Messages`, `Send Messages`,
   `Embed Links`, `Read Message History`, `View Channels`.
4. انسخ الرابط الناتج بالأسفل وافتحه في المتصفح، ثم اختر سيرفرك وادعُ البوت.

> ⚠️ **مهم:** بعد دعوة البوت، اذهب إلى إعدادات السيرفر → الرتب، واسحب **رتبة البوت للأعلى** (فوق أي رتبة تريد إدارتها لاحقاً بالرتب الجماعية أو الرتبة التلقائية).

### الخطوة 3: تجهيز المشروع على جهازك

تأكد أن لديك [Node.js](https://nodejs.org) إصدار 18 أو أحدث مثبت (`node -v` للتأكد).

```bash
# 1. افتح الطرفية (Terminal) داخل مجلد المشروع discord-bot
cd discord-bot

# 2. تثبيت الحزم المطلوبة
npm install
```

### الخطوة 4: إعداد ملف البيئة (.env)

1. انسخ ملف `.env.example` وأعد تسميته إلى `.env`
2. افتحه وضع بياناتك:

```env
DISCORD_TOKEN=التوكن_الذي_نسخته_في_الخطوة_1
CLIENT_ID=معرف_التطبيق_الذي_نسخته_في_الخطوة_1
GUILD_ID=معرف_سيرفرك (اختياري - للتسجيل السريع أثناء التجربة)
```

> 💡 **كيف أحصل على GUILD_ID؟** فعّل "وضع المطور" في ديسكورد (الإعدادات → متقدم → Developer Mode)، ثم اضغط كليك يمين على أيقونة السيرفر → Copy Server ID.

### الخطوة 5: تسجيل الأوامر (Slash Commands)

```bash
node deploy-commands.js
```

يجب أن ترى رسالة تفيد بنجاح تسجيل الأوامر. إذا وضعت `GUILD_ID` ستظهر الأوامر فوراً؛ وإلا فقد تستغرق حتى ساعة للظهور عالمياً.

### الخطوة 6: تشغيل البوت

```bash
node index.js
```

إذا رأيت `✅ تم تسجيل الدخول بنجاح باسم: ...` فالبوت يعمل الآن بنجاح! 🎉

---

## ⚙️ أوامر الإعداد الأولي داخل السيرفر (بعد التشغيل)

نفّذ هذه الأوامر داخل ديسكورد لإعداد الميزات:

| الأمر | الوظيفة |
|---|---|
| `/setwelcome القناة:#ترحيب` | تفعيل رسائل الترحيب في قناة معينة |
| `/setautorole الرتبة:@عضو` | تفعيل الرتبة التلقائية للأعضاء الجدد |
| `/setprotection النظام:Anti-Spam تفعيل:true` | تفعيل الحماية من السبام |
| `/setprotection النظام:Anti-Link تفعيل:true` | تفعيل الحماية من الروابط |
| `/ticket-setup` | إرسال رسالة فتح التذاكر في القناة الحالية |
| `/help` | عرض كل الأوامر المتاحة |

---

## 🔧 أوامر الإدارة والاستخدام اليومي

- `/ban العضو:@شخص السبب:...` — حظر عضو
- `/kick العضو:@شخص` — طرد عضو
- `/mute العضو:@شخص المدة:10m` — إسكات مؤقت (m=دقائق, h=ساعات, d=أيام)
- `/clear العدد:50` — حذف 50 رسالة
- `/mass-role give الرتبة:@VIP` — إعطاء رتبة لكل الأعضاء (مع تأكيد بزر)
- `/mass-role remove الرتبة:@VIP` — سحب رتبة من كل الأعضاء
- `/serverinfo` / `/userinfo` — معلومات السيرفر/العضو

---

## 🖥️ تشغيل البوت 24/7 (استضافة مجانية)

`node index.js` يوقف البوت عند إغلاق الطرفية. للتشغيل الدائم مجاناً جرّب:

- **Railway.app** أو **Render.com** — استضافة مجانية بحدود شهرية، تدعم رفع مشاريع Node.js مباشرة من GitHub.
- **VPS خاص بك** مع أداة `pm2`:
  ```bash
  npm install -g pm2
  pm2 start index.js --name "my-bot"
  pm2 save
  ```

⚠️ لا تنسَ رفع ملف `.env` بأمان (لا ترفعه إلى GitHub علناً — أضف `.env` إلى `.gitignore`).

---

## ❓ استكشاف الأخطاء الشائعة

| المشكلة | الحل |
|---|---|
| الأوامر لا تظهر في ديسكورد | نفّذ `node deploy-commands.js` مرة أخرى، وتأكد من `CLIENT_ID` الصحيح |
| خطأ "Missing Permissions" | تأكد أن رتبة البوت أعلى من الرتبة التي تحاول إدارتها |
| رسالة الترحيب لا تظهر | تأكد من تفعيل `SERVER MEMBERS INTENT` من Developer Portal ونفّذ `/setwelcome` |
| Anti-Spam/Anti-Link لا يعمل | تأكد من تفعيل `MESSAGE CONTENT INTENT` ونفّذ `/setprotection` |
