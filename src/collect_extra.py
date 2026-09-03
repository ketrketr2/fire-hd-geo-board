#!/usr/bin/env python3
"""付帯収集（AI6面以外の実データ）。各エンドポイントは独立に try/except し、生レスポンスを
data/raw/<date>/<name>.json に保存する（集計は tools/aggregate.py がローカルでも再実行できる）。

  python src/collect_extra.py --cap 6

収集項目:
  01 keywords_search_volume  Google広告 月間検索数（Kindle関連 約100語・12か月推移）
  02 labs_suggestions        DataForSEO Labs キーワード候補（kindle / 電子書籍リーダー）
  03 amazon_serp             amazon.co.jp 検索結果（順位・価格・評価・先月の購入数）
  04 amazon_asin             主要ASINの商品情報＋上位レビュー
  05 app_apple / app_google  Kindleアプリの評価・レビュー（標準キュー・ポーリング）
  06 youtube                 YouTube検索上位（再生数）
  07 news                    Googleニュース
  08 content_summary         Content Analysis（Web上の語られ方・感情）
  09 ai_keyword_volume       AI検索ボリューム（JP対応があれば）
  10 llm_mentions            LLM Mentions（JP対応があれば・1呼のみ）
  11 chatgpt_scraper         ChatGPT実画面スクレイプ（主要8クエリ・ソースとブランド実体）
  12 trends                  Googleトレンド（pytrendsの保険）
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import dfs  # noqa: E402
from common import RAW, load, load_prompts, today, write_json  # noqa: E402

DAY = today()
OUT = RAW / DAY
_cap = 6.0


def save(name: str, obj) -> None:
    write_json(OUT / f"{name}.json", obj)
    print(f"  saved raw/{DAY}/{name}.json  (累計 ${dfs.spent()['usd']:.3f} / {dfs.spent()['calls']}呼)", flush=True)


def over() -> bool:
    if dfs.spent()["usd"] >= _cap:
        print(f"  skip: 付帯予算 ${_cap} 到達", flush=True)
        return True
    return False


def step(name: str, fn) -> None:
    print(f"\n===== {name} =====", flush=True)
    if over():
        return
    res, err = dfs.safe(name, fn)
    if res is not None:
        save(name, res)
    else:
        save(name, {"error": err})


# ---- 01 需要 ----
def kw_volume():
    groups = load("keywords")["groups"]
    kws = sorted({k.lower() for g in groups.values() for k in g})
    task = dfs.post("keywords_data/google_ads/search_volume/live",
                    [{"keywords": kws, "location_code": 2392, "language_code": "ja", "search_partners": False}])
    return {"groups": groups, "result": task.get("result")}


# ---- 02 Labs ----
def labs_suggestions():
    out = {}
    for kw, lim in (("kindle", 300), ("電子書籍リーダー", 200)):
        t = dfs.post("dataforseo_labs/google/keyword_suggestions/live",
                     [{"keyword": kw, "location_code": 2392, "language_code": "ja", "limit": lim,
                       "include_seed_keyword": True, "include_serp_info": False,
                       "order_by": ["keyword_info.search_volume,desc"]}])
        out[kw] = t.get("result")
    return out


# ---- 03/04 Amazon ----
def amazon_serp():
    cfg = load("settings")["amazon"]
    out = {}
    for kw in cfg["search_keywords"]:
        t, err = dfs.safe(f"amazon_serp:{kw}", dfs.post, "merchant/amazon/products/live/advanced",
                          [{"keyword": kw, "location_code": cfg["location_code"], "language_code": cfg["language_code"],
                            "se_domain": cfg["se_domain"], "depth": 100, "sort_by": "relevance"}])
        out[kw] = t.get("result") if t else {"error": err}
    return out


def amazon_asin(serp: dict | None):
    cfg = load("settings")["amazon"]
    asins: list[tuple[str, str]] = []
    seen = set()
    for kw, res in (serp or {}).items():
        for r in (res or []) if isinstance(res, list) else []:
            for it in r.get("items") or []:
                if it.get("type") not in ("amazon_serp", "amazon_paid"):
                    continue
                title = (it.get("title") or "").lower()
                asin = it.get("data_asin")
                if not asin or asin in seen:
                    continue
                if any(w in title for w in ("kindle", "kobo", "boox", "電子書籍リーダー", "電子ペーパー")) and \
                   not any(w in title for w in ("ケース", "カバー", "フィルム", "スタンド", "充電器", "ペン先", "替え芯", "保護")):
                    seen.add(asin)
                    asins.append((asin, it.get("title") or ""))
    asins = asins[: cfg.get("max_asin_lookups", 10)]
    out = {}
    for asin, title in asins:
        if over():
            break
        t, err = dfs.safe(f"asin:{asin}", dfs.post, "merchant/amazon/asin/live/advanced",
                          [{"asin": asin, "location_code": cfg["location_code"], "language_code": cfg["language_code"],
                            "se_domain": cfg["se_domain"]}])
        out[asin] = {"serp_title": title, "result": t.get("result") if t else None, "error": err}
    return out


# ---- 05 アプリ ----
def app_data():
    cfg = load("settings")["apps"]
    out = {}
    out["apple_info"] = dfs.post_and_wait("app_data/apple/app_info",
        [{"app_id": cfg["apple_app_id"], "location_code": 2392, "language_code": "ja"}], wait_sec=420)
    out["apple_reviews"] = dfs.post_and_wait("app_data/apple/app_reviews",
        [{"app_id": cfg["apple_app_id"], "location_code": 2392, "language_code": "ja", "depth": 50, "sort_by": "most_recent"}], wait_sec=420)
    out["google_info"] = dfs.post_and_wait("app_data/google/app_info",
        [{"app_id": cfg["google_app_id"], "location_code": 2392, "language_code": "ja"}], wait_sec=420)
    out["google_reviews"] = dfs.post_and_wait("app_data/google/app_reviews",
        [{"app_id": cfg["google_app_id"], "location_code": 2392, "language_code": "ja", "depth": 150, "sort_by": "newest"}], wait_sec=420)
    return out


# ---- 06 YouTube / 07 ニュース ----
def youtube():
    out = {}
    for kw in load("settings")["youtube_keywords"]:
        t, err = dfs.safe(f"yt:{kw}", dfs.post, "serp/youtube/organic/live/advanced",
                          [{"keyword": kw, "location_code": 2392, "language_code": "ja", "device": "desktop", "block_depth": 20}])
        out[kw] = t.get("result") if t else {"error": err}
    return out


def news():
    out = {}
    for kw in load("settings")["news_keywords"]:
        t, err = dfs.safe(f"news:{kw}", dfs.post, "serp/google/news/live/advanced",
                          [{"keyword": kw, "location_code": 2392, "language_code": "ja", "depth": 20}])
        out[kw] = t.get("result") if t else {"error": err}
    return out


# ---- 08 Content Analysis ----
def content_summary():
    out = {}
    for kw in load("settings")["content_keywords"]:
        t, err = dfs.safe(f"ca_summary:{kw}", dfs.post, "content_analysis/summary/live",
                          [{"keyword": kw.lower(), "initial_dataset_filters": [["language", "=", "ja"]],
                            "internal_list_limit": 20, "positive_connotation_threshold": 0.4,
                            "sentiments_connotation_threshold": 0.4}])
        out[kw] = t.get("result") if t else {"error": err}
    t, err = dfs.safe("ca_search:kindle", dfs.post, "content_analysis/search/live",
                      [{"keyword": "kindle", "filters": [["language", "=", "ja"]], "search_mode": "one_per_domain",
                        "limit": 100, "order_by": ["content_info.date_published,desc"]}])
    out["_search_kindle"] = t.get("result") if t else {"error": err}
    return out


# ---- 09 AI検索ボリューム / 10 LLM Mentions（JP対応を確認してから）----
def _jp_supported(path: str, key_platform: str | None = None) -> bool:
    js = dfs.get(path)
    for t in js.get("tasks") or []:
        for r in t.get("result") or []:
            if r.get("location_code") == 2392:
                langs = r.get("available_languages") or []
                codes = [x.get("language_code") if isinstance(x, dict) else x for x in langs]
                if "ja" in codes or not langs:
                    if key_platform:
                        for x in langs:
                            if isinstance(x, dict) and x.get("language_code") == "ja":
                                return key_platform in (x.get("available_platforms") or [key_platform])
                    return True
    return False


def ai_keyword_volume():
    ok = _jp_supported("ai_optimization/ai_keyword_data/locations_and_languages")
    if not ok:
        return {"jp_supported": False}
    groups = load("keywords")["groups"]
    kws = sorted({k.lower() for g in groups.values() for k in g})
    t = dfs.post("ai_optimization/ai_keyword_data/keywords_search_volume/live",
                 [{"keywords": kws, "location_code": 2392, "language_code": "ja"}])
    return {"jp_supported": True, "result": t.get("result")}


def llm_mentions():
    """LLM Mentions。targetの受け口が版によって違うため、通る形を順に試して最初に成功したものを使う。

    2026-09-03の実測エラー: 40501 "Exactly one of 'domain' or 'keyword' must be provided"
    → keyword_entity で包まず keyword / domain を直に渡す形を先に試す。
    """
    ok = _jp_supported("ai_optimization/llm_mentions/locations_and_languages", "google")
    if not ok:
        return {"jp_supported": False}
    base = {"location_code": 2392, "language_code": "ja", "platform": "google", "limit": 100}
    shapes = [
        ("keyword_list", {"target": [{"keyword": "kindle", "search_filter": "include", "search_scope": "answer"}]}),
        ("keyword_flat", {"target": {"keyword": "kindle", "search_filter": "include", "search_scope": "answer"}}),
        ("keyword_only", {"keyword": "kindle"}),
        ("domain_list", {"target": [{"domain": "amazon.co.jp", "search_filter": "include", "search_scope": "answer"}]}),
        ("domain_only", {"domain": "amazon.co.jp"}),
    ]
    tried = []
    for name, payload in shapes:
        try:
            t = dfs.post("ai_optimization/llm_mentions/search_mentions/live", [{**base, **payload}])
            return {"jp_supported": True, "shape": name, "tried": tried, "result": t.get("result")}
        except Exception as e:  # noqa: BLE001
            tried.append({"shape": name, "error": str(e)[:200]})
            print(f"    llm_mentions shape={name} 不可: {str(e)[:120]}", flush=True)
    return {"jp_supported": True, "shape": None, "tried": tried, "result": None}


# ---- 11 ChatGPT 実画面 ----
def chatgpt_scraper():
    ids = set(load("settings")["scraper_prompt_ids"])
    out = {}
    for p in load_prompts("active"):
        if p["id"] not in ids or over():
            continue
        t, err = dfs.safe(f"scraper:{p['id']}", dfs.post, "ai_optimization/chat_gpt/llm_scraper/live/advanced",
                          [{"keyword": p["text"], "location_code": 2392, "language_code": "ja"}])
        out[p["id"]] = {"text": p["text"], "result": t.get("result") if t else None, "error": err}
    return out


# ---- 12 トレンド（保険）----
def trends():
    out = {}
    t, err = dfs.safe("trends:brands", dfs.post, "keywords_data/google_trends/explore/live",
                      [{"keywords": ["Kindle", "Kobo", "BOOX", "電子書籍リーダー", "Kindle Unlimited"], "location_code": 2392,
                        "language_code": "ja", "type": "web", "time_range": "past_12_months", "item_types": ["google_trends_graph"]}])
    out["brands_12m"] = t.get("result") if t else {"error": err}
    t, err = dfs.safe("trends:queries", dfs.post, "keywords_data/google_trends/explore/live",
                      [{"keywords": ["Kindle"], "location_code": 2392, "language_code": "ja", "type": "web",
                        "time_range": "past_12_months", "item_types": ["google_trends_queries_list", "google_trends_topics_list"]}])
    out["kindle_queries"] = t.get("result") if t else {"error": err}
    t, err = dfs.safe("trends:youtube", dfs.post, "keywords_data/google_trends/explore/live",
                      [{"keywords": ["Kindle", "Kobo"], "location_code": 2392, "language_code": "ja", "type": "youtube",
                        "time_range": "past_12_months", "item_types": ["google_trends_graph"]}])
    out["youtube_12m"] = t.get("result") if t else {"error": err}
    return out


def main() -> None:
    global _cap
    ap = argparse.ArgumentParser()
    ap.add_argument("--cap", type=float, default=6.0)
    ap.add_argument("--skip", default="", help="カンマ区切りでスキップする項目名")
    a = ap.parse_args()
    _cap = a.cap
    skip = set(a.skip.split(",")) if a.skip else set()
    OUT.mkdir(parents=True, exist_ok=True)
    serp_holder: dict = {}

    def _amazon_serp():
        serp_holder["r"] = amazon_serp()
        return serp_holder["r"]

    plan = [
        ("keywords_search_volume", kw_volume),
        ("labs_suggestions", labs_suggestions),
        ("amazon_serp", _amazon_serp),
        ("amazon_asin", lambda: amazon_asin(serp_holder.get("r"))),
        ("youtube", youtube),
        ("news", news),
        ("content_summary", content_summary),
        ("ai_keyword_volume", ai_keyword_volume),
        ("chatgpt_scraper", chatgpt_scraper),
        ("trends", trends),
        ("llm_mentions", llm_mentions),
        ("app_data", app_data),          # 標準キューで数分待つため最後
    ]
    for name, fn in plan:
        if name in skip:
            print(f"skip {name}")
            continue
        step(name, fn)
    write_json(OUT / "_meta.json", {"date": DAY, "spent": dfs.spent(), "errors": dfs.errors()})
    print(f"\n付帯収集 合計: ${dfs.spent()['usd']:.3f} / {dfs.spent()['calls']}呼  errors={len(dfs.errors())}")


if __name__ == "__main__":
    main()
