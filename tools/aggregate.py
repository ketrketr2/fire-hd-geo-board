#!/usr/bin/env python3
"""集計: data/ 配下（公開統計・トレンド・AIスナップショット・付帯収集の生データ）→ tools/board_data.json。

原則:
  - 実測が無い指標は null（ボードは「—」または「計測待ち」を出す）。推定値で埋めない
  - 販売実績など社内データは sample=true を明示した設計サンプルのみ（連携すると実値に置き換わる）
  - 回答本文・引用は全文をボードに載せる（実クエリ表示の要件）
"""
from __future__ import annotations

import json
import math
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from common import DATA, RAW, SNAPSHOTS, load, now_jst, read_json, write_json  # noqa: E402

FACE_LABEL = {"chatgpt": "ChatGPT", "gemini": "Gemini", "claude": "Claude", "perplexity": "Perplexity",
              "aio": "AI Overview", "aimode": "AIモード"}
FAMILY_LABEL = {"A": "カテゴリ型", "B": "ペルソナ内包", "C": "比較型", "D": "指名型", "P": "購入チャネル型", "H": "ネガ検証"}
BUCKET_LABEL = {"owned": "自社（Amazon）", "competitor": "競合", "retail": "小売・比較", "ugc": "UGC・ブログ",
                "video": "動画（YouTube）", "affiliate": "アフィリ・ランキング", "press": "プレスリリース",
                "reference": "Wikipedia等", "media": "メディア・その他"}


# ------------------------------------------------------------------ 公開統計
def facts_block() -> dict:
    mf = read_json(DATA / "market_facts.json", {"facts": [], "news": []})
    by_id = {f["id"]: f for f in mf["facts"]}
    ebook_series = [  # インプレス総研 各年版（億円・年度）
        {"fy": "2018", "v": 2826}, {"fy": "2019", "v": 3473}, {"fy": "2020", "v": 4821}, {"fy": "2021", "v": 5510},
        {"fy": "2022", "v": 6026}, {"fy": "2023", "v": 6449}, {"fy": "2024", "v": 6703}, {"fy": "2025", "v": 6846}]
    return {"by_id": by_id, "news": mf["news"], "ebook_series": ebook_series, "as_of": mf.get("as_of")}


# ------------------------------------------------------------------ 製品ラインナップ（公式価格）
def lineup_block(facts: dict) -> list[dict]:
    g = lambda k: (facts.get(k) or {}).get("value")  # noqa: E731
    return [
        {"id": "kindle", "name": "Kindle（第11世代 2024）", "screen": "6型 300ppi", "price": g("D01"), "sale": 15980, "sale_label": "PD2026", "storage": "16GB", "color": False, "pen": False, "water": False, "tag": "エントリー"},
        {"id": "paperwhite", "name": "Kindle Paperwhite（第12世代）", "screen": "7型 300ppi", "price": g("D02"), "sale": 18980, "sale_label": "PD2026", "storage": "16GB", "color": False, "pen": False, "water": True, "tag": "主力"},
        {"id": "paperwhite_se", "name": "Paperwhite シグニチャー", "screen": "7型 300ppi", "price": g("D02b"), "sale": 27980, "sale_label": "サマー2026", "storage": "32GB", "color": False, "pen": False, "water": True, "tag": "上位"},
        {"id": "colorsoft", "name": "Kindle Colorsoft", "screen": "7型 カラー", "price": g("D03"), "sale": 29980, "sale_label": "PD2026", "storage": "16GB", "color": True, "pen": False, "water": True, "tag": "カラー"},
        {"id": "scribe_2024", "name": "Kindle Scribe（2024）", "screen": "10.2型 300ppi", "price": 56980, "sale": 39980, "sale_label": "PD2026(64GB)", "storage": "16GB", "color": False, "pen": True, "water": False, "tag": "手書き"},
        {"id": "scribe_2026", "name": "Kindle Scribe（2026・11型）", "screen": "11型 300ppi", "price": g("D05"), "sale": None, "sale_label": None, "storage": "32GB", "color": False, "pen": True, "water": False, "tag": "手書き 新型"},
        {"id": "scribe_colorsoft", "name": "Kindle Scribe Colorsoft", "screen": "11型 カラー", "price": g("D04"), "sale": None, "sale_label": None, "storage": "32GB", "color": True, "pen": True, "water": False, "tag": "最上位"},
    ]


