# ART PIPELINE — lớp, animation, danh sách asset cần gen (Quầy POV)

Đi kèm `art/ART-BIBLE.md` (phong cách C: ký hoạ màu nước, nét mực nâu `#3b2a1e`, viền trắng sticker) và `docs/PLAN-CORE.md` (bước 3).
Concept duyệt 14/09: `art/ui-concepts/ui-pov-portrait.png` (bố cục tổng), `ui-pov-closeup.png` (tủ prep + phiếu), `ui-map-notebook.png` (bản đồ sổ tay).
Chữ trong 3 tấm concept là **rác do AI bịa** — mọi chữ trong game do code vẽ bằng font chữ tay, lấy tên từ `sim-data.js`.

---

## 1. Chia lớp (z-order) — màn Quầy POV

Màn chơi = 7 lớp DOM chồng nhau, mỗi lớp một ảnh hoặc một nhóm sprite. Toạ độ theo **phần trăm** khung (`src/data/counter-layout.js`), nên một bộ ảnh chạy được cả dọc lẫn ngang.

| z | Lớp | Nội dung | Ảnh | Parallax khi kéo |
|---|---|---|---|---|
| 0 | `bg` | Tường gạch men, sàn, kệ chén phía sau, cửa sổ — KHÔNG có gì bấm được | 1 ảnh nền full-bleed (dọc + ngang) | 0.02 (gần như đứng yên) |
| 1 | `far` | Nồi trụng · bồn xả · dãy nồi nước lèo · chảo chiên · lò vi sóng | 5 ảnh rời, nền trong | 0.05 |
| 2 | `far-dyn` | Rọ sợi trong nồi, tô nóng trữ, nồi đang đun, đồ trong chảo/lò | sprite item (đã có 81 icon) | 0.05 |
| 3 | `mid` | Thân tủ prep (inox, cửa, khay GN rỗng) | 1 ảnh | 0.10 |
| 4 | `mid-dyn` | Đồ trong từng khay + nhãn tên (chữ do code vẽ) | sprite item | 0.10 |
| 5 | `near` | Mặt thớt inox, chồng tô, bin sợi, thùng rác | 1 ảnh | 0.16 |
| 6 | `near-dyn` | Tô đang ráp (tô + các lớp topping), thớt đang làm, bàn tay | sprite + ảnh tay | 0.16 |
| 7 | `ui` | Phiếu khách, nút, thông báo, thanh kiên nhẫn | SVG/CSS + ảnh giấy | 0 |

**Vùng thả (hitbox)** là `div` trong suốt đặt theo toạ độ %, KHÔNG cắt theo hình — dễ trúng ngón tay hơn. Ảnh chỉ để nhìn.
`counter-layout.js` dạng:
```js
export const LAYOUT = {
  portrait: { pot: { x: 4, y: 13, w: 52, h: 20 }, baskets: [{x:7,y:17,w:13,h:12}, …], sink: {…}, burner: {…},
              prepPans: { x: 4, y: 40, w: 92, h: 16, cols: 6, rows: 2 }, slots: [{…},{…}], trash: {…}, tickets: { x: 4, y: 2, w: 92, h: 9 } },
  landscape: { … },
};
```

---

## 2. Animation — cái gì động, làm bằng gì, bao lâu

Nguyên tắc: **không dùng sprite-sheet nhân vật** (đắt, khó gen đồng nhất). Mọi chuyển động = CSS transform trên sprite tĩnh + vài ảnh overlay lặp. Tất cả ≤ 8 KB/cái.

