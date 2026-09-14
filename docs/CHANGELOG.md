# CHANGELOG — Quán Bún

## 0.0.1 — 2026-09-12 · Prototype khối tạm, ca 1, phở tái nạm
### Có
- Bếp 3D blockout theo `KITCHEN` trong config (kệ sợi, kệ tô, nồi trụng, bồn xả, nước phở, kệ thịt, kệ rau, quầy ráp 2 tô, quầy giao, 3 ghế).
- Đầu bếp chạm-là-đi, hàng đợi 3 việc, cầm 2 thứ; kệ tự chọn thứ cần nhất (ưu tiên tô đang làm), trả lại kệ thứ không cần.
- Quy trình phở thật: trụng (nền 4 s) → xả lạnh (2 s) → trụng lại (1.5 s); tô trụng 1.5 s; ráp 8 bước đúng thứ tự; múc nước phở.
- Khách 3 loại với kiên nhẫn khác nhau, tip theo tốc độ, bỏ đi khi hết kiên nhẫn (tô của họ bị dọn).
- Ca 150 s, kết quả 3 sao theo tiền + số khách bỏ đi.
- Test: 11 unit test (adapter công thức đúng với sim-data cho phở/bún bò/phở đặc biệt; world + bot nấu và giao đúng thứ tự; luật sai thứ tự; khách bỏ đi) và smoke test Chromium landscape + portrait, 0 lỗi console.

### Đã sửa trong lúc làm
- `reset()` xoá nhầm quầy ráp vì id `counter` bắt đầu bằng `c` như khách `c0` → đổi khoá khách thành `cust:*`.
- Kệ lấy trùng đồ / lấy đồ cho khách chưa có tô → chef kẹt tay đầy → thêm mức ưu tiên và trả đồ về kệ.
- Camera khớp theo tỉ lệ màn hình (portrait thấy hết bếp nhưng nhỏ — cần bố trí bếp dọc riêng cho mobile).

### Còn thiếu / câu hỏi thiết kế cần chơi thử
- 20 lượt chạm / tô có quá nhiều không? Ứng viên gộp: lấy tô + trụng tô thành một; hành tây + ngò + hành lá thành "rau phở" (nhưng bếp thật bỏ 3 lần — phải hỏi Kent).
- Chưa có: nâng cấp, chọn ca, lưu tiến độ, âm thanh, sắp bếp, phở đặc biệt/bún riêu/bún bò (dữ liệu đã có, chỉ cần thêm vào `SHIFTS.dishes` + trạm còn thiếu như bếp đun nước riêu).
- Chưa có model/ảnh thật; chưa có animation đầu bếp.
- Portrait cần layout bếp dọc.

## 0.0.2 — 2026-09-12 · Phản hồi "nhiều lỗi, không đúng trình tự, không tự nhiên"
- **Kệ không tự đoán nữa.** Mỗi nguyên liệu trên kệ là một ô chạm riêng có nhãn; chạm cái nào lấy đúng cái đó (kể cả thứ không cần — đó là bài tập nhớ). Chạm lại thứ đang cầm = trả về kệ. Bỏ hoàn toàn cơ chế "tự chọn thứ cần nhất" và "tự trả kệ" vì nó làm người chơi không hiểu tay mình đang cầm gì.
- **Mỗi tô trên quầy là một ô chạm riêng** (vòng tròn đánh dấu). Bỏ đúng thứ tự thì vào; thứ thuộc món nhưng chưa tới lượt → lỗi có tag rõ: "Ráp sớm: Hành lá — tiếp theo phải là Nạm"; thứ không thuộc món → "Không có trong Phở Tái Nạm: Lá sách". Không mất nguyên liệu.
- **Sai trạm** có báo: đem sợi chưa trụng tới bồn → "Sai trạm: Sợi phở phải đem tới Nồi trụng".
- Nồi/bồn: thả thứ cầm trước (FIFO), toast ghi rõ "Trụng sợi lần 1: Sợi phở".
- Khách bỏ đi thì **tô đang làm giữ lại** (như bếp thật), tự gắn cho khách sau gọi cùng món.
- Lỗi lưu thành danh sách `errors[{t, tag}]` trong kết quả ca — nền cho phần Tiến độ.
- Thêm nút **"Xem bot làm mẫu"** (hoặc `?bot=1`): bot chơi đúng thứ tự thật để xem; chạm màn hình là giành lại quyền chơi.
- Hitbox to hơn cho ngón tay.
- Test: 13 unit (thêm: kệ lấy đúng thứ chạm/trả lại; sai trạm; tô giữ lại khi khách đi) + smoke test 0 lỗi.

## 0.0.3 — 2026-09-12 · Phản hồi từ điện thoại (ảnh chụp): chữ chồng, màn dọc dư trên dưới, cầm 2 thứ tới nồi không biết bỏ gì
- **Bố trí bếp dọc riêng** (`KITCHEN_PORTRAIT`, 6 × 11 m) cho điện thoại: nồi/bồn/nước phở hàng trên, kệ hai bên dọc, quầy ráp giữa, quầy giao + ghế dưới. Tự chọn theo hướng màn hình; xoay máy giữa ca thì giữ tới ca sau.
- Nhãn: kệ đặt theo cạnh dài để nguyên liệu xếp dọc, nhãn nguyên liệu nhỏ có nền tối, tên kệ chuyển thành chữ nhỏ ở mép; camera nghiêng 58° ở màn dọc.
- **Thuật toán trạm viết lại theo bảng quyết định `docs/INTERACTIONS.md`**: tới nồi/bồn thì thả *tất cả* thứ áp dụng được (chạy nền trước, đứng làm sau, cộng dồn thời gian), rồi lấy đồ đã xong nếu tay còn chỗ; không có gì làm thì giải thích đúng lý do (sai trạm / còn N giây / tay đầy / không liên quan). Ví dụ [tô, sợi] → sợi vào trụng nền + trụng tô ngay, không còn mơ hồ.
- Test: 16 unit (thêm 3 ca theo bảng quyết định §2), smoke ngang + dọc 0 lỗi.

