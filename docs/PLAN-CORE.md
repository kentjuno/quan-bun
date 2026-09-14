# KẾ HOẠCH LÕI MỚI — "Quầy POV" (kéo thả · chạm đôi) thay bếp 3D làm màn chơi chính

Tài liệu bàn giao, tự đủ như `docs/PLAN-WORLDS.md`. Kent duyệt hướng ngày 14/09/2026 sau hai bản thử (`Ráp tô` 0.8.1 → `Quầy POV` 0.8.2): **"ngon hơn rồi, chỉ cần thiết kế lại giao diện cho đẹp; kéo chính xác khó → thêm chạm đôi"** (chạm đôi đã có ở 0.8.3).

> **Prompt giao việc:** "Repo `F:\AntiGravity\Games\quan-bun`. Đọc `docs/PLAN-CORE.md` hết, rồi `art/ART-BIBLE.md`, `docs/PLAN-WORLDS.md` §0 (bất biến) và `src/pov.js`. Làm theo thứ tự mục 6, mỗi bước chạy `npx vitest run` + `node tests/smoke.browser.mjs`, báo tôi trước khi sang bước sau. Công thức bếp: chỉ đọc `src/data/sim-data.js`, không bịa; thiếu thì hỏi tôi. Xong: CHANGELOG 0.9.0, STATUS, build, deploy (PLAN-WORLDS §9), gửi ảnh."

| Bước (mục 6) | Trạng thái | Ghi chú |
|---|---|---|
| 0 chạm đôi + drop-zone rộng | ✅ 0.8.3 | `autoTarget`, `flyTo`; chạm nhẹ không thả |
| 1 Pov thành engine đủ món (thớt, chảo, lò vi sóng, nấu nước ở lò) | ✅ 0.9.0 | `src/game/counter.js` (state thuần) + `pov.js` chỉ vẽ; `povOk` 18/18; `tests/counter.test.js` 11 test, bot làm xong cả 18 món |
| 2 World/level chạy trên Pov (thay bếp 3D) | chưa | |
| 3 Giao diện art C (nền ký hoạ, sprite, chữ tay) | chưa | |
| 4 Juice + âm thanh cho kéo thả | chưa | |
| 5 Bếp 3D → chế độ "Bếp thật" trong Thêm; docs; deploy | chưa | |

## 1. Vì sao (để model hiểu, không tranh cãi lại)
Overcooked mạnh ở co-op; chơi một mình chỉ còn tối ưu lộ trình → chán. Papa's/Cook-Serve-Delicious chơi một mình cuốn vì **lõi là thuộc công thức + tay làm**: một đơn = một bài toán, chấm từng bước. Kéo thả mô phỏng động tác thật (kéo tô vô nồi, trút rọ, rắc hành) nên cả tay lẫn đầu cùng nhớ — đúng mục đích gốc của Kent (nhanh và đúng ở tiệm). Góc POV trước quầy prep = góc Kent nhìn mỗi ngày, và là góc rẻ nhất cho art C (một nền + sprite, không model 3D).

## 2. Lõi đã có (`src/pov.js`, 0.8.3) — giữ, mở rộng, không viết lại
- Ba lớp sâu: **nồi trụng** (3 rọ, chỗ trữ tô nóng ≤5) + **bồn xả** · **nồi nước lèo** (kéo vá) · **tủ prep** khay GN theo `SHELF_TOPPING` · **mặt thớt** (chồng tô, bin sợi, 2 chỗ tô). Phiếu khách treo (≤3), kiên nhẫn theo phiếu.
- Vật thể có trạng thái: rọ `blanching→hot→rinsing→rinsed→reblanching→hot2`; tô nóng `until`; tô đang ráp `{type, placed[], mistakes}`. Tô hợp lệ khi `placed` là tiền tố chuỗi ráp của ≥1 phiếu đang treo (`fits`). Giao = kéo tô lên phiếu khớp.
- Điều khiển: kéo (ghost bám ngón, vùng thả `.drop` sáng) **hoặc chạm đôi** (`autoTarget` chọn đích hợp lý nhất, `flyTo` bay tới). Chạm nhẹ không thả. Lỗi tính theo tô, cộng vào phiếu khi giao. Kết quả cùng dạng puzzle → mastery/progress dùng chung.
- Giới hạn hiện tại (`povOk`): chỉ món tô + sợi + topping rời + nước có sẵn — phở tái nạm, bún riêu, bún bò Huế.

