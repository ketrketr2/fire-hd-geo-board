#!/usr/bin/env python3
"""AI6面ラウンドの計測ランナー（御殿場 run_round.py の Kindle 移植）。

  python src/run_round.py --cap 15

・回答本文・引用は全文保存（指標の再定義・再計算のため）
・取得率50%未満ならスナップショットを書かずに落ちる（欠測だらけの回を正に混ぜない）
・言及率(G2)/第一想起(G3)の分母は「出現期待クエリ」= named でも compare でもないクエリ
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import dfs  # noqa: E402
from common import SNAPSHOTS, DATA, classify_url, env, load, load_prompts, today, write_json  # noqa: E402
from detect import SELF_ID, catalog, detect_brands, detect_models, detect_stores, theme_persona_scan  # noqa: E402


def build_jobs(day: str, cap: float, only: list[str] | None = None) -> tuple[list[dict], dict]:
    cfg = load("settings")
    surfaces = [s for s in cfg["surfaces"] if s.get("enabled") and (not only or s["id"] in only)]
    guard = dfs.BudgetGuard(cap)
    prompts = load_prompts("active")
    jobs = [{"day": day, "p": p, "s": s, "guard": guard} for p in prompts for s in surfaces]
    return jobs, {p["id"]: p for p in prompts}


def collect(jobs: list[dict]) -> list[dict]:
    workers = int(env("GEO_BOARD_WORKERS", "8") or 8)
    out, done = [], 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(dfs.one_call, j): j for j in jobs}
        for fut in as_completed(futs):
            r = fut.result()
            done += 1
            if r:
                out.append(r)
            if done % 50 == 0:
                print(f"  … {done}/{len(jobs)} 完了（成功 {len(out)} / ${dfs.spent()['usd']:.2f}）", flush=True)
    out.sort(key=lambda r: (r["prompt_id"], r["surface"]))
    return out


def build_cells(responses: list[dict], prompts_by_id: dict) -> list[dict]:
    cat = catalog()
    cells = []
    for r in responses:
        p = prompts_by_id.get(r["prompt_id"], {})
        text = r.get("text") or ""
        det = detect_brands(text, cat)
        scan = theme_persona_scan(text, cat)
        cites = []
        for c in r.get("citations") or []:
            u = c.get("url") or ""
            dom = (c.get("domain") or "").strip().lower()
            redirected = any(x in u for x in ("vertexaisearch", "google.com/goto", "grounding-api-redirect"))
            target = ("https://" + dom) if (redirected and dom and "." in dom and "/" not in dom) else u
            cites.append({**classify_url(target), "url": u, "title": (c.get("title") or "")[:120]})
        cells.append({
            "prompt_id": r["prompt_id"], "surface": r["surface"],
            "family": p.get("family"), "named": bool(p.get("named")), "compare": bool(p.get("compare")),
            "model": r.get("model"), "cost": r.get("cost"), "money_spent": r.get("money_spent"),
            "answer": text, "markdown": r.get("markdown") or "",
            "citations": cites, "organic": r.get("organic") or [],
            "brands": det, "models": detect_models(text), "stores": detect_stores(text),
            "themes": scan["themes"], "personas": scan["personas"], "self_polarity": scan["self_polarity"],
            "fanout": r.get("fanout") or [],
        })
    return cells


def summarize(cells: list[dict]) -> dict:
    cfg = load("settings")
    faces = [s["id"] for s in cfg["surfaces"] if s.get("enabled")]
    expect = [c for c in cells if not c["named"] and not c["compare"]]
    per_face = {}
    for f in faces:
        fc = [c for c in cells if c["surface"] == f]
        fe = [c for c in expect if c["surface"] == f]
        answered = [c for c in fc if c["answer"]]
        cite_counts = [len([x for x in c["citations"] if x["bucket"] != "noise"]) for c in answered]
        m = [c for c in fe if SELF_ID in c["brands"]]
        first = [c for c in m if c["brands"][SELF_ID]["rank"] == 1]
        owned = sum(1 for c in answered for x in c["citations"] if x["bucket"] == "owned")
        allc = sum(cite_counts) or 1
        per_face[f] = {
            "cells": len(fc), "answered": len(answered),
            "gen_rate": round(len(answered) / len(fc) * 100, 1) if fc else None,
            "avg_cites": round(sum(cite_counts) / len(cite_counts), 2) if cite_counts else None,
            "expect_cells": len(fe), "mention": len(m),
            "mention_rate": round(len(m) / len(fe) * 100, 1) if fe else None,
            "first": len(first), "first_rate": round(len(first) / len(m) * 100, 1) if m else None,
            "owned_cite_share": round(owned / allc * 100, 1),
        }
    first_rank, mention_rank = Counter(), Counter()
    for c in expect:
        for bid, d in c["brands"].items():
            mention_rank[bid] += 1
            if d["rank"] == 1:
                first_rank[bid] += 1
    dom, buckets = Counter(), Counter()
    for c in cells:
        for x in c["citations"]:
            if x["bucket"] == "noise":
                continue
            dom[x["host"]] += 1
            buckets[x["bucket"]] += 1
    total = sum(dom.values()) or 1
    return {"per_face": per_face, "first_rank": first_rank.most_common(20),
            "mention_rank": mention_rank.most_common(20),
            "domains": [[h, n, round(n / total * 100, 1)] for h, n in dom.most_common(40)],
            "cite_buckets": {k: round(v / total * 100, 1) for k, v in buckets.items()}}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=today())
    ap.add_argument("--cap", type=float, default=15.0)
    ap.add_argument("--surfaces", default="", help="カンマ区切りで面を限定（例: chatgpt,aio）")
    a = ap.parse_args()
    only = [s for s in a.surfaces.split(",") if s] or None
    jobs, prompts_by_id = build_jobs(a.date, a.cap, only)
    faces = sorted({j["s"]["id"] for j in jobs})
    print(f"[{a.date}] round: {len(prompts_by_id)}本 × {len(faces)}面 {faces} = {len(jobs)}呼び出し（上限 ${a.cap:.0f}）", flush=True)
    responses = collect(jobs)
    got = len(responses) / max(len(jobs), 1)
    by_surface = Counter(r["surface"] for r in responses)
    print(f"  取得 {len(responses)}/{len(jobs)} ({got*100:.1f}%) 面別 {dict(by_surface)}  実費 ${dfs.spent()['usd']:.2f}", flush=True)
    if got < 0.5:
        (DATA / "last_error.txt").write_text(
            f"{a.date} round 取得率 {got*100:.1f}%（{len(responses)}/{len(jobs)}）\n面別: {dict(by_surface)}\n"
            f"実費 {dfs.spent()}\n\n" + "\n".join(dfs.errors()), encoding="utf-8")
        sys.exit("取得率が50%を下回ったため、スナップショットは書きません。data/last_error.txt を確認。")
    cells = build_cells(responses, prompts_by_id)
    snap = {"date": a.date, "mode": "live", "n_prompts": len(prompts_by_id), "n_cells": len(cells),
            "surfaces": dict(by_surface), "summary": summarize(cells), "api_cost": dfs.spent(),
            "errors": dfs.errors()[:40], "cells": cells}
    write_json(SNAPSHOTS / f"{a.date}.json", snap, compact=True)
    print(f"  wrote data/snapshots/{a.date}.json  実費 ${snap['api_cost']['usd']:.2f} / {snap['api_cost']['calls']}回")
    for f, v in snap["summary"]["per_face"].items():
        print(f"    {f:<10} 生成率 {v['gen_rate']}% 引用 {v['avg_cites']} 言及率 {v['mention_rate']}% 第一想起 {v['first_rate']}% 自社引用 {v['owned_cite_share']}%")


if __name__ == "__main__":
    main()