## 0.0.4 — 2026-09-12 · Thùng rác + bộ model Blender thay khối tạm
- **Thùng rác** (`trash`): vứt hết đồ trên tay kể cả tô dở; không tính lỗi thứ tự, ghi `Vứt: …` + đếm lãng phí trong kết quả. Có ở cả hai bố trí.
- **Đồ hoạ**: `art/scripts/build_kitchen.py` dựng toàn bộ model trong Blender (bevel bo góc kiểu đồ chơi, flat shading) → `public/models/kitchen.glb` (kệ, nồi, bồn, bếp nước lèo, quầy ráp, quầy giao, ghế + bàn, thùng rác, ô gạch sàn, ô tường), `chef.glb` (chibi có tay/đầu tách rời để animate bằng code), `customers.glb` (cô công sở búi tóc, bác xe ôm đội nón, du khách đội mũ đeo ba lô), `items.glb` (27 nguyên liệu/token + tô + 9 lớp ráp bật dần theo thứ tự).
- Ánh sáng theo hồ sơ "toy miniature" của 3dviz-pro-max: key ấm 3.0 ở 55°/az 300, fill hemisphere 1.1, rim 0.8, nền tối hơn sàn một stop, sương nhẹ, vignette. Khói bốc từ nồi và bếp. Chạm có gợn sóng + trạm nhấp nháy.
- Đầu bếp: nhấp nhô khi chạy, vung tay, khom khi làm, giơ tay khi cầm đồ; đồ cầm gắn vào điểm `Chef_Carry`. Khách lắc đầu khi sốt ruột.
- Bản một file/Artifact nhúng GLB dạng data URI (≈2.1 MB).
- Sửa: GLTFLoader bỏ dấu chấm trong tên (`Station_pot.001` → `Station_pot001`) — loader tự cắt hậu tố; script Blender dọn object cũ trước khi dựng lại.
- Test: 17 unit + smoke ngang/dọc 0 lỗi.

## 0.0.5 — 2026-09-12 · Đi đường tránh vật cản, hitbox chuẩn, khách kẹt hình
- **Đường đi**: `src/game/nav.js` — lưới 0,25 m, vật cản = footprint trạm/ghế/bàn nở 0,28 m, A* 8 hướng không cắt góc, kéo thẳng đường. Đầu bếp đi vòng quanh quầy ráp/thùng rác thay vì xuyên qua. Chỗ đứng của trạm tự chọn ô trống **tới được** gần điểm ưu tiên (không còn chỗ đứng kẹt trong vật cản).
- Bố trí dọc rộng 7 m để hai bên quầy ráp có lối đi ≥ 0,6 m; thùng rác chuyển sát quầy ráp (nơi hay phát hiện lấy sai).
- **Hitbox** thu về đúng hình: ô nguyên liệu = đúng phần kệ của nó từ mặt kệ tới nhãn; tô = vòng tròn trên quầy; trạm = thân trạm tới đỉnh. Xem hitbox bằng `?hit=1`.
- **Khách ăn xong vẫn kẹt hình / khách mới dùng chung thanh kiên nhẫn**: CSS2DRenderer không xoá phần tử DOM khi object rời scene → bong bóng và thanh kiên nhẫn cũ đứng nguyên tại ghế. Thêm `dispose()` gỡ DOM cho khách, lớp tô, đồ trên tay, reset ca. Smoke test kiểm số bong bóng ≤ số khách đang chờ.
- Test: 22 unit (thêm nav: mọi chỗ đứng tới được ở cả 2 bố trí, đường không cắt footprint) + smoke ngang/dọc + ảnh hitbox.

## 0.0.6 — 2026-09-12 · Thùng rác gọn hơn, bot tận dụng lúc trụng nền
- **Thùng rác** dời vào khe giữa kệ sợi và kệ tô (cả bố trí ngang lẫn dọc) — không chiếm lối đi nữa; chỗ đứng vẫn tới được (kiểm bằng nav grid).
- **Trụng lần 1 vốn là việc nền** (`blanch-noodle` passive): thả sợi vào nồi rồi đi làm việc khác, vòng tròn xanh thì quay lại lấy. Chỉ xả lạnh và trụng nóng lại phải đứng làm. Bot làm mẫu giờ cũng tranh thủ đi lấy đồ (thịt, rau, tô) trong lúc sợi đang trụng thay vì đứng chờ.
- Test: 22 unit pass, smoke ngang/dọc 0 lỗi.

## 0.0.7 — 2026-09-12 · Nồi theo bếp thật, hai ô tay, bot làm nhiều tô
### Kent nói về bếp thật (đã đưa vào game)
- Tô trụng nóng **trữ trong nồi** được, tối đa **5**, để bao lâu cũng được → `blanch-bowl` giờ chạy nền, tô nằm trong nồi tới khi cần.
- Sợi trụng lần 1 tối đa **3 rọ**; sợi (phở/bún) để lâu **bị hư, phải đem vứt** → sau `POT.noodleSpoilAfter` (tạm 15 s, Kent chưa chốt số thật) rọ chuyển đỏ ✖, lấy ra thành "Sợi hư (vứt)", chỉ thùng rác nhận; tính lãng phí, không tính lỗi thứ tự.
- Nồi có **3 ô rọ + chồng tô** chạm riêng (`pot:0..2`, `pot:bowl`) — 2 rọ cùng chín thì chọn lấy rọ nào; chạm thân nồi vẫn lấy gộp như cũ. Vòng tròn xếp so le để không chồng nhau trên màn dọc.
### HUD & luật
- **Hai ô tay** dưới đáy màn hình hiện thứ đang cầm; nút **×** → đầu bếp đi tới thùng rác vứt riêng thứ đó (`trash:i`), chạm × lần nữa = huỷ.
- Quầy ráp: cầm sẵn đồ cho bước sau trong lúc bỏ bước này **không còn bị tính "Ráp sớm"** — chỉ lỗi khi không bỏ được gì. (Trước đó bot cầm nạm + tô đi mở tô mới bị phạt oan.)
- Về "cầm 2 thứ giống nhau": kệ không cho lấy trùng (chạm lại = trả); 2 phần giống nhau chỉ xuất hiện khi lấy 2 rọ sợi từ nồi — là chủ đích khi làm 2 tô. Ô tay giúp nhìn rõ.
### Bot làm mẫu
- Làm **nhiều tô song song**: tô nào đang chờ nồi thì chuyển sang tô khác / mở tô mới cho khách kế; chỉ lấy trước 1 thứ để chừa 1 tay lấy đồ trong nồi; lấy đúng rọ/chồng tô; tự lấy sợi hư đi vứt.
- Test: 25 unit (thêm: vứt riêng ô tay, sức chứa nồi 3+5, sợi hư), smoke ngang/dọc + kiểm HUD tay + ảnh nồi đầy.
### Ghi chú / hỏi Kent
- Sợi để bao lâu thì hư ngoài đời? (game tạm 15 s sau khi chín.) Tô trụng có cần thời gian trụng hay chỉ cần nằm trong nồi nóng?

