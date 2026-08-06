// =====================================================
// app.js — منطق لوحة التحكم (Vanilla JS SPA)
// =====================================================

let state = {
  guildId: '',
  members: [],
  economy: [],
  cpuData: [],
  cpuLabels: [],
  health: null
};

// ---------- أدوات ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function toast(msg, ok = true) {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast show ${ok ? 'ok' : 'err'}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------- التنقل بين التبويبات ----------
const TITLES = {
  dashboard: 'لوحة الإحصائيات',
  console: 'الكونسول الحي',
  moderation: 'الإدارة والرصد',
  protection: 'الحماية Anti-Nuke',
  welcome: 'الترحيب والبطاقات',
  economy: 'الاقتصاد',
  tickets: 'الدعم الفني',
  music: 'المشغل',
  settings: 'الإعدادات'
};

function switchTab(name) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${name}`));
  $('pageTitle').textContent = TITLES[name] || name;
  if (name === 'moderation') loadMembers();
  if (name === 'economy') loadEconomy();
}

document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => switchTab(n.dataset.tab)));

// ---------- تحميل السيرفرات ----------
async function loadGuilds() {
  try {
    const guilds = await api('/api/guilds');
    const sel = $('guildSelect');
    sel.innerHTML = '<option value="">— اختر السيرفر —</option>' + guilds
      .map(g => `<option value="${g.id}">${esc(g.name)} (${g.memberCount})</option>`)
      .join('');
    if (guilds.length) {
      sel.value = guilds[0].id;
      state.guildId = guilds[0].id;
      onGuildChange();
    }
  } catch (e) {
    toast('تعذر تحميل السيرفرات', false);
  }
}

$('guildSelect').addEventListener('change', (e) => {
  state.guildId = e.target.value;
  onGuildChange();
});

async function loadBotInfo() {
  try {
    const me = await api('/api/me');
    $('botName').textContent = me.username || 'البوت';
    if (me.avatar) $('botAvatar').src = me.avatar;
  } catch { /* ignore */ }
}

// ---------- ملء القوائم من إعدادات السيرفر ----------
function fillSelect(id, items, current, prefix = '#') {
  const sel = $(id);
  sel.innerHTML = '<option value="">— لا شيء —</option>' + items
    .map(c => `<option value="${c.id}" ${String(c.id) === String(current) ? 'selected' : ''}>${prefix}${esc(c.name)}</option>`)
    .join('');
}

function fillCategories(id, items, current) {
  const sel = $(id);
  sel.innerHTML = '<option value="">— بدون فئة —</option>' + items
    .map(c => `<option value="${c.id}" ${String(c.id) === String(current) ? 'selected' : ''}>📁 ${esc(c.name)}</option>`)
    .join('');
}

async function onGuildChange() {
  const gid = state.guildId;
  if (!gid) return;
  try {
    const g = await api(`/api/guild?guild=${gid}`);
    const s = g.settings;
    const texts = g.channels.filter(c => c.type === 0);
    const voices = g.channels.filter(c => c.type === 2);
    const categories = g.channels.filter(c => c.type === 4);

    fillSelect('welcomeChannel', texts, s.welcomeChannelId);
    fillSelect('goodbyeChannel', texts, s.goodbyeChannelId);
    fillSelect('rulesChannel', texts, s.rulesChannelId);
    fillSelect('modLogChannel', texts, s.modLogChannelId);
    fillSelect('memberLogChannel', texts, s.memberLogChannelId);
    fillSelect('ticketLog', texts, s.ticketLogChannelId);
    fillSelect('levelChannel', texts, s.levelUpChannelId);
    fillSelect('musicVoice', voices, null);
    fillSelect('musicText', texts, null);
    fillSelect('sayChannel', texts, null);
    fillCategories('ticketCategory', categories, s.ticketCategoryId);
    fillSelect('ticketStaff', g.roles, s.staffRoleId);
    fillSelect('autoRole', g.roles, s.autoRoleId, '');

    $('welcomeMessage').value = s.welcomeMessage || '';
    $('goodbyeMessage').value = s.goodbyeMessage || '';
    $('welcomeEnabled').checked = Boolean(s.welcomeChannelId);
    $('pgAntiNuke').checked = Boolean(s.antiNuke);
    $('pgAntiSpam').checked = Boolean(s.antiSpam);
    $('pgAntiLink').checked = Boolean(s.antiLink);
    $('pgMaxActions').value = s.maxNukeActions || 3;
    $('levelEnabled').checked = Boolean(s.levelSystem);

    // AutoMod
    $('amBadWordsEnabled').checked = Boolean(s.badWordsEnabled);
    $('amMentionLimit').value = s.mentionLimit ?? 5;
    $('amEmojiLimit').value = s.emojiLimit ?? 10;
    $('amCapsLimit').value = s.capsLimit ?? 0;
    const act = Array.isArray(s.warnActions) ? s.warnActions[0] : null;
    $('amWarnPoints').value = act?.points ?? 0;
    $('amWarnAction').value = act?.action ?? 'timeout';
    $('amWarnDuration').value = act?.durationMin ?? 60;
    renderAutoWords(s.badWords || []);
    $('botLocale').value = s.locale === 'en' ? 'en' : 'ar';

    loadWhitelist();
    loadBackgroundStatus();
    loadEconomy();
    loadMembers();
  } catch (e) {
    toast(e.message, false);
  }
}

// ===================== LIVE (SSE) =====================
const MAX_POINTS = 60;
let cpuChart, memDonut;

function initCharts() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.color = '#8ea4c0';
  Chart.defaults.borderColor = 'rgba(255,255,255,.06)';

  cpuChart = new Chart($('cpuChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'CPU %', data: [], borderColor: '#00f0ff', backgroundColor: 'rgba(0,240,255,.12)', fill: true, tension: .4, borderWidth: 2, pointRadius: 0 },
        { label: 'RAM %', data: [], borderColor: '#ff2ec4', backgroundColor: 'rgba(255,46,196,.10)', fill: true, tension: .4, borderWidth: 2, pointRadius: 0 }
      ]
    },
    options: {
      animation: { duration: 300 },
      scales: { y: { max: 100, min: 0 } },
      plugins: { legend: { display: true } }
    }
  });

  memDonut = new Chart($('memDonut'), {
    type: 'doughnut',
    data: {
      labels: ['مستخدم', 'متاح'],
      datasets: [{ data: [0, 100], backgroundColor: ['#ff2ec4', '#1e293b'], borderWidth: 0 }]
    },
    options: { cutout: '72%', plugins: { legend: { display: false } } }
  });
}

function connectLive() {
  const es = new EventSource('/api/live');

  es.addEventListener('metrics', (e) => {
    const m = JSON.parse(e.data);
    state.health = m;
    $('mServers').textContent = m.servers;
    $('mMembers').textContent = m.members.toLocaleString();
    $('mPing').textContent = m.ping;
    $('mMem').textContent = `${m.memPercent}%`;

    state.cpuData.push(m.cpu);
    state.cpuLabels.push(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    if (state.cpuData.length > MAX_POINTS) { state.cpuData.shift(); state.cpuLabels.shift(); }
    if (cpuChart) {
      cpuChart.data.datasets[0].data = state.cpuData;
      cpuChart.data.datasets[1].data = [...state.cpuData.slice(0, -1), m.memPercent];
      cpuChart.data.labels = state.cpuLabels;
      cpuChart.update('none');
    }

    if (memDonut) {
      memDonut.data.datasets[0].data = [m.memPercent, Number((100 - m.memPercent).toFixed(1))];
      memDonut.update();
    }

    const up = m.uptimeSec;
    const dd = Math.floor(up / 86400), hh = Math.floor((up % 86400) / 3600), mm = Math.floor((up % 3600) / 60);
    $('healthList').innerHTML = `
      <div>المعالج: <b style="color:${m.cpu > 80 ? '#ff4d5e' : '#00f0ff'}">${m.cpu}%</b></div>
      <div>الرام (النظام): <b style="color:#ff2ec4">${m.memPercent}%</b></div>
      <div>الرام (البوت): <b style="color:#8b5cf6">${m.heapMB} MB</b></div>
      <div>البنق: <b style="color:#22e584">${m.ping} ms</b></div>
      <div>مدة التشغيل: <b>${dd}ي ${hh}س ${mm}د</b></div>
      <div>الحالة: <b style="color:${m.ready ? '#22e584' : '#ff4d5e'}">${m.ready ? 'متصل ✅' : 'غير جاهز'}</b></div>`;
  });

  const onEvent = (kind, css, label) => (e) => {
    const d = JSON.parse(e.data);
    const time = new Date(d.at || Date.now()).toLocaleTimeString('en-GB', { hour12: false });
    const text = typeof d.message === 'string' ? d.message : (d.label || JSON.stringify(d));
    const line = document.createElement('div');
    line.className = 'line';
    line.innerHTML = `<span class="time">[${time}]</span> <span class="src">${esc(d.source || 'system')}</span> <span class="${css}">${esc(text)}</span>`;
    const term = $('terminal');
    term.appendChild(line);
    while (term.children.length > 400) term.removeChild(term.firstChild);
    term.scrollTop = term.scrollHeight;
  };

  es.addEventListener('log', onEvent('log', 'info'));
  es.addEventListener('alert', onEvent('alert', 'warn', '🚨'));
  es.addEventListener('connected', (e) => {
    const d = JSON.parse(e.data);
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const line = document.createElement('div');
    line.className = 'line';
    line.innerHTML = `<span class="time">[${time}]</span> <span class="src">live</span> <span class="success">${esc(d.label || 'متصل')}</span>`;
    $('terminal').appendChild(line);
  });
}

// ===================== الحماية =====================
async function saveProtection() {
  try {
    await api('/api/settings/protection', {
      method: 'POST',
      body: JSON.stringify({
        guildId: state.guildId,
        antiNuke: $('pgAntiNuke').checked,
        antiSpam: $('pgAntiSpam').checked,
        antiLink: $('pgAntiLink').checked,
        maxNukeActions: $('pgMaxActions').value
      })
    });
    toast('تم حفظ إعدادات الحماية ✅');
  } catch (e) { toast(e.message, false); }
}

async function loadWhitelist() {
  try {
    const g = await api(`/api/guild?guild=${state.guildId}`);
    const s = g.settings;
    const box = $('whitelistBox');
    const users = (s.whitelistedUsers || []).map(id => {
      const m = g.members ? null : null;
      return `<span class="chip">👤 ${esc(id)} <button onclick="removeWhitelist('user','${id}')">✕</button></span>`;
    });
    const roles = (s.whitelistedRoles || []).map(id => {
      const r = g.roles.find(x => x.id === id);
      return `<span class="chip">🎭 ${esc(r ? r.name : id)} <button onclick="removeWhitelist('role','${id}')">✕</button></span>`;
    });
    box.innerHTML = (users.join('') + roles.join('')) || 'لا توجد عناصر في القائمة البيضاء.';
  } catch (e) { toast(e.message, false); }
}

async function addWhitelist() {
  const type = $('wlType').value;
  const id = $('wlId').value.trim();
  if (!id) return toast('أدخل المعرف', false);
  try {
    await api('/api/settings/whitelist', { method: 'POST', body: JSON.stringify({ guildId: state.guildId, type, id }) });
    $('wlId').value = '';
    toast('تمت الإضافة للقائمة البيضاء ✅');
    loadWhitelist();
  } catch (e) { toast(e.message, false); }
}

async function removeWhitelist(type, id) {
  try {
    await api('/api/settings/whitelist/remove', { method: 'POST', body: JSON.stringify({ guildId: state.guildId, type, id }) });
    toast('تمت الإزالة');
    loadWhitelist();
  } catch (e) { toast(e.message, false); }
}

// ===================== الترحيب =====================
async function saveWelcome() {
  try {
    await api('/api/settings/welcome', {
      method: 'POST',
      body: JSON.stringify({
        guildId: state.guildId,
        enabled: $('welcomeEnabled').checked ? 'true' : 'false',
        channel: $('welcomeChannel').value,
        goodbyeChannel: $('goodbyeChannel').value,
        message: $('welcomeMessage').value,
        goodbyeMessage: $('goodbyeMessage').value
      })
    });
    await api('/api/settings/rules', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.guildId, channel: $('rulesChannel').value })
    });
    toast('تم حفظ إعدادات الترحيب ✅');
  } catch (e) { toast(e.message, false); }
}

async function saveAutoRole() {
  try {
    await api('/api/settings/roles', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.guildId, autoRoleId: $('autoRole').value || null })
    });
    toast('تم حفظ الرتبة التلقائية ✅');
  } catch (e) { toast(e.message, false); }
}

async function uploadBackground() {
  const file = $('bgFile').files[0];
  if (!file) return toast('اختر صورة أولاً', false);
  try {
    const res = await fetch(`/api/welcome/background?guild=${state.guildId}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'image/png' },
      body: file
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast('تم رفع الخلفية ✅');
    loadBackgroundStatus();
  } catch (e) { toast(e.message, false); }
}

