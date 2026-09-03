/* part4: V8 データ連携 / V9 GEO打ち手 / ヘルプ / ティッカー / 初期化 */
RENDER.v8 = () => {
  const st = D.status || [];
  const cnt = k => st.filter(s => s.state === k).length;
  const icon = {live: '●', sample: '◐', wait: '○', teaser: '◌'};
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>データ連携ステータス — 何が実測で、何がサンプルか</h3>${tagOf('live')}<span class="sub">このボードは「無い数値を作らない」。連携すると同じ場所に実値が入る</span><span class="hb" onclick="help('connect')">?</span></div>
    <div class="kpi">
      <div class="k lime"><div class="l">実測・出典付き</div><div class="v"><span data-cu="${cnt('live')}">0</span><small>系統</small></div><div class="d">公開統計／トレンド／価格／ニュース${AI.measured ? '／AI6面／Amazon／アプリ／YouTube' : ''}</div></div>
      <div class="k orange"><div class="l">サンプル（連携で置換）</div><div class="v"><span data-cu="${cnt('sample')}">0</span><small>系統</small></div><div class="d">販売実績・量販店チャネル・KU会員</div></div>
      <div class="k cyan"><div class="l">計測待ち</div><div class="v"><span data-cu="${cnt('wait')}">0</span><small>系統</small></div><div class="d">${AI.measured ? '次回ラウンドで自動更新' : 'DataForSEO 初回ラウンド待ち'}</div></div>
      <div class="k violet"><div class="l">連携予定（工事中）</div><div class="v"><span data-cu="${cnt('teaser')}">0</span><small>系統</small></div><div class="d">SNS API・社内アクセス解析</div></div>
    </div></div>
  <div class="card s12 rv"><div class="ct"><h3>系統別の状態と接続方法</h3></div>
    <div class="st">${st.map(s => `<div class="si ${s.state}"><div class="ic">${icon[s.state] || '○'}</div><div><b>${esc(s.label)}</b> ${tagOf(s.state)}<div class="s">ソース: ${esc(s.src)}</div><div class="h">接続: ${esc(s.how)}</div></div></div>`).join('')}</div></div>
  <div class="card s6 rv"><div class="ct"><h3>社内データを接続する手順（販売実績）</h3>${tagOf('sample')}</div>
    <ol style="padding-left:18px;font-size:12px;color:var(--ink2);line-height:1.9">
      <li>Amazon Retail Analytics（またはVendor Central＞レポート）で <b>週次・ASIN別の販売数・売上</b> をCSV出力</li>
      <li>列を <span class="mono">week, asin, model, units, revenue, channel</span> に揃え、<span class="mono">data/connect/sales.csv</span> に配置（GitHubのUpload filesで可）</li>
      <li>量販店分は BCN／GfK のPOS（機種×週）を <span class="mono">data/connect/retail_pos.csv</span> に配置</li>
      <li>Actions ＞ publish を実行 → 集計が <b>sample=false</b> で再生成し、SAMPLEリボンが消える</li></ol>
    <div class="note">個人情報は不要（集計値のみ）。ファイルはゲート付きページにしか載らず、リポジトリは非公開化も可能。</div></div>
  <div class="card s6 rv"><div class="ct"><h3>計測パイプライン（週次自動）</h3>${tagOf('live')}</div>
    <div class="stepper" style="grid-template-columns:repeat(4,minmax(0,1fr))">${[['①', '計測', 'AI6面×42本 + Amazon/アプリ/YouTube/ニュース/需要'], ['②', '保存', '回答全文・引用・ファンアウトを snapshots/ に'], ['③', '集計', 'aggregate.py → board_data.json'], ['④', '検証', 'playwright: 全ビュー×2幅・エラー0'], ['⑤', '暗号化', 'AES-256-GCM（PBKDF2 20万回）'], ['⑥', '復号検証', '誤PW→拒否／正PW→描画'], ['⑦', '公開', 'GitHub Pages（noindex）'], ['⑧', '通知', '差分をSlack/メール（設定で）']].map(s => `<div class="step done"><div class="n">${s[0]}</div><b>${esc(s[1])}</b><span class="muted">${esc(s[2])}</span></div>`).join('')}</div>
    <div class="note">1周の実費 ≒ $10〜20（DataForSEO）。毎週月曜 07:10 JST の cron は初回検品後に有効化。</div></div>
  </div>`;
};

/* ---------- V9 GEO打ち手 ---------- */
RENDER.v9 = () => {
  const m = AI.measured; const pf = AI.per_face || {};
  const avgO = avgOf((AI.faces || []).map(f => (pf[f.id] || {}).owned_cite_share));
  const bk = AI.buckets || []; const video = (bk.find(b => b.id === 'video') || {}).share, ugc = (bk.find(b => b.id === 'ugc') || {}).share, aff = (bk.find(b => b.id === 'affiliate') || {}).share;
  const kf = (AI.first_rank || []).find(x => x.id === 'kindle') || {}; const rival = (AI.first_rank || []).find(x => x.id !== 'kindle') || {};
  const moves = [
    {n: '01', t: '第三者媒体の「語られ方」を変える', s: m ? `引用の${pct(100 - (avgO || 0), 0)}が第三者。動画${pct(video, 0)}・UGC${pct(ugc, 0)}・アフィリ${pct(aff, 0)}` : '資料p31: AIの材料は7〜9割が第三者', d: '推薦転換率の高い媒体（V7の右上）に、比較記事・レビュー・一次データ提供でリード文言及を取りに行く。リード文言及は本文中の1.39倍・リンクのみの3倍効く（p33）。', kpi: 'Kindle第一想起率／推薦転換率25%以上の媒体数', tag: 'オフサイト'},
    {n: '02', t: 'YouTubeを「AIが読む一次情報」に', s: 'AI引用の第1位ソースはYouTube（日本でも1位・p32）', d: '公式・量販店・レビュアー動画に字幕・チャプター・説明文（価格・型番・比較表）を整備。「Kindle おすすめ 2026」「Kindle Kobo 比較」の上位動画を狙う。', kpi: 'YouTube上位20本のうち公式/協力動画の本数', tag: 'オフサイト'},
    {n: '03', t: '公式ページを「1問1答・結論ファースト」に', s: m ? `自社（Amazon）引用率 ${pct(avgO, 0)}` : '資料p35: 引用される公式の型', d: 'モデル比較・選び方・防水/カラー/手書きの各質問に1URLで答える。価格・重量・ppi・バッテリーを本文HTML（表）に。PDF・画像内の情報は読まれない。', kpi: 'A/B族クエリでの自社引用率', tag: 'オンサイト'},
    {n: '04', t: 'ファンアウト語で検索上位を押さえる', s: m ? `ファンアウト上位: ${(AI.fanout_top || []).slice(0, 3).map(x => x[0]).join(' / ') || '—'}` : 'AIは1質問を数十の検索に分解（p25）', d: 'V4のファンアウト語・V2の需要KWで、自社ページの検索順位を週次で追う。上位のページほどAIにも引用される（p36）。圏外の語は第三者媒体で補う。', kpi: 'ファンアウト語の自社Top10率', tag: 'SEO×GEO'},
    {n: '05', t: '「解約・囲い込み」文脈への先回り', s: '関連検索上位に「kindle 解約」「kindle unlimited 解約」（V2）', d: '解約手順・DRMフリー本のEPUB/PDFダウンロード・他端末での閲覧を公式FAQで明快に。ネガ検証クエリ（H族）でのAIの説明を正確にする（情報正確性KPI）。', kpi: 'H族の懸念文比率／誤情報件数', tag: 'コンテンツ'},
    {n: '06', t: '量販店チャネルをAI上でも可視化', s: '取扱6社・ヨドバシ不在・価格.com未登録', d: '「どこで買う」質問でAmazonのみが挙がる状態なら、量販店の商品ページ（価格・在庫・実機展示）を整え、店頭体験の記事化（第三者）を仕込む。価格.com登録は比較の場に戻る最短手。', kpi: 'P族での量販店言及率', tag: 'チャネル'},
    {n: '07', t: 'セール文脈の一次情報を公式発で', s: '需要の山はPD・BF・年末年始・新生活・サマー（V1/V2）', d: 'セール日程・価格の一次情報をプレスリリース＋公式ページで先出しし、まとめ記事の引用元を公式にする。「Kindle セール いつ」でのAI回答の出典を追う。', kpi: 'セール系クエリの自社引用率', tag: '一次情報'},
    {n: '08', t: 'マルチターン（会話が進んだ後）を測る', s: '5ターン後の残存は最大49%〜1%（p38）', d: '「おすすめは？」→「予算2万円なら？」→「マンガ中心なら？」と会話を重ねた時にKindleが残るかを次フェーズで計測（登録クエリに会話チェーンを追加）。', kpi: '5ターン残存率', tag: '次フェーズ'},
  ];
  return `<div class="g">
  <div class="card s12 rv" style="padding:16px 20px"><div class="ct"><h3>GEO打ち手 — データから逆算した8手（資料の3系統：オンサイト／コンテンツ／オフサイト）</h3>${tagOf(m ? 'live' : 'wait')}<span class="sub">${m ? '実測 ' + esc(AI.date) + ' に基づく' : '初回計測後に数値が入り、優先順位が確定'}</span><span class="hb" onclick="help('moves')">?</span></div>
    <div class="kpi">
      <div class="k orange"><div class="l">現在の第一想起</div><div class="v">${m ? `<span data-cu="${kf.rate || 0}" data-d="0">0</span><small>%</small>` : '<span style="font-size:16px;color:var(--ink3)">計測待ち</span>'}</div><div class="d">${m ? `対抗 ${esc(rival.label || '—')} ${pct(rival.rate, 0)}` : 'カテゴリ質問でKindleが最初に出る率'}</div></div>
      <div class="k cyan"><div class="l">目標（次四半期）</div><div class="v">${m && isNum(kf.rate) ? `<span data-cu="${Math.min(95, Math.round(kf.rate + 10))}">0</span><small>%</small>` : '<span style="font-size:16px;color:var(--ink3)">+10pt</span>'}</div><div class="d">第一想起 +10pt／自社引用率 +5pt／H族懸念文 −20%</div></div>
      <div class="k violet"><div class="l">最優先の面</div><div class="v" style="font-size:18px">${m ? esc((AI.faces || []).map(f => [f.label, (pf[f.id] || {}).mention_rate]).filter(x => isNum(x[1])).sort((a, b) => a[1] - b[1])[0][0]) : '—'}</div><div class="d">言及率が最も低い面から着手</div></div>
      <div class="k lime"><div class="l">今週の打ち手</div><div class="v" style="font-size:18px">01・02・03</div><div class="d">第三者媒体／YouTube／公式1問1答</div></div>
    </div></div>
  ${moves.map(mv => `<div class="card s6 rv"><div class="ct"><h3><span class="mono" style="color:#FFD166;margin-right:8px">${mv.n}</span>${esc(mv.t)}</h3><span class="tag">${esc(mv.tag)}</span></div>
    <div style="font-size:12px;color:#9BEBF7;margin-bottom:6px">根拠: ${esc(mv.s)}</div><p style="font-size:13px;color:var(--ink2);line-height:1.8">${esc(mv.d)}</p><div class="note">KPI: <b>${esc(mv.kpi)}</b></div></div>`).join('')}
  <div class="card s12 rv"><div class="ct"><h3>やってはいけないこと（資料p43）</h3>${tagOf('live')}</div>
    <div class="flex">${[['△ 構造化データ先行', '効果の根拠はまだ限定的。本文HTMLの改善と第三者言及が先'], ['✕ AI向け薄いページの量産', 'ファンアウト対応を名目にした低品質ページは評価を下げる'], ['✕ 効果を断定する売り込み', '「必ず引用される」に根拠はない。定点観測で確かめる'], ['✓ 先にやる', '本文の取得可能性点検（JS依存の排除）／クローラー許可方針／基本のSEO／引用されやすい型']].map(([t, s]) => `<div class="qi" style="flex:1 1 220px;cursor:default"><div class="tx"><b>${esc(t)}</b></div><div style="font-size:11px;color:var(--ink2)">${esc(s)}</div></div>`).join('')}</div></div>
  </div>`;
};

/* ---------- ヘルプ（指標定義） ---------- */
const HELP = {
  idx: ['AI指標の<em>定義</em>', `<ul><li><b>生成率</b>：質問に対してAIが回答を返した率（AI Overviewは表示されない質問がある）。</li><li><b>言及率（G2）</b>：Kindleの名前が回答本文に出た率。分母は<b>出現期待クエリ</b>（カテゴリ型A・ペルソナ型B・ネガ一般H）— 指名型・比較型は「名前が出て当然」なので除外（ファネル原則）。</li><li><b>第一想起率（G3）</b>：言及があった回答のうち、最初に挙がったブランドがKindleだった率。</li><li><b>自社引用率</b>：出典リンクのうち amazon.co.jp / aboutamazon.jp 等の比率。残りが第三者。</li><li><b>平均引用数（G1・露出機会）</b>：1回答あたりの出典リンク数。多い面ほど「引用で戦える」。</li><li><b>推薦転換率</b>：その媒体が引用された回答のうち、Kindleが第一想起になった率（資料p34）。</li></ul><div class="formula">言及率 = Kindle言及セル ÷ 出現期待セル ／ 第一想起率 = 第一想起セル ÷ Kindle言及セル</div><p>検出はブランド辞書（Kindle／キンドル／Paperwhite／Colorsoft／Scribe 等）をNFKC正規化・長い順に照合。Kindle Fireは端末ブランドに数えない。極性は文単位の辞書判定（好意語／懸念語）で、回答全文は無加工で保存・表示しています。</p>`],
  sample: ['<em>サンプル</em>の扱い', `<p>販売台数・売上・チャネル比率・KU会員・ファネルは社内データ連携前のため、<b>固定シードで生成した設計サンプル</b>です。実データには一切基づきません。SAMPLEリボン・点線枠・「サンプル」タグで必ず区別しています。</p><p>接続すると（データ連携ビュー参照）同じカードに実値が入り、リボンが消えます。市場統計・価格・トレンド・AI計測などは出典付きの実測です。</p>`],
  price: ['価格の<em>出典</em>', `<p>通常価格はAmazon公式の「Kindleの選び方」ページ、Scribe新型はAmazon Japanプレスリリース（2026/5/12）、セール底値は窓の杜・ケータイWatch等の報道から。競合はメーカー公式価格（2026/9時点）。</p>`],
  market: ['市場統計の<em>読み方</em>', `<p>インプレス総研（年度・電子書籍市場）と出版科学研究所（暦年・電子出版市場）は<b>定義と期間が違う</b>ため数値が異なります。両方を併記し、比率は同一ソース内で計算しています。</p><p>Kindleストアの利用率・課金経験率はインプレス総研の消費者調査（2026年5-6月）。ピッコマ・LINEマンガは無料回遊中心のため利用率が高く、課金経験率ではKindleが1位です。</p>`],
  demand: ['検索需要の<em>読み方</em>', `<p>Googleトレンドは相対値（期間内の最大＝100）。ブランド比較は同一グラフ内でのみ比較可能。月間検索数はGoogle広告のキーワードプランナー値（DataForSEO経由）で、こちらは絶対値（回/月）です。</p><p>関連クエリの「上位」は相対人気、「急上昇」は前期間比の伸び率（%）。4,600%等の極端な値は分母が小さい語です。</p>`],
  voice: ['世間の声の<em>集め方</em>', `<p>ニュースは2026年の主要報道を編集部が選定しトーン（好意／中立／懸念）を判定。アプリ評価はApp Store／Google Playの公開値。YouTube・Amazon検索結果・アプリレビュー・Web感情はDataForSEO経由で週次に自動取得します。</p><p>SNSの言及量はAPI連携後に表示（工事中）。</p>`],
  query: ['クエリ実物の<em>見方</em>', `<p>左のリストは登録42本。各行の6つの点は面ごとの結果（緑＝Kindleが第一想起、黄＝言及あり、赤＝言及なし、灰＝回答なし／未計測）。</p><p>右は選んだ面の<b>回答全文（無加工）</b>。ブランド名だけをハイライトしています。引用は出典の種類（自社／競合／小売／UGC／動画／アフィリ…）で色分け。ファンアウトはAIが裏で投げた検索語です。</p>`],
  posmap: ['配置図の<em>見方</em>', `<p>資料p37「AIの回答には、ブランドの配置図が表れる」の実装。横軸はブランドが主語の文の極性バランス（懸念←→好意）、縦軸は第一想起率、円の大きさは言及量。円の右に主なテーマ語。</p><p>空いている象限（好意的だが第一想起が低い等）が次に狙う語られ方の候補です。</p>`],
  cite: ['引用元の<em>読み方</em>', `<p>全面の出典リンクを集計（Google検索リダイレクタ等のノイズは除外、Geminiのリダイレクタはタイトルのドメインから復元）。</p><p>「推薦転換率」は資料p34の考え方：引用の多さと推薦の生まれやすさは一致しないため、媒体ごとに <b>引用された回答でKindleが第一想起だった率</b> を出し、重点媒体を選びます。</p>`],
  connect: ['連携の<em>設計思想</em>', `<p>「無い数値を作らない」。実測（緑）・サンプル（黄・置換前提）・計測待ち（灰）・連携予定（紫）の4状態を全カードに明示しています。社内データはCSVを置くだけで同じレイアウトに入ります。</p>`],
  moves: ['打ち手の<em>導き方</em>', `<p>電通デジタルのGEO資料（2026/8/28）の分析知見 — 第三者が7〜9割・YouTube一強・掲載のされ方で言及率3倍・推薦を生む媒体は限られる・公式が引用される型 — に、このボードの実測（面別言及率・引用元・ファンアウト・需要）を当てはめて優先順位をつけています。</p>`],
};
function help(id){ const h = HELP[id]; if(!h) return; $('#modal').innerHTML = `<button class="x" onclick="closeModal()">✕</button><h3>${h[0]}</h3>${h[1]}`; $('#mback').classList.add('on'); }
function closeModal(){ $('#mback').classList.remove('on'); }

/* ---------- ティッカー ---------- */
function ticker(){
  const items = [];
  (AI.queries || []).forEach(q => { const cells = (AI.faces || []).map(f => CELL_IDX[q.id + '|' + f.id]).filter(Boolean);
    const m = cells.filter(c => isNum(c.kindle_rank)).length, f1 = cells.filter(c => c.kindle_rank === 1).length;
    items.push(`<b>${esc(q.id)}</b> ${esc(q.text)}${AI.measured ? ` — Kindle言及 ${m}/${cells.length}面・第一想起 ${f1}` : ''}`); });
  const s = items.join(' ／ '); $('#tickr').innerHTML = `<span>${s} ／ ${s}</span>`;
}

/* ---------- 初期化 ---------- */
renderNav(); ticker();
const h0 = (location.hash || '').replace('#', '');
go(VIEWS.some(v => v.id === h0) ? h0 : 'v0');