## 0.0.8 — 2026-09-12 · Đầu bếp có rig + animation, lấy 2 thứ giống nhau
- **Đầu bếp mới** (`art/scripts/build_chef_rig.py`): mesh chi tiết hơn (nón bếp có nếp, ria, má hồng, khăn cổ, tạp dề có túi, cúc áo, cổ tay áo, giày) gắn Armature 13 xương, rigid skinning kiểu đồ chơi. 5 clip qua NLA track: **Idle, Walk, Carry, CarryIdle, Work**. `view.js` dùng `AnimationMixer` + crossfade theo trạng thái (đi / đi cầm đồ / đứng làm / đứng cầm / đứng không), tốc độ bước theo `CHEF.speed`. Đồ cầm gắn vào xương `Carry` nên đung đưa theo tay.
- **Kệ: lấy 2 cái giống nhau được** (2 tô cho 2 khách). Tay đầy chạm lại thứ đang cầm = trả về kệ; muốn bỏ 1 thứ dùng × ở ô tay. Bot chỉ trả đồ về kệ khi tay đầy.
- Smoke test kiểm 5 clip nạp được.
### Tiếp theo (đồ hoạ)
- Khách có rig + animation (ngồi chờ, ăn, bực); sợi/tô thấy được trong nồi & trên quầy; nước sôi, khói, tiền bay; texture sàn/tường.

## 0.0.9 — 2026-09-12 · Nồi không vét hết, chuẩn bị 10 s, bot làm song song thật, nút Tự chơi
- **Sửa lỗi nồi**: chạm thân nồi trước đây lấy hết mọi thứ đã xong (Kent bị lấy 2 tô cùng lúc). Giờ: đã thả đồ vào thì không tự lấy gì ra; chạm thân nồi tay trống → lấy **1 thứ** (sợi ngon trước); việc đứng làm xong → chỉ lấy đúng kết quả việc đó. Muốn lấy đúng cái nào → chạm rọ/chồng tô.
- **Chuẩn bị** (`RULES.prepSeconds` = 10): đếm ngược to giữa màn hình, đồng hồ ca chưa chạy, khách chưa tới; được trụng tô/sợi sẵn.
- **Bot**: (1) lúc chuẩn bị trụng sẵn 2 tô; (2) cầm thứ cần nấu nền → thả vào nồi ngay; (3) tay trống mà tô khác cần thứ nấu nền (nhìn trước 2 bước) → lấy trước cho nồi chạy song song; (4) sắp đem 1 phần đi nồi mà tô khác cũng cần → lấy 2 phần; (5) sắp bỏ vào tô mà tay còn chỗ → gom thêm thứ kế tiếp trên kệ. Ca 1: 5 khách, 1 bỏ (bác xe ôm 30 s tới đúng lúc đang giữa tô khác — cân bằng, không phải bot).
- **Nút "Tự chơi ▶"** khi xem bot: chạm màn hình không còn cắt ngang bot; bấm nút để cầm lái.
- Test: 26 unit (thêm: chuẩn bị), smoke ngang/dọc.

## 0.0.10 — 2026-09-12 · Thử nghiệm: kệ kiểu card (bật/tắt)
- Menu có 2 tuỳ chọn (nhớ trong máy): **Kệ kiểu card** — kệ chỉ có tên và 1 ô chạm cả kệ; chạm → đầu bếp đi tới → card trượt lên từ đáy (không chặn bếp, đồng hồ vẫn chạy) → chọn tối đa số chỗ trống trên tay → "Lấy". Đóng × = không lấy. Việc xếp sau vẫn chờ tới khi đóng card. **Ẩn tên trên card** — chỉ còn hình để tự nhớ.
- Cũng mở bằng `?card=1`, `?hidename=1`. Bot không dùng card (vẫn chạm từng món). Kệ thường giữ nguyên khi tắt.
- Thứ tự trên card = thứ tự `items` trong config; Kent nói kệ ở chỗ làm cố định → chờ ảnh kệ thật để xếp card đúng vị trí thật.
- Test: 27 unit (thêm luồng card), smoke có bước chạm kệ → card → lấy 2 thứ.

## 0.0.11 — 2026-09-12 · Ảnh item thật (Flow), card chọn 2 cái giống nhau
- **12 ảnh item** gen bằng Google Flow qua flowkit (`art/items_raw2/*.jpg`, prompt kiểu "3D low-poly toy miniature, matte clay" trên nền magenta chroma-key) → `scripts/process_icons.py` tách nền theo màu 4 góc, gỡ trộn màu, cắt sát, 256² PNG → `public/icons/`. `scripts/gen_icons_map.mjs` sinh `src/game/icons.js`; `scripts_single.mjs` nhúng base64. Bài học: nền trắng không tách được vật thể trắng (sợi, tô) → dùng magenta.
- Card và **ô tay** dùng ảnh thật thay emoji (token đã chế biến dùng ảnh nguyên liệu gốc).
- **Card chọn trùng**: chạm 2 lần = 2 cái giống nhau (badge ×2), nút − để bớt; đầy rồi chạm ô khác = thay cái cũ nhất.
- Ô tay dời lên khỏi dòng gợi ý.

## 0.1.0 — 2026-09-12 · Bốn món, bếp lớn dần theo ca, chill hơn, nhạc nền
- **4 ca / 4 món**: Ca 1 phở tái nạm · Ca 2 + phở đặc biệt (lá sách, bò viên trụng ở nồi) · Ca 3 + bún riêu cua (kệ riêu: cà chua, đậu hũ, tôm; nồi nước riêu) · Ca 4 + bún bò Huế (bún cọng to trụng 1 lần, kệ bún bò: thịt luộc, bắp bò, chả lụa, chả rế; rau răm; nồi nước bún bò). Chọn ca ở menu, "Ca tiếp →" sau khi hết ca. Dữ liệu vẫn 100% từ `sim-data.js`.
- **Nước lèo theo nồi**: token `broth:<action>` — nước phở chan vào bún riêu = lỗi "Không có trong Bún Riêu Cua: Nước phở". Ba nồi nước riêng.
- **Trạm có `dishes`** chỉ xuất hiện khi ca có món đó → ca 1 bếp gọn như cũ, ca 4 thêm 2 kệ + 2 nồi. Kệ rau chuyển thành kệ ngang giữa bếp, nhãn so le.
- **Chill**: kiên nhẫn khách ×2 (90/70/130 s), ca 180 s, sợi hư sau 25 s, mục tiêu tiền nâng theo. Bot làm mẫu đạt 3 sao cả 4 ca, 0 lỗi, 0 lãng phí.
- **Nhạc nền ambient** (WebAudio, ngũ cung, 72 bpm, pad + gảy + shaker) + tiếng động nhẹ (lấy, thả, xong, ráp, chuông giao, chuông khách, lỗi). Nút 🔊 góc dưới trái, nhớ trạng thái.
- Bot: vứt riêng sợi hư (`trash:i`), không lấy trước sợi khi đã có phần trong nồi, chỉ lấy sợi cho tô sau khi tô này còn ≤ 4 bước (đỡ hư).
- Chưa có: lớp model 3D trong tô cho nguyên liệu mới (dùng viên màu tạm), ảnh Flow cho 8 nguyên liệu mới (đang gen), bước chuẩn bị nước lèo đầu ca (bếp thật có: cốt cua + huyết + nước + đun — ứng viên cho giai đoạn chuẩn bị).
- Test: 30 unit (thêm: ca 4 nấu đủ 4 món đúng thứ tự & đúng nước lèo, bếp lớn dần, nước phở không vào bún riêu), smoke có ảnh ca 4 ngang/dọc.
- Ảnh Flow cho 8 nguyên liệu mới (cà chua, đậu hũ, tôm, thịt luộc, bắp bò, chả lụa, chả rế, rau răm) → 20/20 nguyên liệu có ảnh.

