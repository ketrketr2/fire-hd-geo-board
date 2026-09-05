import json, time, sys, os
from pytrends.request import TrendReq
out = {"pulled_at": time.strftime("%Y-%m-%d %H:%M JST", time.gmtime(time.time()+9*3600)), "geo":"JP", "series":{}, "related":{}, "region":{}, "errors":[]}
pt = TrendReq(hl='ja-JP', tz=-540, timeout=(10,40))
def iot(key, kws, tf):
    for attempt in range(3):
        try:
            pt.build_payload(kws, timeframe=tf, geo='JP')
            df = pt.interest_over_time()
            if df is None or df.empty:
                raise RuntimeError("empty")
            out["series"][key] = {"keywords": kws, "timeframe": tf,
                "dates": [d.strftime("%Y-%m-%d") for d in df.index],
                "values": {k: [int(x) for x in df[k].tolist()] for k in kws}}
            print("ok", key, len(df)); return
        except Exception as e:
            print("retry", key, attempt, type(e).__name__, str(e)[:120]); time.sleep(20*(attempt+1))
    out["errors"].append(key)
iot("brands_12m", ["Fire TV Stick","Chromecast","Apple TV","TVer","スマートテレビ"], "today 12-m"); time.sleep(8)
iot("brands_5y", ["Fire TV Stick","Chromecast","ストリーミングデバイス","スマートテレビ","TVer"], "today 5-y"); time.sleep(8)
iot("models_12m", ["Fire TV Stick 4K","Fire TV Stick HD","Fire TV Cube","Fire TV Stick セール","ファイヤースティック"], "today 12-m"); time.sleep(8)
iot("channels_12m", ["テレビ youtube 見る方法","テレビ netflix","ストリーミングデバイス","テレビ tver","チューナーレステレビ"], "today 12-m"); time.sleep(8)
# related queries for Fire TV Stick
for attempt in range(3):
    try:
        pt.build_payload(["Fire TV Stick"], timeframe="today 12-m", geo="JP")
        rq = pt.related_queries()["Fire TV Stick"]
        out["related"]["Fire TV Stick"] = {
            "top": rq["top"].to_dict("records") if rq.get("top") is not None else [],
            "rising": rq["rising"].to_dict("records") if rq.get("rising") is not None else []}
        print("ok related", len(out["related"]["Fire TV Stick"]["top"]), len(out["related"]["Fire TV Stick"]["rising"])); break
    except Exception as e:
        print("retry related", attempt, type(e).__name__, str(e)[:120]); time.sleep(25*(attempt+1))
time.sleep(8)
for attempt in range(3):
    try:
        pt.build_payload(["Fire TV Stick"], timeframe="today 12-m", geo="JP")
        df = pt.interest_by_region(resolution="REGION", inc_low_vol=True)
        out["region"]["Fire TV Stick"] = {k:int(v) for k,v in df["Fire TV Stick"].to_dict().items()}
        print("ok region", len(out["region"]["Fire TV Stick"])); break
    except Exception as e:
        print("retry region", attempt, type(e).__name__, str(e)[:120]); time.sleep(25*(attempt+1))
time.sleep(8)
for attempt in range(3):
    try:
        pt.build_payload(["Fire TV Stick","Chromecast"], timeframe="today 12-m", geo="JP")
        df = pt.interest_by_region(resolution="REGION", inc_low_vol=True)
        out["region"]["Fire_vs_Chromecast"] = {k:{"Fire TV Stick":int(v["Fire TV Stick"]),"Chromecast":int(v["Chromecast"])} for k,v in df.to_dict("index").items()}
        print("ok region2"); break
    except Exception as e:
        print("retry region2", attempt, type(e).__name__, str(e)[:120]); time.sleep(25*(attempt+1))
import os
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"), exist_ok=True)
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "trends.json"),"w"), ensure_ascii=False, indent=1)
print("saved; errors:", out["errors"])