| # | Animation | Khi nào | Cách làm | Thời lượng |
|---|---|---|---|---|
| A1 | Hơi nước nồi | luôn, khi nồi bật | 1 PNG khói (512²) × 3 bản sao, `translateY(-24px)` + `opacity 1→0` + `scaleX(1.15)`, lệch pha | 2.2 s loop |
| A2 | Mặt nước sôi | luôn | PNG bọt trong suốt, `background-position` chạy + `opacity` nhấp nháy nhẹ | 1.6 s loop |
| A3 | Thả rọ vô nồi | drop vào `pot` | sprite rọ `translateY(0→+18px)` ease-in 160 ms, kèm A4 | 0.16 s |
| A4 | Nước bắn | cùng A3 | PNG splash, `scale(.6→1.3)` + fade | 0.35 s |
| A5 | Rọ đang trụng | `left > 0` | rọ `translateY` ±3px sin, vòng tròn tiến độ quanh rọ | loop |
| A6 | Rọ xong | `left = 0` | viền vàng nhấp nháy + nảy nhẹ `scale 1→1.06` | 0.5 s ×2 |
| A7 | Vật bay (chạm đôi) | double-tap | ghost `translate` theo bezier `.3,.7,.3,1` + `scale .85` | 0.21 s (đã có) |
| A8 | Topping rơi vô tô | drop vào `slot` | sprite từ vị trí thả → tâm tô theo cung parabol, xoay 12°, đáp `scale 1.15→1` | 0.28 s |
| A9 | Lớp trong tô hiện | sau A8 | lớp mới `opacity 0→1` + `translateY(-6px→0)` | 0.18 s |
| A10 | Chan nước | drop `broth`/`ready` | **ảnh bàn tay cầm vá** trượt vào từ mép dưới, nghiêng 25°, dòng nước (PNG) `scaleY 0→1`, tô sáng lên | 0.8 s |
| A11 | Tô đủ bước | `fits` = đủ | tô nảy `scale` 1→1.05 loop + quầng sáng giấy | loop tới khi giao |
| A12 | Giao tô lên phiếu | drop vào `ticket` | tô bay lên phiếu, phiếu **xé rời** (`rotate 6° + translateY(-120%)` + fade), dấu mộc chất lượng đóng xuống (`scale 2→1`, xoay −8°) | 0.55 s |
| A13 | Phiếu sắp hết giờ | patience < 25 % | phiếu rung `translateX ±2px` 3 nhịp mỗi 2 s, thanh đỏ | loop |
| A14 | Khách bỏ đi | expire | phiếu trôi xuống + xám hoá | 0.5 s |
| A15 | Chiên xèo | `fryer.left > 0` | PNG bọt dầu nhỏ nhấp nháy + rung chảo 1px | loop |
| A16 | Lò vi sóng chạy | `microwave.left > 0` | ô cửa sáng vàng nhấp nháy 0.9 s | loop |
| A17 | Dao cắt trên thớt | `board.left > 0` | PNG dao `rotate -25°↔0` 2 nhịp/s + vụn bay | loop |
| A18 | Nồi nước đang đun | `burner.pot.left > 0` | A1 nhỏ + viền nồi ấm dần (filter hue nhẹ) | loop |
| A19 | Sợi hư | spoiled | sprite xám hoá + dấu ✖ mực đỏ vẽ nét | 0.4 s |
| A20 | Vào màn | start | ba lớp far/mid/near trượt lên lệch pha (0 / 60 / 120 ms) | 0.5 s |

Tất cả bọc trong `@media (prefers-reduced-motion: reduce)` → tắt A1/A2/A5/A15–A18.

---

## 3. Danh sách asset cần GEN (Flow) — 41 ảnh

Quy ước: nền **magenta `#FF00FF`** để cắt bằng `scripts/process_icons.py`, trừ nhóm BG (nền đầy đủ).
Đặt ở `art/raw/<nhóm>/`, xử lý ra `public/art/<nhóm>/`.

### 3.1 Nền (2 ảnh, KHÔNG magenta)
| file | tỉ lệ | nội dung |
|---|---|---|
| `bg-counter-portrait.png` | 9:16 | Tường gạch men xanh ngọc, kệ chén phía sau, cửa sổ mờ, sàn gạch bông — **trống ở giữa** để đặt trạm, không vẽ nồi/tủ |
| `bg-counter-landscape.png` | 16:9 | như trên, bố cục ngang |

### 3.2 Trạm (7 ảnh, magenta)
`st-pot.png` (nồi trụng inox 3 rọ rỗng, nhìn chéo từ trên) · `st-sink.png` (bồn xả nước lạnh) · `st-burner.png` (bếp 2 lò + nồi nhỏ rỗng) · `st-fryer.png` (chảo chiên ngập dầu) · `st-microwave.png` (lò vi sóng nhỏ) · `st-preptable.png` (tủ lạnh prep, **khay GN rỗng**, 2 hàng 6 cột, cửa dưới) · `st-worktop.png` (mặt thớt inox + thớt nhựa trắng).

### 3.3 Bàn tay (4 ảnh, magenta) — làm POV thật
`hand-empty.png` · `hand-ladle.png` (cầm vá) · `hand-chopsticks.png` (cầm đũa) · `hand-basket.png` (cầm rọ). Góc: từ mép dưới màn hình chếch lên, cổ tay áo xám.

### 3.4 Hiệu ứng (6 ảnh, magenta hoặc alpha)
`fx-steam.png` (512², khói mềm) · `fx-splash.png` · `fx-bubbles.png` (mặt nước sôi, tile ngang) · `fx-oil-bubbles.png` · `fx-pour.png` (dòng nước lèo đổ) · `fx-chop.png` (dao + vụn).

### 3.5 Mặt khách (14 ảnh, magenta, vuông 512²)
6 khách quen theo `sketch` trong `src/data/customers.js`: `cus-cau-hai` (áo sơ mi xắn tay, tờ báo) · `cus-di-ba` (khăn rằn, giỏ chợ) · `cus-thim-bay` (nón lá) · `cus-chu-tu` (kính lão) · `cus-ut-muoi` (trẻ, tai nghe) · `cus-ong-nam` (mũ bảo hiểm).
8 khách lạ: `cus-x1..x8` (cô công sở, anh áo đỏ, bác gái, học sinh, chú xe ôm, du khách, ông già, chị bầu).
Chỉ **chân dung vai trở lên**, để dán lên phiếu.

### 3.6 UI giấy (8 ảnh, magenta)
`ui-ticket.png` (tờ phiếu giấy + kẹp bướm) · `ui-panel.png` (khung giấy có băng keo) · `ui-btn.png` (nút viền mực) · `ui-tape.png` · `ui-star.png` · `ui-lock.png` · `ui-badge.png` (huy hiệu tròn cho world) · `ui-stamp.png` (dấu mộc "HOÀN HẢO").

