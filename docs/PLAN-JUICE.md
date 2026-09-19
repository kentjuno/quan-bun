# PLAN-JUICE — Nâng quầy POV từ "tranh có nút" thành "màn hình game"

> Viết để **bất kỳ model nào** cũng làm đúng ý Kent mà không cần hỏi lại.
> Mỗi hạng mục có: mục tiêu · hiện trạng (file, dòng) · spec bằng số · tiêu chí nghiệm thu đo được · cách kiểm · bẫy đã biết.
> Ảnh đích: `art/ref/concept-pov.jpg` (concept Kent chốt). Ảnh hiện trạng: chụp từ điện thoại Kent 19/09 (trong chat).

Ngày lập: 2026-09-19. Bản game lúc lập: sw v47, 21 món, 126 level, 90 test.

---

## 0. Đọc trước khi đụng vào bất cứ thứ gì

1. **Nguồn sự thật bếp** là `F:\AntiGravity\cooking-note\sim-data.js` → copy sang `src/data/sim-data.js`. Kế hoạch này **không đổi công thức, thứ tự bước, hay số lượng**. Chỉ đổi cách *nhìn* và *cảm*.
2. Đọc `docs/ART-PIPELINE.md` §8–§16 — mọi bẫy đã dính đều ở đó. Không đọc thì sẽ dính lại.
3. Quy trình deploy, không bỏ bước:
   `npx vitest run` (phải 90/90) → tăng `-vNN` trong `public/sw.js` → `npx vite build` → `scripts\deploy_pages.cmd` → chờ ~30 s → `fetch('/quan-bun/sw.js?cb=…')` thấy đúng `-vNN` mới được kết luận gì về bản live.
4. Commit ở `F:\AntiGravity\Games\quan-bun` với `-c user.name="Kent Juno" -c user.email="akissforyou.forever@gmail.com"`, rồi `git push`.
5. **Không tự dời số trong `ZONES`** bằng tay. Dùng `tools/zones.html` (`https://kentjuno.github.io/quan-bun/tools/zones.html`) rồi dán code ra. Kent là người chỉnh ZONES; model chỉ đề xuất số và nói rõ.
6. Mọi thứ trên màn hình quầy tính theo **% của `.pv-stage`** (768×1376). Máy chuẩn để đo: Samsung 412×915 → stage rộng **368 px** (đã trừ mép 22 px hai bên cho cử chỉ Back của Android). Mọi ngưỡng px dưới đây là ở stage 368.
7. Font chữ cho quầy dùng **`cqw`** (container query width của `.pv-stage`, đã có `container-type`? — nếu chưa thì thêm `container-type: inline-size` cho `.pv-stage`). 1 cqw = 3.68 px trên máy chuẩn. Không dùng px cứng cho chữ trong stage nữa.

### Những thứ đã có sẵn, ĐỪNG làm lại
| Thứ | Ở đâu |
|---|---|
| Kéo thả mượt: bóng bám con trỏ, hít 34 px, viền `.pv-hl`, ô nảy `.hit`, thả trật bay về | `src/pov.js` `bind()`, `flyBack()`, `bump()` |
| Chan nước có bàn tay + dòng nước + bọt (A10) | `src/pov.js` `pour()`, số trong `POUR` (`src/data/counter-layout.js`) |
| Khói nồi trụng | `STEAM` trong `counter-layout.js` |
| Rung thùng rác + bụi | `src/pov.js` `toss()` |
| Tô 4 bậc + 89 ảnh tô theo từng bước | `src/game/art.js` `dishArtAt`, `dishStepArt` |
| 53 khay topping sprite, 2 hàng khi > 8 khay | `public/art/pan/`, `PAN_MAX1`, `PAN_ROW_GAP` |
| Icon 109 món | `public/icons/`, `src/game/icons.js` (sinh bởi `scripts/gen_icons_map.mjs`) |
| Âm thanh tổng hợp | `src/audio.js` → `sfx.{tap,pick,drop,done,place,serve,mistake,arrive,trash,sizzle,splash,clink,coin,bell,cheer,chatter,hum}` |
| Sự kiện từ lõi quầy | `src/game/counter.js` → `ev.{onSfx,onMsg,onEnd,onServe(t,r),onExpire(t),onSpoil,onSpawn(t)}` |