async function resetBackground() {
  try {
    await api('/api/welcome/background/reset', { method: 'POST', body: JSON.stringify({ guildId: state.guildId }) });
    toast('تمت إزالة الخلفية المخصصة');
    loadBackgroundStatus();
  } catch (e) { toast(e.message, false); }
}

async function loadBackgroundStatus() {
  try {
    const g = await api(`/api/guild?guild=${state.guildId}`);
    $('bgStatus').innerHTML = g.customBackground
      ? '🖼️ توجد خلفية مخصصة حالياً.'
      : 'لا توجد خلفية مخصصة — تُستخدم الخلفية الافتراضية المتوهجة.';
  } catch { /* ignore */ }
}

// ===================== الاقتصاد =====================
async function loadEconomy() {
  const body = $('economyBody');
  body.innerHTML = '<tr><td colspan="5"><div class="spinner"></div></td></tr>';
  try {
    const rows = await api(`/api/economy?guild=${state.guildId}`);
    state.economy = rows;
    renderEconomy('');
  } catch (e) {
    body.innerHTML = `<tr><td colspan="5"><div class="empty">${esc(e.message)}</div></td></tr>`;
  }
}

function renderEconomy(filter) {
  const rows = state.economy.filter(r => r.tag.toLowerCase().includes(filter.toLowerCase()));
  $('economyBody').innerHTML = rows.length ? rows.map((r, i) => `
    <tr>
      <td>#${i + 1}</td>
      <td>${esc(r.tag)} <span class="tag tag-dim">${esc(r.id)}</span></td>
      <td><b style="color:var(--cyan)">${r.balance}</b> 🪙</td>
      <td>${r.games?.wins || 0} / ${r.games?.losses || 0}</td>
      <td>
        <div class="row">
          <input id="eco-amt-${r.id}" type="number" value="100" style="width:90px;margin:0;padding:6px">
          <button class="btn btn-sm btn-green" onclick="adjustEconomy('${r.id}',1)">+ إضافة</button>
          <button class="btn btn-sm btn-red" onclick="adjustEconomy('${r.id}',-1)">- سحب</button>
          <button class="btn btn-sm btn-magenta" onclick="setEconomy('${r.id}')">ضبط</button>
        </div>
      </td>
    </tr>`).join('') : '<tr><td colspan="5"><div class="empty">لا توجد أرصدة بعد — جرّب الأوامر /daily أو /coinflip.</div></td></tr>';
}