### 3.7 Icon còn thiếu (4 ảnh) — theo bible §3
`dia-dai`, `cha-gio`, `tom-luoc`, `banh-trang` (81 icon đã có, 57 item cần dùng đủ trừ 4 cái này).

**Tổng: 41 ảnh.** Flow ~60–90 s/ảnh → chạy 5 mẻ, mỗi mẻ 8–9 ảnh, khoảng 1 giờ tổng.

---

## 4. Font & chữ
Chữ tay: **Patrick Hand** (Google Fonts, có tiếng Việt). Tiêu đề/bảng hiệu cỡ lớn; số liệu (tiền, giây) dùng `Be Vietnam Pro` đang có để không lem.
Artifact claude.ai chỉ cho `fonts.googleapis.com`; bản Pages nhúng `.woff2` vào `public/fonts/` để chạy offline.

## 5. Ngân sách & kiểm tra
- Tổng ảnh sau xử lý phải < 3 MB (nền 2×250 KB, trạm 7×80 KB, còn lại < 40 KB/ảnh) để PWA vẫn cài offline nhanh.
- Mỗi mẻ gen xong: chạy `process_icons.py`, ghép lên màn thật, chụp 1 ảnh gửi Kent duyệt **trước khi gen mẻ sau**.
- Kiểm tra bắt buộc: icon đọc được ở 48 px (bible §2), nền không nuốt chữ trắng, hitbox vẫn trúng khi đổi từ dọc sang ngang.

---

## 6. A10 — chan nước: đã làm xong, số đã chốt (14/09)

Demo: `art/demo/pour.html` (dựng từ `pour.tpl.html` + `build_pour_demo.py`). Số Kent duyệt nằm trong `src/data/counter-layout.js`.

| Thông số | Giá trị | Ghi chú |
|---|---|---|
| Tổng thời gian | 1500 ms | chậm hơn dự kiến 0.8 s — Kent thấy 0.8 s gấp quá |
| Độ nghiêng vá | 30° | |
| Cỡ tay / cỡ tô | 62% / 54% bề ngang sân khấu | |
| Vá cao hơn miệng tô | 0% | vá gần như chạm vành |
| Ảnh tay | `hand-ladle-d` (vá cán dài) | `hand-ladle-b` giữ làm dự phòng |

**Ba lỗi đã sửa, đừng lặp lại:**

1. **Đừng dùng icon món làm lớp trong tô.** Icon là vật trên kệ, đặt chồng lên nhau trong tô thì lệch cỡ và khác hệ vẽ. Mỗi món có **2 ảnh trạng thái** (`<dish>-dry` / `<dish>-wet`), chan xong thì crossfade — không xếp lớp.
2. **Đừng canh vị trí dòng nước bằng tay.** Mỗi ảnh tay ghi sẵn `spout` (toạ độ miệng vá, % của ảnh); code giải ngược ra chỗ tay phải đứng (đã tính góc xoay) để nước rơi **đúng tâm tô**. Đổi tay/cỡ/góc vẫn đúng.
3. **`easing` trong options của Web Animations bóp méo cả timeline**, không phải từng đoạn — làm tay vọt lên rồi tụt xuống trước khi nước kịp chảy. Luôn để `options.easing = 'linear'`, easing gắn vào từng keyframe.

**Mốc hình ảnh** tính theo % chiều cao của ảnh tô (không phải sân khấu): miệng tô `0.13`, mặt nước `0.30`, dòng nước bắt đầu thấp hơn miệng vá `0.06`. Nước chảy tới mặt nước rồi toé ở đó.

### Ảnh đã có
`hand-ladle-b`, `hand-ladle-d`, `hand-bowl` (bưng tô), `fx-stream`, `fx-splash` — trong `art/cut/`, gốc trong `art/raw/`.
Cắt nền magenta bằng `scripts/cut_magenta.py <thư mục raw>`.

---

## 7. Toàn bộ asset đã gen xong (14/09)

| Nhóm | Số ảnh | Nơi để | Ghi chú |
|---|---|---|---|
| Tô/mẹt/dĩa 18 món × 2 trạng thái | 36 | `art/cut/<dish>-dry.png`, `-wet.png` | mẻ v2; mẻ v1 giữ ở `art/raw/dishes-v1` + `art/cut-v1` |
| Bàn tay | 3 | `hand-ladle-b/d`, `hand-bowl`, thêm `hand-chopsticks`, `hand-basket` | `spout` ghi trong `counter-layout.js` |
| Hiệu ứng | 6 | `fx-stream`, `fx-splash`, `fx-steam`, `fx-chop`, `fx-bubbles`, `fx-oil-bubbles`, `fx-sparkle`, `fx-splash-water` | |
| Mặt khách | 14 | `cus-*` | 6 khách quen khớp `sketch` trong `customers.js`, 8 khách lạ |
| UI giấy | 8 | `ui-*` | giấy để TRỐNG, chữ do code vẽ bằng font tay |
| Icon bổ sung | 4 | `dia-dai`, `cha-gio`, `tom-luoc`, `banh-trang` | lấp 4 chỗ trống của bộ 81 icon |

