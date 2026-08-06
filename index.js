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
const srcEntry = path.join(__dirname, 'src', 'index.ts');

if (!fs.existsSync(distEntry)) {
    // dist/ غير موجود (مثلاً خطط مجانية منخفضة الذاكرة)
    // الأولوية: tsx (خفيف جداً — يعتمد على esbuild) ثم tsc كخيار أخير
    try {
        require('tsx/cjs'); // يفعّل دعم استيراد TypeScript مباشرة
        require(srcEntry);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log('[bootstrap] tsx غير متاح — تنفيذ البناء (tsc) ...');
        require('child_process').execSync('npx tsc', { stdio: 'inherit' });
        require(distEntry);
    }
} else {
    require(distEntry);
}
