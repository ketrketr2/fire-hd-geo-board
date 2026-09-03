# Kindle 語られ方ボード（kindle-geo-board）

Amazon Kindle（国内販売）の「現状」「世間の語られ方」「AIでの語られ方」を1画面で見る実データボード。
AI6面（ChatGPT / Gemini / Claude / Perplexity / GoogleのAI Overview / AIモード）・Google検索需要・
Amazon.co.jp 検索結果・アプリ評価・YouTube・ニュース・Web感情を計測し、暗号化ゲート付き GitHub Pages で配信する。

- 公開URL（ゲート付き）: https://ketrketr2.github.io/kindle-geo-board/
- 技術資産の流用元: gotemba-geo-board（計測基盤・ゲート・検証）

## 構成

```
config/    settings.yaml（6面・予算）/ brands.yaml（ブランド・テーマ辞書）/ domains.yaml（引用分類）/ keywords.yaml（需要KW）
prompts/   registry.yaml … クエリレジストリ42本（IDは絶対に振り直さない）
src/       dfs.py（DataForSEOクライアント）/ run_round.py（AI6面）/ collect_extra.py（付帯収集）/ detect.py（検出辞書）
tools/     pull_trends.py → aggregate.py → build.py → verify.js → encrypt.py → verify_gate.js
data/      snapshots/（回答全文＋引用）/ raw/（付帯収集の生データ）/ trends.json / market_facts.json（出典付き公開統計）
docs/      公開ディレクトリ（GitHub Pages: main /docs）
```

## セットアップ（初回のみ）

1. Settings > Secrets and variables > Actions に3件登録
   - `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD`（https://app.dataforseo.com/ の API Access）
   - `KINDLE_GATE_KEY`（閲覧ゲートの "id:pw" 連結文字列）
2. Settings > Pages > Deploy from a branch > `main` / `docs`
3. Actions > round を手動実行（1周 ≒ $10–20）→ snapshot 検品 → cron 有効化

## 品質ルール（全て実事故由来・厳守）

- 推定値をボードに実測として載せない。取れない数値は「—」。サンプルは必ず「サンプル」タグ付き
- クエリIDは絶対に振り直さない（時系列が壊れる）
- 回答本文・引用は全文保存（指標の再定義・再計算のため）
- playwright検証 ERRORS: none になるまで公開しない（verify.js / verify_gate.js）
- フォントは BIZ UDGothic / BIZ UDPGothic を非ブロッキング読込
- Secrets・ゲートPW・APIキーをコード／ログ／ボードに出さない