### Prompt đã dùng (giữ nguyên cho mọi đợt gen sau)
Nét: *ink line art with warm marker and watercolor wash, brown ink outline, hand-drawn illustration*.
Nền: *flat solid MAGENTA #FF00FF*, cắt bằng `scripts/cut_magenta.py <thư mục raw>`.

### Bốn cái bẫy của Flow — đã dính, đừng dính lại
1. **Bảo "giấy trắng trơn" thì nó vẫn vẽ hình lên** (con cú, dây lá, cây nấm). Phải liệt kê thẳng từng thứ cấm: *no bird, no animal, no flower, no leaf, no drawing, no pattern, nothing at all on it*.
2. **Khói/hơi nước hay ra màu hồng** → lẫn với nền magenta, cắt xong còn vệt hồng. Phải ép *PURE WHITE and pale grey only, never pink, never magenta*. `scripts/_normalize.py` có hàm `depink()` quét 30% phía trên ảnh để dọn nốt.
3. **Nền không phải lúc nào cũng magenta chuẩn** (có tấm ra trắng, có tấm ra tím) → cắt thất bại, ảnh giữ nguyên khung. Luôn soi contact sheet trước khi dùng.
4. **Tả "dải ngang" thì nó vẽ luôn cái khung chữ nhật.** Phải nói *floating free with nothing around them, no rim, no rectangle*.

### Quy tắc 2 trạng thái
Mỗi món có ĐÚNG MỘT cái tô, xuất hiện y hệt ở cả `-dry` và `-wet` → chan nước chỉ crossfade phần trong tô, cái tô đứng yên. Prompt phải tả cái tô giống hệt nhau ở hai lần gen, và chặn *NO chopsticks, NO spoon, no extra side dishes*.

## 8. Tô có 4 bậc — hết kiểu đè icon lên ảnh tô (16/09)

Kent báo: *"cái tô bỏ vô đúng đẹp nhưng khi phở vô thì nó ra z"* — màn lắp tô đang vẽ
ảnh tô rồi **dán icon rời đè lên**, ra cục sợi bé tí lơ lửng giữa tô to. Bỏ hẳn cách đó.

Mỗi món giờ có tối đa **4 ảnh, mỗi ảnh là MỘT bức liền**:

| Bậc | File | Là gì |
|---|---|---|
| `s0`  | `<dish>-s0.webp`  | vỏ trống, mới lấy tô/dĩa ra (13 món) |
| `dry` | `<dish>-dry.webp` | đã có đế: bánh phở / bún / bánh tráng (18 món) |
| `top` | `<dish>-top.webp` | đủ topping, chưa chan nước (10 món nước) |
| `wet` | `<dish>-wet.webp` | đã chan nước / xong tô (18 món) |

`dishStage(placed, full)` trong `src/game/art.js` chọn bậc **theo token đã bỏ vào**, không đếm
bước — vì mỗi level đơn giản hoá một kiểu nên số bước không đáng tin.
Món thiếu ảnh bậc nào thì `dishArtAt()` lùi về bậc có sẵn (mẹt/dĩa: `s0` → `dry`; món khô: `top` → `wet`).

### Cách gen thêm bậc: **sửa ảnh cũ, đừng gen lại từ đầu**
flowkit có `/api/flow/upload-image` → `media_id`, rồi `/api/flow/edit-image`
(`prompt`, `source_media_id`, `project_id`, `aspect_ratio`). Upload chính cái PNG raw cũ
(nền magenta còn nguyên) rồi bảo nó **đổi ĐÚNG MỘT thứ**:
*"Keep the EXACT same bowl … same flat solid MAGENTA background. Change ONE thing only: …"*.
Cái tô giữ nguyên gần như tuyệt đối — đúng thứ cần để 4 bậc chồng lên nhau không giật.
Gen xong: `scripts\cut_magenta.py art\raw\stages` → resize 300px → `.webp` vào `public/art`.

## 9. Tạm đồ là object riêng, không vẽ dính trong nền (16/09)

Kent: *"chồng tô phở nên là 1 object riêng, cái sợi phở bún cũng vậy, khi mà kéo nó đi thì nó đi theo con trỏ."*

Khuôn làm, áp cho mọi trạm sau này:

1. **Xoá món đó khỏi `scene.webp`** bằng `edit-image` trên `art/raw/scene/scene-c.png`:
   *"Keep the EXACT same kitchen picture … Change TWO things only: remove …"*.
   Gen 3 bản rồi so `art/raw/scene/scene-strip*.png`, chọn bản ít trôi bố cục nhất.
   **Bố cục có trôi nhẹ ở nửa dưới** — luôn vẽ khung ZONES đè lên so trước khi thay.
2. **Cắt sprite từ chính `scene-c.png`** (crop đúng vùng → pad nền magenta → `edit-image`
   *"… background must be a flat solid MAGENTA … only that one thing floating on it"*).
   Cắt từ tranh gốc chứ đừng gen mới — cùng nét, cùng màu, cùng góc, khớp ngay.
