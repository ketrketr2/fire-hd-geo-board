#!/usr/bin/env python3
"""Kindle 語られ方ボード: パーツ結合 → plain.html（暗号化前の平文ボード）。"""
import glob
import json
import os

CB = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.environ.get('BOARD_DATA', f'{CB}/board_data.json'), encoding='utf-8'))
head = open(f'{CB}/part_head.html', encoding='utf-8').read()
js = '\n'.join(open(p, encoding='utf-8').read() for p in sorted(glob.glob(f'{CB}/part_js*.js')))
payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
html = head + '\n<script>\nwindow.BOARD_DATA=' + payload + ';\n</script>\n<script>\n' + js + '\n</script>\n</body>\n</html>\n'
out = os.environ.get('OUT', 'plain.html')
open(out, 'w', encoding='utf-8').write(html)
print(f'{out} {len(html.encode())/1024:.0f}KB (data {len(payload.encode())/1024:.0f}KB, js {len(js.encode())/1024:.0f}KB)')