## 3. Bước 1 — Pov đủ 18 món (engine)
Mọi bước trong `recipeFor(d).transforms` phải có một **trạm kéo-thả** trên quầy. Trạm mới, đặt theo lớp:
- **Thớt** (`station: 'prep'`) — trên mặt thớt, cạnh 2 chỗ tô: vùng thả nhận 1..n nguyên liệu của cùng một transform (`t.inputs`); đủ đầu vào → thanh thời gian `t.time` → ra token `t.output` (thẻ có thể kéo). Ví dụ chả cá 2 miếng cắt đôi, thì là cắt 3 khúc, đập tái với gừng, cắt xà lách + dưa leo + đồ chua, cuốn gỏi (nhiều đầu vào), pha các chén Lã Vọng.
- **Chảo chiên** (`fryer`) — lớp xa, cạnh bồn: thả chả giò → chiên nền `deep-fry` → thẻ "đã chiên" kéo ra thớt cắt chéo.
- **Lò vi sóng** (`microwave`) — lớp xa: sườn → nền 5 s → thẻ ra thớt.
- **Lò đun nước** (`burner`, `soupRecipeFor`) — thay hàng "nồi nước lèo có sẵn": kéo lần lượt cốt cua → huyết → miếng nước vô nồi nhỏ (sai thứ tự = lỗi, nồi đổ lại), đun nền → thành **vá** kéo được (1 phần), stack ≤6 trên kệ nước; phở vẫn có nồi nước sẵn. Cháo: chảo cháo → đun → vá cháo.
- **Mẹt / tô khô / dĩa dài / mâm** = loại "tô" khác trong chồng (không trụng nóng; `hotBowl` tự nhiên: `bowl-hot:` chỉ có ở món nước). `assembly[0]` quyết định thứ lấy: `tray-ready` (mẹt + giấy lót → thớt), `dry-bowl`, `dia-dai`, `chen-*-ready`.
- `povOk` → true cho cả 18 món; test: bot mô phỏng Pov (`tests/pov.test.js`, không DOM: tách logic ra `src/game/counter.js` — class `Counter` thuần state; `pov.js` chỉ vẽ + kéo thả). **Đây là việc quan trọng nhất của bước 1: tách state/DOM để test được.**

