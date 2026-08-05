// =====================================================
// Welcome Cards - توليد بطاقات ترحيب رسمية عبر Canvas
// - خلفية مخصصة لكل سيرفر (data/welcome/{guildId}.png)
// - دائرة الصورة الرمزية + الاسم + رقم العضو
// =====================================================

const fs = require('fs');
const path = require('path');
const canvasModule = require('canvas');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WELCOME_DIR = path.join(DATA_DIR, 'welcome');
if (!fs.existsSync(WELCOME_DIR)) fs.mkdirSync(WELCOME_DIR, { recursive: true });

const { createCanvas, loadImage, registerFont } = canvasModule;

// محاولة تحميل خط يدعم العربية (Arial متوفر على ويندوز)
const FONT_CANDIDATES = ['Arial', 'Tahoma', 'Segoe UI', 'sans-serif'];

async function fontFamily() {
    for (const f of FONT_CANDIDATES) {
        try {
            const { fontList } = await canvasModule;
            if (fontList && fontList.indexOf(f) !== -1) return f;
        } catch { /* ignore */ }
    }
    return 'Arial';
}

function guildBackgroundPath(guildId) {
    return path.join(WELCOME_DIR, `${guildId}.png`);
}

function hasCustomBackground(guildId) {
    return fs.existsSync(guildBackgroundPath(guildId));
}

/**
 * توليد بطاقة ترحيب للمستخدم
 * @param {object} member - Discord GuildMember
 * @param {object} opts   - { guildId, memberCount, username, avatarURL, accent }
 * @returns {Promise<Buffer>} PNG buffer
 */
async function generateWelcomeCard(member, opts = {}) {
    const W = 1200;
    const H = 420;

    const guildId = opts.guildId || member.guild.id;
    const username = (opts.username || member.displayName || member.user?.username || 'member').slice(0, 26);
    const memberCount = opts.memberCount || member.guild.memberCount;
    let avatarURL = opts.avatarURL;
    if (!avatarURL) {
        try { avatarURL = member.user?.displayAvatarURL({ extension: 'png', size: 512 }); } catch { avatarURL = null; }
    }
    const accent = opts.accent || '#00f0ff';

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const font = await fontFamily();

    // ---------- الخلفية ----------
    let bg;
    try {
        if (hasCustomBackground(guildId)) {
            bg = await loadImage(guildBackgroundPath(guildId));
            ctx.drawImage(bg, 0, 0, W, H);
            // طبقة تعتيم لضمان وضوح النص
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, 'rgba(2,6,23,0.72)');
            grad.addColorStop(1, 'rgba(2,6,23,0.88)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        } else {
            const grad = ctx.createLinearGradient(0, 0, W, H);
            grad.addColorStop(0, '#0b1026');
            grad.addColorStop(0.5, '#111a3d');
            grad.addColorStop(1, '#0d2b33');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        }
    } catch {
        ctx.fillStyle = '#0b1026';
        ctx.fillRect(0, 0, W, H);
    }

    // ---------- إطاران متوهجان ----------
    ctx.shadowColor = accent;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, W - 68, H - 68);

    // ---------- شريط زخرفي سفلي ----------
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

    let avatar;
    try {
        avatar = await loadImage(avatarURL);
    } catch {
        avatar = null;
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
    ctx.fillText('WELCOME TO', xText, 120);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold 52px ${font}`;
    const nameWidth = ctx.measureText(username).width;
    ctx.fillText(username, xText, 205);

    // خط متوهج تحت الاسم
    ctx.shadowColor = accent;
    ctx.shadowBlur = 14;
    ctx.fillStyle = accent;
    ctx.fillRect(xText, 250, Math.min(nameWidth, 520), 4);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `30px ${font}`;
    ctx.fillText(`MEMBER  #${memberCount}`, xText, 320);

    // ---------- شعار زخرفي ----------
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.font = `bold 120px ${font}`;
    ctx.fillText('✦', W - 170, H - 90);

    return canvas.toBuffer('image/png');
}

module.exports = { generateWelcomeCard, hasCustomBackground, guildBackgroundPath };