### Cách kiểm cho ĐÚNG (bắt buộc mỗi hạng mục)
- **Khung xem trước của Claude bị hãm `requestAnimationFrame` gần như đứng.** Không dùng nó để đánh giá chuyển động. Ở đó chỉ kiểm: DOM có đúng phần tử, `getComputedStyle`, `getBoundingClientRect`, `element.getAnimations()`, ảnh có load (`naturalWidth > 0`).
- Bắn thao tác giả: `el.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, clientX, clientY, pointerId:1, pointerType:'touch', isPrimary:true}))` rồi `pointermove`/`pointerup` lên `#pov`. Mẫu đầy đủ trong `docs/ART-PIPELINE.md` §13.
- **Chuyển động chỉ nghiệm thu bằng ảnh/quay từ điện thoại Kent.** Mỗi hạng mục xong: nói rõ "cần Kent quay 5 giây màn X" — đó là bước nghiệm thu, không phải lịch sự.
- Sau khi sửa `src/pov.js`: mở bản live, chạy `window.__qb.pov.render()` và đọc console. Test unit không dựng DOM quầy nên **không bắt được lỗi render**.
- `render()` của quầy **dựng lại DOM mỗi tick**. Mọi hiệu ứng kéo dài > 1 khung hình phải là **phần tử riêng gắn vào `#pov`** (như `pour()` làm), không phải class gắn lên ô — class bị xoá ngay.

### Chuyển ảnh giữa máy Claude và máy Kent
- Máy → Claude: `device_stage_files` **hỏng trên ổ F:** (lỗi `nlink > 1`). Dùng base64 qua Blender (`execute_blender_code`), ảnh nhỏ < 40 KB, hoặc mở bản live rồi chèn `<img>` để nhìn.
- Claude → máy: copy vào `/mnt/user-data/outputs/` rồi `device_commit_files` với `stagedPath` — **không tốn token**, ưu tiên cách này cho file lớn.

---

## 1. Thứ tự làm và lý do

| # | Hạng mục | Vì sao ở vị trí này |
|---|---|---|
| J1 | Tương phản nền | Chiếm nửa khoảng cách với concept; chỉ là art, không đụng code |
| J2 | Vùng thớt + tô to | 30 % màn hình đang trống; sửa xong mọi thứ khác mới có chỗ đứng |
| J3 | HUD trong khung + đồng hồ | Kent hỏi đồng hồ từ 17/09; HUD là thứ nói "đây là game" |
| J4 | Khoảnh khắc thắng | Rẻ nhất trên mỗi đơn vị cảm giác |
| J5 | Vật nhận nảy khi thả | Hiện chỉ bóng kéo nảy, vật nhận đứng im |
| J6 | Phiếu to có icon nguyên liệu | Vừa giống concept vừa đúng mục đích luyện nhớ |
| J7 | Nồi nước trên bếp | Bếp đang trống 6 họng |
| J8 | Ẩn nhãn khay | Sạch + ép nhớ; làm sau J6 vì phiếu đã gợi ý |
| J9 | Đời sống nền | Làm cuối vì tốn FPS, phải đo |

Mỗi hạng mục = **một commit + một lần deploy + một ảnh từ điện thoại Kent**. Không gộp.

---

## J1 — Tương phản nền (art, không code)

**Mục tiêu.** Nét mực đậm, đồ ăn no màu, mặt trước tủ/bàn tối hơn, mép tranh hơi tối (vignette) — như `art/ref/concept-pov.jpg`. **Bố cục không được nhích một pixel** vì `ZONES` đo trên tranh này.

**Hiện trạng.** `public/art/scene.webp` 768×1376, nguồn tách lớp ở `art/raw/scene/` (bản đã xoá nồi/khay/rổ theo §9–§10). Toàn tranh một tông pastel.

**Cách làm.** `edit-image` từ chính `scene.webp` (upload → media_id → edit). Prompt, dùng nguyên văn rồi chỉ thêm nếu cần:

```
Keep the EXACT same composition, camera, perspective, every object position and size,
the same tiled wall, pot, sink, stove, sink tap, counter, cutting board, cabinets and bin.
Change ONLY the rendering: make the brown ink outlines darker and more confident (about 2x darker),
increase color saturation of all surfaces by about 30%, make the counter front and cabinet fronts
noticeably darker (mid-tone, not light), add a subtle darker vignette in the four corners,
keep the watercolor paper texture. No new objects, no text, no people, no food on the trays.
```
Chạy 3 lần, giữ bản có SSIM cao nhất so với bản cũ (xem nghiệm thu).