## 0.1.1 — 2026-09-12 · Một kệ topping, lò đun nước lèo (theo bếp thật của Kent)
- **Kệ**: bỏ kệ thịt / kệ rau / kệ riêu / kệ bún bò riêng → **một kệ topping chung** (bếp thật chỉ có một kệ cho cả rau lẫn thịt). Kệ chỉ bày nguyên liệu các món trong ca + lá sách, bò viên gây nhiễu (`alwaysShow`). Card mode giờ là mặc định (15 món trên một kệ hợp với card hơn), vẫn tắt được.
- **Nước lèo**: nước phở có sẵn trên nồi; nước riêu / bún bò phải **nấu ở lò đun** (2 bếp, hiện từ ca 3): chạm bếp lò trống → card chọn nguyên liệu **theo thứ tự cho vào nồi** (cốt cua → huyết → nước; nước bún bò → huyết → nước — đúng `extraStages` sim-data) → Đun 6 s nền → múc được 4 phần → hết thì nấu nồi mới. Sai thứ tự / sai bộ = lỗi có tag riêng. Nước cá là thứ gây nhiễu trên card.
- Bot biết khi nào cần nấu nước lèo (chưa có nguồn → tới lò trống → tự chọn đúng công thức), 3 sao cả 4 ca.
- Ảnh Flow cho 5 nguyên liệu nước lèo (cốt cua, huyết, miếng nước, nước bún bò, nước cá) → 25 ảnh.
- Test: 32 unit (thêm: lò đun sai thứ tự / đúng / hết phần; ca 1 kệ chỉ có đồ phở + gây nhiễu), smoke có bước card nước lèo.

## 0.1.2 — 2026-09-12 · Hàng rọ trên nồi thẳng đều
- Kent hỏi có phải chạm đúng vị trí mới lấy được sợi/tô và thấy 2 icon so le không đều → bỏ xếp so le: nồi rộng 2 m, **3 rọ + chồng tô nằm một hàng ngang**, rọ trống hiện vòng mờ nét đứt (để biết chỗ chạm), chồng tô trống hiện 🥣 mờ. Nhãn "Nồi trụng" dời xuống mặt trước nồi.
- Nhắc luật: chạm đúng rọ = lấy đúng rọ đó; chạm chồng tô = 1 tô; chạm thân nồi = thả đồ trên tay (không tự lấy ra) hoặc lấy 1 thứ khi tay trống.

## 0.2.0 — 2026-09-12 · Tổng kết để tối ưu, luyện đơn lẻ, rush, tiến độ nhớ món
- **Bảng tổng kết sau ca**: đứng nghĩ (giây rảnh khi có khách chờ), số chạm, trung bình/tô, vứt/hư; từng tô: thời gian từ lúc khách tới → giao, **so với bot** (par tính bằng cách cho bot làm đúng món đó trên đúng bếp này), lỗi, chạm; danh sách lỗi thứ tự có mốc giây; **lộ trình nhanh nhất** (chuỗi trạm của bot) cho tô chậm nhất so với bot; chip tiến độ từng món.
- **Luyện đơn lẻ** (5 đơn nối tiếp, không giới hạn giờ, món ra theo trọng số — món hay sai ra nhiều) và **Rush 3 đơn** (3 khách cùng lúc, 240 s) bên cạnh Mở hàng.
- **Tiến độ nhớ món** (`mastery.js`, localStorage): số tô, tô sạch, chuỗi sạch, nhanh nhất, lỗi gần đây. ≥ 3 tô sạch liên tiếp = "thuộc" → card tự ẩn tên nguyên liệu khi mọi món trong ca đã thuộc. Nút Xoá tiến độ trong menu.
- **Tô theo loại**: `bowl-hot:pho-bowl` / `bowl-hot:soup-bowl` — bún riêu / bún bò phải dùng tô món nước; dùng tô phở = lỗi "Sai tô". Chạm chồng tô lấy đúng loại khách đang cần; bot lấy `pot:bowl.<loại>`.
- `docs/OPTIMIZE.md` (sinh bởi `scripts/gen_optimize.mjs`): nguyên tắc xếp việc + lộ trình bot cho từng món — cheat sheet để áp dụng ngoài đời.
- World ghi `stats` (tô, idle, taps, trips); `shift.drill/drillCount/weights/patience` per arrival.
- cooking-note: thêm `menu.js` (56 món chép từ ảnh menu nhà hàng, ghi chú tay của Kent giữ nguyên, chưa xác nhận) + tab 🧾 Thực đơn; SW v0.42.0; AGENTS.md mục 12.

## 0.2.1 — 2026-09-12 · Đồng bộ sim-data: thêm V4/V5/V6 (món khô)
- Kent kể Level 1 cho Bún nem cua/thịt nướng/tôm nướng (V4), Bún gà nướng (V5), Bún chả Hà Nội (V6) → thêm vào cooking-note (sim-data, recipes, level1, menu) và chép sang game. Game CHƯA chơi được món khô: cần trạm mẹt (tray), thớt (board), token '@finish' (hết Level 1, không có nước lèo). Ứng viên bước tiếp nếu Kent muốn luyện món khô trong game.