3. **Khai báo trong `STATION_ART`** (`src/game/art.js`), key là token của món.
   `pov.js` tự vẽ `.pv-obj` đầy ô; token nào chưa có sprite thì quay về icon như cũ.
4. **Icon nhỏ vẫn giữ, nhưng ẩn** trong `<i class="pv-ghosticon">` — đó là thứ bay theo ngón tay
   khi kéo (kéo cả chồng tô thì vô lý; kéo ra MỘT cái tô mới đúng).

### Cạm: đừng đặt tên class `.pv-st`
`.pv-st` đã dùng cho chảo chiên / lò vi sóng từ trước. Sprite trạm dùng `.pv-obj` / `.pv-objimg`.
Lần đầu tui đặt trùng tên → CSS không ăn, sprite phình ra full màn hình.

### Đã tách xong (cập nhật khi rải thêm)

| Trạm | Sprite | Trạng thái |
|---|---|---|
| Chồng tô | `st-bowl-stack.webp` | 1 |
| Khay sợi | `st-noodle-tray.webp` | 1 |
| Rổ trụng ×3 | `st-basket.webp`, `st-basket-noodle.webp` | rỗng / có sợi; nóng · xả lạnh · hư là `drop-shadow` đổi màu |

Còn lại: khay topping, thớt, chảo chiên, lò vi sóng, kệ nước.

### Bậy thứ hai: **xoá đồ khỏi nền thì ô cũ không còn đúng nữa**
Ô `pot` cũ (x5 y23.5 w33 h21) bao cả viền ngoài nồi — hồi đó không sao vì rổ vẽ sẵn trong tranh.
Khi rổ thành sprite, nó căn theo ô → trôi ra ngoài nồi, tụt xuống mặt bàn.
Bóp lại còn `x9.5 y18 w23 h24` (lòng nồi + chừa chỗ quai nhô trên vành) là vừa.
**Sau mỗi lần tách một trạm, kiểm lại ô của trạm đó.**

### Bảng trạm (cập nhật 16/09)

| Trạm | Sprite | Ghi chú |
|---|---|---|
| Chồng tô | `st-bowl-stack.webp` | dùng cho `pho-bowl` `soup-bowl` `dry-bowl` `extra-bowl` |
| Khay sợi | `st-noodle-tray.webp` | dùng cho `pho-noodle` `bun` `bun-to` `banh-da` |
| Rổ trụng ×3 | `st-basket.webp` / `st-basket-noodle.webp` | nóng · xả lạnh · hư = đổi màu `drop-shadow` |
| Nồi nước trên bếp | `st-soup-pot.webp` | nồi cũ đã xoá khỏi mặt bếp trong tranh |
| Chảo chiên | `st-fryer.webp` | đứng đầu phải mặt bếp |
| Lò vi sóng | `st-microwave.webp` | kệ tường trên bếp |

**Không tách** (cố ý): mẹt / dĩa / bánh tráng vẫn dùng icon — vẽ chồng tô cho cái mẹt thì sai hơn là không vẽ.
**Thớt** cũng không tách: hai khay trắng vẽ sẵn ở góc dưới CHÍNH LÀ cái thớt; đắp thêm thớt gỗ lên là nhân đôi đồ vật.
**Khay topping** cũng không: các khay GN trong tranh đang TRỐNG, icon chính là đồ nằm trong khay — không trùng gì cả.

### Bậy thứ ba: helper định nghĩa trong `build()` nhưng gọi trong `render()`
`objImg()` tui đặt trong `build()`, rồi dùng lại ở `render()` cho thớt/nồi → `ReferenceError`
ngay lần vẽ lại đầu tiên. **83 test vẫn pass** vì test không dựng DOM của POV.
Helper dùng ở cả hai chỗ thì đặt ở module scope, cạnh `img()`.
Sau mỗi lần đổi `pov.js`: mở bản live, chạy `pov.render()` và soi console — test không bắt giúm.

### Dải khay topping: không phải tách, mà là căn

Kent: *"Xử lý được chỗ này thì hay"* — đồ topping nằm **trên vành khay** chứ không trong lòng,
cỡ to nhỏ lộn xộn, nhãn "Ngò rí + ngò gai" tràn sang khay bên cạnh.
Đây KHÔNG phải lỗi nhân đôi đồ vật (khay trong tranh đang trống) mà là lỗi căn chỉnh:

1. **Bề ngang `.pv-pan` phải là `1/PAN_COLS`**, không được ước lượng.
   Cũ đặt `13%` trong khi tranh có 9 khay (11.1%) → đến khay thứ 5 lệch hẳn một khay.
2. **Ô `prep` phải bám miệng khay**, không phải cả dải inox: `x7 y44 w88 h5.4`.
3. Đồ trong khay: `position:absolute; top:11%; height:58%` — căn theo Ô chứ không flex-center,
   vì flex-center với nội dung cao hơn ô thì nó tràn đều hai đầu → lòi lên trên vành.
4. Nhãn xuống mặt bàn dưới khay, xuống dòng trong bề ngang khay của nó.
   **Không cắt cụt bằng `text-overflow: ellipsis`** — game này là để nhớ tên nguyên liệu.