$('ecoSearch').addEventListener('input', (e) => renderEconomy(e.target.value));

async function adjustEconomy(userId, dir) {
  const amt = $(`eco-amt-${userId}`).value || 100;
  try {
    const r = await api('/api/economy/adjust', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.guildId, userId, amount: dir * parseInt(amt) })
    });
    toast(`الرصيد الجديد: ${r.balance} 🪙`);
    loadEconomy();
  } catch (e) { toast(e.message, false); }
}

async function setEconomy(userId) {
  const amt = $(`eco-amt-${userId}`).value || 0;
  try {
    const r = await api('/api/economy/set', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.guildId, userId, amount: parseInt(amt) })
    });
    toast(`تم الضبط على: ${r.balance} 🪙`);
    loadEconomy();
  } catch (e) { toast(e.message, false); }
}

// ===================== AutoMod =====================
function renderAutoWords(words) {
  $('amWordsBox').innerHTML = words.length
    ? words.map(w => `<span class="chip">🗨️ ${esc(w)} <button onclick="removeAutoWord('${esc(w)}')">✕</button></span>`).join(' ')
    : 'لا توجد كلمات محظورة.';
}

async function addAutoWord() {
  const word = $('amNewWord').value.trim();
  if (!word) return toast('اكتب الكلمة أولاً', false);
  try {
    const r = await api('/api/settings/automod/words', { method: 'POST', body: JSON.stringify({ guildId: state.guildId, word }) });
    $('amNewWord').value = '';
    renderAutoWords(r.list);
    toast('أُضيفت الكلمة ✅');
  } catch (e) { toast(e.message, false); }
}

