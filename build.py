#!/usr/bin/env python3
"""Genera el juego en un solo archivo (el-observador.html) a partir de index.html + css/ + js/.
Uso:  python3 build.py"""
import re, pathlib
root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text(encoding='utf8')

def css(m):
    return '<style>\n' + (root / m.group(1)).read_text(encoding='utf8') + '\n</style>'
def js(m):
    return '<script>\n' + (root / m.group(1)).read_text(encoding='utf8').replace('</script', '<\\/script') + '\n</script>'

html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
html = re.sub(r'<script src="(?!http)([^"]+)"></script>', js, html)
assert not re.search(r'<script src="http', html), 'quedó un script externo: el juego debe ser 100 % offline'
(root / 'el-observador.html').write_text(html, encoding='utf8')
print('el-observador.html generado:', len(html) // 1024, 'KB')