## 4. Bước 2 — World/level chạy trên quầy POV
- `World`-style: level (WORLDS/ALL_LEVELS đã có) → `Counter(level, mods)`; dùng lại **y nguyên**: `simplify` (hotBowl = chồng tô phát tô nóng; skipRinse = rọ chỉ cần `hot`; skipPrep/skipFry = thẻ đã chế biến nằm sẵn trên thớt; soupReady = vá có sẵn; toppings/maxSteps đã ở recipe), `constraints` (potSlots = số rọ; handCapacity → **số vật đang bay/cầm** = 1; brothCap; noStack), `events` (rain/vip/change-order/tour — cùng code, đổi `arrivals` thành phiếu), `goal`, `regulars`, `unlocks`, `whatsNew`, `layout` → **biến thể bố trí quầy**: `far-pot` = nồi ở góc đối diện chồng tô; `left-topping` = tủ prep đảo thứ tự khay (trái↔phải); `island` = 3 chỗ tô nhưng phiếu ≤4. Bảng ràng buộc mới cho POV: `slots: 1|2|3` (số chỗ tô).
- Bot cho par/"so với bot" → bot trên `Counter` (quy tắc: làm theo `assembly`, mỗi bước = 1 kéo; par = số kéo × 0.6 s + thời gian nền).
- Màn kết, bản đồ, tiến trình: không đổi. `main.js`: nút Chơi ở bản đồ → `startLevelPov(level)`; bếp 3D không còn là mặc định.
- Điểm & sao: giữ cách tính (tiền/goal). Thêm **điểm chất lượng mỗi tô** (Papa's): đúng thứ tự 100 %, mỗi lỗi −20, chậm hơn par×1.5 −10 → hiện dưới phiếu khi giao ("Hoàn hảo" / "Được" / "Ẩu").

## 5. Bước 3 — Giao diện art C (theo `art/ART-BIBLE.md`)
- **Nền** một tấm ký hoạ màu nước POV quầy (gen Flow theo prompt bible §5, khung 9:16 và 16:9), ba lớp tách riêng (xa: nồi/bồn/lò · giữa: tủ prep · gần: mặt thớt) để parallax nhẹ khi kéo. Vùng thả là các hình vẽ trong nền (miệng nồi, rọ, bồn, khay GN, chỗ tô) — DOM `.drop` chỉ là hitbox trong suốt đặt lên toạ độ nền (bảng toạ độ theo % trong `src/data/counter-layout.js`).
- Sprite: icon hiện có tạm dùng; gen lại bộ 3 món đầu theo bible §3 (viền trắng sticker). Tô đang ráp: lớp topping xếp theo thứ tự thật (đã có, chỉnh vị trí đẹp).
- Phiếu: giấy kẹp ghim, chữ tay (font tay hoặc ảnh chữ Kent), mặt khách ký hoạ nhỏ (khách quen có nét riêng theo `customers.js sketch`).
- UI: nền giấy, viền mực run, băng keo — bible §6. Cấm: gradient mượt, highlight bóng, hai màu mực.
- Sau khi có nền: **bỏ CSS-gradient tạm** trong `#pov`.

## 6. Thứ tự làm & tiêu chí
1. ✅ Tách `Counter` (state thuần, `src/game/counter.js`) khỏi `pov.js`; thêm thớt/chảo/lò vi sóng/lò đun nước/bồn nhúng; `povOk` = 18/18. `tests/counter.test.js` (11): bot `counterMove` làm xong cả 18 món 0 lỗi; nóng-lạnh-nóng vs trụng-một-lần bị kiểm; nấu nước sai thứ tự bị bắt; thớt gom đủ nguyên liệu mới làm; giao nhầm phiếu bị bắt; cờ rút gọn + ràng buộc level dùng lại được; sợi để lâu hư; khách bỏ đi.
   **API cho bước sau**: `new Counter({dishes, rounds, simplify, constraints:{slots,potSlots,brothCap,noStack,boards}, burners, patience, gap, weights, ev})` · `C.drop(src, zone)` với src `{kind:'item'|'basket'|'hotbowl'|'board'|'fryer'|'microwave'|'sink'|'ready'|'burnerpot'|'broth'|'madebowl', tok?, i?}` và zone `{kind:'pot'|'sink'|'prep'|'fryer'|'microwave'|'burner'|'slot'|'ticket'|'trash', i?, id?}` · `C.update(dt)` · `counterMove(C)` (bot/par).
2. Level chạy trên Counter: `startLevelPov`; simplify/constraints/events/goal/layout đủ; smoke: chơi Phở 1 bằng bot-DOM (chạm đôi) → kết quả có sao; Phở 9 (1 rọ) và Bún riêu 3 (nấu nước) chạy.
3. Art C: nền + hitbox theo toạ độ; ảnh chụp 3 màn (bản đồ, quầy, kết) gửi Kent duyệt trước khi gen sprite hàng loạt.
4. Juice: tiếng theo vật (thả tô = cạch, rọ vô nồi = xèo, trút sợi = soạt, vá nước = ục), ghost nghiêng theo hướng kéo, phiếu rung khi sắp hết kiên nhẫn, tô rung + sáng khi đủ.
5. Bếp 3D → tab Thêm "Bếp thật" (giữ nguyên code, không xoá); CHANGELOG 0.9.0; STATUS; deploy.

Định nghĩa xong: Kent chơi Phở 1→5 bằng ngón tay cái trên điện thoại không cần đọc hướng dẫn, nói "muốn chơi tiếp".

## 6b. Ghi chú kỹ thuật bắt buộc (Kent báo từ điện thoại)
- **Chặn Back bằng cử chỉ**: `html, body, #pov { overscroll-behavior: none }` (Chrome Android: quẹt ngang không thành Back, kéo xuống không Reload) + `touch-action: none`; JS: khi vào màn chơi `history.pushState`, `popstate` khi đang chơi → pushState lại + toast "dùng nút ‹" (đã làm 0.8.4). iOS Safari quẹt từ mép trái không chặn được bằng web — chỉ hết khi cài PWA (standalone); game nhắc một lần. Mọi màn chơi mới (Counter POV) phải gọi `armBackGuard()`.
- **Chữ tay**: Kent không dùng chữ viết tay thật → dùng font chữ tay tiếng Việt có đủ dấu (ưu tiên Google Fonts hỗ trợ Vietnamese: "Patrick Hand", "Itim", "Baloo 2" cho tiêu đề; kiểm tra dấu ă/ơ/ư hiện đúng). Artifact claude.ai chỉ cho fonts.googleapis.com; bản Pages nhúng font file vào `public/` để offline.

## 7. Không làm
Không sửa sim-data/công thức; không bỏ chạm-là-đi 3D (chỉ chuyển sang Thêm); không đổi art khỏi hướng C; không tự viết thoại khách quen mới; không thêm món ngoài 18 món sim-data.


---

## Bước 2 ✅ + bước 3 (một phần) — 14/09

**Bước 2 xong**: level chính chạy ở Quầy POV. `Counter` nhận `arrivals` (lịch khách của level), `goal`, `moneyTargets`, tính tiền/tip/sao/chuỗi y như `World`. Test mới `tests/counter.test.js` chạy bot qua **cả 124 level**. Bếp 3D còn nguyên, vào bằng tab **Thêm → Luyện tập → Bếp thật (3D)**, hoặc `?bep3d=1`.

Ba lỗi đã sửa khi làm bước này:
1. Bot đứng hình ở mọi bản tập — `findReady` không biết `shelfSubs` (bản tập lấy tô ở kệ là ra thẳng tô nóng, token `bowl-hot:*` không nằm trong `D.items`).
2. Bot loop ở 4 level nước nấu sẵn — `soupMove` vẫn cố nấu khi `sim.soupReady`; giờ chặn hẳn.
3. Màn kết ngày đọc `world.shift` của bếp 3D trong khi đang chơi quầy — giờ nhớ `povLevel` riêng, và bỏ cột "so với bot" (quầy không đi lại nên so lộ trình là vô nghĩa).

**Bước 3 mới làm một phần**:
- Bếp 3D thành phần phụ thật sự: `set3D()` ẩn hẳn `#app` VÀ ngưng `view.sync/render` khi không chơi nó. Trước đây canvas 3D luôn chạy làm nền menu — đó là lý do chơi xong một level lại "thấy 3D".
- Nền 2D `#bg2d` (giấy kẻ ô + vệt màu nước, thuần CSS nên không phải tải ảnh), `.overlay` trong suốt khi `body.flat`.
- Quầy POV đổi sang hệ màu giấy art C; ô ráp tô to lên `min(30vw,150px)`.
- `src/game/art.js` + `public/art/*.webp`: tô của mỗi món hiện **ảnh art C thật** trong ô ráp, `-dry` → `-wet` khi đã chan nước. Chỉ vẽ khi còn đúng một món khớp; không có ảnh thì tự quay về icon cũ (`onerror` gỡ thẻ img) nên không bao giờ vỡ giao diện.

**Còn lại của bước 3**: nền từng trạm bằng ảnh (nồi/bồn/chảo/lò), vùng thả theo % trong `counter-layout.js`, mặt khách lên phiếu, và ráp animation A10 (tay cầm vá) vào lúc chan nước thật trong game.


## Nhịp khách ở quầy — 14/09 (Kent: "tần suất khách xuất hiện ít quá")

Đúng là do level. Lịch khách trong `data/worlds.js` canh cho **bếp 3D** (còn phải đi lại); bê nguyên qua quầy thì khách thưa gấp đôi. Đo thật:

| | lịch cũ | lịch quầy |
|---|---|---|
| Khách đầu tiên (pho-1) | giây 38 | giây 4 |
| Thời gian có ít nhất 1 phiếu treo (TB 124 level) | 48 % | 86 % |
| Số phiếu treo trung bình | 0.59 | 1.10 |
| Bot để khách bỏ đi | 0.6 % | 0.6 % |

Cách làm: `povArrivals(level)` **giữ nguyên nhịp** của level (đợt dồn, khách đôi, boss) nhưng **nén cả trục thời gian** cho khớp tốc độ thật của quầy. Tốc độ thật đo bằng bot, để trong `src/data/pace.js` (`POV_SECONDS`, giây/tô cho từng món: 4.8 s gỏi cuốn → 25 s bún cá Hải Phòng). Chỉ nén, không bao giờ giãn ra. Bản tập nhân thêm 0.62 vì bỏ bớt bước nên làm nhanh hơn.

`tests/counter.test.js` giữ ba chốt: bảng giây/tô lệch >40 % so với bot là fail; khách đầu phải tới trước giây 6 ở cả 124 level; và nén xong bot vẫn không để mất quá 1/3 khách ở bất kỳ level nào.

### Hai lỗi bot lộ ra khi đo
1. `counterMove` chỉ làm **phiếu đầu tiên** — phiếu đó chờ nồi là bot đứng im dù phiếu khác có việc. Giờ duyệt mọi phiếu, lấy nước đi đầu tiên hợp lệ (đúng kiểu làm song song ở tiệm).
2. Hết chỗ ráp tô thì bot **đổ đại vào tô của phiếu khác** (`Math.max(0, findIndex)` trả 0 khi không còn chỗ) → tự sinh lỗi. Giờ hết chỗ thì chờ.
Kèm theo: lỗi không gắn với tô nào thì chỉ ghi vào `errors`, không đổ cho `tickets[0]` nữa — chơi song song mà đổ lỗi cho phiếu đầu là sai chất lượng.

## Art đã vào game
- Mặt khách (`cus-*`) hiện trên phiếu — khách quen đúng mặt, khách lạ rải theo id phiếu.
- **A10 chan nước chạy thật trong game**: thả nước lèo vào tô → tay cầm vá trượt vào, nghiêng 30°, dòng nước chảy xuống mặt nước rồi rút ra; tô đổi `-dry` → `-wet`. Thông số lấy thẳng từ `counter-layout.js` (số Kent duyệt trên demo). Tôn trọng `prefers-reduced-motion`.
