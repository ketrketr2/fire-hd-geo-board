"""回答本文からの検出: ブランド（出現順＝第一想起）・端末モデル・購入チャネル・テーマ・ペルソナ・極性。

detect_brands はトヨタ detect_cars → 御殿場 detect_outlets の確定形をそのまま移植:
  「全トークン（alias+guard）を長い順・同長なら alias 優先で走査し、
   一致区間を＊でマスクしながら最小位置を記録 → 出現順 rank 化」
照合は NFKC + casefold 正規化テキストに対して行う。
"""
from __future__ import annotations

import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import load, sentences  # noqa: E402


def catalog() -> list[dict]:
    cfg = load("brands")
    rows = [{**cfg["self"], "own": True, "tier": "self"}]
    rows += [{**c, "own": False, "tier": "t1"} for c in cfg["tier1"]]
    rows += [{**c, "own": False, "tier": "t2"} for c in cfg["tier2"]]
    return rows


def _norm(text: str) -> str:
    return unicodedata.normalize("NFKC", text or "").casefold()


def _scan(text: str, entries: list[tuple[str, list[str], list[str]]]) -> dict[str, dict]:
    """entries: [(id, aliases, guards)] → {id: {pos, rank, hits}}"""
    if not text:
        return {}
    work = _norm(text)
    tokens = [(_norm(a), eid) for eid, al, _ in entries for a in al]
    tokens += [(_norm(g), None) for _, _, gd in entries for g in (gd or [])]
    tokens.sort(key=lambda x: (-len(x[0]), x[1] is None))
    found: dict[str, int] = {}
    hits: dict[str, int] = {}
    for tok, eid in tokens:
        if not tok:
            continue
        start = 0
        while True:
            i = work.find(tok, start)
            if i < 0:
                break
            if eid is not None:
                hits[eid] = hits.get(eid, 0) + 1
                if eid not in found or i < found[eid]:
                    found[eid] = i
            work = work[:i] + "＊" * len(tok) + work[i + len(tok):]
            start = i + len(tok)
    order = sorted(found, key=lambda k: found[k])
    return {eid: {"pos": pos, "rank": order.index(eid) + 1, "hits": hits.get(eid, 0)}
            for eid, pos in found.items()}


def detect_brands(text: str, cat: list[dict] | None = None) -> dict[str, dict]:
    cat = cat or catalog()
    return _scan(text, [(c["id"], c["aliases"], c.get("guards") or []) for c in cat])


def detect_models(text: str) -> dict[str, int]:
    """Kindle端末モデル別の言及回数。"""
    models = load("brands")["self"].get("models") or {}
    res = _scan(text, [(mid, words, []) for mid, words in models.items()])
    return {k: v["hits"] for k, v in res.items()}


def detect_stores(text: str) -> dict[str, dict]:
    stores = load("brands")["stores"]
    return _scan(text, [(sid, s["aliases"], []) for sid, s in stores.items()])


def sent_polarity(s_norm: str) -> str:
    sx = load("brands")["sentiment"]
    p = sum(s_norm.count(_norm(w)) for w in sx["positive"])
    n = sum(s_norm.count(_norm(w)) for w in sx["negative"])
    return "pos" if p > n else "neg" if n > p else "neu"


def _hit_words(s_norm: str, words: list[str]) -> bool:
    return any(_norm(w) in s_norm for w in words)


def theme_persona_scan(text: str, cat: list[dict] | None = None) -> dict:
    """文単位でテーマ・ペルソナ・ブランドの共起を取る。"""
    cat = cat or catalog()
    cfg = load("brands")
    out_t, out_p, pol_counts = [], [], {"pos": 0, "neg": 0, "neu": 0}
    for line in (text or "").split("\n"):
        carry: list[str] = []                     # 同じ段落内では直前の文の主語ブランドを引き継ぐ
        for s in sentences(line):
            sn = _norm(s)
            det = detect_brands(s, cat)
            brands = sorted(det, key=lambda k: det[k]["pos"]) if det else carry
            if not brands:
                continue
            carry = brands[:1] if det else carry
            pol = sent_polarity(sn)
            if "kindle" in brands:
                pol_counts[pol] += 1
            _collect(cfg, sn, s, brands, pol, out_t, out_p)
    return {"themes": out_t, "personas": out_p, "kindle_polarity": pol_counts}


def _collect(cfg, sn, s, brands, pol, out_t, out_p) -> None:
    if True:
        for tid, t in cfg["themes"].items():
            if _hit_words(sn, t["words"]):
                out_t.append({"theme": tid, "brands": brands, "pol": pol, "snippet": s[:160]})
        for pid, p in cfg["personas"].items():
            if _hit_words(sn, p["words"]):
                out_p.append({"persona": pid, "brands": brands, "snippet": s[:160]})


# ---------------------------------------------------------------- selftest
def _selftest() -> None:
    cat = catalog()
    t1 = "楽天KoboのClara BWも良いですが、Kindle Paperwhiteは防水で目に優しく定番です。BOOX Palmaも人気。"
    d1 = detect_brands(t1, cat)
    assert set(d1) == {"kobo", "kindle", "boox"}, d1
    assert d1["kobo"]["rank"] == 1 and d1["kindle"]["rank"] == 2 and d1["boox"]["rank"] == 3, d1
    t2 = "KINDLE PAPERWHITE is the best e-reader; iPad mini is a tablet."
    d2 = detect_brands(t2, cat)
    assert set(d2) == {"kindle", "ipad"}, d2
    t3 = "Kindle FireはAmazonのタブレットです。Fire HD 10もあります。"   # guard: Kindle Fire は端末ブランドに数えない
    d3 = detect_brands(t3, cat)
    assert set(d3) == {"fire"}, d3
    m = detect_models("Kindle PaperwhiteとKindle Colorsoft、Scribeを比較。Kindle Unlimitedも。")
    assert m.get("paperwhite") == 1 and m.get("colorsoft") == 1 and m.get("scribe") == 1 and m.get("unlimited") == 1, m
    st = detect_stores("Amazonのセール時が最安ですが、ビックカメラやヨドバシの店頭でも買えます。中古ならメルカリも。")
    assert set(st) >= {"amazon", "bic", "yodobashi", "used"}, st
    r = theme_persona_scan("Kindle Paperwhiteは防水なのでお風呂でも安心して読めます。", cat)
    assert any(x["theme"] == "waterproof" and "kindle" in x["brands"] and x["pol"] == "pos" for x in r["themes"]), r
    assert any(x["persona"] == "bath" for x in r["personas"]), r
    print("detect selftest: OK (6/6)")


if __name__ == "__main__":
    _selftest()
