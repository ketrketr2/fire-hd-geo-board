"""DataForSEO v3 クライアント（AI6面 + 付帯収集）。

実測で確認済みの仕様（御殿場・トヨタ案件 1,700呼以上）:
  - chatgpt : /ai_optimization/chat_gpt/llm_responses/live（gpt-5・max_tokens 4096 必須・
              web_search_country_iso_code は chatgpt/claude/perplexity のみ。gemini に送ると 40501）
  - gemini  : /ai_optimization/gemini/llm_responses/live（gemini-2.5-flash）
              引用が vertexaisearch のリダイレクタで返る → title の裸ドメインから復元
  - aio     : /serp/google/organic/live/advanced + load_async_ai_overview
  - aimode  : /serp/google/ai_mode/live/advanced
  - google.com/goto リダイレクタは 302 を1回辿って実URLへ解決
本案件で追加: claude / perplexity（モデル名は models エンドポイントで実行時に解決し、
              パラメータ拒否時は任意項目を外して1回だけ再試行する）。
デモモードは提供しない（推定値をボードに載せないため）。認証が無ければ止まる。
"""
from __future__ import annotations

import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import requests  # noqa: E402

from common import domain_of, env, load  # noqa: E402

DFS_BASE = "https://api.dataforseo.com/v3"
LLM_PATH = {"chatgpt": "chat_gpt", "gemini": "gemini", "claude": "claude", "perplexity": "perplexity"}

_LOCK = threading.Lock()
_COST = {"total": 0.0, "calls": 0}
_ERRORS: list[str] = []
_MODEL_CACHE: dict[str, str] = {}


def errors() -> list[str]:
    with _LOCK:
        return list(_ERRORS)


def note_error(msg: str) -> None:
    with _LOCK:
        if len(_ERRORS) < 80:
            _ERRORS.append(msg[:300])


def spent() -> dict:
    with _LOCK:
        return {"usd": round(_COST["total"], 4), "calls": _COST["calls"]}


def _charge(task: dict) -> None:
    with _LOCK:
        _COST["total"] += float(task.get("cost") or 0)
        _COST["calls"] += 1


def _auth():
    lg, pw = env("DATAFORSEO_LOGIN"), env("DATAFORSEO_PASSWORD")
    if not lg or not pw:
        sys.exit("DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD 未設定。GitHub Secrets に登録して Actions から実行してください。")
    return (lg, pw)


def post(path: str, body: list, timeout: int = 200) -> dict:
    """1タスクをPOSTし、tasks[0] を返す。status_code != 20000 は例外。"""
    r = requests.post(f"{DFS_BASE}/{path}", auth=_auth(), json=body, timeout=timeout)
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code} {r.text[:300]}")
    js = r.json()
    task = (js.get("tasks") or [{}])[0]
    if task.get("status_code") != 20000:
        _charge(task)
        raise RuntimeError(f"{task.get('status_code')} {task.get('status_message')}")
    _charge(task)
    return task


def get(path: str, timeout: int = 60) -> dict:
    r = requests.get(f"{DFS_BASE}/{path}", auth=_auth(), timeout=timeout)
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code} {r.text[:300]}")
    return r.json()


def safe(label: str, fn, *a, **kw):
    """失敗しても全体を止めない。戻り値 (result|None, error|None)。"""
    try:
        return fn(*a, **kw), None
    except Exception as e:  # noqa: BLE001
        msg = f"{label}: {type(e).__name__}: {e}"
        print(f"  ! {msg}", file=sys.stderr, flush=True)
        note_error(msg)
        return None, msg


# ---- リダイレクタ対策 ----
_REDIRECTORS = ("vertexaisearch.cloud.google.com", "grounding-api-redirect", "google.com/goto")
_GOTO_CACHE: dict[str, str] = {}
_UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                     "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"}


def _is_goto(url: str) -> bool:
    u = (url or "").lower()
    return ("google.com/goto" in u) and u.startswith(("http://", "https://"))


