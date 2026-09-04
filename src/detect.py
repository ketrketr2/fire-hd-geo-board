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


SELF_ID = load("brands")["self"]["id"]   # 自社ブランドID（config/brands.yaml の self.id）


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
            if SELF_ID in brands:
                pol_counts[pol] += 1
            _collect(cfg, sn, s, brands, pol, out_t, out_p)
    return {"themes": out_t, "personas": out_p, "self_polarity": pol_counts}


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
    t1 = "Xiaomi Redmi Pad 2も良いですが、Fire HD 10は動画視聴に十分で安価です。iPadは高価。"
    d1 = detect_brands(t1, cat)
    assert set(d1) == {"xiaomi", "fire", "ipad"}, d1
    assert d1["xiaomi"]["rank"] == 1 and d1["fire"]["rank"] == 2 and d1["ipad"]["rank"] == 3, d1
    t2 = "FIRE HD 8 is cheap; the iPad mini is a premium tablet."
    d2 = detect_brands(t2, cat)
    assert set(d2) == {"fire", "ipad"}, d2
    # guard: Fire TV Stick は端末ブランド（タブレット）に数えない
    t3 = "Fire TV Stickは動画用のドングルです。Fire HD 10はタブレットです。"
    d3 = detect_brands(t3, cat)
    assert set(d3) == {"fire"} and d3["fire"]["hits"] == 1, d3
    # Kindle Fire は自社（Fireタブレット）、単独の Kindle は電子書籍リーダー側
    t4 = "Kindle FireはAmazonのタブレット。読書だけならKindle Paperwhiteの方が向きます。"
    d4 = detect_brands(t4, cat)
    assert set(d4) == {"fire", "kindle"}, d4
    m = detect_models("Fire HD 10とFire HD 8、Fire Max 11を比較。キッズモデルやプライムビデオも。")
    assert m.get("fire_hd10") == 1 and m.get("fire_hd8") == 1 and m.get("fire_max11") == 1, m
    assert m.get("kids") == 1 and m.get("prime_video") == 1, m
    st = detect_stores("Amazonのセール時が最安ですが、ビックカメラやヨドバシの店頭でも買えます。中古ならメルカリも。")
    assert set(st) >= {"amazon", "bic", "yodobashi", "used"}, st
    r = theme_persona_scan("Fire HD 10はGoogle Playが使えないのでアプリが少なく不便です。", cat)
    assert any(x["theme"] == "play" and "fire" in x["brands"] and x["pol"] == "neg" for x in r["themes"]), r
    r2 = theme_persona_scan("子ども用にはFireキッズモデルが安心でおすすめです。", cat)
    assert any(x["persona"] == "kids_parent" for x in r2["personas"]), r2
    print("detect selftest: OK (8/8)")


if __name__ == "__main__":
    _selftest()