async function removeAutoWord(word) {
  try {
    const r = await api('/api/settings/automod/words', { method: 'POST', body: JSON.stringify({ guildId: state.guildId, word, remove: true }) });
    renderAutoWords(r.list);
    toast('أُزيلت الكلمة');
  } catch (e) { toast(e.message, false); }
}

async function saveAutoMod() {
  const points = parseInt($('amWarnPoints').value) || 0;
  const action = $('amWarnAction').value;
  const warnActions = points > 0 ? [{ points, action, durationMin: parseInt($('amWarnDuration').value) || 60 }] : [];
  try {
    await api('/api/settings/automod', {
      method: 'POST',
      body: JSON.stringify({
        guildId: state.guildId,
        badWordsEnabled: $('amBadWordsEnabled').checked,
        mentionLimit: $('amMentionLimit').value,
        emojiLimit: $('amEmojiLimit').value,
        capsLimit: $('amCapsLimit').value,
        warnActions
      })
    });
    toast('تم حفظ إعدادات AutoMod ✅');
  } catch (e) { toast(e.message, false); }
}

// ===================== اللغة =====================
async function saveLocale() {
  try {
    await api('/api/settings/locale', { method: 'POST', body: JSON.stringify({ guildId: state.guildId, locale: $('botLocale').value }) });
    toast('تم حفظ اللغة ✅');
  } catch (e) { toast(e.message, false); }
}

