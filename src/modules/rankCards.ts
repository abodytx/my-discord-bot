// =====================================================
// Rank Cards - توليد بطاقات الرتبة/المستوى عبر Canvas
// - خلفية متدرجة + صورة رمزية دائرية + شريط تقدم XP
// - نفس نمط بطاقات الترحيب (welcomeCards) مع ألوان مخصصة
// =====================================================

import { createCanvas, loadImage } from 'canvas';

const FONT_CANDIDATES = ['Arial', 'Tahoma', 'Segoe UI', 'sans-serif'];

async function fontFamily(): Promise<string> {
    for (const f of FONT_CANDIDATES) {
        try {
            const canvas = await import('canvas');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fontList: string[] = (canvas as any).fontList;
            if (fontList && fontList.indexOf(f) !== -1) return f;
        } catch {
            /* ignore */
        }
    }
    return 'Arial';
}

export interface RankCardOptions {
    username: string;
    avatarURL?: string | null;
    level: number;
    rank: number;
    xpInLevel: number;
    xpForNextLevel: number;
    totalXp: number;
    progress: number;
    accent?: string;
}

/**
 * توليد بطاقة رتبة للمستخدم
 * @param opts بيانات المستوى والمظهر
 * @returns PNG buffer
 */
export async function generateRankCard(opts: RankCardOptions): Promise<Buffer> {
    const W = 1200;
    const H = 420;

    const username = opts.username.slice(0, 26);
    const level = opts.level;
    const rank = opts.rank > 0 ? opts.rank : 0;
    const xpInLevel = opts.xpInLevel;
    const xpForNextLevel = Math.max(1, opts.xpForNextLevel);
    const totalXp = opts.totalXp;
    const progress = Math.max(0, Math.min(1, opts.progress));
    const accent = opts.accent || '#00f0ff';

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const font = await fontFamily();

    // ---------- الخلفية المتدرجة ----------
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0b1026');
    grad.addColorStop(0.5, '#141b3a');
    grad.addColorStop(1, '#10222e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // ---------- إطار متوهج ----------
    ctx.shadowColor = accent;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, W - 68, H - 68);

    // شريط زخرفي سفلي
    const barGrad = ctx.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, accent);
    barGrad.addColorStop(0.5, '#ff2ec4');
    barGrad.addColorStop(1, accent);
    ctx.fillStyle = barGrad;
    ctx.fillRect(24, H - 24, W - 48, 4);

    // ---------- الصورة الرمزية (دائرة) ----------
    const avX = 130;
    const avY = H / 2;
    const avR = 92;

    ctx.beginPath();
    ctx.arc(avX, avY, avR + 10, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 26;
    ctx.fill();
    ctx.shadowBlur = 0;

    let avatar: import('canvas').Image | null = null;
    if (opts.avatarURL) {
        try {
            avatar = await loadImage(opts.avatarURL);
        } catch {
            avatar = null;
        }
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (avatar) {
        ctx.drawImage(avatar, avX - avR, avY - avR, avR * 2, avR * 2);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
    }
    ctx.restore();

    // ---------- النصوص ----------
    const xText = 280;
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#94a3b8';
    ctx.font = `26px ${font}`;
    ctx.fillText(rank ? `RANK  #${rank}` : 'RANK  —', xText, 110);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold 46px ${font}`;
    ctx.fillText(username, xText, 180);

    // شريط التقدم
    const barX = xText;
    const barY = 280;
    const barW = 720;
    const barH = 34;

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barH / 2);
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(barH, barW * progress), barH, barH / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#0b1026';
    ctx.font = `bold 20px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${xpInLevel} / ${xpForNextLevel} XP`, barX + barW / 2, barY + barH / 2 + 1);
    ctx.textAlign = 'start';

    // المستوى (يسار) و إجمالي XP (يمين)
    ctx.fillStyle = accent;
    ctx.font = `bold 34px ${font}`;
    ctx.textAlign = 'right';
    ctx.fillText(`LEVEL ${level}`, W - 70, 120);
    ctx.textAlign = 'start';

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `26px ${font}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${totalXp.toLocaleString()} XP`, W - 70, 170);
    ctx.textAlign = 'start';

    // شعار زخرفي
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.font = `bold 90px ${font}`;
    ctx.fillText('★', W - 90, H - 60);

    return canvas.toBuffer('image/png');
}