Cách dò: bắt `pov.render()` trên bản live rồi đo `getBoundingClientRect()` của `.pv-pan`
quy ra % của `.pv-stage`, so với vị trí khay đọc từ lưới % đè lên `scene.webp`. Nhanh hơn đoán nhiều.

### Bậy thứ tư (cái này mới là gốc): **tranh có chiều sâu, đừng chia đều**

Tui sửa dải khay hai lần vẫn lệch, vì cả hai lần đều **chia đều bề ngang** (13% rồi 11.1%).
Đo thật thì khay không đều: **khay đầu 12.8%, khay cuối 7.6%** — vì tranh vẽ có chiều sâu,
cái gần thì to, cái xa thì nhỏ. Chia đều kiểu gì cũng lệch dần, đến khay 7–8 là 3.5%.

Giải pháp: `PANS[]` trong `counter-layout.js` giữ toạ độ **từng khay**,
`scripts/measure_pans.py` đo thẳng từ `scene.webp` (dò vạch mực giữa hai khay).
Đổi tranh nền → chạy lại script, dán block mới vào.

**Cách nghiệm thu (đừng nhìn bằng mắt):** đo `getBoundingClientRect()` của từng `.pv-pan`
quy ra % của `.pv-scene`, trừ với vạch do script đo — phải ra `dL = dR = 0.0`.
Hai lần trước tui nhìn screenshot thấy "đẹp rồi" trong khi thực tế lệch 3%.

**Luật chung:** bất cứ thứ gì lặp lại trên tranh nền (dải khay, hàng bếp, chỗ tô)
đều phải có toạ độ riêng từng cái, không được `flex` chia đều.

## 10. Dải khay topping: nướng đồ vào khay luôn (17/09)

Ý của Kent: *"generate hình từng khay luôn, mỗi khay 1 item"*. Đúng, và nó gỡ luôn hai thứ:

**Lỗi thật sự tìm ra khi đếm để chuẩn bị gen:** tranh có **9 khay** nhưng thế giới
Hải Phòng cần **14 món** — 6 món cuối đang chồng hết lên khay số 9.
Bám theo khay vẽ trong tranh thì không bao giờ sửa được, vì khay là của tranh.

**Cách làm:**
1. Xoá cả dải khay khỏi tranh → mặt bàn trơn (`scene-strip5-*`).
2. Mỗi món một ảnh `public/art/pan/<token>.webp` = **khay + đồ nằm trong khay**,
   tất cả nướng từ CÙNG một cái khay gốc → hình dạng, góc, nét giống hệt.
3. `pov.js` xếp bao nhiêu khay cũng được, chia đều cả dải — **giờ chia đều là đúng**,
   vì khay do code vẽ chứ không còn là vật trong tranh có chiều sâu.

### Bậy: **ảnh gốc có gì thì Flow giữ nguyên cái đó**
Mở đầu tui lấy mẫu là một khay cắt thẳng từ tranh — mà cái crop đó **dính một mép khay
bên cạnh**. Thế là cả loạt ảnh đều có mẩu khay thừa ở rìa, xếp thành hàng thì lồm chồm.
Lọc "chỉ giữ mảng lớn nhất" **không cứu được** vì mẩu thừa dính liền với khay chính.
Phải làm **một cái khay mẫu sạch** trước (`art/raw/scene/pan-seed.png`: khay trống, đứng
một mình), rồi mới nướng 50 món từ nó. Prompt phải nói thẳng:
*"ONLY ONE tray … no sliver or edge of another tray anywhere"*.

**Quy trình:** `scripts/pans_to_webp.py` — cắt nền magenta → cắt sát mép → phóng cho bề ngang
bằng nhau → dán vào khung cố định 320×250, căn đáy. Mô tả từng món ở
`art/raw/stages/_pan_desc.json` — gen lại thì sửa ở đó.

### Bậy chí mạng: `open(p,"w").write(open(p).read())` làm RỖNG file
Python mở file chế độ `"w"` là **cắt trắng ngay lập tức**, rồi mới đọc → đọc ra chuỗi rỗng.
Tui dùng kiểu này để tăng số phiên bản `public/sw.js`, nên **từ v19 đến v30 file sw.js
bị rỗng và đã deploy như vậy** — game vẫn chạy (không có service worker thì chỉ mất
phần cache offline), nhưng mọi con số "sw vNN" tui báo trong khoảng đó đều vô nghĩa.
Khôi phục từ `612c97fd`, đặt lại v31.

**Luật:** đọc xong, đóng, RỒI mới mở ghi:
```python
s = io.open(p, encoding='utf-8').read()
s = s.replace(...)
with io.open(p, 'w', encoding='utf-8') as f: f.write(s)
```
Và sau mỗi lần sửa file quan trọng, đọc lại kiểm độ dài — `git status` không cứu được
vì file rỗng vẫn là một thay đổi hợp lệ, commit trôi qua bình thường.

## 11. Tô đổi theo từng món bỏ vào (17/09)

89 ảnh ở `public/art/step/<dish>-k<N>.webp`, gen bằng **chuỗi**: ảnh bước k nướng từ chính
ảnh bước k−1, prompt *"giữ nguyên mọi thứ đã có trong tô, chỉ THÊM …"*.
Mô tả từng món ở `art/raw/stages/_step_desc.json`; script gen nằm trong lịch sử git.

