/* part2: V2 検索需要 / V3 声・ニュース */
RENDER.v2 = () => {
  const T = D.trends || {}; const S = T.series || {};
  const kw = EX.keywords; const aik = EX.ai_keywords;
  const rel = ((T.related || {}).Kindle) || {top: [], rising: []};
  const reg = T.region || {};
  const regRows = Object.entries(reg.Kindle || {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const ku = S.models_12m;
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>世間の需要 — Googleで「Kindle」はどれだけ・何と一緒に探されているか</h3>${tagOf(T.series ? 'live' : 'wait')}<span class="sub">Google Trends（日本）${kw ? '＋ Google広告 月間検索数' : ''}</span><span class="hb" onclick="help('demand')">?</span></div>
    <div class="kpi">
      <div class="k orange"><div class="l">Kindle 検索関心（直近8週平均）</div><div class="v"><span data-cu="${T.kindle_avg_last8 || 0}" data-d="1">0</span><small>/100</small></div><div class="d"><span class="${cls((T.kindle_avg_last8 || 0) - (T.kindle_avg_prev8 || 0))}">${arrow((T.kindle_avg_last8 || 0) - (T.kindle_avg_prev8 || 0))} ${sgn((T.kindle_avg_last8 || 0) - (T.kindle_avg_prev8 || 0))}</span> 前8週比（pt）</div>${spark((S.brands_12m || {values: {}}).values.Kindle || [])}</div>
      <div class="k cyan"><div class="l">対 Kobo 倍率（12か月平均）</div><div class="v"><span data-cu="${(T.share_12m || {}).Kindle && (T.share_12m || {}).Kobo ? T.share_12m.Kindle / T.share_12m.Kobo : 0}" data-d="1">0</span><small>倍</small></div><div class="d">Kindle ${fmt((T.share_12m || {}).Kindle, 1)} vs Kobo ${fmt((T.share_12m || {}).Kobo, 1)} vs BOOX ${fmt((T.share_12m || {}).BOOX, 1)}</div></div>
      <div class="k rose"><div class="l">直近12か月のピーク</div><div class="v">${T.kindle_peak ? esc(T.kindle_peak.date.slice(5).replace('-', '/')) : '—'}<small>週</small></div><div class="d">${T.kindle_peak ? 'ブラックフライデー週（=100）' : ''}／次点 12/28 年末・7/5 プライムデー</div></div>
      <div class="k violet"><div class="l">Google広告 月間検索数（合計）</div><div class="v">${kw ? `<span data-cu="${kw.total}">0</span><small>回/月</small>` : '<span style="font-size:16px;color:var(--ink3)">計測待ち</span>'}</div><div class="d">${kw ? 'Kindle関連 ' + kw.rows.length + '語の合計' : 'DataForSEO 初回ラウンドで反映'}</div></div>
    </div></div>

  <div class="card s7 rv"><div class="ct"><h3>ブランド別 検索関心 5年（週次）</h3>${tagOf(S.brands_5y ? 'live' : 'wait')}<span class="sub">Kindle最大週=100</span></div>
    ${S.brands_5y ? `<div class="leg"><span><i style="background:#E36A1E"></i>Kindle</span><span><i style="background:#3987e5"></i>電子書籍</span><span><i style="background:#d55181"></i>Kobo</span><span><i style="background:#9085e9"></i>楽天Kobo</span></div>` + lineChart({w: 720, h: 230, dates: S.brands_5y.dates, labelsEvery: 26, ymax: 100, dfmt: d => d.slice(0, 7), series: [
      {name: 'Kindle', color: '#E36A1E', values: S.brands_5y.values['Kindle']}, {name: '電子書籍', color: '#3987e5', values: S.brands_5y.values['電子書籍']},
      {name: 'Kobo', color: '#d55181', values: S.brands_5y.values['Kobo']}, {name: '楽天Kobo', color: '#9085e9', values: S.brands_5y.values['楽天Kobo']}]}) : waitBox('5年トレンドが未取得です')}
    <div class="note">5年で見ると Kindle の関心は<b>じわ上げ</b>（5年前の週≒55 → 直近≒65-70）。一般語「電子書籍」（≒22）よりブランド名「Kindle」で探される市場＝<span class="hl">カテゴリ名がブランド名に置き換わっている</span>。</div>
    <div class="src">出典: <a href="https://trends.google.co.jp/trends/explore?date=today%205-y&geo=JP&q=Kindle,Kobo,%E9%9B%BB%E5%AD%90%E6%9B%B8%E7%B1%8D" target="_blank" rel="noopener">Google Trends</a> 取得 ${esc(T.pulled_at || '')}</div></div>

  <div class="card s5 rv"><div class="ct"><h3>Kindle と一緒に検索される語（12か月）</h3>${tagOf(rel.top && rel.top.length ? 'live' : 'wait')}<span class="sub">上位＝相対値／急上昇＝伸び率</span></div>
    <div class="row" style="align-items:flex-start;gap:16px;flex-wrap:wrap"><div style="flex:1 1 200px"><div class="muted" style="font-size:11px;margin-bottom:4px">上位</div>${hbars((rel.top || []).slice(0, 12).map(r => ({name: r.query, v: r.value, color: /解約|削除/.test(r.query) ? '#F87171' : /セール|無料|日替わり/.test(r.query) ? '#c98500' : '#E36A1E'})), {})}</div>
    <div style="flex:1 1 180px"><div class="muted" style="font-size:11px;margin-bottom:4px">急上昇</div>${(rel.rising || []).slice(0, 9).map(r => `<div class="row" style="justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--line)"><span>${esc(r.query)}</span><b class="mono" style="color:#8FF0C9">+${fmt(r.value)}%</b></div>`).join('')}</div></div>
    <div class="note">「kindle unlimited」「kindle セール」が需要の2大文脈。一方で<span class="hl">「kindle 解約」「kindle unlimited 解約」「kindle 削除」</span>も上位 — 解約導線の分かりにくさは世間側の不満として顕在化。急上昇1位「kindle scribe colorsoft」は新型の関心の高さ。</div></div>

  <div class="card s6 rv"><div class="ct"><h3>モデル・サービス別の関心（12か月）</h3>${tagOf(ku ? 'live' : 'wait')}<span class="sub">Kindle Unlimited最大週=100</span></div>
    ${ku ? `<div class="leg">${ku.keywords.map((k, i) => `<span><i style="background:${CAT[i]}"></i>${esc(k)}</span>`).join('')}</div>` + lineChart({w: 620, h: 220, dates: ku.dates, labelsEvery: 8, ymax: 100, dfmt: d => d.slice(5).replace('-', '/'), series: ku.keywords.map((k, i) => ({name: k, color: CAT[i], values: ku.values[k]}))}) : waitBox('モデル別トレンド未取得')}
    <div class="note">端末名ではPaperwhiteが最多（Scribe・Colorsoftの2-3倍）。Scribe/Colorsoftは<b>6月の新型発表で山</b>。「Kindle セール」はKUと並ぶ大きな塊 — 需要はセール待ち行動と強く結びついている。</div></div>

  <div class="card s6 rv"><div class="ct"><h3>都道府県別の関心（Kindle・12か月）</h3>${tagOf(regRows.length ? 'live' : 'wait')}<span class="sub">最大=100</span></div>
    ${regRows.length ? hbars(regRows.map(([k, v]) => ({name: k, v, color: '#22D3EE'})), {}) : waitBox('地域データ未取得')}
    <div class="note">首都圏＋大阪・京都・愛知に加え、<b>長野（63）・茨城（57）</b>が上位 — 通勤時間の長い地域や書店密度の低い地域で関心が高い仮説。量販店の店頭展開（地方店）の優先順位づけに使える。</div></div>

  <div class="card s12 rv ${kw ? '' : 'wait'}"><div class="ct"><h3>Google広告 月間検索ボリューム（Kindle関連 ${kw ? kw.rows.length + '語' : '約100語'}）</h3>${tagOf(kw ? 'live' : 'wait')}<span class="sub">DataForSEO keywords_data（日本・過去12か月平均）</span></div>
    ${kw ? kwTable(kw) : waitBox('検索ボリューム（月間）は初回ラウンドで反映されます', 'ブランド／モデル／価格／チャネル／サービス／カテゴリ／競合 の8群・約100語を1呼で取得（$0.09）。')}
  </div>
  ${aik ? `<div class="card s12 rv"><div class="ct"><h3>AI検索ボリューム（ChatGPT等でのプロンプト需要・推計）</h3>${tagOf('live')}<span class="sub">DataForSEO AI Keyword Data</span></div>${hbars(aik.slice(0, 20).map(r => ({name: r.kw, v: r.vol, color: '#9085e9'})), {})}</div>` : ''}
  </div>`;
};
function kwTable(kw){
  const groups = {brand: 'ブランド', models: 'モデル', price: '価格・セール', channel: '購入チャネル', service: 'KU・サービス', usage: '使い方', category: 'カテゴリ一般', competitor: '競合', ebook: '電子書籍全般', other: 'その他'};
  const g = Object.entries(kw.groups || {}).sort((a, b) => b[1] - a[1]);
  return `<div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap"><div style="flex:1 1 300px"><div class="muted" style="font-size:11px;margin-bottom:4px">群別 合計（回/月）</div>${hbars(g.map(([k, v], i) => ({name: groups[k] || k, v, color: CAT[i % 6]})), {})}</div>
  <div style="flex:2 1 460px" class="tw"><table><tr><th>キーワード</th><th>群</th><th class="num">月間検索数</th><th class="num">CPC</th><th>12か月</th></tr>${kw.rows.slice(0, 40).map(r => `<tr><td>${esc(r.kw)}</td><td><span class="fam">${esc(groups[r.group] || r.group)}</span></td><td class="num"><b>${fmt(r.vol)}</b></td><td class="num">${isNum(r.cpc) ? '$' + fmt(r.cpc, 2) : '—'}</td><td>${spark(r.monthly.map(m => m[2]), '#22D3EE', 80, 20)}</td></tr>`).join('')}</table></div></div>`;
}

/* ---------- V3 声・ニュース ---------- */
RENDER.v3 = () => {
  const news = (D.news_curated || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const tone = {pos: news.filter(n => n.tone === 'pos').length, neu: news.filter(n => n.tone === 'neu').length, neg: news.filter(n => n.tone === 'neg').length};
  const yt = EX.youtube, apps = EX.apps, am = EX.amazon_serp, ca = EX.content, nz = EX.news, prods = EX.amazon_products;
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>世間の声 — ニュース・動画・アプリ評価・Amazon上の評判</h3>${tagOf('live')}<span class="sub">報道${yt ? '・YouTube' : ''}${apps ? '・アプリストア' : ''}${am ? '・Amazon.co.jp' : ''}${ca ? '・Web感情' : ''}</span><span class="hb" onclick="help('voice')">?</span></div>
    <div class="kpi">
      <div class="k orange"><div class="l">2026年の主要報道 ${news.length}件のトーン</div><div class="v"><span style="color:#8FF0C9" data-cu="${tone.pos}">0</span><small>好意</small> <span style="color:#A9B7CF" data-cu="${tone.neu}">0</span><small>中立</small> <span style="color:#FDA4AF" data-cu="${tone.neg}">0</span><small>懸念</small></div><div class="d">懸念＝価格2倍（Scribe Colorsoft）・マンガ表示バグ半年・旧機種接続終了・PC版移行</div></div>
      <div class="k cyan"><div class="l">Kindleアプリ評価 iOS</div><div class="v"><span data-cu="${(apps && apps.apple && apps.apple.rating) || fact('J01')}" data-d="1">0</span><small>/5</small></div><div class="d">${apps && apps.apple ? fmt(apps.apple.votes) + '件（DataForSEO実測）' : '111万件・ブック7位（App Store 2026/9/3）'}</div></div>
      <div class="k violet"><div class="l">Kindleアプリ評価 Android</div><div class="v"><span data-cu="${(apps && apps.google && apps.google.rating) || fact('J02')}" data-d="1">0</span><small>/5</small></div><div class="d">${apps && apps.google ? fmt(apps.google.votes) + '件・' + esc(apps.google.installs || '') : '479万件・1億+ DL（Google Play）'}</div></div>
      <div class="k lime"><div class="l">Amazon.co.jp「kindle」検索 上位</div><div class="v">${am && am.kindle ? `<span data-cu="${(am.kindle.filter(x => /kindle/i.test(x.title)).length)}">0</span><small>/${am.kindle.length}件がKindle</small>` : '<span style="font-size:16px;color:var(--ink3)">計測待ち</span>'}</div><div class="d">${am ? '順位・価格・評価・先月の購入数（DataForSEO Merchant）' : '初回ラウンドで反映'}</div></div>
    </div></div>

  <div class="card s7 rv"><div class="ct"><h3>ニュース・タイムライン（2026年・主要報道）</h3>${tagOf('live')}<span class="sub">全件リンク付き・トーンは編集判定</span></div>
    <div style="max-height:520px;overflow:auto;padding-right:4px">${news.map(n => `<a class="qi" href="${esc(n.url)}" target="_blank" rel="noopener" style="display:grid;grid-template-columns:86px 1fr;gap:10px;align-items:start;border-left:3px solid ${n.tone === 'neg' ? '#F87171' : n.tone === 'pos' ? '#34D399' : '#64748B'}"><div class="id" style="font-size:11px;line-height:1.5">${esc(n.date)}<br><span style="color:var(--ink2)">${esc(n.media)}</span></div><div><div class="tx" style="color:var(--ink);margin:0 0 4px">${esc(n.title)}</div><span class="fam">${esc(n.tag)}</span></div></a>`).join('')}</div></div>

  <div class="card s5 rv"><div class="ct"><h3>語られ方の論点マップ（報道・レビュー要約）</h3>${tagOf('live')}</div>
    ${[['新製品', 'Scribe Colorsoft（初のカラー手書き）は「進化」と「価格2倍・10万円超」が同時に語られる', 'pos'], ['セール', 'プライムデー・サマーセール・KU無料期間の記事が最多。需要が「セール待ち」化', 'pos'], ['価格', 'Paperwhite 14,980→27,980円の累積値上げ。Koboも値上げで相対差は維持', 'neg'], ['不具合・サポート', 'マンガ表示バグを半年放置→5.19.6で修正。旧13機種の接続終了、PC版アプリ移行', 'neg'], ['機能', 'DRMフリー本のEPUB/PDFダウンロード開始（囲い込み批判への応答）', 'pos'], ['チャネル', '量販店6社で店頭展開。ヨドバシ不在・価格.com未登録で「比較の場」にいない', 'neu']].map(([t, s, tn]) => `<div class="row" style="align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line)"><span class="pill ${tn === 'pos' ? 'b-ugc' : tn === 'neg' ? 'b-video' : 'b-media'}" style="flex:none;margin-top:2px">${esc(t)}</span><span style="font-size:12px;color:var(--ink2)">${esc(s)}</span></div>`).join('')}
    <div class="src">出典: 上のタイムライン各記事／${factLink('D10b')}／${factLink('G02')}</div></div>

  ${yt ? ytBlock(yt) : `<div class="card s6 rv wait"><div class="ct"><h3>YouTube で語られるKindle</h3>${tagOf('wait')}<span class="sub">AI引用の第1位ソースはYouTube</span></div>${waitBox('「Kindle おすすめ」「Kindle Kobo 比較」など5語の上位20本・再生数を取得します', '初回ラウンドで反映（DataForSEO YouTube SERP）')}</div>`}
  ${apps ? appBlock(apps) : `<div class="card s6 rv wait"><div class="ct"><h3>アプリレビュー（最新）</h3>${tagOf('wait')}</div>${waitBox('App Store 最新50件・Google Play 最新150件の星と本文を取得します', '初回ラウンドで反映（DataForSEO App Data）')}</div>`}
  ${am ? amazonBlock(am, prods) : `<div class="card s12 rv wait"><div class="ct"><h3>Amazon.co.jp 検索結果（kindle / 電子書籍リーダー / kobo）</h3>${tagOf('wait')}</div>${waitBox('順位・価格・星・レビュー数・先月の購入数（bought_past_month）・ベストセラー／Amazon\'s Choice を取得します', '初回ラウンドで反映（DataForSEO Merchant Amazon）')}</div>`}
  ${ca ? caBlock(ca) : ''}
  <div class="card s12 rv"><div class="ct"><h3>SNS（X / Instagram / TikTok）の言及量・感情</h3>${tagOf('teaser')}<span class="sub">SNS管理者アカウント（API）連携で解放</span></div>
    <div class="teaserbox" style="border-radius:12px;padding:6px">${lineChart({w: 900, h: 160, dates: Array.from({length: 26}, (_, i) => 'W' + (i + 1)), series: [{name: 'X 言及数', color: '#22D3EE', values: Array.from({length: 26}, (_, i) => 40 + 30 * Math.abs(Math.sin(i / 3)))}], fill: true, labelsEvery: 4})}</div>
    <div class="note">連携後に表示: 日次言及数・感情比率・話題語・インフルエンサー上位・キャンペーン反応。データ連携ビュー（⚙）に手順。</div></div>
  </div>`;
};
function ytBlock(yt){
  const rows = Object.entries(yt).flatMap(([kw, vs]) => vs.map(v => ({...v, kw}))).filter(v => v.title).sort((a, b) => (b.views || 0) - (a.views || 0));
  const seen = new Set(); const uniq = rows.filter(r => !seen.has(r.url) && seen.add(r.url)).slice(0, 14);
  return `<div class="card s6 rv"><div class="ct"><h3>YouTube で語られるKindle（再生数順）</h3>${tagOf('live')}<span class="sub">${Object.keys(yt).length}語の検索上位</span></div>
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
  const kw = Object.keys(am)[0]; const rows = (am.kindle || am[kw] || []).slice(0, 20);
  return `<div class="card s12 rv"><div class="ct"><h3>Amazon.co.jp 検索結果（実測）</h3>${tagOf('live')}<span class="sub">DataForSEO Merchant ・ ${esc(EX.date || '')}</span></div>
    <div class="ftabs" id="amtabs">${Object.keys(am).map((k, i) => `<button class="${i === 0 ? 'on' : ''}" onclick="amTab('${esc(k)}',this)">${esc(k)}</button>`).join('')}</div>
    <div id="ambody">${amTable(rows)}</div>
    ${prods && prods.length ? `<div class="ct" style="margin-top:14px"><h3>主要商品の詳細と上位レビュー</h3></div><div class="flex">${prods.slice(0, 6).map(p => `<div class="qi" style="flex:1 1 300px;cursor:default"><div class="id">${esc(p.asin)} ・ ★${fmt(p.rating, 1)}（${fmt(p.votes)}件）・ ${yen(p.price)}${isNum(p.discount) && p.discount ? ' ・ ' + p.discount + '%OFF' : ''}</div><div class="tx"><b>${esc(short(p.title, 70))}</b></div>${(p.reviews || []).slice(0, 3).map(r => `<div style="font-size:11px;color:var(--ink2);border-top:1px solid var(--line);padding:5px 0">★${fmt(r.rating, 0)} ${esc(short(r.title || '', 40))} — ${esc(short(r.text, 110))}</div>`).join('')}</div>`).join('')}</div>` : ''}
  </div>`;
}
function amTable(rows){
  return `<div class="tw"><table><tr><th class="num">順位</th><th>商品</th><th class="num">価格</th><th class="num">★</th><th class="num">評価数</th><th class="num">先月購入</th><th>ラベル</th></tr>${rows.map(r => `<tr><td class="num">${r.rank}${r.type === 'amazon_paid' ? '<span class="fam">広告</span>' : ''}</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:${/kindle/i.test(r.title) ? '#FFD9B3' : 'var(--ink)'}">${esc(short(r.title, 64))}</a></td><td class="num">${yen(r.price)}</td><td class="num">${fmt(r.rating, 1)}</td><td class="num">${fmt(r.votes)}</td><td class="num">${esc(r.bought || '—')}</td><td>${r.best ? '<span class="pill b-owned">ベストセラー</span>' : ''}${r.choice ? '<span class="pill b-retail">Choice</span>' : ''}</td></tr>`).join('')}</table></div>`;
}
function amTab(k, btn){ $$('#amtabs button').forEach(b => b.classList.toggle('on', b === btn)); $('#ambody').innerHTML = amTable((EX.amazon_serp[k] || []).slice(0, 20)); }
function caBlock(ca){
  const s = (ca.summary || {}).kindle || Object.values(ca.summary || {})[0]; if(!s) return '';
  const conn = s.connotation || {}; const tot = (conn.positive || 0) + (conn.negative || 0) + (conn.neutral || 0) || 1;
  const sent = s.sentiment || {};
  return `<div class="card s12 rv"><div class="ct"><h3>Web上の「kindle」言及の感情（Content Analysis・日本語）</h3>${tagOf('live')}<span class="sub">総ページ ${fmt(s.total)} 件</span></div>
    <div class="row" style="align-items:flex-start;gap:20px;flex-wrap:wrap"><div style="flex:1 1 240px">${donut([{name: 'ポジティブ', v: (conn.positive || 0) / tot * 100, color: '#34D399'}, {name: 'ニュートラル', v: (conn.neutral || 0) / tot * 100, color: '#64748B'}, {name: 'ネガティブ', v: (conn.negative || 0) / tot * 100, color: '#F87171'}])}</div>
    <div style="flex:1 1 260px">${hbars(Object.entries(sent).map(([k, v]) => ({name: {anger: '怒り', happiness: '喜び', love: '愛着', sadness: '悲しみ', share: '共有', fun: '楽しさ'}[k] || k, v, color: '#9085e9'})), {})}</div>
    <div style="flex:1 1 260px"><div class="muted" style="font-size:11px;margin-bottom:4px">言及の多いドメイン</div>${(s.top_domains || []).slice(0, 10).map(d => `<div class="row" style="justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--line)"><span>${esc(d.domain)}</span><b class="mono">${fmt(d.count)}</b></div>`).join('')}</div></div>
    ${(ca.mentions || []).length ? `<div style="max-height:300px;overflow:auto;margin-top:10px">${ca.mentions.slice(0, 30).map(m => `<a class="qi" href="${esc(m.url)}" target="_blank" rel="noopener" style="display:block"><div class="id">${esc(m.domain)} ・ ${esc((m.date || '').slice(0, 10))}</div><div class="tx" style="color:var(--ink)">${esc(short(m.title || '', 90))}</div><div style="font-size:11px;color:var(--ink2)">${esc(short(m.snippet || '', 160))}</div></a>`).join('')}</div>` : ''}</div>`;
}