## 0.3.0 — 2026-09-12 · Đủ 16 món có quy trình (ca 5–9), thớt, lò vi sóng, mẹt, tô khô, cháo
- **Adapter công thức tổng quát** (`recipes.js`): mỗi extraStage → một phép biến đổi giữ nguyên bước (không gộp, trừ "cho vào rọ"/"để ráo" dính vào bước trụng), `inputs` nhiều thứ, `requiresAny` (rau muống | cần nước), `bowl-ready` = tô nóng bất kỳ, alias token trùng nghĩa (bh-bun-ready = dry-bun-ready). Chuỗi nước lèo/cháo (put → add → heat-*) → công thức lò đun; token nước = output của heat-*. Chuỗi ráp bỏ `@finish`; ô quầy mở bằng token đầu chuỗi (`opener`).
- **Trạm mới**: Thớt (2 thớt, gom đủ nguyên liệu rồi làm), Lò vi sóng. Lò đun nấu cả cháo. Kệ tô có tô khô, tô phụ, dĩa, mẹt, giấy lót, chảo; kệ sợi có bánh đa, bánh hỏi; kệ topping đủ 46 thứ (chỉ bày thứ ca cần).
- **Ca 5–9**: Món khô (bún đậu, bánh hỏi, bún chả HN, V4, V5) · Phở nâng cao (tái đập, sườn tái) · Hải Phòng (bánh đa cua, bún cá) · Cháo (lòng, sườn) · Chả cá Lã Vọng. Khách kiên nhẫn 170 s, tới thưa hơn.
- Bot: gom nhiều nguyên liệu cho thớt qua nhiều chuyến, quay lò vi sóng, không thả bún sống của bún đậu vào nồi, tự trả đồ về kệ khi tay đầy mà bước kế không lấy được. Làm được cả 16 món đơn lẻ trên 2 bố trí, 0 lỗi; chả cá 60–90 s/phần (7 chén).
- `docs/OPTIMIZE.md` giờ có lộ trình cho cả 16 món. Ảnh Flow cho 40 nguyên liệu mới (đang gen).
- Test: 35 unit (thêm: 16 món × 2 bố trí, thớt thiếu/đủ, mẹt mở quầy), smoke có ca 5.

## 0.4.0 — 2026-09-12 · Level thay ca, điểm → trang trí quán, Survival, Luyện tập chọn món
- **Level 1–9** (dữ liệu cũ của 9 ca): đạt ≥1★ mở level kế; sao tốt nhất mỗi level lưu (`progress.js`, localStorage `qb.progress.v1`). `?level=N` / `?all` (dev) bỏ khoá.
- **Điểm** = tiền + tip mỗi lần chơi (mọi chế độ; survival ×1.5) + 60 mỗi sao mới. Tab **Trang trí**: 8 món (cây cảnh, đèn lồng, bảng hiệu, tranh, gạch hoa, bể cá có cá bơi, sơn tường vàng, chậu mai) — `view.buildDecor`, chỉ là "áo", không hitbox.
- **Survival**: đủ 16 món, khách tới mãi (gap 42 s → 18 s, giảm 1.5 s mỗi khách), kiên nhẫn 170 s, 3 khách bỏ đi là hết; đồng hồ đếm lên; kỷ lục lưu (khách · thời gian · tiền).
- **Luyện tập**: chọn món trong 16 (lưu), nút chọn hết / món chưa thuộc; Luyện đơn lẻ 8 đơn, Rush 3 đơn theo món đã chọn.
- **Sợi theo LOẠI**: token `noodle-blanched:<sợi>` / `noodle-rinsed:<sợi>` / `noodle-drained:<sợi>` (bún ≠ phở ≠ bánh đa ≠ bún cọng to) — trước đây một token chung nên bày đủ menu bị lẫn. `transformAt` ưu tiên đường đi của món khách đang chờ (bún: nóng→lạnh→nóng cho V4/V5/V6 vs trụng 1 lần cho bánh hỏi).
- **Bếp thật Kent xác nhận 12/09**: bún khô V4/V5/V6 trụng **nóng → xả lạnh → nóng lại**; rau mẹt bún chả = bộ bún đậu; 3 miếng dưa leo đặt **sau** bún; nồi nước lèo ở lò = 4 tô. Đã cập nhật cooking-note (`sim-data.js` bỏ `todo`, `recipes.js`, `level1.js`, AGENTS.md, SW v0.44.0) và `src/data/sim-data.js`.
- `par.js` ép `survival:false` (trước đó tính par với shift survival ra món ngẫu nhiên). Tests 38 + smoke (menu/decor, survival).

## 0.4.1 — 2026-09-12 · Menu gọn (carousel level), bánh hỏi nóng→lạnh→nóng
- **Menu đầu game** viết lại cho gọn (Kent: "hơi bị rối"): đầu = tên + điểm; 4 tab dạng segmented (Level · Survival · Luyện · Quán); level là **carousel** một thẻ với ‹ › (bấm hoặc vuốt), chấm tiến độ (đỏ = đang chọn, vàng = đã có sao); thẻ khoá ghi cần gì để mở; "Cách chơi · tuỳ chọn" gấp lại dưới cùng (kệ card, ẩn tên, xoá tiến độ). Vừa một màn điện thoại.
- **Bánh hỏi** (Kent xác nhận): bánh hỏi trụng nóng → xả lạnh → nóng lại, bún kèm cũng vậy → sim-data đổi `blanch-banh-hoi` thành chuỗi load/blanch/cold-rinse/reblanch/drain (token `banh-hoi-*` → game `noodle-*:banh-hoi`); cooking-note recipes/level1/AGENTS, SW v0.44.1.
- `?shift=N` / `?level=N` / `?all` bỏ khoá level (dev/test).

## 0.4.2 — 2026-09-13 · Kệ nước lèo (mỗi nồi 1 phần, stack nhiều loại), chống kẹt
- **Lò đun theo bếp thật (Kent 13/09)**: mỗi lần đun = **một phần**; đun xong tự để sang **kệ nước** giữa 2 bếp (stack tối đa 6, lẫn nhiều loại) → lò trống đun tiếp. Chạm kệ nước (`burner:ready`) lấy đúng loại tô đang ráp / khách chờ đang cần (`wantedBroth`), hoặc `burner:ready.<token>`; kệ đầy thì phần nóng nằm lại trên lò, chạm lò để cầm. `SOUP.servings` 4 → 1, `stackMax` 6. Bot đếm số phần cần − số phần có (kệ + đang đun) để quyết định nấu thêm.
- **Chống kẹt** (Kent báo "xong 1 tô thì bị đứng", chưa tái hiện được bằng bot): mục tiêu không còn hợp lệ → bỏ thay vì ném lỗi; `tick()` bọc try/catch — có lỗi thì hiện toast "Lỗi: …", ghi `__qb.lastError`, reset đầu bếp (không đứng hình); đóng card phân theo chỗ đang đứng chờ (lò/kệ) thay vì biến `cardMode`; chờ card >1.5 s mà card không mở → thả đi tiếp.
- HUD: hướng dẫn hiện 6 s rồi mờ; thông báo lỗi nằm trên hai ô tay, nền mờ. `__qb.tick(dt)` để test chạy nguyên vòng khung hình.

## 0.4.3 — 2026-09-13 · Bánh đa cua theo Kent
- Bánh Đa Cua Hải Phòng: bánh đa, rau muống trụng, chả cá chiên, tôm chiên, cà chua; topping hành tây, hành lá, tóp mỡ, hành phi; chan 1 phần nước cốt cua (bỏ bò lá lốt, chả hấp, chả cua). Thứ tự ráp tạm theo thứ tự Kent kể — chờ xác nhận. cooking-note SW v0.44.2.

