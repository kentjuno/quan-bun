import base64, io, json, sys, os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def uri(path, maxw=None):
    im = Image.open(path).convert('RGBA')
    if maxw and im.width > maxw:
        im = im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=86, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
ic = lambda n: uri(os.path.join(R, 'public', 'icons', n + '.png'))
CUT = os.path.join(R, 'art', 'cut')
SPEC = [('hand-ladle-b', 'Tay B — vá ngang', {'sx': 40, 'sy': 24, 'size': 72, 'rise': 62}),
        ('hand-ladle-d', 'Tay D — vá cán dài', {'sx': 62, 'sy': 30, 'size': 84, 'rise': 54})]
hands = [{'label': lb, 'preset': pr, 'src': uri(os.path.join(CUT, n + '.png'), 520)}
         for n, lb, pr in SPEC if os.path.exists(os.path.join(CUT, n + '.png'))]
tpl = open(os.path.join(R, 'art', 'demo', 'pour.tpl.html'), encoding='utf-8').read()
out = (tpl.replace('__BOWL__', ic('pho-bowl')).replace('__NOODLE__', ic('pho-noodle'))
          .replace('__BROTH__', ic('nuoc-pho')).replace('__MEAT__', ic('bo-tai'))
          .replace('__STREAM__', uri(os.path.join(CUT, 'fx-stream.png'), 180))
          .replace('__SPLASH__', uri(os.path.join(CUT, 'fx-splash.png'), 300))
          .replace('__HAND0__', hands[0]['src'])
          .replace('__HANDS__', json.dumps(hands, ensure_ascii=False)))
dst = os.path.join(R, 'public', 'pour.html')
open(dst, 'w', encoding='utf-8').write(out)
print(dst, round(len(out)/1024), 'KB')