def competitor_block(facts: dict) -> list[dict]:
    g = lambda k: (facts.get(k) or {}).get("value")  # noqa: E731
    return [
        {"brand": "楽天Kobo", "name": "Kobo Clara BW", "price": g("F01"), "note": "6型・防水"},
        {"brand": "楽天Kobo", "name": "Kobo Clara Colour", "price": g("F01b"), "note": "6型カラー"},
        {"brand": "楽天Kobo", "name": "Kobo Libra Colour", "price": g("F02"), "note": "7型カラー・ページ送りボタン・価格.com売れ筋1位"},
        {"brand": "楽天Kobo", "name": "Kobo Elipsa 2E", "price": g("F02b"), "note": "10.3型・手書き"},
        {"brand": "BOOX", "name": "BOOX Go 7 / Go Color 7 Gen II", "price": 39800, "note": "Android・7型"},
        {"brand": "BOOX", "name": "BOOX Palma 2 Pro", "price": g("F03"), "note": "6.13型・スマホ型"},
        {"brand": "BOOX", "name": "BOOX Note Air5 C", "price": g("F03c"), "note": "10.3型カラー・手書き"},
        {"brand": "Bigme", "name": "HiBreak Pro Color", "price": g("F04"), "note": "カラー電子ペーパー5Gスマホ"},
    ]


# ------------------------------------------------------------------ 販売サンプル（設計サンプル・連携で置換）
def sales_sample() -> dict:
    """社内販売データ連携前の設計サンプル。乱数は固定シードで再現可能。全てに sample=true。"""
    rnd = random.Random(20260903)
    weeks = []
    import datetime as dt
    start = dt.date(2025, 9, 1)
    events = {  # 週の開始日 → 倍率（プライムデー・BF・年末年始・新生活・サマー）
        dt.date(2025, 11, 24): 3.6, dt.date(2025, 12, 1): 1.6, dt.date(2025, 12, 22): 1.9, dt.date(2025, 12, 29): 1.7,
        dt.date(2026, 3, 2): 1.5, dt.date(2026, 3, 9): 1.3, dt.date(2026, 4, 27): 1.3, dt.date(2026, 6, 8): 1.4,
        dt.date(2026, 7, 6): 4.2, dt.date(2026, 7, 13): 1.5, dt.date(2026, 8, 3): 1.8, dt.date(2026, 8, 10): 1.6}
    base = {"kindle": 2600, "paperwhite": 5200, "paperwhite_se": 1300, "colorsoft": 1500, "scribe": 900}
    for i in range(53):
        d = start + dt.timedelta(days=7 * i)
        mult = events.get(d, 1.0) * (1 + 0.08 * math.sin(i / 3.0)) * rnd.uniform(0.93, 1.07)
        row = {"week": d.isoformat()}
        tot = 0
        for m, b in base.items():
            seasonal = 1.0
            if m == "scribe" and d >= dt.date(2026, 6, 8):
                seasonal = 1.6            # Scribe新型発売
            if m == "colorsoft" and d >= dt.date(2026, 6, 8):
                seasonal = 1.2
            v = int(b * mult * seasonal)
            row[m] = v
            tot += v
        row["total"] = tot
        row["amazon"] = int(tot * rnd.uniform(0.80, 0.86))
        row["retail"] = tot - row["amazon"]
        weeks.append(row)
    last4 = weeks[-4:]
    prev4 = weeks[-8:-4]
    units_4w = sum(w["total"] for w in last4)
    units_prev = sum(w["total"] for w in prev4)
    yoy_4w = round((units_4w / max(1, sum(w["total"] for w in weeks[:4])) - 1) * 100, 1)
    asp = 29800
    return {
        "sample": True,
        "note": "販売数・売上・チャネル比率は社内データ連携前の設計サンプル（固定シード生成）。Amazon Retail Analytics／Vendor Central／量販店POS（BCN・GfK）を接続すると実値に置き換わります。",
        "weeks": weeks,
        "kpi": {
            "units_4w": units_4w, "units_4w_delta": round((units_4w / max(1, units_prev) - 1) * 100, 1), "units_yoy": yoy_4w,
            "revenue_4w_oku": round(units_4w * asp / 1e8, 2), "asp": asp,
            "amazon_share": round(sum(w["amazon"] for w in last4) / max(1, units_4w) * 100, 1),
            "ku_members_man": 312, "ku_delta": 2.4, "attach_rate": 38.5, "review_avg": 4.4,
            "channel": [
                {"name": "Amazon.co.jp", "share": 83.2, "own": True},
                {"name": "ビックカメラ・コジマ", "share": 5.1}, {"name": "ヤマダデンキ", "share": 4.2},
                {"name": "ケーズデンキ", "share": 2.6}, {"name": "エディオン", "share": 2.3},
                {"name": "ジョーシン", "share": 1.4}, {"name": "その他", "share": 1.2}],
            "model_mix": [{"id": "paperwhite", "name": "Paperwhite", "share": 44.7}, {"id": "kindle", "name": "Kindle", "share": 22.3},
                          {"id": "colorsoft", "name": "Colorsoft", "share": 14.2}, {"id": "scribe", "name": "Scribe", "share": 10.6},
                          {"id": "paperwhite_se", "name": "PW シグニチャー", "share": 8.2}],
            "funnel": [{"stage": "商品ページ閲覧", "v": 100}, {"stage": "カート追加", "v": 11.8}, {"stage": "購入", "v": 4.6}, {"stage": "KU同時加入", "v": 1.8}],
        },
    }


