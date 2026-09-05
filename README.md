# Fire TV 語られ方ボード（fire-hd-geo-board）

Amazon Fire TV（テレビのHDMIに挿すストリーミング端末／Fire TV 搭載テレビ）の「現状」「世間の語られ方」「AIでの語られ方」を1画面で見る実データボード。

> **2026-09-05 全面刷新**: 計測対象を Fireタブレット（Fire HD）→ **Fire TV** に差し替えた。
> 競合・購買文脈・失敗パターンが別物のため、クエリ42本・ブランド辞書・需要KW・市場統計・表示コピーを全面的に入れ替えている。
> 旧 f001–f042 と旧データ（snapshots / raw / 棚・価格.com・トレンド）は `archive/tablet-2026-09/` に退避し、時系列は接続しない。
AI6面（ChatGPT / Gemini / Claude / Perplexity / GoogleのAI Overview / AIモード）・Google検索需要・
Amazon.co.jp 検索結果・価格.com・YouTube・ニュース・Web感情を計測し、GitHub Pages で配信する（認証なし・noindex）。

- 公開URL: https://ketrketr2.github.io/fire-hd-geo-board/ （ID・PWなしでそのまま閲覧）
- 技術資産の流用元: gotemba-geo-board（計測基盤・検証）

## 構成

```
config/    settings.yaml（6面・予算）/ brands.yaml（ブランド・テーマ辞書）/ domains.yaml（引用分類）/ keywords.yaml（需要KW）
prompts/   registry.yaml … クエリレジストリ42本 t001-t042（IDは絶対に振り直さない。旧 f001-f042 は凍結）
src/       dfs.py（DataForSEOクライアント）/ run_round.py（AI6面）/ collect_extra.py（付帯収集）/ detect.py（検出辞書）
tools/     pull_trends.py → aggregate.py → build.py → verify.js（encrypt.py / verify_gate.js は認証ゲートを戻す場合のみ使用）
data/      snapshots/（回答全文＋引用）/ raw/（付帯収集の生データ）/ trends.json / market_facts.json（出典付き公開統計・42件）
docs/      公開ディレクトリ（GitHub Pages: main /docs）
```

## セットアップ（初回のみ）

1. Settings > Secrets and variables > Actions に3件登録
   - `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD`（https://app.dataforseo.com/ の API Access）
2. Settings > Pages > Deploy from a branch > `main` / `docs`
3. Actions > round を手動実行（1周 ≒ $10–20）→ snapshot 検品 → cron 有効化

## 品質ルール（全て実事故由来・厳守）

- 推定値をボードに実測として載せない。取れない数値は「—」。サンプルは必ず「サンプル」タグ付き
- 二次情報しか無い値は confidence="要検証" とし、確定値として扱わない（例: 4K Plus/Max/Cube の通常価格、米国値上げ）
- クエリIDは絶対に振り直さない（時系列が壊れる）
- 回答本文・引用は全文保存（指標の再定義・再計算のため）
- playwright検証 ERRORS: none になるまで公開しない（verify.js）
- 公開は認証ゲートなし・noindex（robots.txt で全クローラ拒否）。ゲートを戻す場合は encrypt.py + verify_gate.js を publish.yml に戻し、Secret `KINDLE_GATE_KEY` を "id:pw" 形式で登録する
- フォントは BIZ UDGothic / BIZ UDPGothic を非ブロッキング読込
- Secrets・ゲートPW・APIキーをコード／ログ／ボードに出さない

## 2026-09-05 の刷新で差し替えたもの

| 項目 | 旧（タブレット版） | 新（Fire TV 版） |
|---|---|---|
| 対象 | Fire HD 8 / 10 / Max 11 / キッズ | Fire TV Stick HD / 4K Select / 4K Plus / 4K Max / Cube ＋ Fire TV 搭載テレビ |
| 競合 | iPad / Redmi Pad / LAVIE Tab | Google TV Streamer / Apple TV 4K / スマートTV内蔵 / PS5 |
| クエリ | f001–f042（凍結） | t001–t042（2026-09 起点） |
| 需要KW | タブレット関連 | Fire TV・テレビ視聴関連（口語カタカナ表記を含む） |
| 市場統計 | MM総研 出荷台数・世帯保有率 | 総務省ネット接続TV・公取委 普及率・REVISIO・CTV広告市場・TVer |
| 系列 | 出荷台数（年度） / 世帯保有率 | CTV広告市場（年） / TVer のCTV経由再生数 |
| 失敗の型 | Google Play が使えない | Vega OS でアプリが入らない／広告／リモコン |
| 比較サイト | 価格.com タブレットPC（Fire 0製品） | 価格.com に Fire TV Stick の製品ページ自体が無い（棚の設計変更が必要） |

リポジトリ名は `fire-hd-geo-board` のまま（公開URLを維持するため）。中身は Fire TV 版。