**Nghiệm thu (đo bằng script, viết `scripts/contrast_report.py`):**
- Cấu trúc không đổi: SSIM(grayscale, thu về 96×172) giữa bản mới và cũ **≥ 0.80**. Thấp hơn = bố cục đã trôi → bỏ.
- Nét đậm hơn: phân vị 5 % độ sáng (L, 0–255) của toàn tranh **giảm ≥ 25 %** so với bản cũ.
- Tương phản tăng: (p95 − p5) của L **tăng ≥ 30 %**.
- Mặt trước tủ tối hơn: p50 của L trong vùng y 56–79 %, x 15–88 % **≤ 170**.
- Sau khi thay `scene.webp`: mở `tools/zones.html` — rìa nồi, bồn, mép thớt vẫn nằm đúng trong ô `pot`, `sink`, `slots`. Nếu lệch thì bản art sai, không phải sửa ZONES.
- Kent xem A/B trên điện thoại: chốt bằng miệng.

**Bẫy.** Flow hay "sửa giúp" — thêm đồ vào khay, thêm nồi lên bếp. Kiểm bằng mắt vùng khay và bếp phải **trống** như bản cũ.

---

## J2 — Vùng thớt: có vật, có tô to

**Mục tiêu.** Hết khoảng trắng. Thớt có vân, hai chỗ tô là **vật** (tấm lót/vòng), tô đang ráp to, không còn chữ "chỗ tô 1".

**Hiện trạng.** `ZONES.slots {x:37, y:69, w:56, h:26}`; `.pv-slot` là ô trống với `radial-gradient` + `<small>chỗ tô N</small>` (`src/pov.js` render slots ~dòng 150, CSS `.pv-stage .pv-slot` ~dòng 365 `index.html`). `BOWL.width = 54` (% chiều rộng ô).

**Spec.**
1. Trong prompt J1 thêm một dòng: *"the white cutting board gets a subtle pale wood/plastic texture and TWO faint round placemat circles centered where bowls go"* — vị trí hai vòng: tâm tại x = 37 + 56×0.25 và 37 + 56×0.75 (% stage) = **51 %** và **79 %**, y = 69 + 26×0.55 = **83.3 %**, đường kính ≈ **14 %** stage. Nếu Flow không đặt đúng, tách vòng thành sprite riêng `public/art/st-mat.webp` đặt bằng CSS tại đúng toạ độ trên.
2. Xoá `<small class="hint">chỗ tô N</small>`. Ô trống chỉ còn bóng mờ `radial-gradient` hiện tại, opacity giảm còn `.10`.
3. `BOWL.width` 54 → **64**. `BOWL.centerY` giữ 56. Kiểm `pour()` vẫn đúng (nó đọc `BOWL.rim/surface` theo chiều cao tô — không đổi).
4. Khi kéo (`#pov.dragging`) ô trống hiện viền nét đứt như hiện tại — giữ.

**Nghiệm thu.**
- `document.querySelector('.pv-slot small')` → **null** khi ô trống.
- Tô đang ráp: `getBoundingClientRect().width` **≥ 66 px** ở stage 368, và **không giao** với rect của ô bên cạnh (`slot#0.right < slot#1.left`).
- Ảnh điện thoại: thấy hai vòng lót ngay cả khi chưa có tô.

---

## J3 — HUD trong khung + đồng hồ + tranh tràn viền

**Mục tiêu.** Nhìn vào là biết còn bao lâu, được bao tô, bao tiền — chữ đọc được, nằm **trong** tranh. Không còn dải xám "0/5 · Thoát" bên ngoài, không còn viền be quanh tranh.

**Hiện trạng.** `.pv-top` (`src/pov.js` ~dòng 81) nằm ngoài stage; HUD là hai pill `#pvMoney` (ZONES.hudL) và `#pvServed` (ZONES.hudR) chữ 12 px/8 px; render ở ~dòng 115–117. **Chưa có đồng hồ.** Nền `#pov` là gradient be nên stage bị đóng khung.