# ------------------------------------------------------------------ トレンド
def trends_block() -> dict | None:
    t = read_json(DATA / "trends.json")
    if not t:
        return None
    out = {"pulled_at": t.get("pulled_at"), "series": t.get("series"), "region": t.get("region"), "related": t.get("related")}
    s = (t.get("series") or {}).get("brands_12m")
    if s:
        vals = s["values"]
        avg = {k: round(sum(v) / len(v), 1) for k, v in vals.items()}
        out["share_12m"] = avg
        k = vals.get("Kindle") or []
        if k:
            peak_i = max(range(len(k)), key=lambda i: k[i])
            out["kindle_peak"] = {"date": s["dates"][peak_i], "value": k[peak_i]}
            out["kindle_last"] = {"date": s["dates"][-1], "value": k[-1]}
            out["kindle_avg_last8"] = round(sum(k[-8:]) / 8, 1)
            out["kindle_avg_prev8"] = round(sum(k[-16:-8]) / 8, 1)
    return out


# ------------------------------------------------------------------ AIスナップショット
def latest_snapshot() -> dict | None:
    files = sorted(SNAPSHOTS.glob("*.json"))
    return read_json(files[-1]) if files else None


def ai_block(snap: dict | None) -> dict:
    prompts = {p["id"]: p for p in load_prompts_all()}
    faces = [s["id"] for s in load("settings")["surfaces"] if s.get("enabled")]
    brands = load("brands")
    brand_label = {brands["self"]["id"]: brands["self"]["label"]}
    for c in brands["tier1"] + brands["tier2"]:
        brand_label[c["id"]] = c["label"]
    stores = {k: v["label"] for k, v in brands["stores"].items()}
    themes = {k: v["label"] for k, v in brands["themes"].items()}
    personas = {k: v["label"] for k, v in brands["personas"].items()}
    base = {"measured": False, "date": None, "faces": [{"id": f, "label": FACE_LABEL.get(f, f)} for f in faces],
            "queries": [{**{k: p[k] for k in ("id", "family", "named", "compare", "text", "keyword")},
                         "family_label": FAMILY_LABEL.get(p["family"], p["family"])} for p in prompts.values()],
            "family_label": FAMILY_LABEL, "brand_label": brand_label, "store_label": stores,
            "theme_label": themes, "persona_label": personas, "bucket_label": BUCKET_LABEL}
    if not snap:
        return base
    cells = snap["cells"]
    expect = [c for c in cells if not c["named"] and not c["compare"]]
    per_face = snap["summary"]["per_face"]
    # 第一想起・言及（出現期待セル）
    first_rank = Counter()
    mention_rank = Counter()
    for c in expect:
        for bid, d in c["brands"].items():
            mention_rank[bid] += 1
            if d["rank"] == 1:
                first_rank[bid] += 1
    n_exp = len(expect) or 1
    # ファミリー別 言及率（Kindle）
    fam = defaultdict(lambda: {"cells": 0, "mention": 0, "first": 0})
    for c in cells:
        f = fam[c["family"]]
        f["cells"] += 1
        if "kindle" in c["brands"]:
            f["mention"] += 1
            if c["brands"]["kindle"]["rank"] == 1:
                f["first"] += 1
    # モデル別言及
    models = Counter()
    for c in cells:
        for m, n in (c.get("models") or {}).items():
            models[m] += n
    # 購入チャネル言及（P族 + 全体）
    store_all, store_p = Counter(), Counter()
    for c in cells:
        for s in (c.get("stores") or {}):
            store_all[s] += 1
            if c["family"] == "P":
                store_p[s] += 1
    # 極性
    pol = Counter()
    for c in cells:
        for k, v in (c.get("kindle_polarity") or {}).items():
            pol[k] += v
    # 引用元
    dom = Counter()
    dom_bucket = {}
    dom_reco = Counter()   # 引用された回答でKindleが第一想起 → 推薦転換
    bucket = Counter()
    for c in cells:
        seen = set()
        for x in c["citations"]:
            if x["bucket"] == "noise" or not x["host"]:
                continue
            dom[x["host"]] += 1
            bucket[x["bucket"]] += 1
            dom_bucket[x["host"]] = x["bucket"]
            if x["host"] not in seen:
                seen.add(x["host"])
                if "kindle" in c["brands"] and c["brands"]["kindle"]["rank"] == 1:
                    dom_reco[x["host"]] += 1
    total_c = sum(dom.values()) or 1
    domains = [{"host": h, "n": n, "share": round(n / total_c * 100, 1), "bucket": dom_bucket[h],
                "reco": dom_reco[h], "reco_rate": round(dom_reco[h] / n * 100, 1)} for h, n in dom.most_common(40)]
    # 勝敗マトリクス（テーマ×ブランド: Kindleを含む文の極性 / 競合のみの文の極性）
    mx = defaultdict(lambda: defaultdict(lambda: {"pos": 0, "neg": 0, "neu": 0, "n": 0}))
    theme_tot = Counter()
    for c in cells:
        for t in c["themes"]:
            for b in t["brands"][:1]:   # 文の主語ブランド
                cell = mx[t["theme"]][b]
                cell[t["pol"]] += 1
                cell["n"] += 1
                theme_tot[t["theme"]] += 1
    matrix = {th: {b: v for b, v in row.items()} for th, row in mx.items()}
    # 配置図（言及量 × 共起テーマ上位）
    posmap = []
    for bid, n in mention_rank.most_common(8):
        th = Counter()
        pos_n = neg_n = 0
        for c in cells:
            for t in c["themes"]:
                if t["brands"][:1] == [bid]:
                    th[t["theme"]] += 1
                    pos_n += t["pol"] == "pos"
                    neg_n += t["pol"] == "neg"
        posmap.append({"id": bid, "label": brand_label.get(bid, bid), "mentions": n, "first": first_rank[bid],
                       "share": round(n / n_exp * 100, 1), "top_themes": [t for t, _ in th.most_common(3)],
                       "pos": pos_n, "neg": neg_n})
    # ペルソナ別（Kindle言及セル内）
    pers = Counter()
    for c in cells:
        for p in c["personas"]:
            if "kindle" in p["brands"]:
                pers[p["persona"]] += 1
    # ファンアウト
    fan = Counter()
    for c in cells:
        for q in c.get("fanout") or []:
            fan[q.strip()] += 1
    # 面×クエリ マトリクス（Kindle rank） & セル本文
    out_cells = []
    for c in cells:
        out_cells.append({"q": c["prompt_id"], "f": c["surface"], "model": c.get("model"),
                          "answer": c["answer"], "cites": [{"host": x["host"], "bucket": x["bucket"], "url": x["url"], "title": x["title"]}
                                                           for x in c["citations"] if x["bucket"] != "noise"][:20],
                          "brands": {b: d["rank"] for b, d in c["brands"].items()},
                          "kindle_rank": (c["brands"].get("kindle") or {}).get("rank"),
                          "stores": list(c.get("stores") or {}), "pol": c.get("kindle_polarity"),
                          "fanout": (c.get("fanout") or [])[:12], "organic": (c.get("organic") or [])[:10]})
    return {**base, "measured": True, "date": snap["date"], "n_prompts": snap["n_prompts"], "n_cells": snap["n_cells"],
            "api_cost": snap.get("api_cost"), "per_face": per_face,
            "first_rank": [{"id": b, "label": brand_label.get(b, b), "n": n, "rate": round(n / n_exp * 100, 1)} for b, n in first_rank.most_common(10)],
            "mention_rank": [{"id": b, "label": brand_label.get(b, b), "n": n, "rate": round(n / n_exp * 100, 1)} for b, n in mention_rank.most_common(10)],
            "expect_cells": len(expect),
            "family": {k: {**v, "label": FAMILY_LABEL.get(k, k), "rate": round(v["mention"] / max(1, v["cells"]) * 100, 1)} for k, v in fam.items()},
            "models": dict(models.most_common()), "stores_all": dict(store_all.most_common()), "stores_p": dict(store_p.most_common()),
            "polarity": dict(pol), "domains": domains,
            "buckets": [{"id": b, "label": BUCKET_LABEL.get(b, b), "n": n, "share": round(n / total_c * 100, 1)} for b, n in bucket.most_common()],
            "matrix": matrix, "theme_tot": dict(theme_tot), "posmap": posmap, "personas": dict(pers.most_common()),
            "fanout_top": fan.most_common(30), "cells": out_cells}