## 0.4.4 — 2026-09-13 · 17 icon mới (Flow qua AudioBook Studio :8000), khử bóng nền
- 17 ảnh cho token chế biến: rọ trụng, mâm đan, nước phở, mẹt lót giấy, rau muống trụng, salad cắt, 5 chén chả cá, dĩa thì là, chảo áp cá, 4 phần nước lèo (riêu, bún bò, cá, cháo). Gen qua `POST 127.0.0.1:8000/api/generate-scene-frame` của app AudioBook Studio (extension flowkit bản KJStickman trỏ cổng 8000) khi app đó đang mở; không thì bật `agent.main` với `API_PORT=8000`.
- `process_icons.py`: bóng đổ trên nền magenta (a ≈ k·bg, nối với mép ảnh) → trong suốt; không đụng màu tím bên trong vật thể. `gen_icons_map.mjs`: `iconUrl` hiểu `noodle-*:<sợi>`, `bowl-hot:<tô>`, và các token *-ready dùng ảnh nguyên liệu gốc → không token nào còn thiếu ảnh.

## 0.4.5 — 2026-09-13 · Item trên kệ / trên tay / kệ nước = thẻ ảnh Flow (sprite)
- `View.itemMesh(tok, size)`: có ảnh → `THREE.Sprite` luôn quay về camera (texture cache), không thì model/khối tạm như cũ. Dùng cho item trên kệ (chế độ thường và card), đồ trên tay đầu bếp, chồng nước lèo trên kệ nước. Thử theo yêu cầu Kent ("xấu là làm lại").
- 0.4.5b: thẻ item nhỏ hơn, xếp 2 hàng so le trên kệ, bóng tròn dưới chân; chạm ra ngoài card = đóng card; màn ngang: hai ô tay xếp dọc bên phải (không đè quầy giao/ghế).

## 0.4.6 — 2026-09-13 · Kệ topping = tủ lạnh prep table (như tiệm Kent)
- `View.buildPrepTable`: dựng bằng hình khối trong three.js — thân inox, 3 cửa có tay nắm, mặt thớt trắng phía trước, khoang lạnh nhô cao phía sau với khay GN 2 hàng, rail thấp sát tường. Item nằm đúng ô khay (cột = i/2, hàng = i%2). Bóng item kiểu drop-shadow (ảnh tô đen, mờ, lệch nhẹ) thay đĩa tròn.
- 0.4.6b (Kent): **bỏ quầy giao** — bưng tô ra thẳng bàn khách (chạm bàn/ghế = giao; bot đi tới bàn của khách đặt tô). **Bỏ bàn thớt rời**: 2 tấm thớt nằm trên mặt trắng của tủ topping (`prep.onTable`), chạm riêng từng tấm; card kệ topping chỉ bắt nửa sau (khoang khay). Nav: thớt không thêm vật cản (tủ đã là vật cản).
- 0.4.6c: nấu nước lèo sai (thiếu/sai nguyên liệu hoặc sai thứ tự) → tính lỗi nhưng **card vẫn mở** với dòng đỏ giải thích, chọn lại ngay (trước đây card đóng, đầu bếp đứng im — Kent tưởng kẹt). Toast "Nấu sai!" thay "Sai thứ tự!" cho lỗi nước lèo.

## 0.5.0 — 2026-09-13 · Chế độ Đố (puzzle 2D) — tab 🧩
- `src/puzzle.js`: 9 câu/lượt, xoay 3 kiểu — **Xếp thứ tự ráp** (bấm các bước đúng thứ tự), **Bắt kẻ lạ** (2 nguyên liệu của món khác lẫn vào), **Bước bị giấu** (chọn 1/4, đáp án sai = đồ món khác). Cùng dữ liệu công thức với bếp 3D; món ra theo trọng số Tiến độ (món yếu nhiều hơn); dùng món đang chọn ở tab Luyện. Mỗi câu = một "tô" → ghi vào mastery, +10 điểm/câu sạch. Bảng kết quả dùng chung (không có cột so với bot).

## 0.5.1 — 2026-09-13 · Đố kiểu "chém" (Fruit Ninja) + PWA
- Kiểu đố thứ 4 **Chém**: canvas 2D, đồ của món + đồ lạ tung lên theo đợt (0.75 s), vuốt tạo vệt chém; chém đúng thành phần = điểm, chém đồ lạ = lỗi, để đồ của món rơi khỏi màn = "sót" (lỗi). Hai nửa tách theo hướng vệt. Lượt đố 8 câu xoay 4 kiểu.
- **PWA**: `public/manifest.webmanifest`, icon 192/512 (tô phở nền đỏ), `public/sw.js` (cache-first cho assets có hash, network-first cho trang; offline sau lần tải đầu), đăng ký chỉ ở bản build (`import.meta.env.PROD`, không ở artifact claude.ai). Cần HTTPS hoặc localhost để cài; LAN http → dùng cờ Chrome `unsafely-treat-insecure-origin-as-secure` hoặc deploy static host.

## 0.5.2 — 2026-09-13 · Tab 🎮 Mini (Đố nhanh · Chém riêng), GitHub Pages
- Tab "Đố" → **Mini**: hai minigame riêng — *Đố nhanh* (9 câu: xếp thứ tự, kẻ lạ, bước giấu) và *Chém* (6 món, chỉ kiểu chém). `Puzzle` nhận `kinds`; "Chơi lại" giữ đúng minigame vừa chơi.
- Repo GitHub `kentjuno/quan-bun` (public — GitHub Pages miễn phí cần public). `scripts/deploy_pages.cmd`: build → đẩy `dist` lên nhánh `gh-pages` → https://kentjuno.github.io/quan-bun/ (HTTPS → cài PWA được). `.gitignore` bỏ dist, ảnh thô, log.
- 0.5.2b: Chém — tung TỪNG món (món kế chỉ tung khi món trước bị chém hoặc đang rơi nửa dưới), bay chậm hơn (~3 s, đỉnh 72–84% màn), hình to hơn, có tên dưới hình; 7 món + 3–4 đồ lạ.
- 0.5.2c: nút ‹ (góc trên trái HUD) về menu giữa ca — không ghi kết quả.

## 0.5.3 — 2026-09-13 · Bún cá Hải Phòng theo Kent
- Cà chua → cần nước trụng → cá chiên (4) → chả cá 2 miếng cắt đôi (thớt) → **hành lá trước nước** → chan nước cá → **thì là cắt 3 khúc** (thớt, action mới `cut-dill`) bỏ sau. Bỏ dòng bao tử cá basa trong cooking-note. Bún riêu: cooking-note đổi huyết vào nồi nước (game vốn đúng). SW cooking-note v0.44.4.

