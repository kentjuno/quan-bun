import base64, io, json, os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CUT = os.path.join(R, 'art', 'cut')
def uri(path, maxw=None):
    im = Image.open(path).convert('RGBA')
    if maxw and im.width > maxw:
        im = im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=80, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
has = lambda n: os.path.exists(os.path.join(CUT, n + '.png'))
cut = lambda n, w=440: uri(os.path.join(CUT, n + '.png'), w)

# spout = toạ độ MIỆNG VÁ trong ảnh (% rộng, % cao)
HSPEC = [('hand-ladle-b', 'Tay B — vá ngang',   [10, 44], {'size': 62, 'tilt': 26, 'lift': 13, 'offx': -4}),
         ('hand-ladle-d', 'Tay D — vá cán dài', [75, 92], {'size': 78, 'tilt': 30, 'lift': 13, 'offx': 4})]
hands = [{'label': lb, 'spout': sp, 'preset': pr, 'src': cut(n)} for n, lb, sp, pr in HSPEC if has(n)]

BSPEC = [('a', 'Tô A')]
bowls = [{'label': lb, 'dry': cut('bowl-dry-' + k, 470), 'wet': cut('bowl-wet-' + k, 470)}
         for k, lb in BSPEC if has('bowl-dry-' + k) and has('bowl-wet-' + k)]
if not bowls:   # chưa có tô style C -> tạm dùng icon cũ
    bowls = [{'label': 'Icon cũ', 'dry': uri(os.path.join(R,'public','icons','pho-bowl.png')),
              'wet': uri(os.path.join(R,'public','icons','pho-bowl.png'))}]

tpl = open(os.path.join(R, 'art', 'demo', 'pour.tpl.html'), encoding='utf-8').read()
out = (tpl.replace('__STREAM__', cut('fx-stream', 180)).replace('__SPLASH__', cut('fx-splash', 300))
          .replace('__HAND0__', '').replace('__DRY0__', '').replace('__WET0__', '')
          .replace('__HANDS__', json.dumps(hands, ensure_ascii=False))
          .replace('__BOWLS__', json.dumps(bowls, ensure_ascii=False)))
dst = os.path.join(R, 'public', 'pour.html')
open(dst, 'w', encoding='utf-8').write(out)
print(dst, round(len(out)/1024), 'KB', len(hands), 'hands', len(bowls), 'bowls')