### Ba cái bậy của cách này

**1. Đứt chuỗi là sai hết phía sau.** Một lần 502 ở bước 2 thì bước 3 nướng từ bước 1 →
tô thiếu nạm nhưng tên file vẫn ghi là đã có. Đã dính 2 lần.
Cách chữa: có **thử lại 4 lần**, và nếu vẫn hỏng thì **xoá cả chuỗi của món đó**
rồi gen lại từ đầu — tuyệt đối không vá giữa.

**2. `D.recipes` KHÔNG phải công thức thật.** Nó gộp "lấy tô" và "bỏ sợi" thành một bước
`base-ready`, còn `recipeFor(dish)` tách ra hai. Nên:
- Ảnh đánh số theo công thức gọn → tra cứu phải lùi 1: `k = placed - 1`.
- Kiểm "level có chạy đủ công thức không" phải so với `recipeFor(dish)`; so với `D.recipes`
  thì level nào cũng bị coi là đã bớt bước → tính năng không bao giờ bật.

**3. Level huấn luyện bớt món.** Vẽ tô theo số bước ở những level đó sẽ hiện cả món
level cố tình chưa dạy — dạy sai ở đúng chỗ nguy hiểm nhất. `fullRecipe()` chặn việc đó,
level đã đơn giản hoá quay về thang 4 bậc `s0 → dry → top → wet`.

## 12. Xả lạnh ở bồn + thùng rác (18/09)

Kent báo: *"lúc xả lạnh nó vẫn ở nồi trụng"*. Đúng: `toSink()` giữ rổ trong `C.baskets[i]`
và chỉ đổi `state='rinsing'`, mà `pvBaskets` vẽ theo `C.baskets` → rổ vẫn nằm trong nồi.

Sửa ở **lớp vẽ**, không đụng luật chơi: rổ có `state` là `rinsing`/`rinsed` thì
vẽ trong `#pvSink`, còn chỗ của nó trong nồi để mờ (`.pv-basket.away`) và không nhận thả.
Đang xả thì có `fx-splash-water`; xả xong đổi nhãn "đã xả lạnh" và kéo được.

**Bậy:** `fx-splash-water` vẽ màu trắng, đặt lên cái bồn sáng thì **không thấy gì**.
Phải nhuộm: `filter: hue-rotate(175deg) saturate(2.2)`. Hiệu ứng trắng trên nền sáng
lúc nào cũng phải kiểm bằng mắt, đừng tin là đã gắn đúng chỗ là xong.

Thùng rác trước là emoji nên mỗi máy vẽ một kiểu — giờ là sprite `st-trash.webp`,
vứt vô thì thùng giật một cái kèm bụi bay lên (`toss()` trong `pov.js`).

## 13. Kéo thả trong POV — hai cái bẫy đã dính

**Bẫy 1: quầy render lại GIỮA LÚC ĐANG KÉO.** `tick()` gọi `render()` liên tục, nên mọi
phần tử `.drop` bị thay mới mỗi khung hình. Hai hệ quả:

- Gắn class `over` lên ô để làm viền sáng thì viền bị xoá ngay trong khung đó — người chơi
  không bao giờ thấy. Viền phải là **một khối riêng** (`.pv-hl`) nằm ngoài cây DOM của quầy,
  chỉ dời `left/top/width/height` theo ô đang hít.
- Đo danh sách ô một lần lúc nhấc lên rồi dùng suốt cú kéo là sai: các `rect` trỏ vào node đã
  rụng. Phải `measure()` lại ở **mỗi lần dò** (và một lần nữa ngay tại điểm nhả).

**Bẫy 2: đừng treo phần bám con trỏ vào `requestAnimationFrame`.** Tab nền / cửa sổ bị hãm
nhịp thì rAF gần như đứng, bóng kéo chết cứng trong khi ngón vẫn đi. Đặt `transform` thẳng
trong `pointermove` — việc đó rẻ, không đọc layout. Chỉ **phần dò ô** mới cần chặn lại
(`t - tt < 16ms` hoặc đi chưa đủ 3px), vì nó vừa `measure()` vừa `elementsFromPoint`.

**Hít (SNAP = 34px):** thả hụt trong 34px vẫn tính là trúng ô gần nhất. Ưu tiên ô đang nằm
trong (`elementsFromPoint`), không có mới tính khoảng cách tới `rect`. Không có hít thì ô nhỏ
(rổ, khay) gần như không thả trúng bằng ngón tay.

**Cách kiểm tra:** rAF trong khung xem trước của Claude bị hãm gần như đứng hẳn — đừng dùng nó
để đo phần chuyển động. Bắn `PointerEvent` tổng hợp rồi đọc `.pv-hl.on`, `style.transform` của
`.pv-ghost`, và câu thông báo của game là đủ chắc.

## 14. Trang chỉnh ZONES — `tools/zones.html`