## 0.5.4 — 2026-09-13 · Minigame ⚡ Phản xạ + lọc "Chỉ món bún"
- **Phản xạ** (Kent: hay quên các món bún, muốn tập phản xạ): lưới topping **cố định** theo thứ tự kệ thật (không xáo, để nhớ vị trí), tên món hiện ra → bấm đủ topping trước khi hết giờ (3 s + 1.6 s/topping), thanh đếm ngược; hết giờ = lỗi bằng số còn thiếu, tô vàng thứ bị sót; 10 món liên tục, món yếu ra nhiều hơn. Nút "Chỉ món bún" ở tab Luyện chọn nhanh 7 món bún để tập chéo (interleaving).
- Cooking-note: tiệm không dùng cần tây (ghi AGENTS).
- 0.5.5: "rau salad" = xà lách (Kent 13/09) → gộp item `rau-salad` vào `xa-lach` (sim-data, kệ, icon, cooking-note recipes/level1/menu/AGENTS; SW v0.44.5).

## 0.6.0 — 2026-09-13 · Hai món khai vị mới (Kent học 13/09) + trạm Chảo chiên
- **Chả Giò Việt Nam (A3)**: chả giò 2 cây → **Chảo chiên** (trạm mới `fryer`, chiên ngập dầu lửa nhỏ, nền, thật 5 phút / game 8 s) → thớt cắt chéo → ráp: dĩa dài → chả giò → đồ chua.
- **Gỏi Cuốn Tôm Thịt (A6)**: bồn: nhúng bánh tráng → ráp theo thứ tự: bánh tráng đã nhúng → thịt luộc (2, xếp ngang) → tôm luộc (4) → bún (lên thịt) → xà lách (2, sau khi gấp 2 mép) → dĩa dài (gấp lên, ép, cuốn, cắt đôi). Chưa hỏi: bún có trụng không.
- Item mới: chả giò, bánh tráng, tôm luộc, dĩa dài (chưa có ảnh Flow — server AudioBook đang tắt; dùng emoji/ảnh tôm). Level 10 — Khai vị. 18 món. cooking-note v0.45.0 (sim-data, recipes, level1, menu A3/A6 → recipe).

## 0.7.0 — 2026-09-14 · KJ's Choices — vòng chơi theo NGÀY, khách quen, nâng cấp bếp, juice
Theo `docs/GAME-DESIGN.md` (Kent duyệt 14/09): biến công cụ luyện thành game có đầu có đuôi; chế độ luyện dồn vào tab **Thêm** (extra modes). Tên hiển thị **KJ's Choices** (manifest, bảng hiệu, menu). Hướng art chốt: C — ký hoạ màu nước (`art/ART-BIBLE.md`, thử 5 sprite ở 48 px đạt).
- **Ngày ở quán** (`config.DAYS`, 21 ngày + ngày vô tận `dayAfter`): mỗi ngày mở đúng một thứ (món mới / khách quen / cơ chế); menu chỉ lớn dần. Khách sinh theo 3 pha **trưa đông (2–42 %) → xế thở (42–62 %) → chiều đông (62–92 %)**, seed theo ngày (chơi lại thấy quen); ngày 5+ có **khách đi cặp**, ngày 7/14/21 **đoàn 4 người**. Chuẩn bị 20 s. Mục tiêu sao tính từ giá trung bình menu × số khách. `?day=N` chọn ngày (dev), `?all` mở hết.
- **Khách quen** `src/data/customers.js` (Kent sửa thoại thẳng trong file): Cậu Hai (phở tái nạm, ngày 1), Dì Ba (bún riêu, 2), Thím Bảy (bún bò Huế, 3), Chú Tư (phở đặc biệt, 4), Út Mười (bún chả HN, 6), Ông Năm xe ôm (bún cá HP, 8). Mỗi người: món ruột cố định, kiên nhẫn/tip riêng, nét nhận diện, thoại sit/wait/good/wrong/leave/recap giọng quê ("Nay quán đông dữ hen", "Chu cha nước phở này nó ngon"). Khách lạ có thoại chung. Khách ăn xong nói một câu rồi mới trả ghế (`linger`). Bong bóng: tên khách quen · món, dòng thoại nghiêng hiện ~3 s (`View.say`).
- **Menu một nút**: bảng hiệu KJ's Choices, thẻ Ngày N (ghi chú cơ chế, menu, khách quen, mục tiêu, "hôm nay"), ‹ › xem lại ngày cũ (ngày kế chỉ mở khi ≥1★). Tab **Nâng cấp** (bếp + trang trí), tab **Thêm** (Survival · Luyện · Mini, sub-tab). Tiền quán thống nhất (điểm cũ) hiển thị "k".
- **Màn kết ngày**: "Đóng cửa — Ngày N", sao rơi từng cái có tiếng, tiền chạy số, câu nhận xét của một khách quen đã ghé (khen nếu được phục vụ, "mai ráng" nếu không), thẻ **mở khoá ngày mai** (món mới / nâng cấp mở bán / khách quen mới) khi lần đầu qua ngày, nút "Sang ngày N+1". Báo cáo bếp gấp trong `<details>`.
- **Nâng cấp bếp** (`config.UPGRADES`, data-driven qua `modsFor` → `World(shift, ev, kitchen, mods)`): Nồi trụng chồng tô 3→4→5 · Bếp lò 1→2→3 (mặc định ngày mới chỉ 1 lò) · Lửa lớn −15 %/cấp thời gian đun · Thêm bàn 3→4→5 (ghế `extra` trong KITCHEN) · Dép bếp êm +12 %/cấp tốc độ. Mỗi cái mở bán từ một ngày. **Trang trí có tác dụng**: mỗi món +6 % kiên nhẫn khách. `progress`: `upgrades`, `buyUpgrade`, `playerMods`, `currentDay`, `dayUnlocked`, `unlocksAt`.
- **Âm thanh + juice**: nhạc đổi **mood theo pha** (calm 72 bpm / busy 96 bpm dày nốt / close 58 bpm); nồi sôi ục ục nền (noise + LFO, to hơn khi có đồ trong nồi); sfx mới: xèo (chảo/lò), thả sợi vào nước, cạch đặt tô, tiền, chuông mở cửa, cheer hết ngày, rì rào khách nhóm, khách lên tiếng. Banner giữa màn khi đổi pha (Mở cửa! · Giờ cao điểm · Xế chiều · Đợt chiều · Sắp đóng cửa), số tiền bay lên từ bàn khách (`View.float`), "✖ bỏ đi", rung máy khi giao/khách bỏ đi.
- Tests: `tests/days.test.js` (5) — 43 unit pass; smoke Chromium cập nhật cho ngày/nâng cấp (0 lỗi). LEVELS cũ giữ cho tests/par.