**Spec.**
1. **Bỏ `.pv-top`.** Nút Thoát thành icon `✕` 9 cqw ở góc trên phải **trong stage** (z-index trên rail), `aria-label="Thoát"`.
2. **Nền ngoài stage** = chính `scene.webp` phóng `cover` + `filter: blur(14px) brightness(.8)` trên `#pov::before`. Mép 22 px vẫn giữ để né cử chỉ Back, nhưng mắt không thấy khung.
3. **Đồng hồ** ở `hudR`: vòng tròn SVG đường kính **13 cqw**, nét 1.6 cqw, số giây còn lại ở giữa **4.2 cqw** (≈ 15 px). Nguồn: `C.o.seconds` (level) — nếu không có (drill/rush) thì đếm lên và không tô vòng. Màu: `--broth` khi > 25 % còn lại; `#e0a030` khi ≤ 25 %; `#d64a2c` + `animation: pulse .6s infinite` khi ≤ 10 %. 10 giây cuối: `sfx.tap` mỗi giây.
4. **Tiền** ở `hudL`: số **4.6 cqw**, chữ "k" nhỏ. Khi `C.money` tăng: gắn `<span class="pv-float">+45k</span>` vào `#pov` tại vị trí số tiền, bay lên 40 px, mờ dần, **700 ms**, `sfx.coin`. Là phần tử riêng vì `render()` dựng lại DOM.
5. **Tô đã xong** dưới đồng hồ: hàng **icon tô** nhỏ 5 cqw mỗi cái, `C.rounds` cái, cái đã xong tô đầy (icon món từ `iconUrl(dish)`), chưa xong là vòng mờ. Quá 8 thì hiện "5/12".
6. **Chuỗi** (`C.streak` ≥ 2): huy hiệu `×N` 4 cqw cạnh tiền, pop `scale 1.4→1` 200 ms khi tăng.
7. Toàn bộ chữ HUD dùng cqw; **không** px.

**Nghiệm thu.**
- `document.querySelector('.pv-top')` → null. Nút Thoát nằm trong `.pv-stage`.
- `getComputedStyle(số giây).fontSize` **≥ 15 px**, tiền **≥ 16 px** ở stage 368.
- Ở level có `seconds`: vòng đồng hồ giảm đều; tại 25 % và 10 % đổi màu đúng (kiểm bằng `C.time` giả).
- Ảnh điện thoại: không thấy dải màu be phẳng hai bên tranh.

**ĐÃ LÀM 19/09 (sw v54) — 3 chỗ LỆCH SPEC, có lý do:**
1. *§3 nguồn giờ.* Spec ghi `C.o.seconds` — **không tồn tại**. `seconds` của level chỉ được in ra menu
   ("160s"), quầy POV không hề dùng: level chỉ kết thúc khi phục vụ hết khách. Kent chốt 19/09:
   **hết giờ là đóng ca thật** → `Counter.seconds` + `Counter.endShift()`, `main.js` truyền `L.seconds`.
   Thêm test `hết giờ là đóng ca`: cả 124 level bot vẫn phục vụ ≥ 60 % khách trong đúng `seconds`.
2. *§3 màu vòng.* Spec ghi `--broth` khi còn > 25 %. `--broth` = `#e8a33c`, gần y hệt màu cảnh báo
   `#e0a030` → mốc 25 % nhìn không ra. Đổi màu "còn nhiều giờ" sang **xanh `#3f8f4f`**.
3. *§5 hàng icon tô.* **Không đủ chỗ.** Đo thật: `hudR` rộng 47 % ≈ 173 px; vòng đồng hồ 48 px +
   nút ✕ 33 px + khoảng cách ≈ 93 px, chỉ còn ~80 px — không nhét nổi 8 icon 5 cqw (18 px).
   Tạm giữ chữ `n/N tô`. **Không tự sửa ZONES**: muốn có hàng icon thì Kent nới `hudR` trong
   `tools/zones.html` (rộng hơn hoặc cao 9 %), rồi làm sau.
   Nút ✕ đang 9 cqw ≈ 33 px, nhỏ hơn ngưỡng chạm 44 px — cố ý, để đừng lỡ tay thoát giữa ca.

**Bẫy.** `hudL {x:2,y:1.5,w:41.5,h:7.5}` và `hudR` cao 7.5 % ≈ 49 px — vòng 13 cqw ≈ 48 px vừa khít; nếu chật thì đề xuất Kent nới `hudR.h` lên 9 trong `tools/zones.html`, **không** tự sửa.

---

## J4 — Khoảnh khắc thắng (0,8 giây)