// ===================== الإدارة =====================
async function loadMembers() {
  const body = $('membersBody');
  body.innerHTML = '<tr><td colspan="5"><div class="spinner"></div></td></tr>';
  try {
    const members = await api(`/api/members?guild=${state.guildId}`);
    state.members = members;
    renderMembers('');
  } catch (e) {
    body.innerHTML = `<tr><td colspan="5"><div class="empty">${esc(e.message)}</div></td></tr>`;
  }
}

function renderMembers(filter) {
  const rows = state.members.filter(m => (m.tag + ' ' + m.id).toLowerCase().includes(filter.toLowerCase()));
  $('membersBody').innerHTML = rows.map(m => `
    <tr>
      <td>
        ${m.bot ? '<span class="tag tag-cyan">بوت</span>' : '<span class="tag tag-green">عضو</span>'} ${esc(m.tag)}
        <div class="hint" style="margin:0">${esc(m.id)}</div>
      </td>
      <td>${esc(m.nickname || '—')}</td>
      <td>${m.roles.map(r => `<span class="tag tag-dim">${esc(r)}</span>`).join(' ') || '—'}</td>
      <td>${m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('ar') : '—'}</td>
      <td>
        <div class="row">
          <button class="btn btn-sm btn-green" onclick="modAction('timeout','${m.id}')">كتم</button>
          <button class="btn btn-sm btn-magenta" onclick="modAction('kick','${m.id}')">طرد</button>
          <button class="btn btn-sm btn-red" onclick="modAction('ban','${m.id}')">حظر</button>
        </div>
      </td>
    </tr>`).join('') || '<tr><td colspan="5"><div class="empty">لا يوجد أعضاء.</div></td></tr>';
}

$('modSearch').addEventListener('input', (e) => renderMembers(e.target.value));

async function modAction(kind, userId) {
  const reason = prompt('السبب (اختياري):') || 'من لوحة التحكم';
  try {
    const body = { guildId: state.guildId, userId, reason };
    if (kind === 'timeout') body.minutes = parseInt(prompt('المدة بالدقائق:', '10')) || 10;
    await api(`/api/moderation/${kind}`, { method: 'POST', body: JSON.stringify(body) });
    toast(kind === 'ban' ? 'تم الحظر ✅' : kind === 'kick' ? 'تم الطرد ✅' : 'تم الكتم ✅');
    loadMembers();
  } catch (e) { toast(e.message, false); }
}

