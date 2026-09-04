/* Fire HD 語られ方ボード — 表示側 part1: ユーティリティ・チャート・演出・ナビ・V0/V1 */
'use strict';
const D = window.BOARD_DATA || {};
const AI = D.ai || {measured:false, queries:[], faces:[]};
const EX = D.extras || {};
const FACTS = D.facts || {};
const FACE_COL = {chatgpt:'#199e70', gemini:'#3987e5', claude:'#E36A1E', perplexity:'#9085e9', aio:'#c98500', aimode:'#d55181'};
const BRAND_COL = {fire:'#E36A1E', ipad:'#3987e5', xiaomi:'#d55181', lenovo:'#199e70', nec:'#9085e9', samsung:'#c98500', kindle:'#22D3EE', oppo:'#f472b6', teclast:'#64748B', iris:'#a3a3a3'};
const SELF = (AI && AI.self_id) || 'fire';
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
  return `<div id="top"><h1>Fire HD <em>語られ方ボード</em> <span class="muted" style="font-size:12px;font-weight:400">現状 × 世間 × AI</span></h1>
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
  const tr = D.trends || {}; const sh = tr.share_12m || {}; const fv = sh['Fire HD'], iv = sh['iPad'];
  const s = D.sales.kpi;
  const first = (AI.first_rank || [])[0];
  const F = id => (D.facts[id] || {}).value;
  return `<div class="g">
  <div class="card hero rv"><h2>Fire HDは今、<em>どう語られているか</em>。<br><span style="font-size:18px;color:var(--ink2)">タブレット市場の現状・世間の声・AI6面の回答を、実データで1画面に。</span></h2>
    <p>数値は<span class="hl">出典付き実測</span>を原則とし、社内データ（販売台数・チャネル・Kids+）は連携前のため<span class="hl">サンプル表示</span>。AI面はDataForSEO経由で <b>${AI.queries.length}本の実クエリ × 6面</b> を計測します（${AI.measured ? '最新 ' + esc(AI.date) : '初回計測待ち'}）。</p>
    <div class="pillars">
      <div class="pl" onclick="go('v1')"><span class="arrow">→</span><div class="n">01 / 現状</div><div class="t">市場は伸びたが、Fireは上位5社圏外</div><div class="b" data-cu="811" data-suf="万台">—</div><div class="m">国内タブレット出荷 2025年度（前年度比+22%）。Apple 60.9%に対し<b>AmazonはMM総研の上位5社から外れ</b>、最後の公表値は2024年度上期の5.0%</div></div>
      <div class="pl" onclick="go('v2')"><span class="arrow">→</span><div class="n">02 / 世間</div><div class="t">検索需要は iPad が Fire HD の約${isNum(fv) && isNum(iv) && fv > 0 ? fmt(iv / fv, 0) : '—'}倍</div><div class="b c">${isNum(fv) ? fmt(fv, 1) : '—'} <span style="font-size:14px;color:var(--ink2)">vs</span> ${isNum(iv) ? fmt(iv, 0) : '—'}</div><div class="m">Googleトレンド 直近12か月平均（最大週=100基準）。Fire HDはRedmi Pad 1.0・Galaxy Tab 1.3と同じ帯で、<b>指名検索が育っていない</b></div></div>
      <div class="pl" onclick="go('v4')"><span class="arrow">→</span><div class="n">03 / AI</div><div class="t">${AI.measured ? 'AIの言及率 ' + pct(avgM, 0) + '・第一想起率 ' + pct(avgF, 0) : 'AI6面 × ' + AI.queries.length + '本を計測待ち'}</div><div class="b v">${AI.measured ? pct(avgM, 0) : '計測待ち'}</div><div class="m">${AI.measured ? 'カテゴリ質問（' + AI.expect_cells + 'セル）でFireに触れた率。第一想起率は言及回答のうち最初に挙がった率で、回答全体の1位の内訳では ' + (first ? esc(first.label) + ' が' + pct(first.rate, 0) : '—') + '。自社（Amazon）引用率 ' + pct(avgO, 0) : 'ChatGPT / Gemini / Claude / Perplexity / AI Overview / AIモード。Secrets登録後、初回ラウンドで自動反映'}</div></div>
    </div></div>

  <div class="card s8 sample rv"><div class="ct"><h3>販売の現在地（直近4週）</h3>${tagOf('sample')}<span class="sub">Amazon Retail Analytics／量販店POSを接続すると実値に置換</span><span class="hb" onclick="help('sample')">?</span></div>
    <div class="kpi">
      <div class="k hero orange"><div class="l">販売台数（4週）</div><div class="v"><span data-cu="${s.units_4w}">0</span><small>台</small></div><div class="d"><span class="${cls(s.units_4w_delta)}">${arrow(s.units_4w_delta)} ${sgn(s.units_4w_delta)}%</span> 前4週比</div>${spark(D.sales.weeks.slice(-16).map(w => w.total))}</div>
      <div class="k cyan"><div class="l">売上（4週・端末）</div><div class="v"><span data-cu="${s.revenue_4w_oku}" data-d="2">0</span><small>億円</small></div><div class="d">ASP ${yen(s.asp)}</div></div>
      <div class="k lime"><div class="l">Amazon.co.jp 比率</div><div class="v"><span data-cu="${s.amazon_share}" data-d="1">0</span><small>%</small></div><div class="d">残りは量販店・法人チャネル</div></div>
      <div class="k violet"><div class="l">Amazon Kids+ 会員</div><div class="v"><span data-cu="${s.ku_members_man}">0</span><small>万人</small></div><div class="d"><span class="dn">▼ ${fmt(s.ku_delta, 1)}%</span> 端末同時加入率 ${pct(s.attach_rate)}</div></div>
    </div>
    <div class="note">⚠ このカードの数値はすべて<b>設計サンプル</b>（固定シード生成）です。データ連携ビュー（⚙）の手順で社内データを接続すると、同じレイアウトのまま実値に置き換わります。</div></div>

  <div class="card s4 rv"><div class="ct"><h3>Fireの公式価格 vs セール底値</h3>${tagOf('live')}<span class="hb" onclick="help('price')">?</span></div>
    ${hbars(D.lineup.filter(l => isNum(l.price)).map(l => ({name: l.name.replace('Fire ', '').replace('（第13世代）', '').replace('（2024年モデル）', ''), v: l.price, vf: yen(l.price), sub: (l.stock === '在庫切れ' ? '在庫切れ' : '') + (l.sale ? (l.stock === '在庫切れ' ? ' / ' : '') + '底値 ' + yen(l.sale) : ''), color: l.stock === '在庫切れ' ? '#64748B' : '#E36A1E', tip: `<b>${esc(l.name)}</b><br>通常 ${yen(l.price)}${l.sale ? '<br>直近セール ' + yen(l.sale) + '（' + esc(l.sale_label) + '・' + fmt((1 - l.sale / l.price) * 100, 0) + '%OFF）' : ''}<br>在庫: ${esc(l.stock)}`})), {})}
    <div class="note">灰色は<b>在庫切れ・再入荷予定なし</b>（2026/9/4 実測）。購入できるのは Fire HD 10 / HD 8 / Max 11 の3機種のみ。</div>
    <div class="src">出典: ${factLink('D01')}／${factLink('D04')}／${factLink('D06')}</div></div>

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
  const s = t.brands_12m; const keys = ['iPad', 'Fire HD', 'Redmi Pad', 'Galaxy Tab'];
  const col = {'iPad': '#3987e5', 'Fire HD': '#E36A1E', 'Redmi Pad': '#d55181', 'Galaxy Tab': '#199e70'};
  return `<div class="leg">${keys.map(k => `<span><i style="background:${col[k]}"></i>${esc(k)}</span>`).join('')}</div>` +
    lineChart({w: 600, h: 200, dates: s.dates, series: keys.map(k => ({name: k, color: col[k], values: s.values[k]})), ymax: 100, labelsEvery: 8, dfmt: d => d.slice(5).replace('-', '/')}) +
    `<div class="note">iPadが指名検索を独占。Fire HDは<b>Redmi Pad・Galaxy Tabと同じ最下層</b>で、ブランド名で探されていない。</div>` +
    `<div class="src">出典: <a href="https://trends.google.co.jp/trends/explore?geo=JP&q=Fire%20HD,iPad,Redmi%20Pad,Galaxy%20Tab" target="_blank" rel="noopener">Google Trends（日本・過去12か月）</a> 取得 ${esc(D.trends.pulled_at)}</div>`;
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
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>現状 — 市場は法人・GIGAで伸び、家庭の保有率は頭打ち。Fireは上位5社圏外</h3>${tagOf('live')}<span class="sub">公開統計・出典リンク付き</span><span class="hb" onclick="help('market')">?</span></div>
    <div class="kpi">
      <div class="k orange"><div class="l">国内タブレット出荷 2025年度</div><div class="v"><span data-cu="811">0</span><small>万台</small></div><div class="d"><span class="up">▲ +22.0%</span> MM総研・2年連続増</div></div>
      <div class="k cyan"><div class="l">2026年度 予測</div><div class="v"><span data-cu="679">0</span><small>万台</small></div><div class="d"><span class="dn">▼ -16.3%</span> メモリー高騰。実績ではなく予測</div></div>
      <div class="k violet"><div class="l">Apple の出荷シェア</div><div class="v"><span data-cu="60.9" data-d="1">0</span><small>%</small></div><div class="d">16年連続1位・上位4社で82.1%</div></div>
      <div class="k rose"><div class="l">Amazon シェア（最後の公表値）</div><div class="v"><span data-cu="5.0" data-d="1">0</span><small>%</small></div><div class="d">2024年度上期 15.2万台・5位。<b>以降は上位5社圏外</b></div></div>
      <div class="k lime"><div class="l">タブレット世帯保有率</div><div class="v"><span data-cu="36.9" data-d="1">0</span><small>%</small></div><div class="d"><span class="dn">▼ -0.7pt</span> スマホ91.8%・10年横ばい</div></div>
      <div class="k orange"><div class="l">6〜12歳のネット利用機器</div><div class="v"><span data-cu="58.8" data-d="1">0</span><small>%</small></div><div class="d">タブレットが<b>スマホ56.4%を上回る唯一の層</b></div></div>
    </div>
    <div class="src">出典: ${factLink('A01')}／${factLink('A02')}／${factLink('B01')}／${factLink('B02')}／${factLink('C01')}／${factLink('C04')}</div></div>

  <div class="card s7 rv"><div class="ct"><h3>国内タブレット出荷台数の推移（年度・万台）</h3>${tagOf('live')}<span class="sub">MM総研 各年度リリースの公表時点値</span></div>
    ${barChart({w: 620, h: 230, labels: ship.map(e => e.fy + '年度'), series: [{name: '出荷台数', color: '#E36A1E', values: ship.map(e => e.v)}], yfmt: v => fmt(v, 0)})}
    <div class="note">2020年度の1,152万台はGIGAスクール特需。以降は法人・文教の買い替えサイクルで上下しており、<b>家庭市場の伸びではない</b>。${esc(D.shipment_note || '')}</div>
    <div class="src">出典: ${factLink('A01')}／${factLink('A04')}</div></div>

  <div class="card s5 rv"><div class="ct"><h3>世帯保有率は10年横ばい（％）</h3>${tagOf('live')}<span class="sub">総務省 通信利用動向調査</span></div>
    ${lineChart({w: 460, h: 210, dates: hh.map(h => h.fy), series: [{name: '世帯保有率', color: '#3987e5', values: hh.map(h => h.v)}], ymax: 50, labelsEvery: 2, dfmt: d => d})}
    <div class="note">出荷台数が乱高下しても保有率は36〜40%で動かない。学校配備端末は世帯保有に入らないため、<b>出荷の伸び＝家庭需要の伸びと読むのは誤り</b>。内閣府調査（二人以上世帯）も2023年44.9%をピークに3年連続低下。</div>
    <div class="src">出典: ${factLink('C01')}／${factLink('C03')}</div></div>

  <div class="card s8 sample rv"><div class="ct"><h3>週次販売台数（モデル別・53週）</h3>${tagOf('sample')}<span class="sub">Amazon Retail Analytics 連携で実値に置換</span><span class="hb" onclick="help('sample')">?</span></div>
    <div class="leg"><span><i style="background:#E36A1E"></i>Fire HD 10</span><span><i style="background:#199e70"></i>Fire HD 8</span><span><i style="background:#9085e9"></i>キッズ</span><span><i style="background:#c98500"></i>Fire Max 11</span><span><i style="background:#3987e5"></i>Fire 7</span></div>
    ${barChart({w: 760, h: 240, stacked: true, labels: wk.map(w => w.week.slice(5).replace('-', '/')), every: 5, series: [
      {name: 'Fire HD 10', color: '#E36A1E', values: wk.map(w => w.fire_hd10)}, {name: 'Fire HD 8', color: '#199e70', values: wk.map(w => w.fire_hd8)},
      {name: 'キッズ', color: '#9085e9', values: wk.map(w => w.kids)}, {name: 'Fire Max 11', color: '#c98500', values: wk.map(w => w.fire_max11)}, {name: 'Fire 7', color: '#3987e5', values: wk.map(w => w.fire7)}]})}
    <div class="note">山はブラックフライデー（11/24週）・年末年始・新生活・プライムデー（7/6週）。サンプルは<b>キッズの在庫切れとFire 7の販売終了を織り込んだ形</b>にしています — 実データで同じ形になるかが最初の検証ポイント。</div></div>

  <div class="card s4 sample rv"><div class="ct"><h3>チャネル構成（4週）</h3>${tagOf('sample')}</div>
    ${donut(s.channel.map((c, i) => ({name: c.name, v: c.share, color: c.own ? '#E36A1E' : ['#3987e5', '#199e70', '#9085e9', '#c98500', '#d55181', '#64748B'][i % 6]})), {center: `<span style="font-size:18px">${pct(s.amazon_share, 0)}</span><small>Amazon.co.jp</small>`})}
    <div class="note">市場全体では<b>法人向けが個人向けの1.7倍</b>（2024年・NIQ）。Fireは家庭向けEC中心のため、法人・文教チャネルの空白がそのまま出荷シェアの差になっている。</div>
    <div class="src">出典: ${factLink('A06')}／${factLink('A05')}</div></div>

  <div class="card s6 sample rv"><div class="ct"><h3>モデル構成比 と 購入ファネル</h3>${tagOf('sample')}</div>
    <div class="row" style="align-items:flex-start;flex-wrap:wrap;gap:22px"><div style="flex:1 1 240px">${hbars(s.model_mix.map((m, i) => ({name: m.name, v: m.share, color: CAT[i]})), {suf: '%', d: 1})}</div>
    <div style="flex:1 1 220px">${s.funnel.map((f, i) => `<div style="margin:5px 0"><div class="row" style="justify-content:space-between;font-size:11px;color:var(--ink2)"><span>${esc(f.stage)}</span><b class="mono" style="color:#FFD166">${pct(f.v, 1)}</b></div><div style="height:16px;background:rgba(120,150,210,.08);border-radius:6px;overflow:hidden"><i class="growx" style="display:block;height:100%;width:${f.v}%;background:linear-gradient(90deg,#22D3EE,#9085e9);animation-delay:${i * 80}ms"></i></div></div>`).join('')}</div></div></div>

  <div class="card s6 rv"><div class="ct"><h3>競合の実売価格（実測）</h3>${tagOf('live')}<span class="sub">Amazon棚・価格.comの最安値</span></div>
    ${hbars(D.competitors.filter(c => isNum(c.price)).map(c => ({name: c.name, v: c.price, vf: yen(c.price), sub: c.brand, color: c.brand === 'Apple' ? '#3987e5' : c.brand === 'Xiaomi' ? '#d55181' : c.brand === '無名Android' ? '#64748B' : '#199e70', tip: `<b>${esc(c.name)}</b><br>${esc(c.note)}`})), {})}
    <div class="note">Fire HD 8（17,980円）の真下に<b>1万円未満の無名Android機</b>が、真上に整備済みiPadと国内メーカー機が並ぶ。価格の下も上も詰まっている状態。</div>
    <div class="src">出典: ${factLink('F02')}／${factLink('F03')}／${factLink('F05')}</div></div>

  <div class="card s12 rv"><div class="ct"><h3>タブレットは何に使われているか（MM総研 利用実態調査）</h3>${tagOf('live')}<span class="sub">2024年1-2月調査・n=1,640</span></div>
    <div class="row" style="align-items:flex-start;flex-wrap:wrap;gap:24px">
      <div style="flex:1 1 300px">${hbars([{name: 'ネット検索・情報収集', v: 81.6, color: '#3987e5'}, {name: '動画視聴', v: 76.7, color: '#E36A1E'}, {name: 'オンラインショッピング', v: 48.7, color: '#199e70'}, {name: 'メール・LINE', v: 46.5, color: '#9085e9'}, {name: '地図・ナビ', v: 45.2, color: '#c98500'}], {suf: '%', d: 1})}</div>
      <div style="flex:1 1 300px">${hbars([{name: 'Amazonプライムビデオ', v: 47.9, color: '#E36A1E'}, {name: 'Netflix', v: 24.2, color: '#d55181'}, {name: 'YouTube Premium', v: 16.2, color: '#199e70'}, {name: 'U-NEXT', v: 15.5, color: '#9085e9'}, {name: 'NHKオンデマンド', v: 15.4, color: '#c98500'}], {suf: '%', d: 1})}
        <div class="muted" style="font-size:11px;margin-top:4px">動画視聴者が使うサービス（n=1,258）</div></div>
    </div>
    <div class="note">タブレットの主用途は<b>動画視聴76.7%</b>、そのうち<b>プライムビデオが47.9%で1位</b>（Netflixの約2倍）。Fireの土俵は「タブレット全般」ではなく<span class="hl">プライムビデオを見る端末</span>。購入時に最も重視されるのは本体価格28.8%で、参考情報はECサイトのレビュー31.2%。</div>
    <div class="src">出典: ${factLink('E02')}／${factLink('E03')}／${factLink('E04')}／${factLink('E07')}</div></div>
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
      d: `自社（amazon.co.jp / aboutamazon.jp）は${pct(own, 0)}。公式サイトの改修だけでは語られ方は動かない（資料p31）`});
    const worstT = concernRows()[0];
    if(worstT) out.push({v: 'v6', tag: 'AI / 語られ方', t: `懸念が最も多いテーマは <b style="color:#FDA4AF">${esc(themeLabel(worstT.t))}</b>`,
      d: `Fireを主語にした文の${pct(worstT.share, 0)}が懸念（好意${worstT.pos}文／懸念${worstT.neg}文）。ここが第三者媒体で語られ方を変えにいく最優先テーマ`});
    const d0 = (AI.domains || [])[0];
    if(d0) out.push({v: 'v7', tag: 'AI / 重点媒体', t: `引用1位は <b style="color:#8FF0C9">${esc(d0.host)}</b>（${d0.n}回）`,
      d: `公式より第三者ブログ・UGCが材料。上位はnote・YouTube・Reddit・my-best。ここでの語られ方がAIの答えになる`});
  }
  if(sh){ const fireItems = (sh.items || []).filter(i => i.brand === 'fire');
    const ranked = (sh.items || []).filter(i => isNum(i.rank)).sort((a, b) => a.rank - b.rank);
    const topRank = ranked[0];
    out.push({v: 'v3', tag: '棚 / Amazon', t: `自社の棚で1位は <b style="color:#FDA4AF">1万円未満の無名機</b>`, d: `ベストセラー2位 ${esc(topRank ? topRank.name.slice(0, 22) : '')} ${topRank ? yen(topRank.price) : ''}（レビュー${topRank ? fmt(topRank.reviews) : ''}件）。Fire HD 10は5位（${esc(sh.measured_at)} 実測）`});
    const f10 = fireItems.find(i => i.name.indexOf('Fire HD 10') >= 0);
    if(f10) out.push({v: 'v3', tag: '満足度 / 弱点', t: `Fire HD 10の評価 <b style="color:#FDA4AF">★${fmt(f10.rating, 1)}</b>`, d: `同じ棚のOPPO Pad SE ★4.7・AOC M10 ★4.5・TECLAST P30T ★4.8。レビュー数では勝っているが、星では格安Android勢に負けている`});
  }
  if(k) out.push({v: 'v3', tag: '比較の場 / 不在', t: `価格.comに Fireは <b style="color:#FDA4AF">0製品</b>`, d: `登録${fmt(k.registered_products)}製品のメーカー一覧にAmazonが存在しない（Apple 485・Lenovo 84・Xiaomi 37・NEC 34）。絞り込みには「Google Play対応」という項目まである`});
  if(T.share_12m && T.share_12m['iPad'] && T.share_12m['Fire HD']) out.push({v: 'v2', tag: '需要 / 指名', t: `指名検索は iPad の <b style="color:#FDA4AF">${fmt((T.share_12m['Fire HD'] || 0) / (T.share_12m['iPad'] || 1) * 100, 1)}%</b>`, d: `Fire HD 1.1 に対し iPad 78.0（直近12か月平均）。Redmi Pad 1.0・Galaxy Tab 1.3と同じ帯で、ブランドで探されていない`});
  out.push({v: 'v1', tag: '市場 / 構造', t: `出荷は+22%でも <b style="color:#FDA4AF">保有率は横ばい</b>`, d: `2025年度811万台（+22%）はGIGA・法人の買い替えが主因。世帯保有率は36.9%で10年動かず、法人向けが個人向けの1.7倍`});
  out.push({v: 'v1', tag: '用途 / 勝ち筋', t: `動画視聴の1位は <b style="color:#8FF0C9">プライムビデオ 47.9%</b>`, d: `タブレット用途の76.7%が動画視聴、その中でプライムビデオがNetflixの約2倍。Fireの土俵は「タブレット全般」ではなくここ`});
  return out;
}