**Mục tiêu.** Bưng tô lên phiếu phải có nhịp: tô bay lên → phiếu đóng dấu ✓ → tiền bay → khách cười → phiếu trượt đi.

**Hiện trạng.** `ev.onServe(t, r)` chỉ đổi dòng chữ `#pvMsg` (`src/pov.js` dòng 34). Không có gì trên tranh.

**Spec (thời gian tính từ lúc thả):**
| t (ms) | Việc | Cách |
|---|---|---|
| 0 | Nhân bản `.pv-bowl` (ảnh tô hiện tại) thành `.pv-fx.pv-serve` gắn vào `#pov` tại rect tô | clone `<img>` |
| 0–280 | Bay tới tâm phiếu `t.id`, `scale 1→.55`, `opacity 1→.7`, ease `cubic-bezier(.2,.8,.2,1)` | `el.animate` |
| 200 | `sfx.serve` | |
| 280 | Dấu ✓: `fx('stamp')` (**cần gen**: con dấu đỏ ✓ nét mực, nền trong) tại góc trên phải phiếu, `scale 1.6→1` 220 ms, xoay −8° | phần tử riêng |
| 280 | Mặt khách: `.tk-face` `scale 1→1.15→1` 300 ms; nếu `r.quality === 100` thêm 2 ngôi sao `fx('sparkle')` bay lên | |
| 350 | `+Nk` (J3.4) + `sfx.coin` | |
| 600–850 | Phiếu trượt sang trái 120 %, mờ dần, rồi `render()` | |

**Nghiệm thu.**
- Gọi `pov.C.ev.onServe(t, {say:'', sec:20, quality:100})` giả → trong 300 ms tồn tại `.pv-serve` và ảnh dấu ✓ (`img[src*="stamp"]`), sau 1 s không còn phần tử nào sót (`querySelectorAll('.pv-fx').length` về như trước).
- Kent quay 5 giây một lần bưng tô.

**ĐÃ LÀM 19/09 (sw v58) — 3 điều spec chưa lường:**
1. *Gọi ở đâu.* Spec ngụ ý móc vào `ev.onServe`. Không được: cả hai chỗ thả đều chạy
   `C.drop()` → **`render()`** → `afterDrop()`, nên tới lúc đó phiếu và tô đã bị xoá khỏi DOM.
   Phải gọi `serveFx()` **giữa `drop()` và `render()`**, lúc còn đo được toạ độ.
2. *Phiếu trượt đi.* Không animate được phiếu thật (render() thay nó ngay khung sau) →
   tạo **bản sao** `.pv-tkghost` gắn vào `#pov`, đóng dấu & trượt trên bản sao.
3. *`el.animate().onfinish` KHÔNG chạy khi khung hình bị nén* (tab nền, máy yếu) → hiệu ứng
   kẹt lại trên màn hình vĩnh viễn. Mọi phần tử fx giờ có thêm `setTimeout(...remove)` dự phòng.
   Lỗi này có sẵn trong `toss()` từ trước — đã vá luôn.
   Kích thước dấu: spec không ghi, lần đầu để `0.9 × rộng phiếu` ra con dấu 65 px trên phiếu 41 px
   (to hơn cả phiếu). Số đúng là **0,8 × CHIỀU CAO phiếu** → 37×36 px.
   `art/fx-stamp.webp` gen bằng Flow rồi cắt nền bằng `scripts/_mkstamp.py` (ngưỡng alpha 200 —
   ngưỡng 235 để lại ô vuông giấy mờ).

**Bẫy.** Phiếu `t` có thể đã bị `render()` thay DOM giữa chừng → lấy rect phiếu **ngay lúc bắt đầu**, lưu số, không giữ tham chiếu phần tử.

---

## J5 — Vật nhận nảy khi thả

**Mục tiêu.** Thả vào đâu, chỗ đó phản ứng. Hiện chỉ có `.hit` (scale 1.12) chung chung.

**Hiện trạng.** `afterDrop(res, src, zone)` (`src/pov.js` ~dòng 160) chỉ xử lý trash và chan nước; `bump(zn)` gắn `.hit`.

