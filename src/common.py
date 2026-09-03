"""共通ユーティリティ: 設定読み込み・パス・日付・ドメイン正規化・引用分類。"""
from __future__ import annotations

import fnmatch
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config"
DATA = ROOT / "data"
SNAPSHOTS = DATA / "snapshots"
RAW = DATA / "raw"
DOCS = ROOT / "docs"
JST = timezone(timedelta(hours=9))

_cache: dict[str, dict] = {}


def load(name: str) -> dict:
    if name not in _cache:
        with open(CONFIG / f"{name}.yaml", encoding="utf-8") as f:
            _cache[name] = yaml.safe_load(f)
    return _cache[name]


def env(key: str, default: str | None = None) -> str | None:
    v = os.environ.get(key)
    return v if v not in (None, "") else default


def load_prompts(tier: str = "active") -> list[dict]:
    with open(ROOT / "prompts" / "registry.yaml", encoding="utf-8") as f:
        rows = yaml.safe_load(f)["prompts"]
    return [p for p in rows if p.get("tier", "active") == tier]


def today() -> str:
    return datetime.now(JST).strftime("%Y-%m-%d")


def now_jst() -> str:
    return datetime.now(JST).strftime("%Y-%m-%d %H:%M")


def sentences(text: str) -> list[str]:
    parts = re.split(r"[。．！!？?\n]+", text or "")
    return [s.strip() for s in parts if s.strip()]


def domain_of(url: str) -> str:
    try:
        host = urlparse(url if "://" in url else "https://" + url).netloc.lower()
    except ValueError:
        return ""
    return host.split(":")[0].removeprefix("www.").rstrip(".")


def match_domain(host: str, patterns: list[str]) -> bool:
    for p in patterns or []:
        p = p.lower()
        if "*" in p:
            if fnmatch.fnmatch(host, p):
                return True
        elif host == p or host.endswith("." + p):
            return True
    return False


def classify_url(url: str) -> dict:
    """URL を owned / competitor / retail / ugc / video / press / media / reference / noise に分類。"""
    dm = load("domains")
    host = domain_of(url)
    if not host:
        return {"host": "", "bucket": "noise", "platform": None}
    low = (url or "").lower()
    if any(p in low for p in dm["noise_patterns"]):
        return {"host": host, "bucket": "noise", "platform": None}
    for bucket in ("owned", "competitor", "retail", "reference", "press"):
        if match_domain(host, dm.get(f"{bucket}_domains") or []):
            return {"host": host, "bucket": bucket, "platform": None}
    for p in dm["platforms"]:
        if match_domain(host, p["domains"]):
            return {"host": host, "bucket": p.get("bucket", "ugc"), "platform": p["id"]}
    return {"host": host, "bucket": "media", "platform": None}


def write_json(path: Path, obj, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        if compact:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(obj, f, ensure_ascii=False, indent=1)


def read_json(path: Path, default=None):
    if not path.exists():
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)
