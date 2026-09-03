/* part3: AI面 V4 サマリー / V5 クエリ実物 / V6 配置図・勝敗 / V7 引用元 */
const CELL_IDX = {};
(AI.cells || []).forEach(c => { CELL_IDX[c.q + '|' + c.f] = c; });
const Q_BY_ID = {}; (AI.queries || []).forEach(q => { Q_BY_ID[q.id] = q; });
const faceLabel = f => ((AI.faces || []).find(x => x.id === f) || {}).label || f;
const brandLabel = b => (AI.brand_label || {})[b] || b;
const themeLabel = t => (AI.theme_label || {})[t] || t;
const storeLabel = s => (AI.store_label || {})[s] || s;
const avgOf = arr => { const v = arr.filter(isNum); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const MODEL_LABEL = {kindle_basic: 'Kindle 無印', paperwhite: 'Paperwhite', colorsoft: 'Colorsoft', scribe: 'Scribe', kids: 'キッズモデル', unlimited: 'Kindle Unlimited', app: 'Kindleアプリ'};

function aiWait(title){
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>${esc(title)}</h3>${tagOf('wait')}<span class="sub">DataForSEO 初回ラウンド待ち</span><span class="hb" onclick="help('idx')">?</span></div>
    <div class="empty" style="text-align:left"><b>AI6面 × 実クエリ ${AI.queries.length}本 ＝ ${AI.queries.length * (AI.faces || []).length} セルを計測します</b>ChatGPT（gpt-5・Web検索）／Gemini 2.5 Flash／Claude／Perplexity／Google AI Overview／AIモード。回答全文・引用URL・ファンアウト（AIが裏で投げた検索語）を全件保存し、このビューに実物を表示します。<div style="margin-top:10px"><button class="btn" onclick="go('v8')">Secrets登録 → 初回ラウンド起動の手順</button></div></div>
    <div style="margin-top:14px">${stepperHtml()}</div></div>
  <div class="card s12 rv"><div class="ct"><h3>計測する実クエリ（レジストリ v1・${AI.queries.length}本）</h3>${tagOf('live')}<span class="sub">IDは固定（時系列を壊さない）</span></div>${queryRegistryTable()}</div>
  </div>`;
}
function stepperHtml(){
  const steps = [['STEP1', '課題の整理', 'Kindleが「薦められない質問」はどれか'], ['STEP2', '需要の把握', 'トレンド・月間検索数で優先度'], ['STEP3', '対象の選定', '42本のクエリ・6ファミリー'], ['STEP4', '面の選定', 'AI6面（対話4＋Google2）'],
    ['STEP5', '取得・加工', '回答全文・引用・ファンアウト'], ['STEP6', '多角的分析', '言及／第一想起／引用／推薦／極性'], ['STEP7', '設計', '打ち手・KPI（V9）'], ['STEP8', '定点観測', '週次自動計測・差分']];
  const done = AI.measured ? 6 : 4;
  return `<div class="stepper">${steps.map((s, i) => `<div class="step ${i < done ? 'done' : i === done ? 'now' : ''}"><div class="n">${s[0]}</div><b>${esc(s[1])}</b><span class="muted">${esc(s[2])}</span></div>`).join('')}</div><div class="src">GEOの8ステップ（電通デジタル ナレッジ共有会 2026/8/28 資料の進め方に準拠）</div>`;
}
function queryRegistryTable(){
  const fams = AI.family_label || {};
  return `<div class="tw"><table><tr><th>ID</th><th>ファミリー</th><th>実クエリ（AIに投げる自然文）</th><th>分母</th><th>需要KW</th></tr>${(AI.queries || []).map(q => `<tr><td class="mono">${esc(q.id)}</td><td><span class="fam" style="border-color:${FAM_COL[q.family]}">${esc(fams[q.family] || q.family)}</span></td><td>${esc(q.text)}</td><td>${q.named || q.compare ? '<span class="muted">除外（指名/比較）</span>' : '<b style="color:#8FF0C9">出現期待</b>'}</td><td class="muted">${esc(q.keyword)}</td></tr>`).join('')}</table></div>`;
}

/* ---------- V4 ---------- */
RENDER.v4 = () => {
  if(!AI.measured) return aiWait('AIでの語られ方 — サマリー（計測待ち）');
  const pf = AI.per_face, faces = AI.faces;
  const avgM = avgOf(faces.map(f => (pf[f.id] || {}).mention_rate)), avgF = avgOf(faces.map(f => (pf[f.id] || {}).first_rate)), avgO = avgOf(faces.map(f => (pf[f.id] || {}).owned_cite_share)), avgC = avgOf(faces.map(f => (pf[f.id] || {}).avg_cites));
  const pol = AI.polarity || {}; const ptot = (pol.pos || 0) + (pol.neg || 0) + (pol.neu || 0) || 1;
  const fam = AI.family || {};
  const famOrder = ['A', 'B', 'C', 'D', 'P', 'H'].filter(k => fam[k]);
  const first = (AI.first_rank || [])[0]; const kf = (AI.first_rank || []).find(x => x.id === 'kindle') || {};
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>AIでの語られ方 — ${AI.queries.length}本 × 6面 ＝ ${AI.n_cells}セル（実測 ${esc(AI.date)}）</h3>${tagOf('live')}<span class="sub">DataForSEO ・ 実費 $${fmt((AI.api_cost || {}).usd, 2)}</span><span class="hb" onclick="help('idx')">?</span></div>
    <div class="kpi">
      <div class="k hero orange"><div class="l">言及率（カテゴリ質問 ${AI.expect_cells}セル）</div><div class="v"><span data-cu="${avgM}" data-d="0">0</span><small>%</small></div><div class="d">Kindleの名前が回答本文に出た率（6面平均）</div></div>
      <div class="k cyan"><div class="l">第一想起率</div><div class="v"><span data-cu="${kf.rate || 0}" data-d="0">0</span><small>%</small></div><div class="d">最初に挙がるブランドがKindle（1位 ${first ? esc(first.label) : '—'}）</div></div>
      <div class="k lime"><div class="l">自社（Amazon）引用率</div><div class="v"><span data-cu="${avgO}" data-d="0">0</span><small>%</small></div><div class="d">出典リンクのうち amazon.co.jp 等の比率。残りは第三者</div></div>
      <div class="k violet"><div class="l">平均引用数 / 回答</div><div class="v"><span data-cu="${avgC}" data-d="1">0</span><small>本</small></div><div class="d">露出機会（G1）。面ごとの差は下表</div></div>
      <div class="k rose"><div class="l">Kindle文の極性</div><div class="v"><span style="color:#8FF0C9" data-cu="${(pol.pos || 0) / ptot * 100}" data-d="0">0</span><small>%好意</small> <span style="color:#FDA4AF" data-cu="${(pol.neg || 0) / ptot * 100}" data-d="0">0</span><small>%懸念</small></div><div class="d">Kindleに触れた文 ${fmt(ptot)}文の辞書判定</div></div>
    </div></div>

  <div class="card s7 rv"><div class="ct"><h3>面別の反応（言及率・第一想起率・自社引用率）</h3>${tagOf('live')}</div>${faceRadar()}</div>
  <div class="card s5 rv"><div class="ct"><h3>第一想起ランキング（カテゴリ質問）</h3>${tagOf('live')}<span class="sub">最初に名前が挙がった回数</span></div>
    ${hbars((AI.first_rank || []).slice(0, 8).map(b => ({name: b.label, v: b.n, sub: pct(b.rate, 0), color: BRAND_COL[b.id] || '#64748B'})), {})}
    <div class="muted" style="font-size:11px;margin:10px 0 4px">言及ランキング（名前が出た回数）</div>
    ${hbars((AI.mention_rank || []).slice(0, 8).map(b => ({name: b.label, v: b.n, sub: pct(b.rate, 0), color: BRAND_COL[b.id] || '#64748B'})), {})}</div>

  <div class="card s6 rv"><div class="ct"><h3>質問タイプ別 Kindle言及率</h3>${tagOf('live')}<span class="sub">指名・比較を含む全セル</span></div>
    ${barChart({w: 520, h: 200, labels: famOrder.map(k => fam[k].label), series: [{name: 'Kindle言及率', color: '#E36A1E', values: famOrder.map(k => fam[k].rate)}], suf: '%', d: 0, yfmt: v => fmt(v, 0) + '%'})}
    <div class="note">カテゴリ型（A）・ペルソナ型（B）が「薦められるか」の本丸。ネガ検証（H）は言及率が高くて当たり前 — 中身（極性）を見る。</div></div>
  <div class="card s6 rv"><div class="ct"><h3>AIが語るKindleの「どのモデル」か</h3>${tagOf('live')}<span class="sub">全セルの端末名・サービス名の出現回数</span></div>
    ${hbars(Object.entries(AI.models || {}).map(([m, n], i) => ({name: MODEL_LABEL[m] || m, v: n, color: CAT[i % 6]})), {})}
    <div class="note">Paperwhite偏重なら「Colorsoft／Scribe新型の情報がAIに届いていない」。KU・アプリが多いなら端末より読み放題で語られている。</div></div>

  <div class="card s6 rv"><div class="ct"><h3>AIが薦める購入チャネル</h3>${tagOf('live')}<span class="sub">購入チャネル型（P）5本 × 6面 と 全セル</span></div>
    <div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap"><div style="flex:1 1 220px"><div class="muted" style="font-size:11px;margin-bottom:4px">P族（どこで買う？）での言及</div>${hbars(Object.entries(AI.stores_p || {}).slice(0, 8).map(([s, n]) => ({name: storeLabel(s), v: n, color: s === 'amazon' ? '#E36A1E' : s === 'used' ? '#F87171' : '#3987e5'})), {})}</div>
    <div style="flex:1 1 220px"><div class="muted" style="font-size:11px;margin-bottom:4px">全セルでの言及</div>${hbars(Object.entries(AI.stores_all || {}).slice(0, 8).map(([s, n]) => ({name: storeLabel(s), v: n, color: s === 'amazon' ? '#E36A1E' : s === 'used' ? '#F87171' : '#3987e5'})), {})}</div></div>
    <div class="note">Amazonだけでなくビックカメラやヨドバシが挙がっていれば量販店チャネルの「AI上の存在感」。中古（メルカリ）が多いと新品販売の逸失。</div></div>
  <div class="card s6 rv"><div class="ct"><h3>AIが裏で投げた検索語（ファンアウト）上位</h3>${tagOf('live')}<span class="sub">ChatGPT/Gemini の fan_out_queries</span></div>
    ${(AI.fanout_top || []).length ? `<div class="flex" style="gap:6px">${AI.fanout_top.slice(0, 30).map(([q, n]) => `<span class="cites" style="margin:0"><a style="cursor:default">${esc(q)} <b>${n}</b></a></span>`).join('')}</div>` : '<div class="empty">ファンアウト情報が返っていません（面によって非提供）</div>'}
    <div class="note">この語で<b>検索上位に自社ページがあるか</b>が引用の入口。無ければ第三者媒体が引用される（資料p25「クエリファンアウト」）。</div></div>

  <div class="card s12 rv"><div class="ct"><h3>ヒートマップ — クエリ × 面 で Kindle は何番目に出たか</h3>${tagOf('live')}<span class="sub">1=第一想起 ／ 2-3=言及あり ／ ✕=言及なし ／ 灰=回答なし。クリックで実物へ</span></div>
    ${heatmap()}</div>
  </div>`;
};
function heatmap(){
  const faces = AI.faces; const qs = AI.queries;
  let h = `<div class="tw"><div class="mx" style="grid-template-columns:230px repeat(${faces.length},minmax(70px,1fr));min-width:${230 + faces.length * 74}px">`;
  h += `<div class="h"></div>` + faces.map(f => `<div class="h" style="color:${FACE_COL[f.id]}">${esc(f.label)}</div>`).join('');
  qs.forEach(q => {
    h += `<div class="rl" title="${esc(q.text)}"><span class="fam" style="margin:0 6px 0 0;border-color:${FAM_COL[q.family]}">${q.family}</span>${esc(short(q.text, 22))}</div>`;
    faces.forEach(f => { const c = CELL_IDX[q.id + '|' + f.id]; let bg = 'rgba(120,150,210,.10)', tx = '–', col = 'var(--ink3)';
      if(c && c.answer){ const r = c.kindle_rank; if(r === 1){ bg = 'rgba(227,106,30,.85)'; tx = '1'; col = '#fff'; } else if(r === 2 || r === 3){ bg = 'rgba(227,106,30,.42)'; tx = String(r); col = '#FFD9B3'; } else if(isNum(r)){ bg = 'rgba(227,106,30,.22)'; tx = String(r); col = '#FFD9B3'; } else { bg = 'rgba(248,113,113,.22)'; tx = '✕'; col = '#FDA4AF'; } }
      h += `<div class="cell" style="background:${bg};color:${col}" onclick="openCell('${q.id}','${f.id}')" data-tip="${esc(`<b>${esc(q.id)}</b> ${esc(faceLabel(f.id))}<br>${esc(short(q.text, 60))}<br>${c && c.answer ? 'Kindle 出現順位: ' + (isNum(c.kindle_rank) ? c.kindle_rank + '番目' : '言及なし') + '<br>他ブランド: ' + Object.keys(c.brands).filter(b => b !== 'kindle').map(brandLabel).join('・') : '回答なし'}`)}">${tx}</div>`; });
  });
  return h + `</div></div>`;
}
function openCell(q, f){ go('v5'); selectQ(q); selectF(f); }

/* ---------- V5 クエリ実物 ---------- */
let QSEL = null, FSEL = null, QFAM = 'all';
RENDER.v5 = () => {
  if(!QSEL) QSEL = (AI.queries[0] || {}).id;
  if(!FSEL) FSEL = (AI.faces[0] || {}).id;
  const fams = AI.family_label || {};
  return `<div class="g">
  <div class="card s12 rv" style="padding:14px 20px"><div class="ct"><h3>クエリ実物 — AIに実際に投げた質問と、返ってきた回答の全文</h3>${tagOf(AI.measured ? 'live' : 'wait')}<span class="sub">${AI.measured ? '実測 ' + esc(AI.date) + '・回答本文は無加工（ブランド名のみハイライト）' : '初回ラウンド後に回答全文が入ります'}</span><span class="hb" onclick="help('query')">?</span></div>
    <div class="qfilter">${['all', ...Object.keys(fams)].map(k => `<button class="${QFAM === k ? 'on' : ''}" onclick="QFAM='${k}';go('v5')">${k === 'all' ? 'すべて' : esc(fams[k])} <span class="muted">${k === 'all' ? AI.queries.length : AI.queries.filter(q => q.family === k).length}</span></button>`).join('')}</div></div>
  <div class="qx"><div><div class="qlist" id="qlist">${AI.queries.filter(q => QFAM === 'all' || q.family === QFAM).map(q => qItem(q)).join('')}</div></div>
  <div class="card" id="qpanel" style="min-height:420px">${qPanel()}</div></div></div>`;
};
function qItem(q){
  const dots = AI.faces.map(f => { const c = CELL_IDX[q.id + '|' + f.id]; const st = !AI.measured || !c ? 'na' : !c.answer ? 'na' : c.kindle_rank === 1 ? 'm1' : isNum(c.kindle_rank) ? 'm2' : 'm0'; return `<i class="${st}" title="${esc(f.label)}"></i>`; }).join('');
  return `<div class="qi ${QSEL === q.id ? 'on' : ''}" id="qi-${q.id}" onclick="selectQ('${q.id}')"><div class="id">${esc(q.id)}<span class="fam" style="border-color:${FAM_COL[q.family]}">${esc((AI.family_label || {})[q.family] || q.family)}</span>${q.named || q.compare ? '<span class="fam">分母外</span>' : ''}</div><div class="tx">${esc(q.text)}</div><div class="dots">${dots}</div></div>`;
}
function selectQ(id){ QSEL = id; $$('.qi').forEach(e => e.classList.toggle('on', e.id === 'qi-' + id)); const p = $('#qpanel'); if(p){ p.innerHTML = qPanel(); bindTips(p); } }
function selectF(f){ FSEL = f; const p = $('#qpanel'); if(p){ p.innerHTML = qPanel(); bindTips(p); } }
function highlight(text){
  const al = [['kindle', /(kindle|キンドル|paperwhite|ペーパーホワイト|colorsoft|カラーソフト|scribe|スクライブ)/gi], ['kobo', /(kobo|コボ|clara|libra|elipsa)/gi], ['boox', /(boox|onyx|palma|note air)/gi], ['ipad', /(ipad|アイパッド)/gi], ['other', /(remarkable|supernote|bigme|meebook|pocketbook|quaderno)/gi]];
  let out = esc(text);
  al.forEach(([k, re]) => { out = out.replace(re, m => `<mark class="${k}">${m}</mark>`); });
  return out;
}
function qPanel(){
  const q = Q_BY_ID[QSEL]; if(!q) return '<div class="empty">クエリを選択してください</div>';
  const tabs = `<div class="ftabs">${AI.faces.map(f => { const c = CELL_IDX[q.id + '|' + f.id]; const st = c && c.answer ? (c.kindle_rank === 1 ? '#34D399' : isNum(c.kindle_rank) ? '#FBBF24' : '#F87171') : '#475569'; return `<button class="${FSEL === f.id ? 'on' : ''}" onclick="selectF('${f.id}')"><i style="background:${st}"></i>${esc(f.label)}</button>`; }).join('')}</div>`;
  let body;
  const c = CELL_IDX[q.id + '|' + FSEL];
  if(!AI.measured) body = `<div class="empty"><b>計測待ち</b>初回ラウンド後、この位置に ${esc(faceLabel(FSEL))} の回答全文・引用URL・ファンアウトが入ります。</div>`;
  else if(!c || !c.answer) body = `<div class="empty"><b>${esc(faceLabel(FSEL))} は回答なし</b>AI Overview は表示されない質問が多い（生成率を参照）。</div>`;
  else {
    const brands = Object.entries(c.brands || {}).sort((a, b) => a[1] - b[1]);
    body = `<div class="meta"><span>出現ブランド順: ${brands.length ? brands.map(([b, r]) => `<b style="color:${BRAND_COL[b] || '#c98500'}">${r}.${esc(brandLabel(b))}</b>`).join(' → ') : '—'}</span><span>引用 <b>${c.cites.length}</b>本</span><span>モデル: <b>${(c.model || '—')}</b></span>${c.pol ? `<span>極性 <b style="color:#8FF0C9">+${c.pol.pos}</b> / <b style="color:#FDA4AF">−${c.pol.neg}</b> / ${c.pol.neu}</span>` : ''}${c.stores.length ? `<span>チャネル: <b>${c.stores.map(storeLabel).join('・')}</b></span>` : ''}</div>
      <div class="ans" id="anstext">${highlight(c.answer)}</div>
      ${c.cites.length ? `<div class="muted" style="font-size:11px;margin-top:10px">引用・出典（${c.cites.length}）</div><div class="cites">${c.cites.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.title || x.url)}"><span class="pill b-${x.bucket}" style="margin-right:5px">${esc((AI.bucket_label || {})[x.bucket] || x.bucket)}</span>${esc(x.host)}</a>`).join('')}</div>` : ''}
      ${c.fanout && c.fanout.length ? `<div class="muted" style="font-size:11px;margin-top:10px">AIが裏で検索した語（ファンアウト）</div><div class="cites">${c.fanout.map(x => `<a style="cursor:default">${esc(x)}</a>`).join('')}</div>` : ''}
      ${c.organic && c.organic.length ? `<div class="muted" style="font-size:11px;margin-top:10px">同時に取得したGoogle通常検索 上位（AI Overviewの土台）</div><div class="cites">${c.organic.map(o => `<a href="${esc(o.url)}" target="_blank" rel="noopener">${o.rank}. ${esc(o.domain)}</a>`).join('')}</div>` : ''}`;
  }
  return `<div class="ct"><h3 style="font-size:15px">${esc(q.text)}</h3></div><div class="meta"><span class="fam" style="border-color:${FAM_COL[q.family]}">${esc((AI.family_label || {})[q.family] || q.family)}</span><span>ID <b class="mono">${esc(q.id)}</b></span><span>需要KW: <b>${esc(q.keyword)}</b></span><span>${q.named || q.compare ? '分母から除外（指名／比較）' : '出現期待クエリ（言及率・第一想起の分母）'}</span></div>${tabs}${body}`;
}

/* ---------- V6 配置図・勝敗 ---------- */
RENDER.v6 = () => {
  if(!AI.measured) return aiWait('AIの中のブランド配置図・テーマ別勝敗（計測待ち）');
  const pm = AI.posmap || [];
  const themes = Object.entries(AI.theme_tot || {}).sort((a, b) => b[1] - a[1]).slice(0, 14).map(x => x[0]);
  const cols = ['kindle', 'kobo', 'boox', 'ipad'];
  const win = [], lose = [];
  themes.forEach(t => { const row = AI.matrix[t] || {}; const k = row.kindle || {pos: 0, neg: 0, n: 0}; const rivals = cols.slice(1).map(b => row[b] || {pos: 0, neg: 0, n: 0});
    const kScore = k.n ? (k.pos - k.neg) / k.n : null; const rBest = Math.max(...rivals.map(r => r.n ? (r.pos - r.neg) / r.n : -9));
    if(k.n >= 3 && kScore !== null && kScore >= 0.2 && kScore >= rBest) win.push([t, k]); if(k.n >= 2 && kScore !== null && (kScore < 0 || (rBest > kScore + 0.3))) lose.push([t, k]); });
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>AIの回答には「ブランドの配置図」が表れる</h3>${tagOf('live')}<span class="sub">横＝語られ方の極性（懸念←→好意）／縦＝第一想起率／大きさ＝言及量</span><span class="hb" onclick="help('posmap')">?</span></div>
    ${bubbleMap(pm)}</div>
  <div class="card s8 rv"><div class="ct"><h3>テーマ × ブランド 勝敗マトリクス</h3>${tagOf('live')}<span class="sub">セル＝そのテーマでブランドが主語の文の数。色＝極性（緑＝好意、赤＝懸念）</span></div>${matrixHtml(themes, cols)}</div>
  <div class="card s4 rv"><div class="ct"><h3>勝ちテーマ / 負けテーマ（Kindle）</h3>${tagOf('live')}</div>
    <div class="muted" style="font-size:11px;margin-bottom:4px">好意的に語られる</div>${win.length ? win.slice(0, 6).map(([t, k]) => `<div class="row" style="justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid var(--line)"><span>✓ ${esc(themeLabel(t))}</span><b class="mono" style="color:#8FF0C9">+${k.pos}/−${k.neg}</b></div>`).join('') : '<div class="muted" style="font-size:12px">該当なし</div>'}
    <div class="muted" style="font-size:11px;margin:12px 0 4px">懸念・競合優位</div>${lose.length ? lose.slice(0, 6).map(([t, k]) => `<div class="row" style="justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid var(--line)"><span>▲ ${esc(themeLabel(t))}</span><b class="mono" style="color:#FDA4AF">+${k.pos}/−${k.neg}</b></div>`).join('') : '<div class="muted" style="font-size:12px">該当なし</div>'}
    <div class="note">勝ちテーマは「AIが既に語ってくれる強み」→ 公式FAQに数値を載せて引用を取りに行く。負けテーマは第三者媒体で語られ方を変える対象（資料p41-42）。</div></div>
  <div class="card s6 rv"><div class="ct"><h3>ペルソナ文脈でのKindle言及</h3>${tagOf('live')}<span class="sub">Kindleが登場した文のペルソナ語</span></div>${hbars(Object.entries(AI.personas || {}).map(([p, n], i) => ({name: (AI.persona_label || {})[p] || p, v: n, color: CAT[i % 6]})), {})}</div>
  <div class="card s6 rv"><div class="ct"><h3>ブランド別 主語テーマ トップ3</h3>${tagOf('live')}</div>${pm.map(b => `<div class="row" style="align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line)"><b style="color:${BRAND_COL[b.id] || '#c98500'};min-width:90px">${esc(b.label)}</b><span style="font-size:12px;color:var(--ink2)">${b.top_themes.map(themeLabel).join(' ／ ') || '—'}<span class="muted"> ・ 言及${b.mentions}回 ・ 第一想起${b.first}回 ・ 好意${b.pos}文／懸念${b.neg}文</span></span></div>`).join('')}</div>
  </div>`;
};
function bubbleMap(pm){
  const w = 900, h = 360, pl = 50, pr = 30, pt = 20, pb = 40; const maxM = Math.max(1, ...pm.map(b => b.mentions));
  const x = b => { const tot = (b.pos + b.neg) || 1; const s = (b.pos - b.neg) / tot; return pl + (w - pl - pr) * (s + 1) / 2; };
  const y = b => { const r = b.mentions ? b.first / b.mentions * 100 : 0; return pt + (h - pt - pb) * (1 - r / 100); };
  let g = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="display:block">`;
  g += `<line class="gl" x1="${(pl + w - pr) / 2}" x2="${(pl + w - pr) / 2}" y1="${pt}" y2="${h - pb}"/><line class="gl" x1="${pl}" x2="${w - pr}" y1="${(pt + h - pb) / 2}" y2="${(pt + h - pb) / 2}"/>`;
  g += `<text class="ax" x="${pl}" y="${h - 12}">← 懸念寄りに語られる</text><text class="ax" x="${w - pr}" y="${h - 12}" text-anchor="end">好意的に語られる →</text><text class="ax" x="${pl - 6}" y="${pt + 8}" text-anchor="end">第一想起↑</text>`;
  pm.forEach((b, i) => { const r = 14 + 46 * Math.sqrt(b.mentions / maxM), cx = x(b), cy = y(b), col = BRAND_COL[b.id] || CAT[i % 6];
    g += `<g class="bubble" data-tip="${esc(`<b>${esc(b.label)}</b><br>言及 ${b.mentions}回（${pct(b.share, 0)}のカテゴリ質問）<br>第一想起 ${b.first}回<br>好意 ${b.pos}文／懸念 ${b.neg}文<br>主なテーマ: ${b.top_themes.map(themeLabel).join('・')}`)}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" fill-opacity=".22" stroke="${col}" stroke-width="2" style="filter:drop-shadow(0 0 12px ${col})"><animate attributeName="r" values="${r};${r * 1.06};${r}" dur="${3 + i * .4}s" repeatCount="indefinite"/></circle><text x="${cx}" y="${cy + 4}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:#fff">${esc(b.label)}</text>${b.top_themes.slice(0, 2).map((t, j) => `<text x="${cx + r + 6}" y="${cy - 6 + j * 14}" style="font-size:10px;fill:#A9B7CF">${esc(themeLabel(t))}</text>`).join('')}</g>`; });
  return g + `</svg>`;
}
function matrixHtml(themes, cols){
  let h = `<div class="mx" style="grid-template-columns:140px repeat(${cols.length},minmax(60px,1fr))"><div class="h"></div>${cols.map(c => `<div class="h" style="color:${BRAND_COL[c]}">${esc(brandLabel(c))}</div>`).join('')}`;
  themes.forEach(t => { h += `<div class="rl">${esc(themeLabel(t))}</div>`; cols.forEach(c => { const v = (AI.matrix[t] || {})[c]; if(!v || !v.n){ h += `<div class="cell" style="background:rgba(120,150,210,.06);color:var(--ink3)">–</div>`; return; }
      const s = (v.pos - v.neg) / v.n; const bg = s > 0 ? `rgba(52,211,153,${.15 + .55 * Math.min(1, s)})` : s < 0 ? `rgba(248,113,113,${.15 + .55 * Math.min(1, -s)})` : 'rgba(120,150,210,.18)';
      h += `<div class="cell" style="background:${bg};color:#fff" data-tip="${esc(`<b>${esc(brandLabel(c))} × ${esc(themeLabel(t))}</b><br>文数 ${v.n}（好意 ${v.pos} / 懸念 ${v.neg} / 中立 ${v.neu}）`)}">${v.n}</div>`; }); });
  return h + `</div>`;
}

/* ---------- V7 引用元 ---------- */
let DOMSORT = {col: 'n', dir: -1};
RENDER.v7 = () => {
  if(!AI.measured) return aiWait('引用元・情報源（計測待ち）');
  const bk = AI.buckets || []; const dm = AI.domains || [];
  const own = bk.find(b => b.id === 'owned') || {share: 0}; const third = 100 - (own.share || 0);
  const pf = AI.per_face;
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>AIの材料は誰が書いているか — 引用元の分布</h3>${tagOf('live')}<span class="sub">ノイズ（検索リダイレクタ等）除外・全面合算</span><span class="hb" onclick="help('cite')">?</span></div>
    <div class="kpi">
      <div class="k hero rose"><div class="l">第三者ページ由来</div><div class="v"><span data-cu="${third}" data-d="0">0</span><small>%</small></div><div class="d">資料p31「7〜9割が第三者」と比較</div></div>
      <div class="k orange"><div class="l">自社（Amazon）</div><div class="v"><span data-cu="${own.share}" data-d="1">0</span><small>%</small></div><div class="d">amazon.co.jp / aboutamazon.jp 等</div></div>
      <div class="k cyan"><div class="l">引用ドメイン数</div><div class="v"><span data-cu="${dm.length}">0</span><small>+</small></div><div class="d">上位40を下表に表示</div></div>
      <div class="k lime"><div class="l">推薦転換率トップ媒体</div><div class="v" style="font-size:16px">${dm.filter(d => d.n >= 3).sort((a, b) => b.reco_rate - a.reco_rate)[0] ? esc(dm.filter(d => d.n >= 3).sort((a, b) => b.reco_rate - a.reco_rate)[0].host) : '—'}</div><div class="d">引用された回答でKindleが第一想起になる率（引用3回以上）</div></div>
    </div></div>
  <div class="card s5 rv"><div class="ct"><h3>引用元の種類</h3>${tagOf('live')}</div>${donut(bk.map(b => ({name: b.label, v: b.share, color: BUCKET_COL[b.id] || '#64748B'})), {center: `<span style="font-size:16px">${fmt(third, 0)}%</span><small>第三者</small>`})}
    <div class="note">動画（YouTube）・UGC・アフィリの比率が高いほど「公式サイト改善だけでは足りない」。第三者媒体への働きかけ（タイアップ・一次情報の提供）が施策の中心になる。</div></div>
  <div class="card s7 rv"><div class="ct"><h3>引用回数 × 推薦転換率（重点媒体の見つけ方）</h3>${tagOf('live')}<span class="sub">右上＝最重点。左上＝少量でも推薦を生む</span></div>${scatterDom(dm)}</div>
  <div class="card s6 rv"><div class="ct"><h3>面別の自社引用率・平均引用数</h3>${tagOf('live')}</div>${barChart({w: 520, h: 200, labels: AI.faces.map(f => f.label), series: [{name: '自社引用率', color: '#E36A1E', values: AI.faces.map(f => (pf[f.id] || {}).owned_cite_share)}], suf: '%', d: 0, yfmt: v => fmt(v, 0) + '%'})}
    <div class="leg"><span><i style="background:#E36A1E"></i>自社引用率</span></div><div class="muted" style="font-size:11px">平均引用数/回答: ${AI.faces.map(f => esc(f.label) + ' ' + fmt((pf[f.id] || {}).avg_cites, 1)).join(' ・ ')}</div></div>
  <div class="card s6 rv"><div class="ct"><h3>Google通常検索の上位ドメイン（AI Overview対象クエリ）</h3>${tagOf('live')}<span class="sub">検索上位ほど引用されやすい（資料p36）</span></div>${organicTop()}</div>
  <div class="card s12 rv"><div class="ct"><h3>引用ドメイン一覧（クリックで並べ替え）</h3>${tagOf('live')}</div><div class="tw"><table><thead><tr><th onclick="sortDom('host')">ドメイン</th><th onclick="sortDom('bucket')">種類</th><th class="num" onclick="sortDom('n')">引用回数</th><th class="num" onclick="sortDom('share')">シェア</th><th class="num" onclick="sortDom('reco')">Kindle第一想起の回答数</th><th class="num" onclick="sortDom('reco_rate')">推薦転換率</th></tr></thead><tbody id="domtb">${domRows()}</tbody></table></div></div>
  </div>`;
};
function domRows(){
  const rows = (AI.domains || []).slice().sort((a, b) => { const va = a[DOMSORT.col], vb = b[DOMSORT.col]; return (typeof va === 'string' ? va.localeCompare(vb) : (va || 0) - (vb || 0)) * DOMSORT.dir; });
  return rows.map(d => `<tr><td style="${d.bucket === 'owned' ? 'color:#FFD9B3;font-weight:700' : ''}">${esc(d.host)}</td><td><span class="pill b-${d.bucket}">${esc((AI.bucket_label || {})[d.bucket] || d.bucket)}</span></td><td class="num">${d.n}</td><td class="num">${pct(d.share)}</td><td class="num">${d.reco}</td><td class="num"><b>${pct(d.reco_rate, 0)}</b></td></tr>`).join('');
}
function sortDom(col){ if(typeof col === 'number') col = ['host', 'bucket', 'n', 'share', 'reco', 'reco_rate'][col] || 'n'; if(DOMSORT.col === col) DOMSORT.dir *= -1; else DOMSORT = {col, dir: col === 'host' || col === 'bucket' ? 1 : -1}; const tb = $('#domtb'); if(tb) tb.innerHTML = domRows(); }
function scatterDom(dm){
  const w = 620, h = 260, pl = 46, pr = 20, pt = 16, pb = 34; const rows = dm.slice(0, 30); const maxN = Math.max(1, ...rows.map(d => d.n));
  const x = d => pl + (w - pl - pr) * d.n / maxN, y = d => pt + (h - pt - pb) * (1 - (d.reco_rate || 0) / 100);
  let g = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="display:block">`;
  [0, 25, 50, 75, 100].forEach(v => { const yy = pt + (h - pt - pb) * (1 - v / 100); g += `<line class="gl" x1="${pl}" x2="${w - pr}" y1="${yy}" y2="${yy}"/><text class="ax" x="${pl - 6}" y="${yy + 3}" text-anchor="end">${v}%</text>`; });
  g += `<text class="ax" x="${w - pr}" y="${h - 10}" text-anchor="end">引用回数 →</text><text class="ax" x="${pl}" y="${h - 10}">推薦転換率↑</text>`;
  rows.forEach((d, i) => { const col = BUCKET_COL[d.bucket] || '#64748B'; g += `<g data-tip="${esc(`<b>${esc(d.host)}</b><br>引用 ${d.n}回・推薦転換率 ${pct(d.reco_rate, 0)}`)}"><circle cx="${x(d)}" cy="${y(d)}" r="${6 + 8 * Math.sqrt(d.n / maxN)}" fill="${col}" fill-opacity=".5" stroke="${col}" stroke-width="1.5"/>${i < 10 ? `<text x="${x(d) + 10}" y="${y(d) + 4}" style="font-size:10px;fill:#C5D3EA">${esc(short(d.host, 22))}</text>` : ''}</g>`; });
  return g + `</svg>`;
}
function organicTop(){
  const cnt = {}; (AI.cells || []).forEach(c => { if(c.f !== 'aio') return; (c.organic || []).forEach(o => { if(!o.domain) return; cnt[o.domain] = cnt[o.domain] || {n: 0, top3: 0}; cnt[o.domain].n++; if(o.rank <= 3) cnt[o.domain].top3++; }); });
  const rows = Object.entries(cnt).sort((a, b) => b[1].n - a[1].n).slice(0, 12);
  if(!rows.length) return '<div class="empty">通常検索の上位データがありません</div>';
  const cited = new Set((AI.domains || []).map(d => d.host));
  return hbars(rows.map(([d, v]) => ({name: d, v: v.n, sub: (cited.has(d) ? '引用あり' : '引用なし') + ' ・ TOP3 ' + v.top3, color: d.includes('amazon') ? '#E36A1E' : cited.has(d) ? '#22D3EE' : '#64748B'})), {});
}
