/* part2: V2 検索需要 / V3 声・ニュース */
RENDER.v2 = () => {
  const T = D.trends || {}; const S = T.series || {};
  const kw = EX.keywords; const aik = EX.ai_keywords;
  const rel = ((T.related || {})['Fire HD']) || {top: [], rising: []};
  const reg = T.region || {};
  const regRows = Object.entries(reg['Fire HD'] || {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const ku = S.models_12m;
  const b12 = (S.brands_12m || {values: {}}).values || {};
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>世間の需要 — タブレットはどう探されているか。Fireは名前で探されているか</h3>${tagOf(T.series ? 'live' : 'wait')}<span class="sub">Google Trends（日本）${kw ? '＋ Google広告 月間検索数' : ''}</span><span class="hb" onclick="help('demand')">?</span></div>
    <div class="kpi">
      <div class="k orange"><div class="l">Fire HD 検索関心（直近8週平均）</div><div class="v"><span data-cu="${T.self_avg_last8 || 0}" data-d="1">0</span><small>/100</small></div><div class="d"><span class="${cls((T.self_avg_last8 || 0) - (T.self_avg_prev8 || 0))}">${arrow((T.self_avg_last8 || 0) - (T.self_avg_prev8 || 0))} ${sgn((T.self_avg_last8 || 0) - (T.self_avg_prev8 || 0))}</span> 前8週比（pt）</div>${spark(b12['Fire HD'] || [])}</div>
      <div class="k rose"><div class="l">iPad との差（12か月平均）</div><div class="v"><span data-cu="${(T.share_12m || {})['iPad'] && (T.share_12m || {})['Fire HD'] ? T.share_12m['iPad'] / T.share_12m['Fire HD'] : 0}" data-d="0">0</span><small>倍</small></div><div class="d">iPad ${fmt((T.share_12m || {})['iPad'], 1)} vs Fire HD ${fmt((T.share_12m || {})['Fire HD'], 1)} vs Redmi Pad ${fmt((T.share_12m || {})['Redmi Pad'], 1)}</div></div>
      <div class="k cyan"><div class="l">直近12か月のピーク</div><div class="v">${T.self_peak ? esc(T.self_peak.date.slice(5).replace('-', '/')) : '—'}<small>週</small></div><div class="d">${T.self_peak ? 'ブラックフライデー週' : ''}／需要はセール週に集中</div></div>
      <div class="k violet"><div class="l">Google広告 月間検索数（合計）</div><div class="v">${kw ? `<span data-cu="${kw.total}">0</span><small>回/月</small>` : '<span style="font-size:16px;color:var(--ink3)">計測待ち</span>'}</div><div class="d">${kw ? 'タブレット関連 ' + kw.rows.length + '語の合計' : 'DataForSEO 初回ラウンドで反映'}</div></div>
    </div></div>

  <div class="card s7 rv"><div class="ct"><h3>ブランド別 検索関心 5年（週次）</h3>${tagOf(S.brands_5y ? 'live' : 'wait')}<span class="sub">最大週=100</span></div>
    ${S.brands_5y ? `<div class="leg"><span><i style="background:#3987e5"></i>iPad</span><span><i style="background:#22D3EE"></i>タブレット</span><span><i style="background:#E36A1E"></i>Fireタブレット</span><span><i style="background:#199e70"></i>Androidタブレット</span></div>` + lineChart({w: 720, h: 230, dates: S.brands_5y.dates, labelsEvery: 26, ymax: 100, dfmt: d => d.slice(0, 7), series: [
      {name: 'iPad', color: '#3987e5', values: S.brands_5y.values['iPad']}, {name: 'タブレット', color: '#22D3EE', values: S.brands_5y.values['タブレット']},
      {name: 'Fireタブレット', color: '#E36A1E', values: S.brands_5y.values['Fireタブレット']}, {name: 'Androidタブレット', color: '#199e70', values: S.brands_5y.values['Androidタブレット']}]}) : waitBox('5年トレンドが未取得です')}
    <div class="note">この市場では<b>カテゴリ語「タブレット」（平均25.2）より、ブランド語「iPad」（57.6）の方が大きい</b>。つまり多くの人は最初から機種名で探している。Fireタブレットは平均0.9で5年間ほぼ横ばい — <span class="hl">指名で探される段階に入れていない</span>。</div>
    <div class="src">出典: <a href="https://trends.google.co.jp/trends/explore?date=today%205-y&geo=JP&q=Fire%E3%82%BF%E3%83%96%E3%83%AC%E3%83%83%E3%83%88,iPad,%E3%82%BF%E3%83%96%E3%83%AC%E3%83%83%E3%83%88" target="_blank" rel="noopener">Google Trends</a> 取得 ${esc(T.pulled_at || '')}</div></div>

  <div class="card s5 rv"><div class="ct"><h3>Fire HD と一緒に検索される語（12か月）</h3>${tagOf(rel.top && rel.top.length ? 'live' : 'wait')}<span class="sub">上位＝相対値／急上昇＝伸び率</span></div>
    ${(rel.top && rel.top.length) ? `<div class="row" style="align-items:flex-start;gap:16px;flex-wrap:wrap"><div style="flex:1 1 200px"><div class="muted" style="font-size:11px;margin-bottom:4px">上位</div>${hbars((rel.top || []).slice(0, 12).map(r => ({name: r.query, v: r.value, color: /google play|使えな|デメリット/.test(r.query) ? '#F87171' : /セール|安い/.test(r.query) ? '#c98500' : '#E36A1E'})), {})}</div>
    <div style="flex:1 1 180px"><div class="muted" style="font-size:11px;margin-bottom:4px">急上昇</div>${(rel.rising || []).slice(0, 9).map(r => `<div class="row" style="justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--line)"><span>${esc(r.query)}</span><b class="mono" style="color:#8FF0C9">+${fmt(r.value)}%</b></div>`).join('')}</div></div>`
      : `<div class="empty" style="text-align:left"><b>関連検索語を取得できませんでした</b>Googleトレンドの関連クエリは検索量が一定以下だと返りません。Fire HDは日本での検索量が少なく、<b>関連語が生成されない水準</b>にあります（これ自体が指名検索の弱さの裏づけ）。下のGoogle広告 月間検索ボリュームで実数を見てください。</div>`}
    <div class="note">同じ条件でiPadは関連語が多数返ります。<span class="hl">「関連語が出ない」こと自体が現状</span>として読める指標です。</div></div>

  <div class="card s6 rv"><div class="ct"><h3>モデル別の関心（12か月）</h3>${tagOf(ku ? 'live' : 'wait')}<span class="sub">最大週=100</span></div>
    ${ku ? `<div class="leg">${ku.keywords.map((k, i) => `<span><i style="background:${CAT[i]}"></i>${esc(k)}</span>`).join('')}</div>` + lineChart({w: 620, h: 220, dates: ku.dates, labelsEvery: 8, ymax: 100, dfmt: d => d.slice(5).replace('-', '/'), series: ku.keywords.map((k, i) => ({name: k, color: CAT[i], values: ku.values[k]}))}) : waitBox('モデル別トレンド未取得')}
    <div class="note">Fire HD 10（平均22.5）＞Fire HD 8（11.1）＞Fire Max 11（1.8）。両者ともピークは<b>ブラックフライデー週</b>で、需要は完全にセール連動。一方「キッズタブレット」は平均31.4とFire HD 10より大きい — <span class="hl">カテゴリ需要はあるのに、キッズモデルは在庫切れ</span>。</div></div>

  <div class="card s6 rv"><div class="ct"><h3>都道府県別の関心（Fire HD・12か月）</h3>${tagOf(regRows.length ? 'live' : 'wait')}<span class="sub">最大=100</span></div>
    ${regRows.length ? hbars(regRows.map(([k, v]) => ({name: k, v, color: '#22D3EE'})), {}) : waitBox('地域データ未取得')}
    <div class="note">検索量が小さいため地域差はノイズを含みます。傾向として大都市圏に偏らない＝<b>価格重視層に薄く広がっている</b>と読めます。量販店の店頭展開を考えるときの参考に。</div></div>

  <div class="card s12 rv ${kw ? '' : 'wait'}"><div class="ct"><h3>Google広告 月間検索ボリューム（タブレット関連 ${kw ? kw.rows.length + '語' : '約100語'}）</h3>${tagOf(kw ? 'live' : 'wait')}<span class="sub">DataForSEO keywords_data（日本・過去12か月平均）</span></div>
    ${kw ? kwTable(kw) : waitBox('検索ボリューム（月間）は初回ラウンドで反映されます', 'ブランド／モデル／価格／チャネル／サービス／使い方／ネガ／カテゴリ／競合 の9群・約100語を1呼で取得（$0.09）。')}
  </div>
  ${aik ? `<div class="card s12 rv"><div class="ct"><h3>AI検索ボリューム（ChatGPT等でのプロンプト需要・推計）</h3>${tagOf('live')}<span class="sub">DataForSEO AI Keyword Data</span></div>${hbars(aik.slice(0, 20).map(r => ({name: r.kw, v: r.vol, color: '#9085e9'})), {})}</div>` : ''}
  </div>`;
};
function kwTable(kw){
  const groups = {brand: 'ブランド', models: 'モデル', price: '価格・セール', channel: '購入チャネル', service: 'サービス・連携', usage: '使い方', negative: 'ネガ・不安', category: 'カテゴリ一般', competitor: '競合', other: 'その他'};
  const g = Object.entries(kw.groups || {}).sort((a, b) => b[1] - a[1]);
  return `<div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap"><div style="flex:1 1 300px"><div class="muted" style="font-size:11px;margin-bottom:4px">群別 合計（回/月）</div>${hbars(g.map(([k, v], i) => ({name: groups[k] || k, v, color: CAT[i % 6]})), {})}</div>
  <div style="flex:2 1 460px" class="tw"><table><tr><th>キーワード</th><th>群</th><th class="num">月間検索数</th><th class="num">CPC</th><th>12か月</th></tr>${kw.rows.slice(0, 40).map(r => `<tr><td>${esc(r.kw)}</td><td><span class="fam">${esc(groups[r.group] || r.group)}</span></td><td class="num"><b>${fmt(r.vol)}</b></td><td class="num">${isNum(r.cpc) ? '$' + fmt(r.cpc, 2) : '—'}</td><td>${spark(r.monthly.map(m => m[2]), '#22D3EE', 80, 20)}</td></tr>`).join('')}</table></div></div>`;
}

/* ---------- V3 声・ニュース ---------- */
RENDER.v3 = () => {
  const news = (D.news_curated || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const tone = {pos: news.filter(n => n.tone === 'pos').length, neu: news.filter(n => n.tone === 'neu').length, neg: news.filter(n => n.tone === 'neg').length};
  const yt = EX.youtube, apps = EX.apps, am = EX.amazon_serp, ca = EX.content, prods = EX.amazon_products;
  const sh = D.shelf || {};
  const fireStock = (D.lineup || []).filter(l => l.stock === '販売中').length;
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>世間の声 — ニュース・動画・棚・Amazon上の評判</h3>${tagOf('live')}<span class="sub">報道${yt ? '・YouTube' : ''}${apps ? '・アプリストア' : ''}${am ? '・Amazon.co.jp' : ''}${ca ? '・Web感情' : ''}</span><span class="hb" onclick="help('voice')">?</span></div>
    <div class="kpi">
      <div class="k orange"><div class="l">2026年の主要報道 ${news.length}件のトーン</div><div class="v"><span style="color:#8FF0C9" data-cu="${tone.pos}">0</span><small>好意</small> <span style="color:#A9B7CF" data-cu="${tone.neu}">0</span><small>中立</small> <span style="color:#FDA4AF" data-cu="${tone.neg}">0</span><small>懸念</small></div><div class="d">好意はほぼ<b>セール記事</b>。懸念はVega OS・在庫切れ・不具合・サポート終了</div></div>
      <div class="k rose"><div class="l">日本での新モデル発表からの空白</div><div class="v"><span data-cu="23">0</span><small>か月</small></div><div class="d">最後は2024年10月の新Fire HD 8。2026年の新製品記事は<b>0件</b></div></div>
      <div class="k violet"><div class="l">購入できるFireのSKU</div><div class="v"><span data-cu="${fireStock}">0</span><small>/8機種</small></div><div class="d">Fire 7・全キッズモデル・Plus系は在庫切れ（${esc(sh.measured_at || '')} 実測）</div></div>
      <div class="k lime"><div class="l">Fire HD 10 のレビュー</div><div class="v"><span data-cu="4.1" data-d="1">0</span><small>/5</small></div><div class="d">5,958件・棚では最多。ただし星は格安Android勢に劣後</div></div>
    </div></div>

  <div class="card s7 rv"><div class="ct"><h3>ニュース・タイムライン（2026年・主要報道）</h3>${tagOf('live')}<span class="sub">全件リンク付き・トーンは編集判定</span></div>
    <div style="max-height:520px;overflow:auto;padding-right:4px">${news.map(n => `<a class="qi" href="${esc(n.url)}" target="_blank" rel="noopener" style="display:grid;grid-template-columns:86px 1fr;gap:10px;align-items:start;border-left:3px solid ${n.tone === 'neg' ? '#F87171' : n.tone === 'pos' ? '#34D399' : '#64748B'}"><div class="id" style="font-size:11px;line-height:1.5">${esc(n.date)}<br><span style="color:var(--ink2)">${esc(n.media)}</span></div><div><div class="tx" style="color:var(--ink);margin:0 0 4px">${esc(n.title)}</div><span class="fam">${esc(n.tag)}</span></div></a>`).join('')}</div></div>

  <div class="card s5 rv"><div class="ct"><h3>語られ方の論点マップ（報道・レビュー要約）</h3>${tagOf('live')}</div>
    ${[['製品の空白', '日本では2024年10月以降、新モデルの発表が一件もない。2026年のFireタブレット本体記事はセール2本のみ', 'neg'],
       ['在庫', 'キッズモデル全機種・Fire 7が在庫切れで再入荷予定なし。2026年7月のプライムデーでは通常モデルが値引きなし', 'neg'],
       ['OS', 'Vega OSはFire TVから搭載開始。将来のFire TV Stickは全機種Vega OSでAndroidアプリのサイドローディング不可', 'neg'],
       ['Google Play', 'Fire OS 8はAndroid 11ベースだがGoogle Play非搭載。レビュー動画の主題が「Google Playを入れる方法」になっている', 'neg'],
       ['セール', 'ブラックフライデーでHD 10が45%OFF・HD 8が50%OFF。値引き幅の大きさ自体が語られ方の中心', 'pos'],
       ['キッズ', 'Kids+ 1年無料＋2年保証は評価が高く★4.5。ただし肝心の在庫がない', 'pos']].map(([t, s, tn]) => `<div class="row" style="align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line)"><span class="pill ${tn === 'pos' ? 'b-ugc' : tn === 'neg' ? 'b-video' : 'b-media'}" style="flex:none;margin-top:2px">${esc(t)}</span><span style="font-size:12px;color:var(--ink2)">${esc(s)}</span></div>`).join('')}
    <div class="src">出典: 上のタイムライン各記事／${factLink('D04')}／${factLink('H03')}</div></div>

  ${yt ? ytBlock(yt) : ''}
  ${apps ? appBlock(apps) : ''}
  ${am ? amazonBlock(am, prods) : ''}
  ${ytManualBlock()}
  ${shelfBlock()}
  ${kakakuBlock()}
  ${ca ? caBlock(ca) : ''}
  <div class="card s12 rv"><div class="ct"><h3>SNS（X / Instagram / TikTok）の言及量・感情</h3>${tagOf('teaser')}<span class="sub">SNS管理者アカウント（API）連携で解放</span></div>
    <div class="teaserbox" style="border-radius:12px;padding:6px">${lineChart({w: 900, h: 160, dates: Array.from({length: 26}, (_, i) => 'W' + (i + 1)), series: [{name: 'X 言及数', color: '#22D3EE', values: Array.from({length: 26}, (_, i) => 40 + 30 * Math.abs(Math.sin(i / 3)))}], fill: true, labelsEvery: 4})}</div>
    <div class="note">連携後に表示: 日次言及数・感情比率・話題語・インフルエンサー上位・キャンペーン反応。データ連携ビュー（⚙）に手順。</div></div>
  </div>`;
};
function ytBlock(yt){
  const rows = Object.entries(yt).flatMap(([kw, vs]) => vs.map(v => ({...v, kw}))).filter(v => v.title).sort((a, b) => (b.views || 0) - (a.views || 0));
  const seen = new Set(); const uniq = rows.filter(r => !seen.has(r.url) && seen.add(r.url)).slice(0, 14);
  return `<div class="card s6 rv"><div class="ct"><h3>YouTube で語られるタブレット（再生数順）</h3>${tagOf('live')}<span class="sub">${Object.keys(yt).length}語の検索上位</span></div>
    <div style="max-height:480px;overflow:auto">${uniq.map(v => `<a class="qi" href="${esc(v.url)}" target="_blank" rel="noopener" style="display:block"><div class="id">${esc(v.channel || '')} ・ ${esc(v.date || '')} ・ <b style="color:#FDA4AF">${man(v.views)}回</b>${v.shorts ? ' ・ Shorts' : ''}</div><div class="tx" style="color:var(--ink)">${esc(v.title)}</div><span class="fam">${esc(v.kw)}</span></a>`).join('')}</div></div>`;
}
function appBlock(apps){
  const rv = [...(apps.apple_reviews || []).map(r => ({...r, os: 'iOS'})), ...(apps.google_reviews || []).map(r => ({...r, os: 'Android'}))].filter(r => r.text).sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  const dist = [1, 2, 3, 4, 5].map(s => rv.filter(r => Math.round(r.rating) === s).length);
  const tot = rv.length || 1;
  return `<div class="card s6 rv"><div class="ct"><h3>アプリレビュー（最新 ${rv.length}件）</h3>${tagOf('live')}<span class="sub">App Store / Google Play 日本</span></div>
    <div class="row" style="gap:6px;align-items:flex-end;height:60px;margin-bottom:8px">${dist.map((n, i) => `<div style="flex:1;text-align:center;font-size:10px;color:var(--ink2)"><div style="height:${Math.max(3, n / Math.max(...dist, 1) * 44)}px;background:${['#F87171', '#FB923C', '#c98500', '#86efac', '#34D399'][i]};border-radius:4px 4px 0 0;margin:0 auto 3px;width:70%"></div>★${i + 1} ${fmt(n / tot * 100, 0)}%</div>`).join('')}</div>
    <div style="max-height:400px;overflow:auto">${rv.slice(0, 40).map(r => `<div class="qi" style="cursor:default"><div class="id">${'★'.repeat(Math.round(r.rating || 0))}<span style="color:var(--ink3)">${'★'.repeat(5 - Math.round(r.rating || 0))}</span> ・ ${esc(r.os)} ・ ${esc((r.ts || '').slice(0, 10))}</div><div class="tx">${esc(r.title ? r.title + ' — ' : '')}${esc(r.text)}</div></div>`).join('')}</div></div>`;
}
function amazonBlock(am, prods){
  const kw = Object.keys(am)[0]; const rows = (am['タブレット'] || am[kw] || []).slice(0, 20);
  return `<div class="card s12 rv"><div class="ct"><h3>Amazon.co.jp 検索結果（実測）</h3>${tagOf('live')}<span class="sub">DataForSEO Merchant ・ ${esc(EX.date || '')}</span></div>
    <div class="ftabs" id="amtabs">${Object.keys(am).map((k, i) => `<button class="${i === 0 ? 'on' : ''}" onclick="amTab('${esc(k)}',this)">${esc(k)}</button>`).join('')}</div>
    <div id="ambody">${amTable(rows)}</div>
    ${prods && prods.length ? `<div class="ct" style="margin-top:14px"><h3>主要商品の詳細と上位レビュー</h3></div><div class="flex">${prods.slice(0, 6).map(p => `<div class="qi" style="flex:1 1 300px;cursor:default"><div class="id">${esc(p.asin)} ・ ★${fmt(p.rating, 1)}（${fmt(p.votes)}件）・ ${yen(p.price)}${isNum(p.discount) && p.discount ? ' ・ ' + p.discount + '%OFF' : ''}</div><div class="tx"><b>${esc(short(p.title, 70))}</b></div>${(p.reviews || []).slice(0, 3).map(r => `<div style="font-size:11px;color:var(--ink2);border-top:1px solid var(--line);padding:5px 0">★${fmt(r.rating, 0)} ${esc(short(r.title || '', 40))} — ${esc(short(r.text, 110))}</div>`).join('')}</div>`).join('')}</div>` : ''}
  </div>`;
}
function amTable(rows){
  return `<div class="tw"><table><tr><th class="num">順位</th><th>商品</th><th class="num">価格</th><th class="num">★</th><th class="num">評価数</th><th class="num">先月購入</th><th>ラベル</th></tr>${rows.map(r => `<tr><td class="num">${r.rank}${r.type === 'amazon_paid' ? '<span class="fam">広告</span>' : ''}</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:${/fire\s?(hd|max|7)|amazon/i.test(r.title) ? '#FFD9B3' : 'var(--ink)'}">${esc(short(r.title, 64))}</a></td><td class="num">${yen(r.price)}</td><td class="num">${fmt(r.rating, 1)}</td><td class="num">${fmt(r.votes)}</td><td class="num">${esc(r.bought || '—')}</td><td>${r.best ? '<span class="pill b-owned">ベストセラー</span>' : ''}${r.choice ? '<span class="pill b-retail">Choice</span>' : ''}</td></tr>`).join('')}</table></div>`;
}
function amTab(k, btn){ $$('#amtabs button').forEach(b => b.classList.toggle('on', b === btn)); $('#ambody').innerHTML = amTable((EX.amazon_serp[k] || []).slice(0, 20)); }
function caBlock(ca){
  const s = (ca.summary || {})['fire hd'] || Object.values(ca.summary || {})[0]; if(!s) return '';
  const conn = s.connotation || {}; const tot = (conn.positive || 0) + (conn.negative || 0) + (conn.neutral || 0) || 1;
  const sent = s.sentiment || {};
  return `<div class="card s12 rv"><div class="ct"><h3>Web上の「Fire HD」言及の感情（Content Analysis・日本語）</h3>${tagOf('live')}<span class="sub">総ページ ${fmt(s.total)} 件</span></div>
    <div class="row" style="align-items:flex-start;gap:20px;flex-wrap:wrap"><div style="flex:1 1 240px">${donut([{name: 'ポジティブ', v: (conn.positive || 0) / tot * 100, color: '#34D399'}, {name: 'ニュートラル', v: (conn.neutral || 0) / tot * 100, color: '#64748B'}, {name: 'ネガティブ', v: (conn.negative || 0) / tot * 100, color: '#F87171'}])}</div>
    <div style="flex:1 1 260px">${hbars(Object.entries(sent).map(([k, v]) => ({name: {anger: '怒り', happiness: '喜び', love: '愛着', sadness: '悲しみ', share: '共有', fun: '楽しさ'}[k] || k, v, color: '#9085e9'})), {})}</div>
    <div style="flex:1 1 260px"><div class="muted" style="font-size:11px;margin-bottom:4px">言及の多いドメイン</div>${(s.top_domains || []).slice(0, 10).map(d => `<div class="row" style="justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--line)"><span>${esc(d.domain)}</span><b class="mono">${fmt(d.count)}</b></div>`).join('')}</div></div>
    ${(ca.mentions || []).length ? `<div style="max-height:300px;overflow:auto;margin-top:10px">${ca.mentions.slice(0, 30).map(m => `<a class="qi" href="${esc(m.url)}" target="_blank" rel="noopener" style="display:block"><div class="id">${esc(m.domain)} ・ ${esc((m.date || '').slice(0, 10))}</div><div class="tx" style="color:var(--ink)">${esc(short(m.title || '', 90))}</div><div style="font-size:11px;color:var(--ink2)">${esc(short(m.snippet || '', 160))}</div></a>`).join('')}</div>` : ''}</div>`;
}

function shelfBlock(){
  const sh = D.shelf; if(!sh) return '';
  const items = sh.items || [];
  const fire = items.filter(i => i.brand === 'fire');
  const ranked = items.filter(i => isNum(i.rank)).sort((a, b) => a.rank - b.rank);
  const fireTop = ranked.filter(i => i.brand === 'fire').length;
  const avgF = avg(fire.map(i => i.rating)), avgR = avg(items.filter(i => i.brand !== 'fire' && i.reviews >= 50).map(i => i.rating));
  const top = ranked[0];
  const BR = {fire: '#E36A1E', ipad: '#3987e5', xiaomi: '#d55181', lenovo: '#199e70', nec: '#9085e9', samsung: '#c98500', oppo: '#f472b6', teclast: '#22D3EE', iris: '#a3a3a3', noname: '#64748B'};
  const BRL = {fire: 'Fire', ipad: 'iPad', xiaomi: 'Xiaomi', lenovo: 'Lenovo', nec: 'NEC', samsung: 'Galaxy', oppo: 'OPPO', teclast: 'TECLAST', iris: 'アイリス', noname: '無名Android'};
  return `<div class="card s12 rv"><div class="ct"><h3>Amazon.co.jp の棚 — 「タブレット」検索1ページ目（実測）</h3>${tagOf('live')}<span class="sub">${esc(sh.measured_at)} 時点・Chromeで採録</span><span class="hb" onclick="help('shelf')">?</span></div>
    <div class="kpi" style="margin-bottom:12px">
      <div class="k hero rose"><div class="l">ベストセラー表示のうち Fire</div><div class="v"><span data-cu="${fireTop}">0</span><small>/${ranked.length}枠</small></div><div class="d">Fire HD 10は<b>5位</b>。1ページ目に出るFireは3機種だけで、キッズは在庫切れで不在</div></div>
      <div class="k orange"><div class="l">棚の最上位（2位）は</div><div class="v" style="font-size:17px">${esc(top ? short(top.name, 18) : '—')}</div><div class="d">${top ? yen(top.price) : ''}・レビュー${top ? fmt(top.reviews) : ''}件・過去1か月${top ? esc(top.bought || '') : ''}購入。<b>無名ブランドが自社の棚の上位</b></div></div>
      <div class="k cyan"><div class="l">Fire平均★（3機種）</div><div class="v"><span data-cu="${avgF}" data-d="2">0</span><small>/5</small></div><div class="d">競合（レビュー50件以上）平均 ${fmt(avgR, 2)} — <b>${avgF >= avgR ? '上回る' : '下回る'}</b></div></div>
      <div class="k violet"><div class="l">競合のスペック表記</div><div class="v" style="font-size:17px">GMS認証</div><div class="d">格安Android勢は「24GB+128GB」「Google Play対応」を全面表示。<b>Fireは表記比較で不利</b></div></div>
    </div>
    <div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap">
      <div style="flex:2 1 460px" class="tw"><table><tr><th class="num">BS順位</th><th>商品</th><th>ブランド</th><th class="num">価格</th><th class="num">★</th><th class="num">レビュー</th><th>過去1か月</th></tr>
        ${items.map(i => `<tr${i.brand === 'fire' ? ' style="background:rgba(227,106,30,.07)"' : ''}><td class="num">${isNum(i.rank) ? i.rank : '—'}</td><td>${esc(i.name)}${i.note ? `<br><span class="muted" style="font-size:10px">${esc(i.note)}</span>` : ''}</td><td><span class="pill" style="background:${BR[i.brand]}33;color:${BR[i.brand]}">${esc(BRL[i.brand] || i.brand)}</span></td><td class="num">${yen(i.price)}${isNum(i.list) && i.list > i.price ? `<br><span class="muted" style="font-size:10px">参考 ${yen(i.list)}</span>` : ''}</td><td class="num" style="color:${i.rating >= 4.4 ? '#8FF0C9' : i.rating < 4 ? '#FDA4AF' : 'var(--ink)'}">${fmt(i.rating, 1)}</td><td class="num">${fmt(i.reviews)}</td><td>${esc(i.bought || '—')}</td></tr>`).join('')}
      </table></div>
      <div style="flex:1 1 300px">
        <div class="muted" style="font-size:11px;margin-bottom:4px">評価（★）— レビュー50件以上の機種</div>
        ${hbars(items.filter(i => i.reviews >= 50).sort((a, b) => b.rating - a.rating).map(i => ({name: short(i.name, 24), v: i.rating, sub: fmt(i.reviews) + '件', color: BR[i.brand], tip: `<b>${esc(i.name)}</b><br>★${fmt(i.rating, 1)}（${fmt(i.reviews)}件）<br>${yen(i.price)}`})), {max: 5, d: 1})}
        <div class="note">Fire HD 10のレビュー数（5,958件）は棚で最多だが、<span class="hl">星ではTECLAST・AOC・OPPOに負けている</span>。価格帯もFire HD 8（17,980円）の下に1万円前後の機種が並び、上には整備済みiPadがいる。<b>「安さ」で選ばれる位置を格安Android勢に奪われている</b>状態。</div>
      </div></div>
    <div class="src">出典: <a href="${esc(sh.source_url)}" target="_blank" rel="noopener">${esc(sh.source)}</a>（${esc(sh.measured_at)}）／${esc(sh.rival_spec_note || '')}</div></div>`;
}
function avg(a){ const v = a.filter(isNum); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; }

function kakakuBlock(){
  const k = D.kakaku; if(!k) return '';
  const BR = {ipad: '#3987e5', xiaomi: '#d55181', lenovo: '#199e70', nec: '#9085e9', samsung: '#c98500', iris: '#a3a3a3', aiwa: '#64748B', fire: '#E36A1E'};
  const BRL = {ipad: 'Apple', xiaomi: 'Xiaomi', lenovo: 'Lenovo', nec: 'NEC', samsung: 'サムスン', iris: 'アイリス', aiwa: 'AIWA', fire: 'Fire'};
  const mk = (k.maker_counts || []).filter(m => m.n > 0);
  return `<div class="card s12 rv"><div class="ct"><h3>比較サイトの棚 — 価格.com「タブレットPC」に <span class="hl">Fireは1製品も無い</span></h3>${tagOf('live')}<span class="sub">${esc(k.source)}・Chromeで実測</span><span class="hb" onclick="help('kakaku')">?</span></div>
    <div class="kpi" style="margin-bottom:12px">
      <div class="k hero rose"><div class="l">登録製品数のうち Fire</div><div class="v"><span data-cu="0">0</span><small>/${fmt(k.registered_products)}製品</small></div><div class="d">メーカー絞り込みの選択肢にも<b>Amazonが存在しない</b>＝比較検討の場に不在</div></div>
      <div class="k cyan"><div class="l">登録製品数トップ</div><div class="v" style="font-size:18px">Apple ${fmt((mk[0] || {}).n)}</div><div class="d">Lenovo 84 ／ マイクロソフト 69 ／ Xiaomi 37 ／ NEC 34 ／ サムスン 22</div></div>
      <div class="k violet"><div class="l">絞り込み条件にある項目</div><div class="v" style="font-size:18px">Google Play対応</div><div class="d">103製品が該当。<b>Google Playの有無が比較軸として明示</b>されている土俵</div></div>
      <div class="k lime"><div class="l">売れ筋1位</div><div class="v" style="font-size:17px">iPad 11インチ</div><div class="d">最安 ${yen((k.items || [])[0] ? k.items[0].price : null)}・満足度4.71（103人）。値上げ後も首位</div></div>
    </div>
    <div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap">
      <div style="flex:2 1 420px" class="tw"><table><tr><th class="num">順位</th><th>製品</th><th>メーカー</th><th class="num">最安値</th><th class="num">満足度</th><th class="num">件数</th><th>発売</th></tr>
      ${(k.items || []).map(r => `<tr><td class="num">${r.rank}</td><td>${esc(r.name)}</td><td><span class="pill" style="background:${BR[r.brand] || '#64748B'}33;color:${BR[r.brand] || '#94A3B8'}">${esc(BRL[r.brand] || r.brand)}</span></td><td class="num">${yen(r.price)}</td><td class="num">${isNum(r.rating) ? fmt(r.rating, 2) : '—'}</td><td class="num">${r.reviews}</td><td class="muted">${esc(r.release)}</td></tr>`).join('')}
      <tr style="background:rgba(227,106,30,.08)"><td class="num">—</td><td><b style="color:#FFD9B3">Fireタブレット（全モデル）</b></td><td><span class="pill b-owned">Amazon</span></td><td class="num">—</td><td class="num">—</td><td class="num">0</td><td class="muted">製品登録なし</td></tr>
      </table></div>
      <div style="flex:1 1 280px">
        <div class="muted" style="font-size:11px;margin-bottom:4px">メーカー別 登録製品数</div>
        ${hbars(mk.map(m => ({name: m.maker, v: m.n, color: m.maker.indexOf('Amazon') >= 0 ? '#E36A1E' : '#64748B'})), {})}
        ${k.voice ? `<div class="note"><b>実際の乗り換え証言</b><br>「${esc(k.voice.quote)}」<br><span class="muted" style="font-size:10px">${esc(k.voice.where)}</span></div>` : ''}
        <div class="note"><b>なぜ効くか</b><br>AIは回答をつくるとき、比較サイト・ランキング記事を第三者ソースとして読みます（資料p31・p34）。価格.comに製品が無いと、<span class="hl">「タブレット おすすめ／比較」文脈でFireが構造的に落ちる</span>。Amazonの棚で5位でも、比較の土俵には上がっていません。</div>
      </div></div>
    <div class="src">出典: <a href="${esc(k.source_url)}" target="_blank" rel="noopener">${esc(k.source)}</a>（${esc(k.measured_at)} 取得）／${esc(k.note)}</div></div>`;
}

function ytManualBlock(){
  const y = D.yt_manual; if(!y) return '';
  const all = (y.queries || []).flatMap(q => (q.videos || []).map(i => ({...i, q: q.q})));
  const uniq = []; const seen = new Set();
  all.forEach(i => { if(!seen.has(i.url)){ seen.add(i.url); uniq.push(i); } });
  const official = uniq.filter(i => i.official).length;
  const play = uniq.filter(i => /google\s?play/i.test(i.title));
  return `<div class="card s12 rv"><div class="ct"><h3>YouTube の上位動画 — <span class="hl">AI引用ソースの第1位はYouTube</span>（資料p32）</h3>${tagOf('live')}<span class="sub">${esc(y.measured_at)}・関連度順・Chromeで実測</span><span class="hb" onclick="help('yt')">?</span></div>
    <div class="kpi" style="margin-bottom:12px">
      <div class="k hero rose"><div class="l">上位動画のうち Amazon公式</div><div class="v"><span data-cu="${official}">0</span><small>/${uniq.length}本</small></div><div class="d">「タブレット おすすめ」「Fire HD 10 レビュー」「子供用タブレット」の上位は<b>すべて第三者</b></div></div>
      <div class="k orange"><div class="l">Fire HD 10レビューの1位は</div><div class="v" style="font-size:16px">Google Play導入</div><div class="d">${play.length ? '「' + esc(short(play[0].title, 30)) + '」' : ''}が24万回視聴。<b>使い方の中心が非公式のGoogle Play導入として語られている</b></div></div>
      <div class="k cyan"><div class="l">最大リーチ動画</div><div class="v" style="font-size:17px">567万回</div><div class="d">「9,980円のiPad風タブレットPCが凄い」（5年前・吉田製作所）— 5年前の動画が今も上位</div></div>
      <div class="k violet"><div class="l">狙うべき状態</div><div class="v" style="font-size:17px">字幕・章立て</div><div class="d">AIが読むのは音声でなく<b>書き起こし</b>。価格・型番・比較表を説明欄と字幕に置く（V9-02）</div></div>
    </div>
    ${(y.queries || []).map(q => `<div style="margin-bottom:10px"><div class="muted" style="font-size:11px;margin-bottom:4px">検索語: <b style="color:#9BEBF7">${esc(q.q)}</b></div>
      <div class="flex">${(q.videos || []).map(i => `<a class="qi" style="flex:1 1 300px;display:block" href="${esc(i.url)}" target="_blank" rel="noopener"><div class="id">${i.rank}位 ・ ${esc(i.channel)} ・ <b style="color:#FDA4AF">${esc(i.views)}視聴</b> ・ ${esc(i.age)}</div><div class="tx" style="color:var(--ink)">${esc(i.title)}</div></a>`).join('')}</div></div>`).join('')}
    <div class="src">出典: ${(y.queries || []).map(q => `<a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.q)}</a>`).join('／')}（${esc(y.measured_at)} 取得）／${esc(y.note)}</div></div>`;
}