def _resolve_goto(url: str) -> str:
    if url in _GOTO_CACHE:
        return _GOTO_CACHE[url]
    u = url.replace("://google.com/", "://www.google.com/", 1)
    final = ""
    for _ in range(3):
        try:
            r = requests.get(u, headers=_UA, timeout=8, allow_redirects=False)
        except Exception:  # noqa: BLE001
            break
        loc = r.headers.get("location") or ""
        if r.status_code in (301, 302, 303, 307, 308) and loc:
            if "google.com/goto" in loc or "grounding-api-redirect" in loc:
                u = loc
                continue
            final = loc
        break
    _GOTO_CACHE[url] = final
    return final


def _walk_refs(node, out: list) -> None:
    """references / annotations / sources は階層がまちまち。URLを持つ辞書を再帰で拾う。"""
    if isinstance(node, dict):
        if node.get("url"):
            url = node["url"]
            title = node.get("title") or node.get("source") or node.get("source_name") or ""
            dom = node.get("domain") or ""
            if _is_goto(url):
                real = _resolve_goto(url)
                if real:
                    url, dom = real, domain_of(real)
                else:
                    dom = url
            if any(x in url for x in _REDIRECTORS):
                if title and "/" not in title and "." in title and " " not in title:
                    dom = title.lower()
            out.append({"url": url, "title": str(title)[:160], "domain": dom or domain_of(url),
                        "text": (node.get("text") or node.get("snippet") or "")[:200]})
            return
        for v in node.values():
            _walk_refs(v, out)
    elif isinstance(node, list):
        for v in node:
            _walk_refs(v, out)


def _dedup(cites: list[dict]) -> list[dict]:
    seen, out = set(), []
    for c in cites:
        key = c.get("url")
        if any(x in (c.get("url") or "") for x in _REDIRECTORS):
            key = ("dom", c.get("domain"), c.get("title"))
        if key not in seen:
            seen.add(key)
            out.append(c)
    return out


# ---- LLM 4面 ----
def resolve_model(surface: dict) -> str:
    sid, want = surface["id"], surface["model"]
    if sid in _MODEL_CACHE:
        return _MODEL_CACHE[sid]
    chosen = want
    try:
        js = get(f"ai_optimization/{LLM_PATH[sid]}/llm_responses/models")
        names = []
        for t in js.get("tasks") or []:
            for r in t.get("result") or []:
                if isinstance(r, dict) and r.get("model_name"):
                    names.append(r["model_name"])
                elif isinstance(r, str):
                    names.append(r)
        if names and want not in names:
            key = {"claude": "sonnet", "perplexity": "sonar", "chatgpt": "gpt-5", "gemini": "flash"}[sid]
            cand = [n for n in names if key in n.lower()]
            chosen = cand[0] if cand else names[0]
            print(f"  model fallback {sid}: {want} -> {chosen} (available: {names[:8]})", flush=True)
    except Exception as e:  # noqa: BLE001
        print(f"  models lookup failed for {sid}: {e}", flush=True)
    _MODEL_CACHE[sid] = chosen
    return chosen


def fetch_llm(prompt: str, surface: dict) -> dict:
    sid = surface["id"]
    path = LLM_PATH[sid]
    body = {"user_prompt": prompt[:500], "model_name": resolve_model(surface),
            "max_output_tokens": int(surface.get("max_tokens", 2048)), "web_search": True}
    if sid in ("chatgpt", "claude", "perplexity"):
        body["web_search_country_iso_code"] = "JP"
    if surface.get("system_message"):
        body["system_message"] = surface["system_message"]
    if sid == "perplexity":
        body.pop("web_search", None)          # Perplexity は常時ウェブ検索
    try:
        task = post(f"ai_optimization/{path}/llm_responses/live", [body])
    except RuntimeError as e:
        if "4050" in str(e) or "field" in str(e).lower() or "parameter" in str(e).lower():
            slim = {k: v for k, v in body.items()
                    if k in ("user_prompt", "model_name", "max_output_tokens")}
            if sid != "perplexity":
                slim["web_search"] = True
            task = post(f"ai_optimization/{path}/llm_responses/live", [slim])
        else:
            raise
    res = (task.get("result") or [{}])[0] or {}
    items = res.get("items") or []
    text, cites = "", []
    for it in items:
        if it.get("type") == "reasoning":
            continue
        for sec in it.get("sections") or []:
            text += (sec.get("text") or "") + "\n"
            _walk_refs(sec.get("annotations"), cites)
    fan = []
    for it in items:
        fan += it.get("fan_out_queries") or []
    return {"text": text.strip(), "citations": _dedup(cites), "fanout": fan,
            "model": res.get("model_name") or body["model_name"],
            "money_spent": res.get("money_spent"), "cost": float(task.get("cost") or 0)}


