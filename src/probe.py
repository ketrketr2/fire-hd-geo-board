#!/usr/bin/env python3
"""疎通確認（Day-1）: DataForSEO の認証・残高・各エンドポイント1呼の構造と実測costを出す。

GitHub Actions（probe.yml・workflow_dispatch）から実行するのが唯一の正規経路。
Secretsの値そのものは絶対に出力しない。認証が通らない時の切り分けのため、
「長さ・前後の空白の有無・先頭2文字」だけをマスクして出す（値の復元はできない）。

  1) appendix/user_data … 認証と残高の確認（無料）
  2) AI6面 各1呼（chatgpt / gemini / claude / perplexity / aio / aimode）
  3) 需要・Amazon・アプリ・YouTube・ニュース・Content Analysis の入口を各1呼
合計$2上限。
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import dfs  # noqa: E402
from common import load  # noqa: E402

CAP = 2.0


def mask(name: str) -> str:
    v = os.environ.get(name)
    if v is None:
        return name + ": 未設定（GitHub Secrets に登録されていない）"
    ws = "あり ← 貼り直しが必要" if v != v.strip() else "なし"
    nl = "あり ← 貼り直しが必要" if ("\n" in v or "\r" in v) else "なし"
    at = "はい" if "@" in v else "いいえ"
    return f"{name}: 長さ{len(v)}文字 / 先頭2文字='{v[:2]}' / 前後空白{ws} / 改行{nl} / @を含む{at}"


def _structure(obj, depth=0) -> str:
    if depth > 3:
        return "…"
    if isinstance(obj, dict):
        return "{" + ", ".join(f"{k}:{_structure(v, depth + 1)}" for k, v in list(obj.items())[:8]) + "}"
    if isinstance(obj, list):
        return f"[{len(obj)}×{_structure(obj[0], depth + 1) if obj else ''}]"
    return type(obj).__name__


def probe(label: str, fn):
    print(f"\n===== {label} =====", flush=True)
    if dfs.spent()["usd"] >= CAP:
        print(f"  skip: 予算上限 ${CAP} 到達")
        return None
    try:
        res = fn()
        print(f"  OK  累計 ${dfs.spent()['usd']:.4f} / {dfs.spent()['calls']}呼")
        print(f"  structure: {_structure(res)[:900]}")
        return res
    except Exception as e:  # noqa: BLE001
        print(f"  !! {type(e).__name__}: {str(e)[:400]}")
        return None


def main() -> None:
    print("=== Secrets の形（値は出しません） ===")
    print(" ", mask("DATAFORSEO_LOGIN"))
    print(" ", mask("DATAFORSEO_PASSWORD"))
    print("  ※ LOGIN は https://app.dataforseo.com/api-access の『API login』（通常はメールアドレス）、")
    print("     PASSWORD は同ページの『API password』（アカウントのログインパスワードとは別物）です。")

    print("\n===== 1) 認証・残高（appendix/user_data・無料） =====", flush=True)
    try:
        js = dfs.get("appendix/user_data")
        t = (js.get("tasks") or [{}])[0]
        r = (t.get("result") or [{}])[0] or {}
        print(f"  status {js.get('status_code')} {js.get('status_message')}")
        print(f"  login: {str(r.get('login'))[:2]}***（マスク） / 残高 ${r.get('money', {}).get('balance')}")
        print(f"  rates: {json.dumps(r.get('rates') or {}, ensure_ascii=False)[:300]}")
    except Exception as e:  # noqa: BLE001
        print(f"  !! 認証に失敗しました: {str(e)[:300]}")
        print("  → 401/40100 の場合、Secrets の値が API Access ページのものと違う可能性が高いです。")
        print("     ここで止めます（以降の課金呼び出しは行いません）。")
        sys.exit(1)

    cfg = load("settings")
    faces = {s["id"]: s for s in cfg["surfaces"]}
    q = "タブレットのおすすめを教えてください"
    for fid in ("chatgpt", "gemini", "claude", "perplexity"):
        if fid in faces:
            probe(f"2) {fid}", lambda f=faces[fid]: dfs.fetch_llm(q, f))
    for fid in ("aio", "aimode"):
        if fid in faces:
            probe(f"2) {fid}", lambda f=faces[fid]: dfs.fetch_serp_ai(q, f))

    probe("3) keywords_data search_volume", lambda: dfs.post(
        "keywords_data/google_ads/search_volume/live",
        [{"keywords": ["fire hd", "タブレット", "ipad"], "location_code": 2392, "language_code": "ja"}]))
    probe("3) merchant amazon products", lambda: dfs.post(
        "merchant/amazon/products/live/advanced",
        [{"keyword": "タブレット", "location_code": 2392, "language_code": "ja_JP",
          "se_domain": "amazon.co.jp", "depth": 20}]))
    probe("3) serp youtube", lambda: dfs.post(
        "serp/youtube/organic/live/advanced",
        [{"keyword": "タブレット おすすめ", "location_code": 2392, "language_code": "ja", "block_depth": 20}]))
    probe("3) serp news", lambda: dfs.post(
        "serp/google/news/live/advanced",
        [{"keyword": "Fireタブレット", "location_code": 2392, "language_code": "ja", "depth": 10}]))
    probe("3) content_analysis summary", lambda: dfs.post(
        "content_analysis/summary/live",
        [{"keyword": "fire hd", "initial_dataset_filters": [["language", "=", "ja"]], "internal_list_limit": 5}]))
    probe("3) ai_keyword_data locations（JP対応の確認・無料）",
          lambda: dfs.get("ai_optimization/ai_keyword_data/locations_and_languages"))
    probe("3) llm_mentions locations（JP対応の確認・無料）",
          lambda: dfs.get("ai_optimization/llm_mentions/locations_and_languages"))

    print(f"\nprobe合計: ${dfs.spent()['usd']:.4f} / {dfs.spent()['calls']}呼")
    print(json.dumps({"errors": dfs.errors()}, ensure_ascii=False)[:1500])


if __name__ == "__main__":
    main()