Vite dựng hai trang (xem `vite.config.js`). Mở `tools/zones.html`, kéo/kéo góc từng ô trên
chính tấm `scene.webp`, bấm **Chép code** rồi dán đè khối `ZONES` trong
`src/data/counter-layout.js`. Chú thích từng ô nằm trong `NOTE` của trang này để đoạn code
xuất ra dán lại được nguyên vẹn — sửa tên ô thì nhớ sửa luôn `NOTE`.

Mũi tên nhích 0.1%, Shift nhích 1%, Alt + mũi tên đổi kích thước. Dải kẻ đỏ hai mép là vùng
cử chỉ Back của Android quy theo máy rộng 412px (5.3%) — đừng để thứ kéo được nằm trong đó.

`#stage` phải tính **chiều rộng** từ chiều cao khung chứa (`100cqh`); đặt `max-height:100%`
thì `aspect-ratio` hết suy ra được chiều cao và ô xẹp thành số không.

## 15. Dải khay: hai hàng khi quá 8 khay + đồ nấu nước không nằm trên khay (18/09)

**Hai hàng.** 36/124 level có hơn 10 khay (bún bò Huế 11, Hải Phòng 14). Một hàng thì trên máy
412px mỗi khay chỉ còn 20px — chưa tới một nửa ngưỡng bấm được (48dp). Quá `PAN_MAX1` (8) thì
`pov.js` xếp hai hàng: mỗi khay **44px**, cao 34px, đúng tỉ lệ sprite 320×250. Hàng cuối thiếu
khay thì căn giữa. Hai hàng thì nhãn phải chui **vào trong ô** (`.pv-pans.two`), để dưới đáy như
một hàng là nó đè lên khay hàng dưới.

**Đồ nấu nước không phải topping.** Nước cá / nước cốt cua / nước bún bò / nồi cháo đi vào NỒI,
miếng nước trắng cũng vậy — không cái nào bỏ vào tô. Trước đây `soupItems` bị trộn thẳng vào dải
khay nên chúng đứng chung với hành lá, cà chua. Nay chia theo **bước ăn nó**, lấy từ
`soupRecipeFor().byAction` (không đoán theo tên item):

| Bước | Đi đâu |
|---|---|
| `put-stock-in-pot`, `put-porridge-in-pot` | kệ nước cạnh bếp (`ZONES.broth`) |
| `add-water` | vòi bồn rửa (`.pv-tap` trong `ZONES.sink`) |
| còn lại (huyết) | vẫn nằm khay — đồ rắn |

Chỉ đổi **chỗ vẽ**: nguồn kéo vẫn là `kind:'item'` nên luật chơi và bot không đụng gì. Level nào
cần nước trắng mà không có bước nhúng bồn thì vẫn phải vẽ ô bồn — nhớ nới điều kiện
`has.sink || C.waterItems.length` ở cả `build()` lẫn `render()`.

## 16. Thêm món vào game: trạm MẶT BẾP và cái bẫy trùng tên (19/09)

Ba món phở mới (sốt vang, xào lăn, phở gà) cần một việc mà 5 trạm cũ không có:
**làm ngay trên mặt bếp bằng nồi/chảo nhỏ**. Ghi lại vì chỗ này dính hai cái bẫy.

**Bẫy 1 — `stove` đã có nghĩa khác.** Trong bếp 3D, `type: 'stove'` là **nồi nước phở
nấu sẵn** (`broth: 'pour-pho-broth'`), múc bao nhiêu cũng được. Đặt trạm mới tên `stove`
thì mọi thao tác hâm/xào bị đẩy vào nồi nước phở — bot chạy mà không phục vụ được ai,
lại **không báo lỗi nào**. Tên đang dùng là **`stovetop`**.

**Bẫy 2 — trạm một việc không gom được nhiều thứ.** Xào lăn cần **hai** thứ (thịt tái +
rau cải). `toJobStation` (chảo chiên, lò vi sóng) chỉ nhận một token; chỗ gom nhiều
nguyên liệu là thớt. Nên:
- quầy POV: `toStovetop()` — gom như thớt nhưng chỉ một chỗ;
- bếp 3D: `stovetop` đi theo `usePrep`/`finishPrep`, và `usePrep` đổi `transformsAt('prep')`
  thành `transformsAt(s.type)` để dùng lại được.

**`left === null` nghĩa là ĐANG GOM.** `null <= 0` trong JS là **true**, nên
`job.left <= 0` sẽ coi một nồi mới gom được nửa chừng là "đã xong". Phải kiểm
`left != null && left <= 0`.

**Mặt bếp không có ô riêng trong tranh.** Nó dùng chung ô `burner` — token nào có phép
biến đổi ở `stovetop` thì về nồi/chảo nhỏ, còn lại vào nồi nước lèo. Góc phải màn hình
đã chật (ô kệ nước với ô chảo chiên đè nhau), thêm ô nữa là vỡ.

**Món mới cần khai ở đâu (dễ quên):** `PRICES` · `SHELF_TOPPING` (không có thì cầm không
được) · `BURNER_DISHES` / `PREP_DISHES` / `STOVETOP_DISHES` (trạm chỉ hiện khi ca có món) ·
`LEVELS` (test bắt mọi món phải nằm trong một ca) · `worlds.js`.