// ===================== التذاكر =====================
async function saveTickets() {
  try {
    await api('/api/tickets/config', {
      method: 'POST',
      body: JSON.stringify({
        guildId: state.guildId,
        categoryId: $('ticketCategory').value,
        logChannelId: $('ticketLog').value,
        staffRoleId: $('ticketStaff').value
      })
    });
    toast('تم حفظ إعدادات التذاكر ✅');
  } catch (e) { toast(e.message, false); }
}

async function openTicket() {
  const userId = $('ticketUserId').value.trim();
  if (!userId) return toast('أدخل معرف العضو', false);
  try {
    const r = await api('/api/tickets/open', { method: 'POST', body: JSON.stringify({ guildId: state.guildId, userId }) });
    toast(r.ok ? `تم فتح التذكرة ✅` : r.message || 'تم الفتح', r.ok);
  } catch (e) { toast(e.message, false); }
}

async function closeTicket() {
  const channelId = $('ticketChannelId').value.trim();
  if (!channelId) return toast('أدخل معرف القناة', false);
  try {
    await api('/api/tickets/close', { method: 'POST', body: JSON.stringify({ channelId }) });
    toast('تم إغلاق التذكرة ✅');
  } catch (e) { toast(e.message, false); }
}

// ===================== الموسيقى =====================
async function playMusic() {
  const song = $('musicSong').value.trim();
  if (!song) return toast('اكتب اسم الأغنية', false);
  try {
    await api('/api/music/play', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.guildId, voiceChannel: $('musicVoice').value, textChannel: $('musicText').value, song })
    });
    toast('جاري التشغيل ✅');
  } catch (e) { toast(e.message, false); }
}

async function musicAction(action) {
  try {
    const body = { guildId: state.guildId };
    if (action === 'volume') body.volume = $('musicVolume').value;
    await api(`/api/music/${action}`, { method: 'POST', body: JSON.stringify(body) });
    toast(action === 'stop' ? 'تم الإيقاف' : 'تم ✅');
  } catch (e) { toast(e.message, false); }
}

// ===================== الإعدادات =====================
async function saveLogs() {
  try {
    await api('/api/settings/logs', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.guildId, modLog: $('modLogChannel').value, memberLog: $('memberLogChannel').value })
    });
    toast('تم حفظ اللوقات ✅');
  } catch (e) { toast(e.message, false); }
}

async function saveLevels() {
  try {
    await api('/api/settings/levels', {
      method: 'POST',
      body: JSON.stringify({ guildId: state.guildId, enabled: $('levelEnabled').checked, channel: $('levelChannel').value })
    });
    toast('تم حفظ إعدادات المستويات ✅');
  } catch (e) { toast(e.message, false); }
}

async function saveStatus() {
  try {
    await api('/api/bot/status', {
      method: 'POST',
      body: JSON.stringify({ type: $('statusType').value, text: $('statusText').value })
    });
    toast('تم تحديث الحالة ✅');
  } catch (e) { toast(e.message, false); }
}

async function sayMessage() {
  const msg = $('sayMessage').value.trim();
  if (!msg) return toast('اكتب الرسالة', false);
  try {
    await api('/api/bot/say', { method: 'POST', body: JSON.stringify({ channel: $('sayChannel').value, message: msg }) });
    $('sayMessage').value = '';
    toast('تم الإرسال ✅');
  } catch (e) { toast(e.message, false); }
}

// ===================== تشغيل =====================
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  loadBotInfo();
  loadGuilds();
  connectLive();
  $('statusText').value = 'لوحة التحكم الشاملة';
});

// تعريف الدوال للوصول من HTML
window.loadMembers = loadMembers;
window.adjustEconomy = adjustEconomy;
window.setEconomy = setEconomy;
window.modAction = modAction;
window.addWhitelist = addWhitelist;
window.removeWhitelist = removeWhitelist;
window.addAutoWord = addAutoWord;
window.removeAutoWord = removeAutoWord;
window.saveAutoMod = saveAutoMod;
window.saveLocale = saveLocale;
