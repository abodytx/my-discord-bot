// =====================================================
// index.js — نقطة تشغيل متوافقة مع الناشرين السحابيين
// بعض المنصات (مثل Render) تشغّل `node index.js` دون تنفيذ `npm run build`.
// هذا الملف يبني TypeScript تلقائياً (إن لم يكن dist/ موجوداً) ثم يشغّل البوت.
// في المحلي يفضل استخدام: npm run build && npm start
// =====================================================

'use strict';

const fs = require('fs');
const path = require('path');

const distEntry = path.join(__dirname, 'dist', 'index.js');

if (!fs.existsSync(distEntry)) {
    // eslint-disable-next-line no-console
    console.log('[bootstrap] dist/ غير موجود — تنفيذ البناء (tsc) ...');
    require('child_process').execSync('npx tsc', { stdio: 'inherit' });
}

require(distEntry);