**Spec — bảng phản ứng theo `zone.kind` (chỉ khi `res.ok`):**
| Đích | Vật nhận | Hiệu ứng | sfx (đã có trong counter) |
|---|---|---|---|
| `pot` (rổ) | `.pv-basket[data-i]` | lún `translateY(6%)` 90 ms rồi về, + `fx('splash-water')` tại miệng nồi 400 ms (đã có hue-rotate cho bồn — ở nồi dùng bản gốc trắng) | splash |
| `sink` | `.pv-rinse` | như hiện tại + rung nhẹ vòi 2° | splash |
| `slot` (tô) | `.pv-bowl` | item bay từ vị trí thả tới tâm tô theo **cung** 200 ms (`flyItem(fromRect, toRect, iconUrl(tok))`), tô `scale 1.08` 180 ms khi item chạm | place / clink |
| `prep` (thớt) | `.pv-board` | rung dọc 2 lần 4 % (dao chặt), `fx('chop')` (**cần gen**: hai vệt mực ngắn) | place |
| `burner` nồi lèo | `.pv-pt` | lún như rổ + `fx('steam')` bùng 1 lần | drop / sizzle |
| `burner` mặt bếp | `#pvStove .pv-job` | `scale 1.1` + `fx('sizzle')` (**cần gen**: 3 tia bắn) | sizzle |
| `fryer` / `microwave` | ô trạm | như mặt bếp | sizzle / drop |
| `ticket` | (J4) | | serve |
| `trash` | có rồi | | trash |

Helper chung `flyItem(from, to, src, ms=200)`: tạo `<img class="pv-fx pv-fly">` trong `#pov`, keyframes `translate` từ `from` tới `to` với điểm giữa cao hơn 18 % khoảng cách (cung), `scale .9→.6`, tự xoá khi xong.

**Nghiệm thu.**
- Thả giả vào mỗi loại đích → `document.getAnimations().length` tăng ≥ 1 trong 50 ms, và không còn `.pv-fx` sau 600 ms.
- Tổng phần tử `.pv-fx` cùng lúc **≤ 6** (kiểm khi thả liên tiếp 5 lần).
- Kent quay: một tô từ đầu tới chan nước.

**ĐÃ LÀM 19/09 (sw v59).** `react(src, zone, from)` + `spawnFx()` + `flyItem()` trong `src/pov.js`.
- Phát hiện tiện thể: `bump()` trước đây **chỉ chạy ở đường kéo**, chạm đôi thì không — đã dời vào `afterDrop()`.
- Chạm đôi KHÔNG bay item lần nữa (`from = null`): ghost đã bay tới tâm đích rồi, bay thêm là thừa.
- Phân biệt nồi lèo / mặt bếp trong cùng `zone.kind === 'burner'`: `#pvStove` không có `data-i` → `zone.i == null` là mặt bếp.
- `art/fx-sizzle.webp` gen bằng Flow + `scripts/_mkstamp.py`. `fx-chop.webp` đã có sẵn, không cần gen.
- Đo: pot/sink/slot/prep/nồi lèo/mặt bếp đều +1 fx +≥1 animation trong 40 ms; thả liên tiếp 5 lần → 5 fx, sau 600 ms về 0.

**Bẫy.** Sau `render()` phải **tìm lại** phần tử đích (như `bump()` làm) — tham chiếu cũ đã rụng.

---

## J6 — Phiếu khách to, có icon nguyên liệu

**Mục tiêu.** Như concept: thẻ giấy kẹp trên dây, mặt khách rõ, tên món to, **hàng icon nguyên liệu** làm gợi ý — và là chỗ dạy nhớ món.

**Hiện trạng.** `ZONES.rail {x:4, y:9.5, w:94, h:14}`; `.pv-rail .tk` `max-width: 32%`, mặt 26 px, tên 10 px, tên món 9 px (`index.html` ~dòng 214, 322, 389).

**Spec.**
1. Mỗi thẻ rộng **30–32 %** stage (đủ 3 thẻ), cao hết `rail.h`. Kẹp giấy: sprite `fx('clip')` (**cần gen**) 5 cqw ở mép trên giữa thẻ. Nghiêng ±1.4° như hiện tại.
2. Mặt khách **12 cqw** (≈ 44 px), tròn, viền mực. Khách quen: kẹp màu vàng.
3. Tên khách 3.4 cqw, **tên món 4.2 cqw** (≥ 15 px), đậm, màu `--pv-ink`.
4. **Hàng icon**: các token trong `recipeFor(t.dish).assembly` lọc `D.items[tok]` (bỏ base-ready, bỏ `@…`), tối đa **7** icon, mỗi icon **6 cqw**, cách 1 cqw, dùng `iconUrl(tok)`; icon nào đã vào tô (`slot.placed`) thì tô đầy, còn lại mờ `.45`. Đây chính là "gợi ý thứ tự" của concept — **chỉ bật ở level có `simplify`** hoặc khi `L.hintIcons === true`; level đủ bước thật thì **ẩn** (mục tiêu là thuộc).
5. Thanh kiên nhẫn cao **1.4 cqw**, dưới cùng thẻ: xanh > 50 %, cam 20–50 %, đỏ < 20 % + pulse. Nguồn: `1 − (C.time − t.born) / t.pat`.
6. Thẻ mới vào: trượt từ trên xuống 220 ms + `sfx.arrive` (đã có).