def load_prompts_all() -> list[dict]:
    import yaml
    with open(ROOT / "prompts" / "registry.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)["prompts"]


# ------------------------------------------------------------------ 付帯収集（生データ → 表示用）
def latest_raw_dir() -> Path | None:
    dirs = sorted([p for p in RAW.glob("*") if p.is_dir()])
    return dirs[-1] if dirs else None


def _result_items(res) -> list:
    out = []
    for r in (res or []) if isinstance(res, list) else []:
        out += (r or {}).get("items") or []
    return out


def extras_block() -> dict:
    d = latest_raw_dir()
    out = {"date": d.name if d else None}
    if not d:
        return out
    # 需要
    kv = read_json(d / "keywords_search_volume.json")
    if kv and kv.get("result"):
        groups = kv.get("groups") or {}
        g_of = {k.lower(): g for g, ks in groups.items() for k in ks}
        rows = []
        for r in kv["result"]:
            if not r or r.get("search_volume") is None:
                continue
            ms = sorted(r.get("monthly_searches") or [], key=lambda m: (m["year"], m["month"]))
            rows.append({"kw": r["keyword"], "group": g_of.get(r["keyword"], "other"), "vol": r["search_volume"],
                         "cpc": r.get("cpc"), "comp": r.get("competition"),
                         "monthly": [[m["year"], m["month"], m["search_volume"]] for m in ms]})
        rows.sort(key=lambda x: -(x["vol"] or 0))
        grp = defaultdict(int)
        for r in rows:
            grp[r["group"]] += r["vol"] or 0
        out["keywords"] = {"rows": rows, "groups": dict(grp), "total": sum(grp.values())}
    # Labs候補
    lb = read_json(d / "labs_suggestions.json")
    if lb and isinstance(lb, dict):
        sug = {}
        for seed, res in lb.items():
            items = _result_items(res)
            sug[seed] = [{"kw": it.get("keyword"), "vol": (it.get("keyword_info") or {}).get("search_volume"),
                          "intent": (it.get("search_intent_info") or {}).get("main_intent"),
                          "kd": (it.get("keyword_properties") or {}).get("keyword_difficulty")}
                         for it in items if it.get("keyword")][:150]
        out["suggestions"] = sug
    # Amazon SERP
    am = read_json(d / "amazon_serp.json")
    if am and isinstance(am, dict):
        serp = {}
        for kw, res in am.items():
            items = [it for it in _result_items(res) if it.get("type") in ("amazon_serp", "amazon_paid")]
            serp[kw] = [{"rank": it.get("rank_absolute"), "type": it.get("type"), "title": (it.get("title") or "")[:90],
                         "asin": it.get("data_asin"), "price": it.get("price_from"), "rating": (it.get("rating") or {}).get("value"),
                         "votes": (it.get("rating") or {}).get("votes_count"), "bought": it.get("bought_past_month"),
                         "best": it.get("is_best_seller"), "choice": it.get("is_amazon_choice"), "url": it.get("url")}
                        for it in items][:40]
        out["amazon_serp"] = serp
    asin = read_json(d / "amazon_asin.json")
    if asin and isinstance(asin, dict):
        prods = []
        for a, v in asin.items():
            for it in _result_items(v.get("result")):
                if it.get("type") != "amazon_product_info":
                    continue
                prods.append({"asin": a, "title": (it.get("title") or "")[:100], "price": it.get("price_from"),
                              "discount": it.get("percentage_discount"), "rating": (it.get("rating") or {}).get("value"),
                              "votes": (it.get("rating") or {}).get("votes_count"), "available": it.get("is_available"),
                              "reviews": [{"title": r.get("title"), "text": (r.get("review_text") or "")[:300], "rating": (r.get("rating") or {}).get("value"),
                                           "date": r.get("publication_date"), "helpful": r.get("helpful_votes")}
                                          for r in (it.get("top_local_reviews") or [])[:8]]})
        out["amazon_products"] = prods
    # アプリ
    app = read_json(d / "app_data.json")
    if app and isinstance(app, dict):
        def _info(tasks):
            for t in tasks or []:
                for it in _result_items(t.get("result")):
                    if it.get("type") in ("app_store_info_organic", "google_play_info_organic"):
                        return {"title": it.get("title"), "rating": (it.get("rating") or {}).get("value"),
                                "votes": (it.get("rating") or {}).get("votes_count"), "reviews_count": it.get("reviews_count"),
                                "version": it.get("version"), "updated": it.get("last_update_date"), "installs": it.get("installs")}
            return None

        def _reviews(tasks):
            rows = []
            for t in tasks or []:
                for it in _result_items(t.get("result")):
                    rows.append({"rating": (it.get("rating") or {}).get("value"), "title": it.get("title"),
                                 "text": (it.get("review_text") or "")[:240], "ts": it.get("timestamp"), "version": it.get("version")})
            return rows
        out["apps"] = {"apple": _info(app.get("apple_info")), "google": _info(app.get("google_info")),
                       "apple_reviews": _reviews(app.get("apple_reviews"))[:60], "google_reviews": _reviews(app.get("google_reviews"))[:150]}
    # YouTube
    yt = read_json(d / "youtube.json")
    if yt and isinstance(yt, dict):
        vids = {}
        for kw, res in yt.items():
            vids[kw] = [{"rank": it.get("rank_absolute"), "title": it.get("title"), "channel": it.get("channel_name"),
                         "views": it.get("views_count"), "date": it.get("publication_date"), "url": it.get("url"),
                         "shorts": it.get("is_shorts"), "dur": it.get("duration_time")}
                        for it in _result_items(res) if it.get("type") == "youtube_video"][:20]
        out["youtube"] = vids
    # ニュース
    nw = read_json(d / "news.json")
    if nw and isinstance(nw, dict):
        news = {}
        for kw, res in nw.items():
            rows = []
            for it in _result_items(res):
                if it.get("type") == "news_search":
                    rows.append({"title": it.get("title"), "domain": it.get("domain"), "url": it.get("url"),
                                 "snippet": (it.get("snippet") or "")[:160], "time": it.get("time_published"), "ts": it.get("timestamp")})
                elif it.get("type") == "top_stories":
                    for el in it.get("items") or []:
                        rows.append({"title": el.get("title"), "domain": el.get("domain"), "url": el.get("url"),
                                     "snippet": "", "time": el.get("date"), "ts": el.get("timestamp"), "top": True})
            news[kw] = rows[:30]
        out["news"] = news
    # Content Analysis
    ca = read_json(d / "content_summary.json")
    if ca and isinstance(ca, dict):
        summ = {}
        for kw, res in ca.items():
            if kw.startswith("_"):
                continue
            for r in (res or []) if isinstance(res, list) else []:
                if r and r.get("type") == "content_analysis_summary":
                    summ[kw] = {"total": r.get("total_count"), "sentiment": r.get("sentiment_connotations"),
                                "connotation": r.get("connotation_types"), "top_domains": (r.get("top_domains") or [])[:20],
                                "page_types": r.get("page_types"), "categories": (r.get("text_categories") or [])[:10]}
        mentions = []
        for r in (ca.get("_search_kindle") or []) if isinstance(ca.get("_search_kindle"), list) else []:
            for it in (r or {}).get("items") or []:
                ci = it.get("content_info") or {}
                mentions.append({"domain": it.get("domain"), "url": it.get("url"), "title": ci.get("title"), "snippet": (ci.get("snippet") or "")[:200],
                                 "date": ci.get("date_published"), "conn": ci.get("connotation_types"), "sent": ci.get("sentiment_connotations")})
        out["content"] = {"summary": summ, "mentions": mentions[:80]}
    # AI検索ボリューム
    ak = read_json(d / "ai_keyword_volume.json")
    if ak and ak.get("result"):
        rows = []
        for r in ak["result"]:
            for it in (r or {}).get("items") or []:
                rows.append({"kw": it.get("keyword"), "vol": it.get("ai_search_volume"),
                             "monthly": [[m["year"], m["month"], m["ai_search_volume"]] for m in (it.get("ai_monthly_searches") or [])]})
        rows.sort(key=lambda x: -(x["vol"] or 0))
        out["ai_keywords"] = rows
    elif ak:
        out["ai_keywords_unsupported"] = True
    # ChatGPT実画面
    sc = read_json(d / "chatgpt_scraper.json")
    if sc and isinstance(sc, dict):
        rows = []
        for pid, v in sc.items():
            for r in (v.get("result") or []) if isinstance(v.get("result"), list) else []:
                rows.append({"q": pid, "text": v.get("text"), "markdown": (r.get("markdown") or "")[:5000],
                             "sources": [{"title": s.get("title"), "domain": s.get("domain"), "url": s.get("url")} for s in (r.get("sources") or [])[:15]],
                             "brands": [{"title": b.get("title"), "category": b.get("category")} for b in (r.get("brand_entities") or [])[:15]],
                             "fanout": (r.get("fan_out_queries") or [])[:12]})
        out["chatgpt_ui"] = rows
    meta = read_json(d / "_meta.json")
    if meta:
        out["spent"] = meta.get("spent")
        out["errors"] = meta.get("errors")
    return out


# ------------------------------------------------------------------ 連携ステータス
def status_block(ai: dict, extras: dict, trends: dict | None) -> list[dict]:
    ex = extras or {}
    return [
        {"id": "sales", "label": "販売実績（台数・売上・ASP）", "state": "sample", "src": "Amazon Retail Analytics / Vendor Central",
         "how": "週次レポートCSVを data/connect/sales.csv に配置 → 集計が自動で実値に置換"},
        {"id": "channel", "label": "量販店チャネル販売", "state": "sample", "src": "BCNランキング / GfK Japan POS",
         "how": "POSデータ（機種×店舗×週）を data/connect/retail_pos.csv に配置"},
        {"id": "ku", "label": "Kindle Unlimited 会員・利用", "state": "sample", "src": "社内KU指標",
         "how": "会員数・アクティブ率の週次CSVを配置"},
        {"id": "market", "label": "市場統計（出版科研・インプレス）", "state": "live", "src": "公開統計（出典リンク付き）", "how": "年次で手動更新"},
        {"id": "price", "label": "公式価格・セール履歴・量販店価格", "state": "live", "src": "Amazon公式 / 量販店EC / 報道", "how": "セール毎に追記"},
        {"id": "trends", "label": "Google検索需要（トレンド）", "state": "live" if trends else "wait", "src": "Google Trends（pytrends）", "how": "毎ラウンド自動更新"},
        {"id": "kwvol", "label": "検索ボリューム（月間）", "state": "live" if ex.get("keywords") else "wait", "src": "DataForSEO Google Ads", "how": "毎ラウンド自動更新"},
        {"id": "ai", "label": "AI6面の語られ方（実クエリ42本）", "state": "live" if ai.get("measured") else "wait", "src": "DataForSEO AI Optimization / SERP", "how": "毎週月曜 自動計測"},
        {"id": "shelf", "label": "Amazon.co.jp の棚（順位・価格・評価）", "state": "live", "src": "Amazon.co.jp 検索結果をChromeで実測", "how": "DataForSEO Merchant 接続後は自動更新に切替"},
        {"id": "kakaku", "label": "比較サイトの棚（価格.com）", "state": "live", "src": "価格.com 人気売れ筋ランキング", "how": "週次でChrome実測"},
        {"id": "amazon", "label": "Amazon.co.jp 検索結果・レビュー（API自動化）", "state": "live" if ex.get("amazon_serp") else "wait", "src": "DataForSEO Merchant", "how": "毎ラウンド自動更新"},
        {"id": "apps", "label": "Kindleアプリ評価（App Store / Google Play）", "state": "live" if ex.get("apps") else "wait", "src": "DataForSEO App Data", "how": "毎ラウンド自動更新"},
        {"id": "youtube", "label": "YouTube 語られ方", "state": "live" if ex.get("youtube") else "wait", "src": "DataForSEO YouTube SERP", "how": "毎ラウンド自動更新"},
        {"id": "news", "label": "ニュース", "state": "live", "src": "報道リンク集 + DataForSEO News", "how": "毎ラウンド自動更新"},
        {"id": "sns", "label": "X / Instagram / TikTok の言及量", "state": "teaser", "src": "SNS管理者アカウント（X API 等）", "how": "APIキー登録で解放（工事中）"},
        {"id": "ga", "label": "Amazon.co.jp 商品ページ流入（AI経由）", "state": "teaser", "src": "社内アクセス解析", "how": "参照元（chatgpt.com / gemini / perplexity）別の流入CSVを配置"},
    ]


def main() -> None:
    fb = facts_block()
    facts = fb["by_id"]
    snap = latest_snapshot()
    ai = ai_block(snap)
    trends = trends_block()
    extras = extras_block()
    shelf = read_json(DATA / "amazon_shelf.json")
    kakaku = read_json(DATA / "kakaku.json")
    board = {
        "meta": {"built_at": now_jst(), "brand": "Kindle", "owner": load("settings")["site"]["owner"],
                 "measured_at": ai.get("date"), "facts_as_of": fb["as_of"], "marker": "KINDLE_BOARD"},
        "status": status_block(ai, extras, trends),
        "facts": facts, "ebook_series": fb["ebook_series"], "news_curated": fb["news"],
        "lineup": lineup_block(facts), "competitors": competitor_block(facts),
        "sales": sales_sample(), "trends": trends, "ai": ai, "extras": extras, "shelf": shelf, "kakaku": kakaku,
    }
    write_json(ROOT / "tools" / "board_data.json", board, compact=True)
    size = (ROOT / "tools" / "board_data.json").stat().st_size
    print(f"board_data.json {size/1024:.0f}KB  measured={ai.get('measured')} extras={extras.get('date')} trends={'ok' if trends else 'none'}")


if __name__ == "__main__":
    main()
