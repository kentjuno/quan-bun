import base64, io, json, os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CUT = os.path.join(R, 'art', 'cut')
def uri(path, maxw=None):
    im = Image.open(path).convert('RGBA')
    if maxw and im.width > maxw:
        im = im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=66, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
has = lambda n: os.path.exists(os.path.join(CUT, n + '.png'))
cut = lambda n, w=380: uri(os.path.join(CUT, n + '.png'), w)

# spout = toạ độ MIỆNG VÁ trong ảnh (% rộng, % cao)
HSPEC = [('hand-ladle-d', 'Tay D — vá cán dài', [75, 92], {'size': 62, 'tilt': 30, 'lift': 0, 'dur': 1500, 'bw': 54}),
         ('hand-ladle-b', 'Tay B — vá ngang',   [10, 44], {'size': 62, 'tilt': 26, 'lift': 6,  'dur': 1500, 'bw': 54})]
hands = [{'label': lb, 'spout': sp, 'preset': pr, 'src': cut(n)} for n, lb, sp, pr in HSPEC if has(n)]

BSPEC = [
 ('pho-tai-nam', 'Phở tái nạm'), ('pho-dac-biet', 'Phở đặc biệt'), ('pho-tai-dap', 'Phở tái đập'),
 ('pho-suon-tai', 'Phở sườn tái'), ('bun-rieu-cua', 'Bún riêu cua'), ('banh-da-cua', 'Bánh đa cua'),
 ('bun-bo-hue', 'Bún bò Huế'), ('bun-ca-hai-phong', 'Bún cá Hải Phòng'), ('cha-ca-la-vong', 'Chả cá Lã Vọng'),
 ('bun-dau-mam-tom', 'Bún đậu mắm tôm'), ('banh-hoi-thit-heo', 'Bánh hỏi thịt heo'),
 ('bun-nem-cua-thit-nuong-tom-nuong', 'Bún nem cua'), ('bun-ga-nuong', 'Bún gà nướng'),
 ('bun-cha-ha-noi', 'Bún chả Hà Nội'), ('cha-gio-viet-nam', 'Chả giò'), ('goi-cuon-tom-thit', 'Gỏi cuốn'),
 ('chao-long', 'Cháo lòng'), ('chao-suon', 'Cháo sườn'),
]
bowls = [{'label': lb, 'dry': cut(k + '-dry', 300), 'wet': cut(k + '-wet', 300)}
         for k, lb in BSPEC if has(k + '-dry') and has(k + '-wet')]
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