**Nghiệm thu.**
- Ở stage 368: tên món `fontSize ≥ 15 px`, mặt `width ≥ 44 px`, 3 thẻ không giao nhau.
- Level 1 (có `simplify`): thấy icon; level 4 (đủ bước): không có `.tk-ing`.
- Thanh đổi màu đúng ngưỡng (giả `C.time`).

**Bẫy.** `rail.h = 14 %` ≈ 92 px. Mặt 44 + tên 2 dòng 32 + icon 22 + bar 5 = 103 > 92. Hai cách, chọn một và nói rõ: (a) icon nằm **đè lên nửa dưới mặt khách** theo hàng ngang bên phải mặt; (b) đề xuất Kent nới `rail.h` lên 17 bằng `tools/zones.html`. Không tự đổi ZONES.

---

## J7 — Nồi nước thật trên bếp

**Mục tiêu.** Kệ nước (`nuoc-pho`, `cot-cua`, `nuoc-ca`, `nuoc-bun-bo`, `cot-pho-ga`, `chao-*`) là **nồi đặt trên họng bếp**, có khói khi nóng — không phải chip icon.

**Hiện trạng.** `ZONES.broth {x:85, y:30, w:14, h:11}` vẽ `.pv-broth` = icon + chữ; đè gần trùng `ZONES.fryer {x:83.5, y:28, w:14, h:13.5}` (test `không level nào vừa có chảo chiên vừa có kệ nước` đang giữ cho không vỡ).

**Spec.**
1. Sprite nồi: `public/art/pot-<token>.webp`, gen bằng `edit-image` từ `public/art/st-soup-pot.webp` (đã có, xem `stationArt('soup-pot')`), prompt: *"Keep the EXACT same pot, angle, ink and watercolor style, magenta background. Change ONE thing: the pot is filled with {mô tả nước}."* Mô tả: nước phở "clear golden beef broth", cốt cua "orange-red crab broth", nước cá "pale golden fish broth", bún bò "red-orange spicy broth with oil", cốt phở gà "golden chicken broth", cháo "thick white rice porridge".
2. Bố cục trên bếp: ô `burner` giữ nguyên; kệ nước xếp thành **một hàng nồi** trong ô `broth`, mỗi nồi rộng `100 / n` % ô, tối đa 3 nồi (kiểm: không level nào > 3 — `stockItems + brothSrc`).
3. Nồi nào "có nước sẵn" (`brothSrc`) hoặc đã nóng: khói `STEAM` nhỏ hơn nồi trụng (count 3, spread 8).
4. Nhãn dưới nồi 3 cqw, một dòng.

**Nghiệm thu.**
- Level phở: thấy nồi trên bếp, khói bay; `img[src*="pot-nuoc-pho"]` `naturalWidth > 0`.
- Test guard vẫn xanh; thêm case: `brothSrc.length + stockItems.length ≤ 3` cho mọi level.

**Bẫy.** Nếu Kent muốn nồi ngồi **trên họng bếp thật** (x 62–99 %, y 28–42 %) thì phải chia lại dải bếp: đề xuất `burner {x:58.5,w:22}`, `broth {x:81.5,w:17}` và dời `fryer` sang chỗ khác — việc này Kent quyết trong `tools/zones.html`.

---

## J8 — Nhãn khay: ẩn mặc định

**Mục tiêu.** Khay đã có ảnh đủ nhận ra. Nhãn chỉ để học lúc đầu.

