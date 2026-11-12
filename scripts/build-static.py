#!/usr/bin/env python3
"""Build dist/pretty-dice-offline.html: index.html with three.js, cannon-es, the addons and the fonts
embedded as data: URLs, so it runs from a double-click (file://) with no network and no vendor/ folder.
Usage: python3 scripts/build-static.py            -> dist/pretty-dice-offline.html
       python3 scripts/build-static.py --artifact -> dist/pretty-dice-artifact.html (libraries from the jsDelivr/Google Fonts CDNs,
       static import map and no fetch probe, for hosts whose CSP only allows those CDNs, e.g. a claude.ai artifact)"""
import base64, json, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
v = root / 'vendor'
b64 = lambda data, mime: f"data:{mime};base64," + base64.b64encode(data).decode()
js = lambda p: b64(p.read_bytes(), 'text/javascript')

ARTIFACT = '--artifact' in sys.argv
def sounds_tag():   # every sample file as base64, keyed like sounds/ ("best/x.wav", "best/manifest.json"); index.html reads window.__SOUNDS before fetching
    d = root / 'sounds'; files = {}
    for sub in ('best', 'kenney'):
        for f in sorted((d / sub).glob('*')):
            if f.suffix in ('.wav', '.json'): files[f'{sub}/{f.name}'] = base64.b64encode(f.read_bytes()).decode()
    return '<script>window.__SOUNDS=' + json.dumps(files) + ';</script>\n'
html = (root / 'index.html').read_text()
m = re.search(r'<!--BOOTSTRAP-->.*?<!--/BOOTSTRAP-->', html, re.S)
if not m: sys.exit('bootstrap markers not found in index.html')

if ARTIFACT:
    V = 'https://cdn.jsdelivr.net/npm/three@0.160.0/'
    cdn = {'three': V + 'build/three.module.js', 'cannon-es': 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js', 'three/addons/': V + 'examples/jsm/'}
    fl = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Inter:wght@400;500;600;800&family=Uncial+Antiqua&family=Metamorphous&display=swap'
    out = html.replace(m.group(0), '<script type="importmap">' + json.dumps({'imports': cdn}) + '</script>\n<link rel="stylesheet" href="' + fl + '">\n' + sounds_tag())
    out = out.replace('<script type="text/plain" id="main-src">', '<script type="module">')
    (root / 'dist').mkdir(exist_ok=True)
    p = root / 'dist/pretty-dice-artifact.html'; p.write_text(out); print(f'wrote {p} ({p.stat().st_size/1e6:.2f} MB)'); sys.exit(0)

imports = {
    'three': js(v / 'three/build/three.module.js'),
    'cannon-es': js(v / 'cannon-es/dist/cannon-es.js'),
}
addons = v / 'three/examples/jsm'
for rel in ['environments/RoomEnvironment.js', 'loaders/OBJLoader.js', 'loaders/STLLoader.js', 'utils/BufferGeometryUtils.js']:
    imports['three/addons/' + rel] = js(addons / rel)
# GLTFLoader imports BufferGeometryUtils relatively, which cannot resolve from a data: URL; point it at the import map instead
gltf = (addons / 'loaders/GLTFLoader.js').read_text()
assert "'../utils/BufferGeometryUtils.js'" in gltf
imports['three/addons/loaders/GLTFLoader.js'] = b64(gltf.replace("'../utils/BufferGeometryUtils.js'", "'three/addons/utils/BufferGeometryUtils.js'").encode(), 'text/javascript')

fonts = (v / 'fonts/fonts.css').read_text()
fonts = re.sub(r'url\(([^)]+\.woff2)\)', lambda f: 'url(' + b64((v / 'fonts' / f.group(1)).read_bytes(), 'font/woff2') + ')', fonts)

static = ('<script type="importmap">' + json.dumps({'imports': imports}) + '</script>\n<style>' + fonts + '</style>\n' + sounds_tag())
out = html.replace(m.group(0), static)
assert out.count('<script type="text/plain" id="main-src">') == 1
out = out.replace('<script type="text/plain" id="main-src">', '<script type="module">')
(root / 'dist').mkdir(exist_ok=True)
p = root / 'dist/pretty-dice-offline.html'
p.write_text(out)
print(f'wrote {p} ({p.stat().st_size/1e6:.1f} MB)')