# ---- Google AI Overview / AIモード ----
def fetch_serp_ai(prompt: str, surface: dict) -> dict:
    cfg = load("settings")["serp"]
    if surface["id"] == "aimode":
        path = "serp/google/ai_mode/live/advanced"
        body = [{"keyword": prompt[:700], "language_code": cfg["language_code"],
                 "location_code": cfg["location_code"], "device": "desktop"}]
    else:
        path = "serp/google/organic/live/advanced"
        body = [{"keyword": prompt[:700], "language_code": cfg["language_code"],
                 "location_code": cfg["location_code"], "device": "desktop",
                 "load_async_ai_overview": True, "depth": 10}]
    task = post(path, body)
    res = (task.get("result") or [{}])[0] or {}
    items = res.get("items") or []
    text, cites, md, organic = "", [], "", []
    for it in items:
        t = str(it.get("type", ""))
        if t == "organic" and len(organic) < 10:
            organic.append({"rank": it.get("rank_absolute"), "domain": it.get("domain"),
                            "url": it.get("url"), "title": (it.get("title") or "")[:120]})
        if not t.startswith("ai_"):
            continue
        md = md or (it.get("markdown") or "")
        for el in (it.get("items") or [it]):
            text += (el.get("text") or "") + "\n"
        _walk_refs(it.get("references"), cites)
        _walk_refs(it.get("items"), cites)
    return {"text": text.strip(), "citations": _dedup(cites), "fanout": [], "markdown": md[:6000],
            "organic": organic, "item_types": res.get("item_types"), "cost": float(task.get("cost") or 0)}


class BudgetGuard:
    def __init__(self, cap_usd: float):
        self.cap = cap_usd

    def over(self) -> bool:
        with _LOCK:
            return self.cap > 0 and _COST["total"] >= self.cap


def one_call(job: dict) -> dict | None:
    """1セル分の実測。失敗しても None を返すだけで全体は止めない。"""
    p, s = job["p"], job["s"]
    if job["guard"].over():
        return None
    fn = fetch_serp_ai if s["provider"] == "serp" else fetch_llm
    for attempt in range(3):
        try:
            res = fn(p["text"], s)
            return {"date": job["day"], "prompt_id": p["id"], "surface": s["id"], **res}
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                note_error(f"{p['id']}/{s['id']}: {type(e).__name__}: {e}")
                print(f"  ! {p['id']}/{s['id']}: {e}", file=sys.stderr, flush=True)
                return None
            time.sleep(2 ** attempt * 1.5)
    return None


# ---- 標準キュー（app_data など）のポーリング ----
def post_and_wait(path_base: str, body: list, wait_sec: int = 600, poll: int = 15) -> list[dict]:
    """<path_base>/task_post → tasks_ready → task_get/advanced を待つ。結果 result 配列を返す。"""
    posted = requests.post(f"{DFS_BASE}/{path_base}/task_post", auth=_auth(), json=body, timeout=60).json()
    ids = []
    for t in posted.get("tasks") or []:
        _charge(t)
        if t.get("status_code") in (20000, 20100) and t.get("id"):
            ids.append(t["id"])
        else:
            note_error(f"{path_base} post: {t.get('status_code')} {t.get('status_message')}")
    results = []
    deadline = time.time() + wait_sec
    pending = set(ids)
    while pending and time.time() < deadline:
        time.sleep(poll)
        for tid in list(pending):
            try:
                js = get(f"{path_base}/task_get/advanced/{tid}")
                t = (js.get("tasks") or [{}])[0]
                if t.get("status_code") == 20000:
                    results.append(t)
                    pending.discard(tid)
                elif t.get("status_code") not in (40601, 40602, 20100):   # 40601/40602 = 未完了
                    note_error(f"{path_base} get {tid}: {t.get('status_code')} {t.get('status_message')}")
                    pending.discard(tid)
            except Exception as e:  # noqa: BLE001
                note_error(f"{path_base} get {tid}: {e}")
    if pending:
        note_error(f"{path_base}: {len(pending)} task(s) not finished in {wait_sec}s")
    return results
