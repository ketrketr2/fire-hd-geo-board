/* part2: V2 検索需要 / V3 声・ニュース */
RENDER.v2 = () => {
  const T = D.trends || {}; const S = T.series || {};
  const kw = EX.keywords; const aik = EX.ai_keywords;
  const rel = ((T.related || {})['Fire TV Stick']) || {top: [], rising: []};
  const reg = T.region || {};
  const regRows = Object.entries(reg['Fire TV Stick'] || {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const _ku = S.models_12m;
  const ku = (_ku && Array.isArray(_ku.keywords) && _ku.keywords.some(k => Array.isArray((_ku.values || {})[k]))) ? _ku : null;
  const b12 = (S.brands_12m || {values: {}}).values || {};
  const B5 = ((S.brands_5y || {}).values) || {};
  const b5ok = S.brands_5y && ['Fire TV Stick', 'Chromecast', 'TVer', 'スマートテレビ'].some(k => Array.isArray(B5[k]));
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>世間の需要 — 人は「機器」ではなく「見たいもの」から探している</h3>${tagOf(T.series ? 'live' : 'wait')}<span class="sub">Google Trends（日本）${kw ? '＋ Google広告 月間検索数' : ''}</span><span class="hb" onclick="help('demand')">?</span></div>
    <div class="kpi">
      <div class="k orange"><div class="l">Fire TV Stick 検索関心（直近8週平均）</div><div class="v"><span data-cu="${T.self_avg_last8 || 0}" data-d="1">0</span><small>/100</small></div><div class="d"><span class="${cls((T.self_avg_last8 || 0) - (T.self_avg_prev8 || 0))}">${arrow((T.self_avg_last8 || 0) - (T.self_avg_prev8 || 0))} ${sgn((T.self_avg_last8 || 0) - (T.self_avg_prev8 || 0))}</span> 前8週比（pt）</div>${spark(b12['Fire TV Stick'] || [])}</div>
      <div class="k rose"><div class="l">TVer との差（12か月平均）</div><div class="v"><span data-cu="${(T.share_12m || {})['TVer'] && (T.share_12m || {})['Fire TV Stick'] ? T.share_12m['TVer'] / T.share_12m['Fire TV Stick'] : 0}" data-d="1">0</span><small>倍</small></div><div class="d">TVer ${fmt((T.share_12m || {})['TVer'], 1)} vs Fire TV Stick ${fmt((T.share_12m || {})['Fire TV Stick'], 1)} vs Chromecast ${fmt((T.share_12m || {})['Chromecast'], 1)}</div></div>
      <div class="k cyan"><div class="l">直近12か月のピーク</div><div class="v">${T.self_peak ? esc(T.self_peak.date.slice(5).replace('-', '/')) : '—'}<small>週</small></div><div class="d">${T.self_peak ? 'セール週に集中' : ''}／プライムデー・BF・新生活</div></div>
      <div class="k violet"><div class="l">Google広告 月間検索数（合計）</div><div class="v">${kw ? `<span data-cu="${kw.total}">0</span><small>回/月</small>` : '<span style="font-size:16px;color:var(--ink3)">計測待ち</span>'}</div><div class="d">${kw ? 'Fire TV・テレビ視聴関連 ' + kw.rows.length + '語の合計' : 'DataForSEO 初回ラウンドで反映'}</div></div>
    </div></div>

  <div class="card s7 rv"><div class="ct"><h3>ブランド別 検索関心 5年（週次）</h3>${tagOf(b5ok ? 'live' : 'wait')}<span class="sub">最大週=100</span></div>
    ${b5ok ? `<div class="leg"><span><i style="background:#E36A1E"></i>Fire TV Stick</span><span><i style="background:#3987e5"></i>Chromecast</span><span><i style="background:#2DD4BF"></i>TVer</span><span><i style="background:#22D3EE"></i>スマートテレビ</span></div>` + lineChart({w: 720, h: 230, dates: S.brands_5y.dates, labelsEvery: 26, ymax: 100, dfmt: d => d.slice(0, 7), series: [
      {name: 'Fire TV Stick', color: '#E36A1E', values: B5['Fire TV Stick'] || []}, {name: 'Chromecast', color: '#3987e5', values: B5['Chromecast'] || []},
      {name: 'TVer', color: '#2DD4BF', values: B5['TVer'] || []}, {name: 'スマートテレビ', color: '#22D3EE', values: B5['スマートテレビ'] || []}]}) : waitBox('5年トレンドが未取得です')}
    <div class="note">端末名とサービス名を同じ軸に置くと、<b>需要の主語がどちらにあるか</b>が見える。人はまず「何を見たいか」で検索し、機器はその答えとして後から出てくる — <span class="hl">非指名クエリでAIが何を勧めるかが、そのまま販売の入口になる</span>。</div>
    <div class="src">出典: <a href="https://trends.google.co.jp/trends/explore?date=today%205-y&geo=JP&q=Fire%20TV%20Stick,Chromecast,TVer" target="_blank" rel="noopener">Google Trends</a> 取得 ${esc(T.pulled_at || '')}</div></div>

  <div class="card s5 rv"><div class="ct"><h3>Fire TV Stick と一緒に検索される語（12か月）</h3>${tagOf(rel.top && rel.top.length ? 'live' : 'wait')}<span class="sub">上位＝相対値／急上昇＝伸び率</span></div>
    ${(rel.top && rel.top.length) ? `<div class="row" style="align-items:flex-start;gap:16px;flex-wrap:wrap"><div style="flex:1 1 200px"><div class="muted" style="font-size:11px;margin-bottom:4px">上位</div>${hbars((rel.top || []).slice(0, 12).map(r => ({name: r.query, v: r.value, color: /google play|使えな|デメリット/.test(r.query) ? '#F87171' : /セール|安い/.test(r.query) ? '#c98500' : '#E36A1E'})), {})}</div>
    <div style="flex:1 1 180px"><div class="muted" style="font-size:11px;margin-bottom:4px">急上昇</div>${(rel.rising || []).slice(0, 9).map(r => `<div class="row" style="justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--line)"><span>${esc(r.query)}</span><b class="mono" style="color:#8FF0C9">+${fmt(r.value)}%</b></div>`).join('')}</div></div>`
      : `<div class="empty" style="text-align:left"><b>関連検索語を取得できませんでした</b>Googleトレンドの関連クエリは検索量が一定以下だと返りません。検索量が一定に満たない語では関連クエリが生成されません。下のGoogle広告 月間検索ボリュームで実数を確認してください。</div>`}
    <div class="note">関連語には<b>「繋がらない」「リモコン」「広告」「4K 意味ない」</b>といったトラブル・疑念系が混ざります。ここに出る語は、そのままAIに投げられている質問だと読めます。</div></div>

  <div class="card s6 rv"><div class="ct"><h3>モデル別の関心（12か月）</h3>${tagOf(ku ? 'live' : 'wait')}<span class="sub">最大週=100</span></div>
    ${ku ? `<div class="leg">${ku.keywords.map((k, i) => `<span><i style="background:${CAT[i]}"></i>${esc(k)}</span>`).join('')}</div>` + lineChart({w: 620, h: 220, dates: ku.dates, labelsEvery: 8, ymax: 100, dfmt: d => d.slice(5).replace('-', '/'), series: ku.keywords.map((k, i) => ({name: k, color: CAT[i], values: ku.values[k]}))}) : waitBox('モデル別トレンド未取得')}
    <div class="note">モデル別（4K / HD / Cube / セール / カタカナ表記）の関心。ピークは<b>セール週</b>に集中し、需要は価格イベント連動。口語表記「ファイヤースティック」がどこまで拾えているかが、<span class="hl">表記ゆれ対応の実測値</span>になります。</div></div>

  <div class="card s6 rv"><div class="ct"><h3>都道府県別の関心（Fire TV Stick・12か月）</h3>${tagOf(regRows.length ? 'live' : 'wait')}<span class="sub">最大=100</span></div>
    ${regRows.length ? hbars(regRows.map(([k, v]) => ({name: k, v, color: '#22D3EE'})), {}) : waitBox('地域データ未取得')}
    <div class="note">地域差はノイズを含みます。テレビ保有率は全国的に高いため、<b>大都市圏に偏らない広がり方</b>であれば、量販店の店頭展開と親和的だと読めます。</div></div>

  <div class="card s12 rv ${kw ? '' : 'wait'}"><div class="ct"><h3>Google広告 月間検索ボリューム（Fire TV・テレビ視聴関連 ${kw ? kw.rows.length + '語' : '約100語'}）</h3>${tagOf(kw ? 'live' : 'wait')}<span class="sub">DataForSEO keywords_data（日本・過去12か月平均）</span></div>
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
      <div class="k orange"><div class="l">直近12か月の主要報道 ${news.length}件のトーン</div><div class="v"><span style="color:#8FF0C9" data-cu="${tone.pos}">0</span><small>好意</small> <span style="color:#A9B7CF" data-cu="${tone.neu}">0</span><small>中立</small> <span style="color:#FDA4AF" data-cu="${tone.neg}">0</span><small>懸念</small></div><div class="d">好意の多くは<b>セール記事と新HDの速度評価</b>。懸念はVega OS移行と米国値上げ</div></div>
      <div class="k rose"><div class="l">新モデルの投入間隔</div><div class="v"><span data-cu="7">0</span><small>か月</small></div><div class="d">4K Select（2025-10）→ 新Stick HD（2026-04）。<b>ハードは動いている</b></div></div>
      <div class="k violet"><div class="l">現行ラインの機種数</div><div class="v"><span data-cu="${fireStock}">0</span><small>機種</small></div><div class="d">Vega機2・Fire OS機3。同じ売場に<b>2つのOSが並ぶ</b></div></div>
      <div class="k lime"><div class="l">起動時間（新Stick HD 実測）</div><div class="v"><span data-cu="12.4" data-d="1">0</span><small>秒</small></div><div class="d">2021年モデルは35.2秒。速度は明確に改善している</div></div>
    </div></div>

  <div class="card s7 rv"><div class="ct"><h3>ニュース・タイムライン（直近12か月・主要報道）</h3>${tagOf('live')}<span class="sub">全件リンク付き・トーンは編集判定</span></div>
    <div style="max-height:520px;overflow:auto;padding-right:4px">${news.map(n => `<a class="qi" href="${esc(n.url)}" target="_blank" rel="noopener" style="display:grid;grid-template-columns:86px 1fr;gap:10px;align-items:start;border-left:3px solid ${n.tone === 'neg' ? '#F87171' : n.tone === 'pos' ? '#34D399' : '#64748B'}"><div class="id" style="font-size:11px;line-height:1.5">${esc(n.date)}<br><span style="color:var(--ink2)">${esc(n.media)}</span></div><div><div class="tx" style="color:var(--ink);margin:0 0 4px">${esc(n.title)}</div><span class="fam">${esc(n.tag)}</span></div></a>`).join('')}</div></div>

  <div class="card s5 rv"><div class="ct"><h3>語られ方の論点マップ（報道・レビュー要約）</h3>${tagOf('live')}</div>
    ${[['OS移行', 'Vega OSはLinuxベースでAndroid非互換。APKのサイドロード不可で、広告ブロック・SmartTube・DiXiM Playが入らない。今後の新機種は全てVegaの方針', 'neg'],
       ['説明不足', '日本語のプレスリリースに「Vega OS」の記載がなく、購入者が違いに気づかないまま買う。後悔記事の生成源になっている', 'neg'],
       ['広告', 'ホーム画面のPR映像が自動再生されるという不満が公式フォーラムに継続的に投稿されている。Vega機では広告ブロックを入れられない', 'neg'],
       ['値上げ', '2026年8月に米国でFire TV・Kindle・Echoが最大60%値上げ。日本での改定は同時点で確認できていない', 'neg'],
       ['速度', '新Stick HDは起動12.4秒（旧35.2秒）・幅30%スリム・USB-C給電。メディアの評価は明確に好意的', 'pos'],
       ['売場', 'パナソニックがFire TV搭載ビエラを12機種投入。テレビ本体側からの面取りが進んでいる', 'pos']].map(([t, s, tn]) => `<div class="row" style="align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line)"><span class="pill ${tn === 'pos' ? 'b-ugc' : tn === 'neg' ? 'b-video' : 'b-media'}" style="flex:none;margin-top:2px">${esc(t)}</span><span style="font-size:12px;color:var(--ink2)">${esc(s)}</span></div>`).join('')}
    <div class="src">出典: 上のタイムライン各記事／${factLink('E05')}／${factLink('E04')}／${factLink('H02')}</div></div>

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
  return `<div class="card s6 rv"><div class="ct"><h3>YouTube で語られる Fire TV（再生数順）</h3>${tagOf('live')}<span class="sub">${Object.keys(yt).length}語の検索上位</span></div>
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
  const kw = Object.keys(am)[0]; const rows = (am['ストリーミングデバイス'] || am[kw] || []).slice(0, 20);
  return `<div class="card s12 rv"><div class="ct"><h3>Amazon.co.jp 検索結果（実測）</h3>${tagOf('live')}<span class="sub">DataForSEO Merchant ・ ${esc(EX.date || '')}</span></div>
    <div class="ftabs" id="amtabs">${Object.keys(am).map((k, i) => `<button class="${i === 0 ? 'on' : ''}" onclick="amTab('${esc(k)}',this)">${esc(k)}</button>`).join('')}</div>
    <div id="ambody">${amTable(rows)}</div>
    ${prods && prods.length ? `<div class="ct" style="margin-top:14px"><h3>主要商品の詳細と上位レビュー</h3></div><div class="flex">${prods.slice(0, 6).map(p => `<div class="qi" style="flex:1 1 300px;cursor:default"><div class="id">${esc(p.asin)} ・ ★${fmt(p.rating, 1)}（${fmt(p.votes)}件）・ ${yen(p.price)}${isNum(p.discount) && p.discount ? ' ・ ' + p.discount + '%OFF' : ''}</div><div class="tx"><b>${esc(short(p.title, 70))}</b></div>${(p.reviews || []).slice(0, 3).map(r => `<div style="font-size:11px;color:var(--ink2);border-top:1px solid var(--line);padding:5px 0">★${fmt(r.rating, 0)} ${esc(short(r.title || '', 40))} — ${esc(short(r.text, 110))}</div>`).join('')}</div>`).join('')}</div>` : ''}
  </div>`;
}
function amTable(rows){
  return `<div class="tw"><table><tr><th class="num">順位</th><th>商品</th><th class="num">価格</th><th class="num">★</th><th class="num">評価数</th><th class="num">先月購入</th><th>ラベル</th></tr>${rows.map(r => `<tr><td class="num">${r.rank}${r.type === 'amazon_paid' ? '<span class="fam">広告</span>' : ''}</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:${/fire\s?tv|firetv|ファイヤ|ファイア|amazon/i.test(r.title) ? '#FFD9B3' : 'var(--ink)'}">${esc(short(r.title, 64))}</a></td><td class="num">${yen(r.price)}</td><td class="num">${fmt(r.rating, 1)}</td><td class="num">${fmt(r.votes)}</td><td class="num">${esc(r.bought || '—')}</td><td>${r.best ? '<span class="pill b-owned">ベストセラー</span>' : ''}${r.choice ? '<span class="pill b-retail">Choice</span>' : ''}</td></tr>`).join('')}</table></div>`;
}
function amTab(k, btn){ $$('#amtabs button').forEach(b => b.classList.toggle('on', b === btn)); $('#ambody').innerHTML = amTable((EX.amazon_serp[k] || []).slice(0, 20)); }
function caBlock(ca){
  const s = (ca.summary || {})['fire tv stick'] || (ca.summary || {})['fire tv'] || Object.values(ca.summary || {})[0]; if(!s) return '';
  const conn = s.connotation || {}; const tot = (conn.positive || 0) + (conn.negative || 0) + (conn.neutral || 0) || 1;
  const sent = s.sentiment || {};
  return `<div class="card s12 rv"><div class="ct"><h3>Web上の「Fire TV」言及の感情（Content Analysis・日本語）</h3>${tagOf('live')}<span class="sub">総ページ ${fmt(s.total)} 件</span></div>
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
  const BR = {fire: '#E36A1E', googletv: '#3987e5', appletv: '#C9CDD4', smarttv: '#2DD4BF', xiaomi: '#c98500', projector: '#22D3EE', noname: '#64748B'};
  const BRL = {fire: 'Fire TV', googletv: 'Google', appletv: 'Apple', smarttv: 'スマートTV', xiaomi: 'Xiaomi', projector: 'プロジェクター', noname: '無名ブランド'};
  return `<div class="card s12 rv"><div class="ct"><h3>Amazon.co.jp の棚 — 「ストリーミングデバイス」検索1ページ目（実測）</h3>${tagOf('live')}<span class="sub">${esc(sh.measured_at)} 時点・Chromeで採録</span><span class="hb" onclick="help('shelf')">?</span></div>
    <div class="kpi" style="margin-bottom:12px">
      <div class="k hero rose"><div class="l">ベストセラー表示のうち Fire TV</div><div class="v"><span data-cu="${fireTop}">0</span><small>/${ranked.length}枠</small></div><div class="d">自社ECの棚で、自社製品が何枠を占めているか。<b>指名検索の前段</b>にあたる</div></div>
      <div class="k orange"><div class="l">棚の最上位</div><div class="v" style="font-size:17px">${esc(top ? short(top.name, 18) : '—')}</div><div class="d">${top ? yen(top.price) : ''}・レビュー${top ? fmt(top.reviews) : ''}件・過去1か月${top ? esc(top.bought || '') : ''}購入</div></div>
      <div class="k cyan"><div class="l">Fire TV 平均★</div><div class="v"><span data-cu="${avgF}" data-d="2">0</span><small>/5</small></div><div class="d">競合（レビュー50件以上）平均 ${fmt(avgR, 2)} — <b>${avgF >= avgR ? '上回る' : '下回る'}</b></div></div>
      <div class="k violet"><div class="l">棚で見えている比較軸</div><div class="v" style="font-size:17px">4K / 対応アプリ</div><div class="d">解像度と「何が見られるか」が並ぶ。<b>OSの違い（Vega / Fire OS）は棚の表記に出てこない</b></div></div>
    </div>
    <div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap">
      <div style="flex:2 1 460px" class="tw"><table><tr><th class="num">BS順位</th><th>商品</th><th>ブランド</th><th class="num">価格</th><th class="num">★</th><th class="num">レビュー</th><th>過去1か月</th></tr>
        ${items.map(i => `<tr${i.brand === 'fire' ? ' style="background:rgba(227,106,30,.07)"' : ''}><td class="num">${isNum(i.rank) ? i.rank : '—'}</td><td>${esc(i.name)}${i.note ? `<br><span class="muted" style="font-size:10px">${esc(i.note)}</span>` : ''}</td><td><span class="pill" style="background:${BR[i.brand]}33;color:${BR[i.brand]}">${esc(BRL[i.brand] || i.brand)}</span></td><td class="num">${yen(i.price)}${isNum(i.list) && i.list > i.price ? `<br><span class="muted" style="font-size:10px">参考 ${yen(i.list)}</span>` : ''}</td><td class="num" style="color:${i.rating >= 4.4 ? '#8FF0C9' : i.rating < 4 ? '#FDA4AF' : 'var(--ink)'}">${fmt(i.rating, 1)}</td><td class="num">${fmt(i.reviews)}</td><td>${esc(i.bought || '—')}</td></tr>`).join('')}
      </table></div>
      <div style="flex:1 1 300px">
        <div class="muted" style="font-size:11px;margin-bottom:4px">評価（★）— レビュー50件以上の機種</div>
        ${hbars(items.filter(i => i.reviews >= 50).sort((a, b) => b.rating - a.rating).map(i => ({name: short(i.name, 24), v: i.rating, sub: fmt(i.reviews) + '件', color: BR[i.brand], tip: `<b>${esc(i.name)}</b><br>★${fmt(i.rating, 1)}（${fmt(i.reviews)}件）<br>${yen(i.price)}`})), {max: 5, d: 1})}
        <div class="note">レビュー数と星の関係を見る。<span class="hl">件数で勝っていても星で負けている</span>なら、不満の中身（リモコン・広告・動作）が評価に効いている。価格の上下に何が並ぶかが、そのまま比較検討の相手になる。</div>
      </div></div>
    <div class="src">出典: <a href="${esc(sh.source_url)}" target="_blank" rel="noopener">${esc(sh.source)}</a>（${esc(sh.measured_at)}）／${esc(sh.rival_spec_note || '')}</div></div>`;
}
function avg(a){ const v = a.filter(isNum); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; }

function kakakuBlock(){
  const k = D.kakaku; if(!k) return '';
  const BR = {appletv: '#C9CDD4', googletv: '#3987e5', xiaomi: '#c98500', smarttv: '#2DD4BF', fire: '#E36A1E', noname: '#64748B'};
  const BRL = {appletv: 'Apple', googletv: 'Google', xiaomi: 'Xiaomi', smarttv: 'スマートTV', fire: 'Fire TV', noname: 'その他'};
  const mk = (k.maker_counts || []).filter(m => m.n > 0);
  return `<div class="card s12 rv"><div class="ct"><h3>比較サイトの棚 — 価格.comに <span class="hl">Fire TV Stick の製品ページが無い</span></h3>${tagOf('live')}<span class="sub">${esc(k.source)}・Chromeで実測</span><span class="hb" onclick="help('kakaku')">?</span></div>
    <div class="kpi" style="margin-bottom:12px">
      <div class="k hero rose"><div class="l">価格.com の製品登録</div><div class="v" style="font-size:17px">登録なし</div><div class="d">あるのは<b>複数店舗の価格一覧（ショッピング検索）だけ</b>で、満足度・レビュー・売れ筋ランキングが存在しない</div></div>
      <div class="k cyan"><div class="l">登録製品数トップ</div><div class="v" style="font-size:18px">Apple ${fmt((mk[0] || {}).n)}</div><div class="d">Lenovo 84 ／ マイクロソフト 69 ／ Xiaomi 37 ／ NEC 34 ／ サムスン 22</div></div>
      <div class="k violet"><div class="l">Fire TV が製品登録されている場所</div><div class="v" style="font-size:17px">テレビ本体</div><div class="d">「Fire TV 搭載テレビ」は液晶・有機ELテレビのカテゴリに存在する。<b>スティック単体には棚がない</b></div></div>
      <div class="k lime"><div class="l">代替できる比較の場</div><div class="v" style="font-size:17px">Fire TV搭載TV</div><div class="d">テレビ本体側のランキングでは Fire TV 搭載機を追える。棚がある場所で測る設計に切り替える</div></div>
    </div>
    <div class="row" style="align-items:flex-start;gap:18px;flex-wrap:wrap">
      <div style="flex:2 1 420px" class="tw"><table><tr><th class="num">順位</th><th>製品</th><th>メーカー</th><th class="num">最安値</th><th class="num">満足度</th><th class="num">件数</th><th>発売</th></tr>
      ${(k.items || []).map(r => `<tr><td class="num">${r.rank}</td><td>${esc(r.name)}</td><td><span class="pill" style="background:${BR[r.brand] || '#64748B'}33;color:${BR[r.brand] || '#94A3B8'}">${esc(BRL[r.brand] || r.brand)}</span></td><td class="num">${yen(r.price)}</td><td class="num">${isNum(r.rating) ? fmt(r.rating, 2) : '—'}</td><td class="num">${r.reviews}</td><td class="muted">${esc(r.release)}</td></tr>`).join('')}
      <tr style="background:rgba(227,106,30,.08)"><td class="num">—</td><td><b style="color:#FFD9B3">Fire TV Stick（全モデル）</b></td><td><span class="pill b-owned">Amazon</span></td><td class="num">—</td><td class="num">—</td><td class="num">0</td><td class="muted">製品登録なし（ショッピング検索のみ）</td></tr>
      </table></div>
      <div style="flex:1 1 280px">
        <div class="muted" style="font-size:11px;margin-bottom:4px">メーカー別 登録製品数</div>
        ${hbars(mk.map(m => ({name: m.maker, v: m.n, color: m.maker.indexOf('Amazon') >= 0 ? '#E36A1E' : '#64748B'})), {})}
        ${k.voice ? `<div class="note"><b>実際の乗り換え証言</b><br>「${esc(k.voice.quote)}」<br><span class="muted" style="font-size:10px">${esc(k.voice.where)}</span></div>` : ''}
        <div class="note"><b>なぜ効くか</b><br>AIは回答をつくるとき、比較サイト・ランキング記事を第三者ソースとして読みます。価格.comに製品ページが無いと、<span class="hl">「ストリーミング端末 おすすめ／比較」文脈で構造的に材料が減る</span>。Amazonの棚で1位でも、比較の土俵には上がっていません。</div>
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
      <div class="k hero rose"><div class="l">上位動画のうち Amazon公式</div><div class="v"><span data-cu="${official}">0</span><small>/${uniq.length}本</small></div><div class="d">「Fire TV Stick レビュー」「テレビ YouTube 見る方法」の上位が<b>第三者だけで占められていないか</b></div></div>
      <div class="k orange"><div class="l">レビュー動画の主題</div><div class="v" style="font-size:16px">${play.length ? esc(short(play[0].title, 18)) : '設定・比較'}</div><div class="d">何を「使い方」として語られているかが、そのままAIの説明の型になる</div></div>
      <div class="k cyan"><div class="l">最大リーチ動画</div><div class="v" style="font-size:17px">${uniq[0] ? man(uniq[0].views || 0) + '回' : '—'}</div><div class="d">${uniq[0] ? esc(short(uniq[0].title, 34)) : ''}</div></div>
      <div class="k violet"><div class="l">狙うべき状態</div><div class="v" style="font-size:17px">字幕・章立て</div><div class="d">AIが読むのは音声でなく<b>書き起こし</b>。価格・型番・OS（Vega / Fire OS）・対応アプリを説明欄と字幕に置く（V9-02）</div></div>
    </div>
    ${(y.queries || []).map(q => `<div style="margin-bottom:10px"><div class="muted" style="font-size:11px;margin-bottom:4px">検索語: <b style="color:#9BEBF7">${esc(q.q)}</b></div>
      <div class="flex">${(q.videos || []).map(i => `<a class="qi" style="flex:1 1 300px;display:block" href="${esc(i.url)}" target="_blank" rel="noopener"><div class="id">${i.rank}位 ・ ${esc(i.channel)} ・ <b style="color:#FDA4AF">${esc(i.views)}視聴</b> ・ ${esc(i.age)}</div><div class="tx" style="color:var(--ink)">${esc(i.title)}</div></a>`).join('')}</div></div>`).join('')}
    <div class="src">出典: ${(y.queries || []).map(q => `<a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.q)}</a>`).join('／')}（${esc(y.measured_at)} 取得）／${esc(y.note)}</div></div>`;
}
