/* Fire TV 語られ方ボード — 表示側 part1: ユーティリティ・チャート・演出・ナビ・V0/V1 */
'use strict';
const D = window.BOARD_DATA || {};
const AI = D.ai || {measured:false, queries:[], faces:[]};
const EX = D.extras || {};
const FACTS = D.facts || {};
const FACE_COL = {chatgpt:'#199e70', gemini:'#3987e5', claude:'#E36A1E', perplexity:'#9085e9', aio:'#c98500', aimode:'#d55181'};
const BRAND_COL = {firetv:'#E36A1E', googletv:'#3987e5', appletv:'#C9CDD4', smarttv:'#2DD4BF', ps5:'#9085e9', switch:'#d55181', xiaomi:'#c98500', roku:'#a3a3a3', projector:'#22D3EE', stb:'#64748B', recorder:'#f472b6', hdmi_direct:'#94A3B8', pc_stick:'#94A3B8'};
const SELF = (AI && AI.self_id) || 'firetv';
const CAT = ['#E36A1E','#199e70','#9085e9','#c98500','#3987e5','#d55181'];
const BUCKET_COL = {owned:'#E36A1E', competitor:'#d55181', retail:'#3987e5', ugc:'#199e70', video:'#F87171', affiliate:'#c98500', press:'#9085e9', reference:'#94A3B8', media:'#64748B'};