**Spec.**
1. `.pv-pan small` ẩn khi `!(L.simplify || L.showLabels)`.
2. Chạm giữ ≥ 350 ms lên khay (không kéo quá 8 px) → tooltip tên món **4 cqw** nổi trên khay 1.2 s, nền giấy, viền mực; đây là phần tử riêng trong `#pov`.
3. Sai thứ tự 3 lần liên tiếp trong một level → bật nhãn lại tới hết level (giống luật gợi ý trong `docs/GAME-DESIGN.md`).

**Nghiệm thu.**
- Level 20: `getComputedStyle('.pv-pan small').display === 'none'`. Level 1: hiện.
- Pointerdown giữ 400 ms không di chuyển → xuất hiện `.pv-tip` với đúng `label(tok)`; 1.5 s sau biến mất. Kéo ngay sau 100 ms → **không** hiện tooltip và kéo vẫn chạy.

---

## J9 — Đời sống nền (idle)

**Mục tiêu.** Không chạm cũng thấy bếp đang sống.

**Spec.**
| Thứ | Hiệu ứng | Ngân sách |
|---|---|---|
| Nồi trụng | khói `STEAM` liên tục (đã có) | |
| Nồi lèo đang đun / đã nóng | ảnh nồi `scaleY 1→1.015` 900 ms lặp + 1 bọt `fx('bubble')` (**cần gen**) nổi lên mỗi 900 ms | ≤ 2 nồi cùng lúc |
| Vòi bồn | giọt nước rơi mỗi 4 s | 1 phần tử |
| Thanh kiên nhẫn | `transition: width .25s linear` | |
| Khách sắp bỏ đi (< 20 %) | mặt lắc 1.5° 2 lần/giây | |
Tổng phần tử động ở trạng thái rảnh **≤ 6**. Tôn trọng `prefers-reduced-motion`.

**Nghiệm thu.**
- Thêm `?fps=1`: overlay đo FPS bằng rAF trong 3 s **trên điện thoại Kent** (không phải khung xem trước). Yêu cầu **≥ 50 FPS** trung bình ở level 20. Nếu < 50 thì tắt bọt trước, giọt nước sau.

---

## 2. Tài sản art cần gen (một đợt, trước J4)

| Tên | Dùng ở | Mô tả prompt (giữ style: mực nâu + màu nước, nền magenta) |
|---|---|---|
| `fx/stamp.webp` | J4 | con dấu tròn đỏ có dấu ✓, nét mực run, mực lem nhẹ |
| `fx/clip.webp` | J6 | kẹp giấy đen nhỏ, kiểu bulldog clip |
| `fx/chop.webp` | J5 | hai vệt mực ngắn chéo, như chớp dao |
| `fx/sizzle.webp` | J5 | ba tia nhỏ vàng cam bắn lên |
| `fx/bubble.webp` | J9 | một bọt tròn mờ viền mực |
| `pot-<token>.webp` ×6 | J7 | xem J7.1 |
Pipeline: `scripts/process_icons.py` (cắt magenta) → webp. Ghi vào `docs/ART-PIPELINE.md` nếu dính bẫy mới.

---

## 3. Definition of Done — mỗi hạng mục

- [ ] `npx vitest run` 90/90 (hoặc hơn nếu thêm test — mỗi hạng mục có ít nhất **một** test hoặc script kiểm).
- [ ] `public/sw.js` tăng số; **đọc lại file sau khi ghi** (bẫy §10: `open('w')` làm rỗng file).
- [ ] Deploy; xác nhận `sw.js` live đúng số.
- [ ] Chạy `window.__qb.pov.render()` trên bản live, console sạch.
- [ ] Tiêu chí đo được ở mục "Nghiệm thu" đều pass, ghi số thật trong commit message.
- [ ] Kent gửi ảnh/clip từ điện thoại và nói OK.
- [ ] `docs/CHANGELOG.md` một dòng; bẫy mới → `docs/ART-PIPELINE.md`.

## 4. Không được làm
- Đổi `sim-data.js`, thứ tự ráp, tên món, số lượng — kể cả "cho đẹp".
- Tự sửa số trong `ZONES`.
- Thêm trạm mới mà không kiểm trùng tên (đã có: `shelf pot sink stove burner stovetop prep counter serve seat trash microwave fryer` — `stove` là **nồi nước phở sẵn** của bếp 3D).
- Dùng `localStorage` cho trạng thái chơi.
- Kết luận "mượt rồi" từ khung xem trước của Claude.
- Đổi engine. CSS + Web Animations + `rAF` đủ cho toàn bộ kế hoạch này.