## 0.8.0 — 2026-09-14 · Worlds & Levels — bậc thang kiểu Overcooked
Kent 14/09: "ngày đầu mà bước nhiều quá, người mới bị ngộp" → bỏ vòng chơi theo NGÀY (0.7.0), thay bằng **world mỗi món · level tăng dần**, đúng `docs/PLAN-WORLDS.md` (Kent duyệt). Công thức gốc trong sim-data KHÔNG đụng: bản tập chỉ rút gọn bằng cờ khi dựng level; mọi chế độ **Thêm** (Luyện/Rush/Survival/Đố/Chém/Phản xạ) vẫn chạy công thức ĐỦ BƯỚC — đó là phần Kent luyện cho việc thật.
- **8 world · 124 level** (`src/data/worlds.js`, ráp qua `config.WORLDS`): Phở 20 · Bún riêu 12 · Bún bò Huế 12 · Hải Phòng 16 · Món khô 20 · Cháo 16 · Khai vị 16 · Chả cá Lã Vọng 12. Mỗi level có `whatsNew` (một dòng: level này có gì mới) + `hint` riêng. World mở khi world trước đủ 60 % số sao tối đa của nó (Phở 60★ → cần 35★).
- **Bậc thang học bước**: L1 cực dễ (vd Phở 1: tô đã nóng sẵn, sợi trụng một lần, chỉ nạm + bò tái, sợi không hư — 2 khách, 120 s), L2 đủ topping, L3 tự trụng tô, **L4 đủ bước thật** và giữ vậy tới hết world. Cờ rút gọn (`recipeFor(dish, simplify)`): `skipRinse` `hotBowl` `toppings[]` `maxSteps` `skipPrep` `skipFry` `soupReady` `noSpoil`. Bỏ bước nào thì kệ phát thẳng token kết quả (`recipe.shelfSubs`, `World.shelfToken`), bước thừa tự cắt. Thẻ level ghi rõ "Bản tập — chưa có xả lạnh, trụng tô…".
- **Bốn trục biến thiên** (từ L6 mỗi level ít nhất một; mốc 5/10/15/20 hai trục) — để 20 level không thành 20 lần lặp:
  · **Bố trí bếp** `config.KITCHEN_VARIANTS`: `far-pot` (nồi cuối bếp) · `left-topping` (tủ topping + thớt đổi bên) · `island` (quầy ráp ra giữa sàn, khách vây hai bên). Test: mọi trạm vẫn tới được ở cả 4 bố trí × 2 hướng màn hình.
  · **Ràng buộc** `constraints`: `potSlots` (1 rọ) · `handCapacity` (một tay) · `brothCap` (kệ nước 1 phần) · `noStack` (lò xong phải lấy liền).
  · **Sự kiện** `events`: `rain` (vắng 40 s rồi dồn khách) · `vip` (tip ×3, kiên nhẫn 60 s) · `change-order` (khách đổi món giữa chừng, tô cũ giữ lại cho khách sau) · `tour` (đoàn khách).
  · **Mục tiêu** `goal` thay cách tính sao: `clean n` (n tô không sai thứ tự) · `no-waste` · `streak n` · `before s`.
- **Bản đồ** thay carousel ngày: hàng world (icon, x/60★, khoá) → lưới ô level (số, sao, khoá, viền vàng ở mốc thử thách, ô "tiếp" nhấp nháy) → thẻ chi tiết (whatsNew, món, nhãn bản tập, mục tiêu, ràng buộc, bố trí, sự kiện, khách quen). Màn kết: "Phở 5 — ⭐ Ba khách một lúc", sao rơi, tiền chạy, thẻ mở khoá (món/khách quen/nâng cấp/world), nút "Level 6 →" hoặc "Sang Bún riêu cua →".
- **Nâng cấp bếp mở theo TỔNG sao** (thay theo ngày): nồi trụng 8★ · thêm bàn 14★ · bếp lò 20★ · lửa lớn 26★ · dép bếp 32★. Trang trí vẫn +6 % kiên nhẫn/món.
- Bot & par chạy đúng công thức của level (kể cả bản tập, kể cả ràng buộc một tay/một rọ); `par` cache theo cả bố trí bếp.
- Bỏ hẳn hệ NGÀY (`DAYS`, `makeDayArrivals`, `dayFor`…). `LEVELS` cũ giữ cho tests/par.
- Tests: `tests/worlds.test.js` (18 — gồm "cả 124 level bot chơi được", "không 3 level liên tiếp cùng một trục", "mọi bố trí bếp đều tới được"), `tests/customers.test.js` (3). Tổng 64 unit pass; smoke Chromium cập nhật cho bản đồ/khoá/nâng cấp/chơi Phở 5 — 0 lỗi.

## 0.8.1 — 2026-09-14 · Bản thử lõi mới: 🥣 Ráp tô (tab Thêm → Mini)
Kent: cơ chế Overcooked mạnh ở co-op, chơi một mình nhàm; giữ bậc thang world/level làm đường luyện, còn game thật cần lõi khác. Phân tích phong cách (Diner Dash · Papa's · Cook Serve Delicious · PlateUp! · Coffee Talk) → đề nghị lai **Papa's (ráp từng đơn, chấm từng bước) × CSD (phiếu treo, phản xạ đã thuộc)**, không đi lại trong bếp. Bản thử cực mỏng để Kent cầm điện thoại quyết:
- `puzzle.js` kind `assemble`: 10 phiếu tới dần (tối đa 3 treo, mỗi phiếu kiên nhẫn 38 s, cách 11 s), phiếu đầu là phiếu đang làm; khách quen có tên thật (Cậu Hai, Dì Ba, Thím Bảy) hoặc khách lạ. Kệ cố định như tủ topping thật chia 4 khu: **Kệ tô** (chạm = trụng tô 0.5 s) · **Nồi trụng** (thẻ sợi có trạng thái: Trụng → chọn *Vô tô* hay *Xả lạnh* → Trụng lại — kiểm tra kiến thức nóng-lạnh-nóng vs bún bò trụng một lần) · **Tủ topping** (thứ tự kệ thật) · **Nước lèo**. Mỗi chạm chấm ngay: đúng bước kế thì vào tô, sai thì rung + lỗi + gợi ý ngắn. Xong phiếu: khách nói một câu (khen nếu hoàn hảo), giây và số lỗi; chờ quá lâu thì bỏ đi (+3 lỗi).
- Chỉ nhận món có chuỗi ráp gồm tô + sợi + topping rời + nước (`assembleOk`): hiện là phở tái nạm, bún riêu cua, bún bò Huế; món có thớt/chảo/lò vi sóng để bản sau.
- Kết quả đi vào mastery như các minigame khác. UI: đầu bảng dính (phiếu + tô đang ráp + phản hồi), kệ thu nhỏ để vừa một màn điện thoại.