/* ---------- utils ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isNum = v => typeof v === 'number' && isFinite(v);
const fmt = (v, d=0) => isNum(v) ? v.toLocaleString('ja-JP', {maximumFractionDigits:d, minimumFractionDigits:d}) : '—';
const pct = (v, d=1) => isNum(v) ? fmt(v, d) + '%' : '—';
const yen = v => isNum(v) ? '¥' + fmt(v) : '—';
const man = v => isNum(v) ? (v >= 1e8 ? fmt(v/1e8, 2) + '億' : v >= 1e4 ? fmt(v/1e4, 1) + '万' : fmt(v)) : '—';
const sgn = v => isNum(v) ? (v > 0 ? '+' : '') + fmt(v, 1) : '—';
const cls = v => !isNum(v) ? '' : v >= 0 ? 'up' : 'dn';
const arrow = v => !isNum(v) ? '' : v >= 0 ? '▲' : '▼';
const fact = (id, key='value') => (FACTS[id] || {})[key];
const factLink = id => { const f = FACTS[id]; return f ? `<a href="${esc(f.source_url)}" target="_blank" rel="noopener">${esc(f.source_title)}</a>` : ''; };
const short = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const tagOf = st => ({live:'<span class="tag live">実測</span>', sample:'<span class="tag sample">サンプル</span>', wait:'<span class="tag wait">計測待ち</span>', teaser:'<span class="tag teaser">連携予定</span>'})[st] || '';
const FAM_COL = {A:'#22D3EE', B:'#A78BFA', C:'#F472B6', D:'#FBBF24', P:'#34D399', H:'#F87171'};

let TIP = null;
function tipShow(ev, html){ TIP = TIP || $('#tip'); TIP.innerHTML = html; TIP.classList.add('on'); tipMove(ev); }
function tipMove(ev){ if(!TIP) return; const x = Math.min(ev.clientX + 14, window.innerWidth - 320), y = Math.min(ev.clientY + 14, window.innerHeight - 120); TIP.style.left = x + 'px'; TIP.style.top = y + 'px'; }
function tipHide(){ if(TIP) TIP.classList.remove('on'); }
document.addEventListener('mousemove', e => { if(TIP && TIP.classList.contains('on')) tipMove(e); });

function bindTips(root){
  $$('[data-tip]', root || document).forEach(el => {
    el.addEventListener('mouseenter', e => tipShow(e, el.getAttribute('data-tip')));
    el.addEventListener('mouseleave', tipHide);
  });
}

/* カウントアップ（数値は data-cu, 小数桁 data-d, 接尾 data-suf） */
function countUp(root){
  $$('[data-cu]', root || document).forEach(el => {
    const target = parseFloat(el.getAttribute('data-cu')); if(!isFinite(target)) return;
    const d = parseInt(el.getAttribute('data-d') || '0', 10), suf = el.getAttribute('data-suf') || '', pre = el.getAttribute('data-pre') || '';
    const t0 = performance.now(), dur = 1100 + Math.random() * 400;
    const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(target * e, d) + suf; if(p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
/* リビール: IntersectionObserver は使わない（スクショ透明化事故対策）→ stagger setTimeout */
function reveal(root){
  $$('.rv', root || document).forEach((el, i) => setTimeout(() => el.classList.add('in'), 60 + i * 55));
}
/* 3Dチルト */
function tilt(root){
  $$('.card', root || document).forEach(c => {
    c.classList.add('tilt');
    c.addEventListener('mousemove', e => { const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = `perspective(1200px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 3).toFixed(2)}deg) translateZ(0)`; });
    c.addEventListener('mouseleave', () => { c.style.transform = ''; });
  });
}

/* ---------- charts (SVG) ---------- */
function lineChart(o){
  // o: {w,h,dates[],series:[{name,color,values[]}], ymax?, fill?, labelsEvery?, yfmt?}
  const w = o.w || 600, h = o.h || 220, pl = 36, pr = 12, pt = 14, pb = 26;
  const n = o.dates.length; const all = o.series.flatMap(s => s.values.filter(isNum));
  const ymax = o.ymax || Math.max(1, ...all) * 1.08;
  const x = i => pl + (w - pl - pr) * (n <= 1 ? 0 : i / (n - 1)), y = v => pt + (h - pt - pb) * (1 - v / ymax);
  let g = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="display:block">`;
  for(let k = 0; k <= 4; k++){ const yy = pt + (h - pt - pb) * k / 4; const val = ymax * (1 - k / 4);
    g += `<line class="gl" x1="${pl}" x2="${w - pr}" y1="${yy}" y2="${yy}"/><text class="ax" x="${pl - 6}" y="${yy + 3}" text-anchor="end">${o.yfmt ? o.yfmt(val) : fmt(val)}</text>`; }
  const every = o.labelsEvery || Math.ceil(n / 8);
  o.dates.forEach((d, i) => { const lastOk = i === n - 1 && (n - 1) % every > every / 2; if(i % every === 0 || lastOk) g += `<text class="ax" x="${x(i)}" y="${h - 8}" text-anchor="middle">${esc(o.dfmt ? o.dfmt(d) : String(d).slice(0, 7))}</text>`; });
  o.series.forEach((s, si) => {
    const pts = s.values.map((v, i) => isNum(v) ? [x(i), y(v)] : null).filter(Boolean);
    if(!pts.length) return;
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    if(o.fill !== false && si === 0) g += `<path class="area" d="${path} L${pts[pts.length-1][0]} ${h - pb} L${pts[0][0]} ${h - pb} Z" fill="${s.color}"/>`;
    g += `<path class="ln draw" d="${path}" stroke="${s.color}" style="color:${s.color};animation-delay:${si * .15}s"/>`;
    const last = pts[pts.length - 1]; g += `<circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${s.color}" stroke="#0B0F1A" stroke-width="2"/>`;
  });
  // hover layer
  g += `<g class="hov">`;
  o.dates.forEach((d, i) => { const vals = o.series.map(s => `<span style="color:${s.color}">●</span> ${esc(s.name)}: <b>${fmt(s.values[i], o.d || 0)}${o.suf || ''}</b>`).join('<br>');
    g += `<rect x="${x(i) - (w - pl - pr) / n / 2}" y="${pt}" width="${(w - pl - pr) / n}" height="${h - pt - pb}" fill="transparent" data-tip="${esc(`<b>${esc(o.dfmt ? o.dfmt(d) : d)}</b><br>${vals}`)}"/>`; });
  g += `</g></svg>`;
  return g;
}
function barChart(o){
  // o: {w,h,labels[],series:[{name,color,values[]}], stacked?, yfmt?, suf?}
  const w = o.w || 600, h = o.h || 220, pl = 40, pr = 10, pt = 14, pb = 30, n = o.labels.length;
  const totals = o.labels.map((_, i) => o.stacked ? o.series.reduce((a, s) => a + (s.values[i] || 0), 0) : Math.max(...o.series.map(s => s.values[i] || 0)));
  const ymax = Math.max(1, ...totals) * 1.1;
  const bw = (w - pl - pr) / n, gap = Math.min(10, bw * .25);
  const y = v => pt + (h - pt - pb) * (1 - v / ymax);
  let g = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="display:block">`;
  for(let k = 0; k <= 4; k++){ const yy = pt + (h - pt - pb) * k / 4; g += `<line class="gl" x1="${pl}" x2="${w - pr}" y1="${yy}" y2="${yy}"/><text class="ax" x="${pl - 6}" y="${yy + 3}" text-anchor="end">${o.yfmt ? o.yfmt(ymax * (1 - k / 4)) : fmt(ymax * (1 - k / 4))}</text>`; }
  o.labels.forEach((lb, i) => {
    let acc = 0; const x0 = pl + i * bw + gap / 2, ww = o.stacked ? bw - gap : (bw - gap) / o.series.length;
    o.series.forEach((s, si) => { const v = s.values[i] || 0; if(!v) return;
      const yy = o.stacked ? y(acc + v) : y(v), hh = (h - pt - pb) * v / ymax, xx = o.stacked ? x0 : x0 + si * ww;
      g += `<rect class="bar grow" x="${xx}" y="${yy}" width="${Math.max(1, ww - (o.stacked ? 0 : 2))}" height="${Math.max(0, hh - (o.stacked ? 2 : 0))}" rx="3" fill="${s.color}" style="animation-delay:${i * 30}ms;transform-box:fill-box" data-tip="${esc(`<b>${esc(lb)}</b><br>${esc(s.name)}: <b>${fmt(v, o.d || 0)}${o.suf || ''}</b>${o.stacked ? '<br>合計: ' + fmt(totals[i]) : ''}`)}"/>`;
      acc += v; });
    if(i % (o.every || 1) === 0) g += `<text class="ax" x="${x0 + (bw - gap) / 2}" y="${h - 9}" text-anchor="middle">${esc(lb)}</text>`;
  });
  g += `</svg>`; return g;
}
function hbars(rows, o={}){
  // rows: [{name, v, sub?, color?, tip?}]
  const max = o.max || Math.max(1, ...rows.map(r => r.v || 0));
  return `<div>${rows.map((r, i) => `<div class="hbar" ${r.tip ? `data-tip="${esc(r.tip)}"` : ''}><div class="n" title="${esc(r.name)}">${esc(r.name)}${r.sub ? ` <span class="muted">${esc(r.sub)}</span>` : ''}</div><div class="t"><i class="growx" style="width:${Math.max(0, Math.min(100, (r.v || 0) / max * 100))}%;animation-delay:${i * 40}ms;${r.color ? `background:${r.color};box-shadow:0 0 10px ${r.color}55` : ''}"></i></div><div class="v">${r.vf || fmt(r.v, o.d || 0)}${o.suf || ''}</div></div>`).join('')}</div>`;
}
function ring(v, o={}){
  const r = 44, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, v || 0)), col = o.color || '#FF9900';
  return `<div class="ring" style="width:${o.size || 110}px;height:${o.size || 110}px"><svg viewBox="0 0 110 110" width="100%" height="100%"><circle cx="55" cy="55" r="${r}" fill="none" stroke="rgba(120,150,210,.14)" stroke-width="9"/><circle cx="55" cy="55" r="${r}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}" style="filter:drop-shadow(0 0 8px ${col});transition:stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)"/></svg><div class="c" style="color:${o.tcolor || '#fff'}">${isNum(v) ? fmt(v, o.d || 0) + (o.suf || '%') : '—'}<small>${esc(o.label || '')}</small></div></div>`;
}
function radar(o){
  // o: {axes:[label], series:[{name,color,values[0-100]}], size}
  const s = o.size || 260, cx = s / 2, cy = s / 2, R = s / 2 - 34, n = o.axes.length;
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
  const pt = (i, v) => [cx + R * v / 100 * Math.cos(ang(i)), cy + R * v / 100 * Math.sin(ang(i))];
  let g = `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" style="max-width:100%;display:block;margin:auto">`;
  [25, 50, 75, 100].forEach(l => g += `<polygon points="${o.axes.map((_, i) => pt(i, l).join(',')).join(' ')}" fill="none" stroke="rgba(120,150,210,.16)"/>`);
  o.axes.forEach((a, i) => { const p = pt(i, 100), q = pt(i, 118); g += `<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" stroke="rgba(120,150,210,.16)"/><text class="ax" x="${q[0]}" y="${q[1] + 3}" text-anchor="middle" style="font-size:10px;fill:#A9B7CF">${esc(a)}</text>`; });
  o.series.forEach(sr => { const pts = sr.values.map((v, i) => pt(i, isNum(v) ? v : 0)); g += `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${sr.color}" fill-opacity=".18" stroke="${sr.color}" stroke-width="2" style="filter:drop-shadow(0 0 6px ${sr.color})"/>`;
    pts.forEach((p, i) => g += `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${sr.color}" stroke="#0B0F1A" stroke-width="1.5" data-tip="${esc(`<b>${esc(sr.name)}</b><br>${esc(o.axes[i])}: <b>${fmt(sr.values[i], 1)}${o.suf || ''}</b>`)}"/>`); });
  g += `</svg>`; return g;
}
function spark(vals, color='#FF9900', w=90, h=28){
  const v = vals.filter(isNum); if(v.length < 2) return '';
  const mx = Math.max(...v), mn = Math.min(...v); const pts = v.map((x, i) => [i / (v.length - 1) * w, h - (mx === mn ? h / 2 : (x - mn) / (mx - mn) * (h - 4) + 2)]);
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${color}" stroke-width="1.6" style="filter:drop-shadow(0 0 4px ${color})"/></svg>`;
}
function donut(parts, o={}){
  // parts: [{name,v,color}]
  const tot = parts.reduce((a, p) => a + (p.v || 0), 0) || 1, r = 46, c = 2 * Math.PI * r; let off = 0;
  let g = `<div class="row" style="align-items:center;gap:16px;flex-wrap:wrap"><div class="ring" style="width:${o.size || 130}px;height:${o.size || 130}px"><svg viewBox="0 0 110 110" width="100%" height="100%">`;
  parts.forEach(p => { const seg = c * (p.v || 0) / tot; g += `<circle cx="55" cy="55" r="${r}" fill="none" stroke="${p.color}" stroke-width="12" stroke-dasharray="${Math.max(0, seg - 2)} ${c - Math.max(0, seg - 2)}" stroke-dashoffset="${-off}" data-tip="${esc(`<b>${esc(p.name)}</b>: ${fmt(p.v, o.d || 1)}${o.suf || '%'}`)}"/>`; off += seg; });
  g += `</svg><div class="c">${o.center || ''}</div></div><div class="leg" style="flex-direction:column;gap:4px">${parts.map(p => `<span><i style="background:${p.color}"></i>${esc(p.name)} <b class="mono">${fmt(p.v, o.d || 1)}${o.suf || '%'}</b></span>`).join('')}</div></div>`;
  return g;
}

/* ---------- 背景パーティクル ---------- */
(function particles(){
  const cv = $('#cv'); if(!cv) return; const ctx = cv.getContext('2d'); let W, H, P = [];
  const rs = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
  rs(); window.addEventListener('resize', rs);
  const N = Math.min(110, Math.floor(W * H / 14000));
  for(let i = 0; i < N; i++) P.push({x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.6 + .4, c: Math.random() < .3 ? '255,153,0' : Math.random() < .5 ? '34,211,238' : '167,139,250'});
  let last = 0;
  function frame(t){ if(t - last > 33){ last = t; ctx.clearRect(0, 0, W, H);
      for(const p of P){ p.x += p.vx; p.y += p.vy; if(p.x < 0 || p.x > W) p.vx *= -1; if(p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fillStyle = `rgba(${p.c},.55)`; ctx.fill(); }
      for(let i = 0; i < P.length; i++) for(let j = i + 1; j < P.length; j++){ const a = P[i], b = P[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if(d2 < 130 * 130){ ctx.strokeStyle = `rgba(120,150,210,${(1 - Math.sqrt(d2) / 130) * .18})`; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } } }
    requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
})();

/* ---------- 起動ログ ---------- */
function bootOff(){ const b = $('#boot'); if(b) b.classList.add('off'); }
(function boot(){
  const log = $('#bootlog'); if(!log) return;
  const lines = ['> 認証OK … 暗号化ボードを復号', `> 公開統計 ${Object.keys(FACTS).length}件 / トレンド ${D.trends ? 'OK' : '—'} を読込`,
    `> AI6面 実クエリ ${AI.queries.length}本 … ${AI.measured ? '実測 ' + AI.date + ' を反映' : '計測待ち（Secrets登録後に自動反映）'}`,
    `> 付帯収集 ${EX.date ? EX.date + ' を反映' : '計測待ち'} / 販売実績はサンプル表示`, '> 描画開始'];
  lines.forEach((l, i) => setTimeout(() => { const d = document.createElement('div'); d.textContent = l; d.style.animationDelay = '0s'; log.appendChild(d); }, 180 + i * 240));
  setTimeout(bootOff, 1750);
})();

/* ---------- ナビ ---------- */
const VIEWS = [
  {id:'v0', sec:'ホーム', label:'エグゼクティブ', ic:'◎', st: AI.measured ? 'live' : 'sample'},
  {id:'v1', sec:'現状', label:'市場・販売', ic:'¥', st:'sample'},
  {id:'v2', sec:'世間', label:'検索需要', ic:'⌕', st: D.trends ? 'live' : 'wait'},
  {id:'v3', sec:'世間', label:'声・ニュース', ic:'☷', st: (EX.news || EX.youtube || EX.apps) ? 'live' : 'live'},
  {id:'v4', sec:'AI', label:'語られ方サマリー', ic:'✦', st: AI.measured ? 'live' : 'wait'},
  {id:'v5', sec:'AI', label:'クエリ実物', ic:'❝', st: AI.measured ? 'live' : 'wait'},
  {id:'v6', sec:'AI', label:'配置図・勝敗', ic:'◈', st: AI.measured ? 'live' : 'wait'},
  {id:'v7', sec:'AI', label:'引用元・情報源', ic:'⇲', st: AI.measured ? 'live' : 'wait'},
  {id:'v8', sec:'運用', label:'データ連携', ic:'⚙', st:'live'},
  {id:'v9', sec:'運用', label:'GEO打ち手', ic:'➤', st:'live'},
];
function renderNav(){
  const nl = $('#navlist'); let sec = ''; let h = '';
  VIEWS.forEach((v, i) => { if(v.sec !== sec){ sec = v.sec; h += `<div class="nsec">${esc(sec)}</div>`; }
    h += `<button class="nb" id="nb-${v.id}" onclick="go('${v.id}')"><span class="ic">${v.ic}</span>${esc(v.label)}<span class="dot ${v.st}"></span><kbd>${i}</kbd></button>`; });
  nl.innerHTML = h;
  $('#navfoot').innerHTML = `ビルド ${esc(D.meta.built_at)} JST<br>AI実測 ${AI.measured ? esc(AI.date) : '計測待ち'}<br>閲覧専用・noindex<br><span class="mono">ketrketr2/fire-hd-geo-board</span>`;
}
let CUR = 'v0';
function go(id){
  CUR = id; $$('.nb').forEach(b => b.classList.toggle('on', b.id === 'nb-' + id));
  const m = $('#main'); m.innerHTML = topBar() + (RENDER[id] ? RENDER[id]() : '<div class="empty">準備中</div>');
  window.scrollTo({top:0, behavior:'smooth'});
  bindTips(m); countUp(m); reveal(m); tilt(m); if(POST[id]) POST[id]();
  try{ history.replaceState(null, '', '#' + id); }catch(e){}
}
function topBar(){
  return `<div id="top"><h1>Fire TV <em>語られ方ボード</em> <span class="muted" style="font-size:12px;font-weight:400">現状 × 世間 × AI</span></h1>
    <span class="livechip"><i></i>${AI.measured ? 'AI実測 ' + esc(AI.date) : 'AI計測 待機中'}</span>
    <div class="legend"><span class="lg live"><i></i>実測・出典付き</span><span class="lg sample"><i></i>サンプル（連携で置換）</span><span class="lg wait"><i></i>計測待ち</span><span class="lg teaser"><i></i>連携予定</span></div></div>`;
}
document.addEventListener('keydown', e => { if(e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = parseInt(e.key, 10); if(!isNaN(k) && VIEWS[k]) go(VIEWS[k].id); if(e.key === 'Escape') closeModal(); });

/* ---------- V0 エグゼクティブ ---------- */
const RENDER = {}, POST = {};
RENDER.v0 = () => {
  const pf = AI.per_face || {}; const faces = AI.faces || [];
  const mrates = faces.map(f => (pf[f.id] || {}).mention_rate).filter(isNum);
  const avgM = mrates.length ? mrates.reduce((a, b) => a + b, 0) / mrates.length : null;
  const frates = faces.map(f => (pf[f.id] || {}).first_rate).filter(isNum);
  const avgF = frates.length ? frates.reduce((a, b) => a + b, 0) / frates.length : null;
  const owned = faces.map(f => (pf[f.id] || {}).owned_cite_share).filter(isNum);
  const avgO = owned.length ? owned.reduce((a, b) => a + b, 0) / owned.length : null;
  const tr = D.trends || {}; const sh = tr.share_12m || {}; const fv = sh['Fire TV Stick'], iv = sh['Chromecast'];
  const s = D.sales.kpi;
  const first = (AI.first_rank || [])[0];
  const F = id => (D.facts[id] || {}).value;
  return `<div class="g">
  <div class="card hero rv"><h2>テレビに挿す1本は今、<em>どう語られているか</em>。<br><span style="font-size:18px;color:var(--ink2)">Fire TV の現状・世間の声・AI6面の回答を、実データで1画面に。</span></h2>
    <p>数値は<span class="hl">出典付き実測</span>を原則とし、社内データ（販売台数・チャネル・会員）は連携前のため<span class="hl">サンプル表示</span>。AI面はDataForSEO経由で <b>${AI.queries.length}本の実クエリ × 6面</b> を計測します（${AI.measured ? '最新 ' + esc(AI.date) : '初回計測待ち'}）。</p>
    <div class="pillars">
      <div class="pl" onclick="go('v1')"><span class="arrow">→</span><div class="n">01 / 現状</div><div class="t">テレビはあるのに、繋がっていない</div><div class="b" data-cu="18.7" data-d="1" data-suf="%">—</div><div class="m">インターネットに接続できるテレビの利用率（総務省・2025年8月調査）。テレビ世帯保有率は90.1%。<b>差分がそのまま Fire TV の未開拓市場</b>で、日本国内の台数・シェアはどこも公表していない</div></div>
      <div class="pl" onclick="go('v2')"><span class="arrow">→</span><div class="n">02 / 世間</div><div class="t">指名検索：Fire TV Stick と Chromecast の距離</div><div class="b c">${isNum(fv) ? fmt(fv, 1) : '—'} <span style="font-size:14px;color:var(--ink2)">vs</span> ${isNum(iv) ? fmt(iv, 0) : '—'}</div><div class="m">Googleトレンド 直近12か月平均（最大週=100基準）。比較対象は Chromecast / Apple TV / TVer / スマートテレビ。<b>需要の入口は「テレビで◯◯を見る方法」側にある</b></div></div>
      <div class="pl" onclick="go('v4')"><span class="arrow">→</span><div class="n">03 / AI</div><div class="t">${AI.measured ? 'AIの言及率 ' + pct(avgM, 0) + '・第一想起率 ' + pct(avgF, 0) : 'AI6面 × ' + AI.queries.length + '本を計測待ち'}</div><div class="b v">${AI.measured ? pct(avgM, 0) : '計測待ち'}</div><div class="m">${AI.measured ? 'カテゴリ質問（' + AI.expect_cells + 'セル）でFireに触れた率。第一想起率は言及回答のうち最初に挙がった率で、回答全体の1位の内訳では ' + (first ? esc(first.label) + ' が' + pct(first.rate, 0) : '—') + '。自社（Amazon）引用率 ' + pct(avgO, 0) : 'ChatGPT / Gemini / Claude / Perplexity / AI Overview / AIモード。Secrets登録後、初回ラウンドで自動反映'}</div></div>
    </div></div>

  <div class="card s8 sample rv"><div class="ct"><h3>販売の現在地（直近4週）</h3>${tagOf('sample')}<span class="sub">Amazon Retail Analytics／量販店POSを接続すると実値に置換</span><span class="hb" onclick="help('sample')">?</span></div>
    <div class="kpi">
      <div class="k hero orange"><div class="l">販売台数（4週）</div><div class="v"><span data-cu="${s.units_4w}">0</span><small>台</small></div><div class="d"><span class="${cls(s.units_4w_delta)}">${arrow(s.units_4w_delta)} ${sgn(s.units_4w_delta)}%</span> 前4週比</div>${spark(D.sales.weeks.slice(-16).map(w => w.total))}</div>
      <div class="k cyan"><div class="l">売上（4週・端末）</div><div class="v"><span data-cu="${s.revenue_4w_oku}" data-d="2">0</span><small>億円</small></div><div class="d">ASP ${yen(s.asp)}</div></div>
      <div class="k lime"><div class="l">Amazon.co.jp 比率</div><div class="v"><span data-cu="${s.amazon_share}" data-d="1">0</span><small>%</small></div><div class="d">残りは量販店・法人チャネル</div></div>
      <div class="k violet"><div class="l">Prime 会員（端末購入者）</div><div class="v"><span data-cu="${s.ku_members_man}">0</span><small>万人</small></div><div class="d"><span class="dn">▼ ${fmt(s.ku_delta, 1)}%</span> 端末同時加入率 ${pct(s.attach_rate)}</div></div>
    </div>
    <div class="note">⚠ このカードの数値はすべて<b>設計サンプル</b>（固定シード生成）です。データ連携ビュー（⚙）の手順で社内データを接続すると、同じレイアウトのまま実値に置き換わります。</div></div>

  <div class="card s4 rv"><div class="ct"><h3>公式価格 vs セール底値</h3>${tagOf('live')}<span class="hb" onclick="help('price')">?</span></div>
    ${hbars(D.lineup.filter(l => isNum(l.price)).map(l => ({name: l.name.replace('Fire ', '').replace('（第13世代）', '').replace('（2024年モデル）', ''), v: l.price, vf: yen(l.price), sub: (l.stock === '在庫切れ' ? '在庫切れ' : '') + (l.sale ? (l.stock === '在庫切れ' ? ' / ' : '') + '底値 ' + yen(l.sale) : ''), color: l.stock === '在庫切れ' ? '#64748B' : '#E36A1E', tip: `<b>${esc(l.name)}</b><br>通常 ${yen(l.price)}${l.sale ? '<br>直近セール ' + yen(l.sale) + '（' + esc(l.sale_label) + '・' + fmt((1 - l.sale / l.price) * 100, 0) + '%OFF）' : ''}<br>在庫: ${esc(l.stock)}`})), {})}
    <div class="note">セール時は<b>定価の4〜6割</b>まで落ちる。7月（プライムデー）と11月（ブラックフライデー）が底で、この2点が消費者の相場観になっている。4K Plus / 4K Max / Cube の通常価格は媒体記載値のため<b>要検証</b>扱い。</div>
    <div class="src">出典: ${factLink('D01')}／${factLink('D02')}／${factLink('D06')}／${factLink('D07')}</div></div>

  <div class="card s6 rv"><div class="ct"><h3>検索需要 12か月（Googleトレンド）</h3>${tagOf(D.trends ? 'live' : 'wait')}<span class="sub">週次・最大週=100</span></div>
    ${trendMini()}</div>
  <div class="card s6 rv"><div class="ct"><h3>AI6面の反応（${AI.measured ? '実測 ' + esc(AI.date) : '計測待ち'}）</h3>${tagOf(AI.measured ? 'live' : 'wait')}<span class="hb" onclick="help('idx')">?</span></div>
    ${AI.measured ? faceRadar() : waitBox('AI6面の言及率・第一想起・自社引用率をレーダーで表示します', '計測は ChatGPT(gpt-5) / Gemini 2.5 / Claude / Perplexity / Google AI Overview / AIモード。1周 ≒ $10。')}
  </div>
  <div class="card s12 rv"><div class="ct"><h3>今週の発見（すべて実測・出典リンク付き）</h3>${tagOf('live')}<span class="sub">クリックすると根拠のビューへ</span></div>
    <div class="flex">${findings().map(f => `<div class="pl" onclick="go('${f.v}')" style="flex:1 1 300px;max-width:520px"><span class="arrow">→</span><div class="n">${esc(f.tag)}</div><div class="t" style="font-size:15px">${f.t}</div><div class="m">${f.d}</div></div>`).join('')}</div></div>

  <div class="card s12 rv"><div class="ct"><h3>直近のニュース・トピック（2026年）</h3>${tagOf('live')}<span class="sub">報道から抽出・全件リンク付き</span></div>
    <div class="flex">${(D.news_curated || []).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map(n => `<a class="qi" style="flex:1 1 280px;display:block" href="${esc(n.url)}" target="_blank" rel="noopener"><div class="id">${esc(n.date)} ・ ${esc(n.media)} <span class="fam" style="border-color:${n.tone === 'neg' ? 'rgba(248,113,113,.6)' : n.tone === 'pos' ? 'rgba(52,211,153,.6)' : 'var(--line2)'}">${esc(n.tag)}</span></div><div class="tx" style="color:var(--ink)">${esc(n.title)}</div></a>`).join('')}</div></div>
  </div>`;
};
function waitBox(t, s){ return `<div class="empty"><b>${esc(t)}</b>${esc(s || '')}<div style="margin-top:10px"><button class="btn" onclick="go('v8')">連携手順を見る</button></div></div>`; }
function trendMini(){
  const t = (D.trends || {}).series; if(!t || !t.brands_12m) return waitBox('Googleトレンドを取得できませんでした');
  const s = t.brands_12m; const all = ['Fire TV Stick', 'Chromecast', 'Apple TV', 'TVer'];
  const keys = all.filter(k => Array.isArray((s.values || {})[k]));
  if(!keys.length) return waitBox('Googleトレンドは旧キーワードのままです。次のラウンドで Fire TV Stick 系の取得に切り替わります');
  const col = {'Fire TV Stick': '#E36A1E', 'Chromecast': '#3987e5', 'Apple TV': '#C9CDD4', 'TVer': '#2DD4BF'};
  return `<div class="leg">${keys.map(k => `<span><i style="background:${col[k]}"></i>${esc(k)}</span>`).join('')}</div>` +
    lineChart({w: 600, h: 200, dates: s.dates, series: keys.map(k => ({name: k, color: col[k], values: s.values[k]})), ymax: 100, labelsEvery: 8, dfmt: d => d.slice(5).replace('-', '/')}) +
    `<div class="note">端末名（Fire TV Stick / Chromecast / Apple TV）よりも、<b>サービス名（TVer）の方が検索される</b>。人はデバイスではなく「見たいもの」から入る。</div>` +
    `<div class="src">出典: <a href="https://trends.google.co.jp/trends/explore?geo=JP&q=Fire%20TV%20Stick,Chromecast,Apple%20TV,TVer" target="_blank" rel="noopener">Google Trends（日本・過去12か月）</a> 取得 ${esc(D.trends.pulled_at)}</div>`;
}
function faceRadar(){
  const pf = AI.per_face || {}; const faces = AI.faces || [];
  return `<div class="row" style="flex-wrap:wrap;gap:18px;align-items:flex-start"><div style="flex:1 1 260px">${radar({axes: faces.map(f => f.label), size: 280, suf: '%', series: [
      {name: '言及率', color: '#E36A1E', values: faces.map(f => (pf[f.id] || {}).mention_rate)},
      {name: '第一想起率', color: '#22D3EE', values: faces.map(f => (pf[f.id] || {}).first_rate)},
      {name: '自社引用率', color: '#9085e9', values: faces.map(f => (pf[f.id] || {}).owned_cite_share)}]})}
    <div class="leg" style="justify-content:center"><span><i style="background:#E36A1E"></i>言及率</span><span><i style="background:#22D3EE"></i>第一想起率</span><span><i style="background:#9085e9"></i>自社引用率</span></div></div>
    <div style="flex:1 1 220px"><table><tr><th>面</th><th class="num">生成</th><th class="num">言及</th><th class="num">第一想起</th><th class="num">自社引用</th></tr>${faces.map(f => { const v = pf[f.id] || {}; return `<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${FACE_COL[f.id]};margin-right:6px"></i>${esc(f.label)}</td><td class="num">${pct(v.gen_rate, 0)}</td><td class="num">${pct(v.mention_rate, 0)}</td><td class="num">${pct(v.first_rate, 0)}</td><td class="num">${pct(v.owned_cite_share, 0)}</td></tr>`; }).join('')}</table></div></div>`;
}

/* ---------- V1 現状：市場・販売 ---------- */
RENDER.v1 = () => {
  const s = D.sales.kpi, wk = D.sales.weeks;
  const ship = D.shipment_series || [], hh = D.household_series || [];
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>現状 — テレビは各家庭にある。繋がっていないだけ</h3>${tagOf('live')}<span class="sub">公開統計・出典リンク付き</span><span class="hb" onclick="help('market')">?</span></div>
    <div class="kpi">
      <div class="k orange"><div class="l">テレビ世帯保有率</div><div class="v"><span data-cu="90.1" data-d="1">0</span><small>%</small></div><div class="d">総務省・スマホ91.8%に次ぐ</div></div>
      <div class="k cyan"><div class="l">ネット接続テレビの利用率</div><div class="v"><span data-cu="18.7" data-d="1">0</span><small>%</small></div><div class="d">個人ベース。<b>ここが空白</b></div></div>
      <div class="k violet"><div class="l">ストリーミング端末の普及</div><div class="v"><span data-cu="33.7" data-d="1">0</span><small>%</small></div><div class="d">2016年8.9%から7年で3.8倍</div></div>
      <div class="k rose"><div class="l">スマートテレビ普及率</div><div class="v"><span data-cu="32.7" data-d="1">0</span><small>%</small></div><div class="d">2021年時点。<b>最大の代替</b></div></div>
      <div class="k lime"><div class="l">Fire TV 世界累計販売</div><div class="v"><span data-cu="3">0</span><small>億台</small></div><div class="d">2024年11月の2.5億台から</div></div>
      <div class="k orange"><div class="l">日本国内の台数・シェア</div><div class="v">—</div><div class="d">公表なし。準公式は<b>公取委2022年のOSシェア推計のみ</b></div></div>
    </div>
    <div class="src">出典: ${factLink('A02')}／${factLink('A01')}／${factLink('A03')}／${factLink('A04')}／${factLink('E01')}／${factLink('H04')}</div></div>

  <div class="card s7 rv"><div class="ct"><h3>CTV向け動画広告市場の推移（億円）</h3>${tagOf('live')}<span class="sub">サイバーエージェント／デジタルインファクト 各年リリース</span></div>
    ${barChart({w: 620, h: 230, labels: ship.map(e => e.fy + '年'), series: [{name: 'CTV広告', color: '#E36A1E', values: ship.map(e => e.v)}], yfmt: v => fmt(v, 0)})}
    <div class="note">4年で2.4倍。テレビ画面が広告面として値付けされ始めた。<b>ホーム画面の広告が重くなっているのは、この市場の伸びの裏返し</b>で、ユーザーの「広告がうざい」という不満と事業側の成長ドライバーが同じ場所にある。${esc(D.shipment_note || '')}</div>
    <div class="src">出典: ${factLink('C01')}／${factLink('C02')}</div></div>

  <div class="card s5 rv"><div class="ct"><h3>TVer のテレビ経由 月間再生数（億回）</h3>${tagOf('live')}<span class="sub">TVer 公式リリースの公表時点値</span></div>
    ${lineChart({w: 460, h: 210, dates: hh.map(h => h.fy), series: [{name: 'CTV経由再生', color: '#2DD4BF', values: hh.map(h => h.v)}], ymax: 2.5, labelsEvery: 1, dfmt: d => d})}
    <div class="note">2年で1.5倍。全体6.3億回のうち2.1億回がテレビ画面（2026年1月）。<b>TVer 公式が対応を明記しているストリーミング端末は Fire TV と Chromecast だけ</b>で、Apple TV は掲載がない。日本での勝敗はスペックの外側で決まっている。</div>
    <div class="src">出典: ${factLink('B05')}／${factLink('B06')}</div></div>

  <div class="card s8 sample rv"><div class="ct"><h3>週次販売台数（モデル別・53週）</h3>${tagOf('sample')}<span class="sub">Amazon Retail Analytics 連携で実値に置換</span><span class="hb" onclick="help('sample')">?</span></div>
    <div class="leg"><span><i style="background:#E36A1E"></i>Stick HD</span><span><i style="background:#199e70"></i>4K Select</span><span><i style="background:#9085e9"></i>4K Plus</span><span><i style="background:#c98500"></i>4K Max</span><span><i style="background:#3987e5"></i>Cube</span></div>
    ${barChart({w: 760, h: 240, stacked: true, labels: wk.map(w => w.week.slice(5).replace('-', '/')), every: 5, series: [
      {name: 'Stick HD', color: '#E36A1E', values: wk.map(w => w.stick_hd)}, {name: '4K Select', color: '#199e70', values: wk.map(w => w.stick_4k_select)},
      {name: '4K Plus', color: '#9085e9', values: wk.map(w => w.stick_4k_plus)}, {name: '4K Max', color: '#c98500', values: wk.map(w => w.stick_4k_max)}, {name: 'Cube', color: '#3987e5', values: wk.map(w => w.cube)}]})}
    <div class="note">山はブラックフライデー（11/24週）・年末年始・新生活・プライムデー（7/6週）。サンプルは<b>4K Select（2025-10）と新HD（2026-04-30）の発売時期</b>を織り込んだ形にしています — 実データで同じ形になるかが最初の検証ポイント。</div></div>

  <div class="card s4 sample rv"><div class="ct"><h3>チャネル構成（4週）</h3>${tagOf('sample')}</div>
    ${donut(s.channel.map((c, i) => ({name: c.name, v: c.share, color: c.own ? '#E36A1E' : ['#3987e5', '#199e70', '#9085e9', '#c98500', '#d55181', '#64748B'][i % 6]})), {center: `<span style="font-size:18px">${pct(s.amazon_share, 0)}</span><small>Amazon.co.jp</small>`})}
    <div class="note">自社ECに寄るほど、<b>テレビを買い替える瞬間の売場（量販店の店頭）に居られない</b>。Fire TV 搭載テレビ（パナソニック ビエラ12機種など）はその穴を埋めるための布石。</div>
    <div class="src">出典: ${factLink('E04')}／${factLink('E03')}</div></div>

  <div class="card s6 sample rv"><div class="ct"><h3>モデル構成比 と 購入ファネル</h3>${tagOf('sample')}</div>
    <div class="row" style="align-items:flex-start;flex-wrap:wrap;gap:22px"><div style="flex:1 1 240px">${hbars(s.model_mix.map((m, i) => ({name: m.name, v: m.share, color: CAT[i]})), {suf: '%', d: 1})}</div>
    <div style="flex:1 1 220px">${s.funnel.map((f, i) => `<div style="margin:5px 0"><div class="row" style="justify-content:space-between;font-size:11px;color:var(--ink2)"><span>${esc(f.stage)}</span><b class="mono" style="color:#FFD166">${pct(f.v, 1)}</b></div><div style="height:16px;background:rgba(120,150,210,.08);border-radius:6px;overflow:hidden"><i class="growx" style="display:block;height:100%;width:${f.v}%;background:linear-gradient(90deg,#22D3EE,#9085e9);animation-delay:${i * 80}ms"></i></div></div>`).join('')}</div></div></div>

  <div class="card s6 rv"><div class="ct"><h3>競合の価格（公式・実測）</h3>${tagOf('live')}<span class="sub">Google ストア／Apple 公式／各社リリース</span></div>
    ${hbars(D.competitors.filter(c => isNum(c.price)).map(c => ({name: c.name, v: c.price, vf: yen(c.price), sub: c.brand, color: c.brand === 'Apple' ? '#C9CDD4' : c.brand === 'Google' ? '#3987e5' : c.brand === 'Xiaomi' ? '#c98500' : '#9085e9', tip: `<b>${esc(c.name)}</b><br>${esc(c.note)}`})), {})}
    <div class="note">最安の Fire TV Stick HD（6,980円）と Apple TV 4K（34,800円）で<b>約5倍</b>。Apple は発売時19,800円から大きく上げ、Google TV Streamer も米国で $99.99→$149.99 に改定済み。<span class="hl">値上げ局面で「入口としての安さ」は相対的に強まっている</span>。</div>
    <div class="src">出典: ${factLink('F01')}／${factLink('F02')}／${factLink('F04')}</div></div>

  <div class="card s12 rv"><div class="ct"><h3>テレビ画面では何が見られているか（REVISIO コネクテッドTV白書2026）</h3>${tagOf('live')}<span class="sub">関東2,000世帯の実測アテンション＋本調査3,000名</span></div>
    <div class="row" style="align-items:flex-start;flex-wrap:wrap;gap:24px">
      <div style="flex:1 1 300px">${hbars([{name: 'YouTube', v: 50.4, color: '#E36A1E'}, {name: '日本テレビ', v: 47.3, color: '#64748B'}, {name: 'TBS', v: 41.0, color: '#64748B'}, {name: 'テレビ朝日', v: 37.9, color: '#64748B'}, {name: 'Prime Video', v: 13.4, color: '#22D3EE'}], {suf: '分', d: 1})}
        <div class="muted" style="font-size:11px;margin-top:4px">テレビデバイス上の1日平均利用時間</div></div>
      <div style="flex:1 1 300px">${hbars([{name: 'YouTube', v: 51.0, color: '#E36A1E'}, {name: 'TVer', v: 29.7, color: '#2DD4BF'}, {name: '有料動画配信 スマートTV', v: 21.3, color: '#3987e5'}, {name: '有料動画配信 ストリーミング端末', v: 12.1, color: '#9085e9'}], {suf: '%', d: 1})}
        <div class="muted" style="font-size:11px;margin-top:4px">利用率（下2本はICT総研・有料動画配信利用者の視聴デバイス）</div></div>
    </div>
    <div class="note">端末を挿す動機は Prime Video ではなく<b>YouTube と民放無料配信</b>。TVer の利用率は Prime Video を上回る。<span class="hl">Amazon の箱を買って、Amazon 以外を見る</span>という構造が、この製品の語られ方の土台にある。</div>
    <div class="src">出典: ${factLink('B01')}／${factLink('B02')}／${factLink('B03')}／${factLink('B04')}／${factLink('C05')}</div></div>
  </div>`;
};
// テーマ別の懸念率（自社ブランド自身の好意/懸念のみ・母数10文未満は除外）。V0の発見とV9の打ち手で共用
function concernRows(){
  const out = [];
  Object.keys(AI.matrix || {}).forEach(t => { const k = (AI.matrix[t] || {})[SELF]; if(!k) return;
    const tot = (k.pos || 0) + (k.neg || 0); if(tot < 10) return;
    out.push({t, pos: k.pos || 0, neg: k.neg || 0, tot, share: (k.neg || 0) / tot * 100}); });
  return out.sort((a, b) => b.share - a.share);
}
function findings(){
  const k = D.kakaku, sh = D.shelf, T = D.trends || {};
  const out = [];
  if(AI.measured){
    const pf = AI.per_face || {}, fs = (AI.faces || []).filter(f => isNum((pf[f.id] || {}).first_rate));
    const worst = fs.slice().sort((a, b) => (pf[a.id].first_rate) - (pf[b.id].first_rate))[0];
    if(worst){ const others = fs.filter(f => f.id !== worst.id).map(f => pf[f.id].first_rate);
      out.push({v: 'v4', tag: 'AI / 穴', t: `${esc(worst.label)}だけ第一想起 <b style="color:#FDA4AF">${pct(pf[worst.id].first_rate, 0)}</b>`,
                d: `他5面は${pct(Math.min(...others), 0)}〜${pct(Math.max(...others), 0)}。利用者数が最も多い面で最初に名前が出ていない`}); }
    const own = (((AI.buckets || []).find(b => b.id === 'owned')) || {}).share;
    if(isNum(own)) out.push({v: 'v7', tag: 'AI / 材料', t: `AIが見ている出典の <b style="color:#FFD166">${pct(100 - own, 0)}が第三者</b>`,
      d: `自社（amazon.co.jp / aboutamazon.jp）は${pct(own, 0)}。公式サイトの改修だけでは語られ方は動かない`});
    const worstT = concernRows()[0];
    if(worstT) out.push({v: 'v6', tag: 'AI / 語られ方', t: `懸念が最も多いテーマは <b style="color:#FDA4AF">${esc(themeLabel(worstT.t))}</b>`,
      d: `Fire TV を主語にした文の${pct(worstT.share, 0)}が懸念（好意${worstT.pos}文／懸念${worstT.neg}文）。第三者媒体で語られ方を変えにいく最優先テーマ`});
    const d0 = (AI.domains || [])[0];
    if(d0) out.push({v: 'v7', tag: 'AI / 重点媒体', t: `引用1位は <b style="color:#8FF0C9">${esc(d0.host)}</b>（${d0.n}回）`,
      d: `公式より第三者ブログ・UGCが材料。ここでの語られ方がそのままAIの答えになる`});
  }
  if(sh){ const ranked = (sh.items || []).filter(i => isNum(i.rank)).sort((a, b) => a.rank - b.rank);
    const topRank = ranked[0];
    if(topRank) out.push({v: 'v3', tag: '棚 / Amazon', t: `棚の1位は <b style="color:#FDA4AF">${esc(topRank.name.slice(0, 22))}</b>`, d: `${yen(topRank.price)}（レビュー${fmt(topRank.reviews)}件・${esc(sh.measured_at)} 実測）。自社ECの棚で何が最初に見えているかは、指名検索の前段そのもの`});
  }
  out.push({v: 'v3', tag: '比較の場 / 不在', t: `価格.comに Fire TV Stick の <b style="color:#FDA4AF">製品ページが無い</b>`, d: `ショッピング検索（複数店舗の価格一覧）だけで、満足度・レビュー・売れ筋ランキングが存在しない。製品として登録されているのは「Fire TV 搭載テレビ」の側。比較サイト経由の検討導線がまるごと欠けている`});
  out.push({v: 'v1', tag: '市場 / 空白', t: `テレビ保有90.1%に対し <b style="color:#FDA4AF">ネット接続は18.7%</b>`, d: `テレビはあるのに繋がっていない。ストリーミング端末の普及は33.7%（2016年8.9%）で、伸びしろは残っているが、スマートテレビ32.7%が同じ空白を先に埋めにいっている`});
  out.push({v: 'v1', tag: '用途 / 勝ち筋', t: `テレビ画面の1位は <b style="color:#8FF0C9">YouTube 50.4分</b>`, d: `Prime Video は13.4分、TVer の利用率29.7%は Prime Video を上回る。Amazon の箱を買って Amazon 以外を見る構造で、TVer 公式対応は Fire TV と Chromecast のみ`});
  out.push({v: 'v1', tag: '価格 / 構造', t: `値上げ局面で <b style="color:#8FF0C9">入口の安さが際立つ</b>`, d: `Apple TV 4K は19,800→34,800円、Google TV Streamer は米国で+50%。Fire TV Stick HD 6,980円（セール底値3,780円）との差は約5倍`});
  out.push({v: 'v2', tag: '需要 / 入口', t: `人は端末名より <b style="color:#FFD166">「テレビで◯◯を見る方法」</b>で探す`, d: `検索需要の入口はサービス名（TVer・YouTube・Netflix）側。指名検索の前に、この非指名クエリでどう答えられているかがAI時代の分岐点`});
  return out;
}
