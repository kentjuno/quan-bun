# PLAN-PUBLIC — **KJ Phở Real** — "a kitchen road trip through Việt Nam"

(Tên game: **KJ Phở Real** — Kent chốt 20/09 sau khi thấy domain "phoreal" đã có người lấy; tiền tố KJ để chắc không đụng. Bảng hiệu / title / manifest / store đều dùng đúng chuỗi này.)

Kent quyết 19/09: **game chính là game cho người chơi, mục đích giới thiệu món Việt ra thế giới.** Chế độ luyện của Kent nằm ở tab *Thêm* (mini games), không đụng. Đã chốt: **hành trình Bắc → Nam**, **vi + en trước**, và (Kent sửa lại cùng ngày) **game chính dùng CÔNG THỨC CHUNG CỦA VIỆT NAM, không dùng công thức quán** — đồ của quán chỉ ở tab Luyện. Nhờ vậy game thêm được món quán không bán, và không lộ công thức quán.

Kế hoạch này viết để **bất kỳ model nào** cũng làm đúng ý. Đọc §0 trước. Mỗi P = một hạng mục, có *Hiện trạng* (đọc code trước khi tin), *Spec*, *Nghiệm thu đo được*, *Bẫy*. Làm xong một P = **một commit + một deploy + Kent thử trên điện thoại**, không gộp.

---

## 0. Luật cho model (đọc trước, không bỏ)

1. **Hai nguồn sự thật, không trộn.** Tab *Luyện* (mini games): `src/data/sim-data.js` = bếp quán, không đụng. **Game chính: `src/data/dishes/<id>.json`** = công thức **phổ biến của Việt Nam** (mức gia đình, không phải quán), cùng schema với engine (bước ráp, trạm, thời gian). Model **được viết nháp** công thức, chuyện, cách ăn, vùng — nhưng **mọi món gắn `[cần Kent duyệt]`** cho tới khi Kent gật; game này đại diện ẩm thực Việt ra thế giới, sai một câu là mất uy tín. Không ghi "theo cách quán KJ" ở đâu cả.
2. **Tên món KHÔNG dịch.** "Phở", "Bún Bò Huế", "Bánh Đa Cua" giữ nguyên dấu ở mọi ngôn ngữ, kèm cách đọc (`pron`) và một dòng giải nghĩa (`gloss`). Người chơi *học* tên Việt — đó là mục đích.
3. **Mọi chữ hiện ra màn hình đi qua `t()`** (`src/i18n.js`). Không hard-code tiếng Việt hay tiếng Anh trong HTML/JS sau P1. Chữ trong *comment* thì tiếng Việt thoải mái.
4. **Thêm món = thêm data + chạy script, không sửa code.** Nếu một món mới cần sửa code thì đó là bug của pipeline (P6), sửa pipeline trước.
5. **Không đổi luật nhịp (`src/data/pace.js`) tuỳ tiện** — đó là chỗ duy nhất chỉnh độ khó; đổi thì chạy test `PACE: bot 3 sao ở cả 129 level`.
6. **Không kết luận "cuốn hút" từ khung xem trước của Claude** (rAF ≈ 1 Hz, không có cảm giác). Nghiệm thu cảm giác chỉ có hai nguồn: điện thoại Kent, và **người chơi ngoài** (P7). Kent là người thử *sai* cho onboarding vì Kent thuộc bếp.
7. Deploy: `npx vitest run` → bump `-vNN` trong `public/sw.js` → `npx vite build` → `scripts\deploy_pages.cmd` → chờ ~30 s → fetch `/quan-bun/sw.js` xác nhận version. Mọi thao tác trên PC qua Blender MCP (thread cho việc > 50 s). `device_stage_files` hỏng trên ổ F:.
8. Bẫy kỹ thuật đã biết (docs/PLAN-JUICE.md, docs/ART-PIPELINE.md): `render()` chỉ gán innerHTML khi chuỗi đổi (`H('id').innerHTML`); `animate().onfinish` không chạy khi tab bị nén → luôn kèm `setTimeout` dọn; `#pov .x` (id) đè `.pv-stage .x`; hiệu ứng lúc bưng tô chạy GIỮA `C.drop()` và `render()`.

---

## 1. Trục thiết kế (tại sao game sẽ cuốn — và cái gì hôm nay còn thiếu)

| Trụ | Hôm nay | Sau kế hoạch |
|---|---|---|
| **Áp lực có nhịp** | ✅ (19/09: kiên nhẫn theo tốc độ bot, combo, cao điểm) | giữ, tinh chỉnh theo playtest |
| **Quyền chọn của người chơi** | ❌ mọi tô là danh sách cố định, chỉ *thực thi* | P4: chọn khách nào trước, làm hàng loạt được thưởng, nâng cấp đổi cách chơi |
| **Lý do quay lại** | nửa: 129 level, sao, nâng cấp chỉ đổi số | P2 + P3: đi hết Việt Nam, mở từng món, đọc chuyện từng món |
| **Cảm giác / art** | ✅ kiểu C, đã "loud" | P5 onboarding, P8 nền tảng |
| **Nói với thế giới** | ❌ chỉ tiếng Việt | P1 i18n, tên món giữ Việt + cách đọc |

**Cốt truyện (Kent, 19/09):** *Bạn là kẻ lang bạt mê ăn, đi dọc các tỉnh thành trên bản đồ Việt Nam. Tới đâu xin vô quán đó làm, chủ quán thử thách: học món của họ, rồi đứng ca làm cho ra hồn. Mỗi tỉnh để lại một món trong sổ tay và một vật kỷ niệm.*

**Vòng chơi:**
```
Bản đồ VN → TỈNH → xin vô QUÁN (chủ quán = nhân vật)
  → HỌC MÓN (chủ quán chỉ tay từng bước, một lần mỗi món)
  → CA LÀM (level của quán: món vừa học + món cũ; nhịp / combo / cao điểm)
  → MINI-GAME của tỉnh (giải lao, thưởng vật kỷ niệm)
  → Sổ tay ghi món + tỉnh → tỉnh kế
```
Ánh xạ lên code đang có — **không đập, chỉ đổi vai**:
| Đang có | Vai mới |
|---|---|
| World (8) | **Quán** trong một tỉnh; ~5 tỉnh đầu, thêm tỉnh = thêm data |
| Khách quen có thoại (`customers.js`) | **Chủ quán**: dạy món, thử thách, khen/chê; thêm màn "xin vô quán" 2–3 câu |
| Level rút gọn `simplify` (1–3) | **Học món** — P5 áp cho MỌI món, không chỉ level 1 |
| Level đủ bước (4+) | **Ca làm** |
| 5 mini-game (`puzzle.js`) | **Mini-game theo tỉnh**: cùng engine, đổi data + tên (Hà Nội: nhận diện rau thơm; Huế: nêm cay; Hải Phòng: bóc cua…). Tab Luyện của Kent tách riêng, không lẫn |
| — | **Vật kỷ niệm** mỗi tỉnh (nón lá, bát Bát Tràng…) hiện trên bản đồ |

---

## 2. Thứ tự làm và công (tính bằng "phiên" ≈ một buổi làm của model)

| P | Việc | Công | Vì sao thứ tự này |
|---|---|---|---|
| P1 | i18n nền (vi + en) | 2 phiên | Làm trước khi thêm chữ mới, không thì phải dịch hai lần |
| P2 | Bản đồ Việt Nam: tỉnh → quán → chủ quán, màn "xin vô quán", vật kỷ niệm | 2.5 phiên | Cái "lý do" — mọi thứ sau treo lên nó |
| P3 | Sổ tay món (codex) | 2 phiên + Kent viết chuyện | Phần thưởng thật của game |
| P4 | Quyền chọn: loại khách, hàng loạt, nâng cấp đổi cách chơi | 2 phiên | Lỗ hổng lớn nhất về gameplay |
| P5 | "Học món": chủ quán chỉ tay từng bước, cho MỌI món (onboarding 60 s là trường hợp đầu) | 1.5 phiên | Người ngoài bỏ ở phút 2 nếu không có |
| P6 | Chuyển 21 món sang `dishes/` (bản chung) + `stations.json` + pipeline thêm món một lệnh | 2 phiên | Scalable = data, không code; làm trước khi thêm món |
| P6b | Mini-game theo tỉnh: 5 engine có sẵn + data tỉnh | 1 phiên | Giải lao giữa các ca, thưởng vật kỷ niệm |
| P7 | Playtest người ngoài + đo | 0.5 phiên + Kent tìm 3 người | Nguồn sự thật duy nhất về "cuốn" |
| P8 | Nền tảng: PWA hoàn chỉnh, chia sẻ, (sau) gói app | 1 phiên | Sau khi P7 nói là đáng |

Tổng ≈ 14–15 phiên. **Không làm P8 trước P7.**

---

## P1 — i18n nền: vi + en

**Mục tiêu.** Đổi ngôn ngữ một nút, không sót chữ. Tên món giữ Việt.

**Hiện trạng.** Chữ tiếng Việt nằm thẳng trong `index.html` (menu, HUD, nút), `src/pov.js` (thông báo `msg()`, nhãn), `src/main.js` (kết quả, thẻ level), `src/data/worlds.js` (tên/`whatsNew`/`hint` của 129 level — ~300 dòng), `src/data/customers.js` (thoại khách quen), `src/game/recipes.js` (`label()` lấy từ `D.items[tok].name` trong sim-data), `src/puzzle.js`. Không có lớp i18n.

**Spec.**
1. `src/i18n.js`: `t(key, vars)`, `setLang(code)`, `lang()`; bảng ở `src/data/i18n/vi.json`, `en.json` (JSON phẳng, key dạng `menu.play`, `pov.msg.needBowl`, `level.pho-4.title`…). Thiếu key → trả `vi` + `console.warn` (dev) — không bao giờ hiện key thô cho người chơi.
2. **Tên món / nguyên liệu:** `src/data/i18n/items.json` = `{ token: { pron, gloss: { en } } }`. `label(tok)` giữ tên Việt; UI nào cần thì ghép `label + " · " + gloss[lang]`. Ví dụ: *Phở Tái Nạm · rare beef & brisket noodle soup*. Cách đọc: `pron: "fuh tie nahm"` (kiểu đọc tiếng Anh gần đúng, không IPA).
3. Level: `title`, `whatsNew`, `hint` chuyển thành key; worlds.js chỉ giữ key. Thoại khách quen: key theo `customers.<id>.<kind>.<n>`.
4. Nút đổi ngôn ngữ ở menu (cờ không dùng — dùng chữ "VI / EN"); lưu `qb.lang` localStorage; mặc định theo `navigator.language` (vi-* → vi, còn lại en).
5. Bản `en.json` model dịch nháp toàn bộ; **Kent duyệt nhóm tên món + sổ tay**, phần UI thì model tự chịu trách nhiệm.
6. `scripts/i18n_lint.mjs`: quét `src/**` và `index.html`, báo mọi **string literal** (không phải comment) chứa dấu tiếng Việt ngoài `src/data/i18n/` và `sim-data.js`. Chạy trong test.

**Nghiệm thu.** Lint = 0. Bật EN: chơi hết level 1 không thấy chữ Việt nào ngoài tên món/nguyên liệu (chụp 3 màn: menu, quầy, kết quả). `t('x.missing')` không hiện `x.missing`.

**Bẫy.** `label()` được gọi trong `counter.js` để ghép **thông báo lỗi** (`"Chưa cần ${label(tok)}"`) — chuyển thành `t('pov.err.notYet', { item })` với item đã ghép gloss. Chữ trên khay (`.pv-pan small`) chỉ 2.6 cqw — gloss tiếng Anh dài sẽ tràn: **khay chỉ hiện tên Việt**, gloss để ở tooltip chạm giữ (J8 đã có).


**ĐÃ LÀM (20/09, commit 4ae5d18):** P1 đủ. Mọi chuỗi qua `t()` (counter/pov/puzzle/main/index); data (worlds/customers/config) giữ tiếng Việt làm nguồn, UI ghép `tl('level|world|upgrade|decor|cust.<id>.*')`. `items.json`: ~76 nguyên liệu (pron + en), 50 hành động, 60 nhãn trạng thái; món: pron/gloss trong `dishes/<id>.json`. `labelL()` = "Nạm (brisket)"; hành động/trạng thái dịch hẳn. Thoại 6 khách quen + khách lạ, hint 129 level EN. `scripts/i18n_lint.mjs` (bỏ comment, hiểu `${}` lồng, `// vi-src`) chạy trong `tests/i18n.test.js` (8 test). Bếp 3D bản cũ không dịch — thẻ ghi "Vietnamese only".

---

## P2 — Bản đồ Việt Nam: world = vùng, đi Bắc → Nam

**Mục tiêu.** Mở game thấy bản đồ Việt Nam ký hoạ màu nước, các vùng sáng dần; mỗi vùng vài món của vùng đó.

**KHUÔN ĐÃ CHỐT (Kent 20/09: "đc đó, chốt phương án này"): `tools/roadtrip.html`** — demo Hà Nội → Hải Phòng. Mọi tỉnh làm y khuôn này, không sáng tác lại:
- Cắt giấy thuần web, **không engine**: 1 tấm bản đồ/mảnh (768×1376, Flow, prompt ghi rõ vị trí tỉnh đầu/cuối + "ONE clear winding road"), phóng 1.45× màn, camera bám xe (`translate` mượt, kẹp mép).
- Đường = SVG `<path>` Catmull-Rom từ ~14 điểm; `?edit=1` chạm lấy điểm; xe chạy `getPointAtLength`, nghiêng ≤ 18° theo dốc (Kent chưa nhận xét — nếu "hơi nhiều" thì hạ hệ số 0.3 → 0.2), lật gương khi đi trái, bánh quay (vòng dashed), nhún 2 px, bụi 140 ms/hạt, mây parallax.
- Qua ranh vùng: bản sao bản đồ xám (`grayscale + sepia`, `clip-path` theo ranh) với `mask` tròn loang `--r` 0 → 1800 px trong 1,6 s (JS gán từng khung) + tên tỉnh viết tay 12 vw viền mực + chuông.
- Tới quán: xe dừng, bảng hiệu pop (`cubic-bezier(.3,1.6,.4,1)`), bong bóng chủ quán trượt lên.
- Vòng lặp bằng `setTimeout(16)` (khung xem trước của Claude bóp rAF; điện thoại như nhau).
- Art: `art/raw/map/*.png` → `scripts/_map_prep.py` → `public/art/map/*.webp` (cắt magenta cho xe/mây).

**Hiện trạng.** 8 world theo món: `pho`, `bun-rieu`, `bun-bo`, `hai-phong`, `mon-kho`, `chao`, `khai-vi`, `cha-ca` (`src/data/worlds.js`, `buildWorlds`). Màn chọn level là lưới số. Không có bản đồ.

**Spec.**
1. `src/data/regions.js`: danh sách vùng theo thứ tự hành trình, mỗi vùng gom world hiện có (**không đổi id world, không đổi level**):

   | Vùng | World gom vào | Ghi chú `[cần Kent duyệt]` |
   |---|---|---|
   | Hà Nội | `pho`, `cha-ca`, `mon-kho` (bún chả, bún đậu, bún nem) | bánh hỏi thịt heo tách ra khỏi `mon-kho` → miền Trung (Kent 20/09) |
   | Hải Phòng | `hai-phong` | |
   | Huế / miền Trung | `bun-bo`, `bun-rieu`, bánh hỏi | **Kent xếp bún riêu và bánh hỏi vào miền Trung (19–20/09).** Lưu ý trung thực: nhiều tài liệu xếp bún riêu gốc Bắc Bộ — nếu bị hỏi, sổ tay ghi "phổ biến khắp ba miền, miền Trung có bản riêng". |
   | Sài Gòn | `khai-vi` (gỏi cuốn, chả giò), `chao` | |

   **Danh sách món — Kent giao model quyết (20/09): "món nào ngon, đặc biệt của vùng đó là được".** Tiêu chí: thế giới biết tên hoặc nhìn là mê; mỗi vùng 3–4 món; ưu tiên món làm được bằng 6 trạm sẵn có trước, món cần trạm mới để sau. Lộ trình (21 món hiện có giữ, thêm dần qua P6):

   | Tỉnh / vùng (thứ tự đi) | Có sẵn | Thêm (P6, theo thứ tự) | Trạm mới? |
   |---|---|---|---|
   | Hà Nội | phở tái nạm, đặc biệt, tái đập, sườn tái, gà, sốt vang, xào lăn; bún chả; bún đậu mắm tôm; bún nem; chả cá Lã Vọng | **bún thang**, **bánh cuốn** | bánh cuốn: tráng hơi (trạm mới) |
   | Hải Phòng | bánh đa cua, bún cá | **bánh mì cay** (kèm) | chảo chiên có sẵn |
   | Huế / miền Trung | bún bò Huế, bún riêu cua, bánh hỏi thịt heo | **bánh bèo**, **bún hến / cơm hến** | bánh bèo: hấp (trạm mới) |
   | Quảng Nam / Đà Nẵng | — | **mì Quảng**, **cao lầu** | không (trụng + topping + chan ít nước) |
   | Nha Trang / Phan Thiết | — | **bún chả cá**, **bánh căn** | bánh căn: khuôn nướng (trạm mới) |
   | Sài Gòn / Nam Bộ | gỏi cuốn, chả giò, cháo lòng, cháo sườn | **hủ tiếu Nam Vang**, **cơm tấm sườn bì chả**, **bánh xèo**, **bún mắm** | cơm tấm: nướng (trạm mới); bánh xèo: đổ chảo (trạm mới) |
   | Miền Tây | — | **bún cá Châu Đốc**, **bánh khọt** | bánh khọt: khuôn (dùng chung trạm bánh căn) |

   Thứ tự thêm: mì Quảng → cao lầu → hủ tiếu → bún thang → bún chả cá (đều 0 trạm mới), rồi mới tới nhóm cần trạm: cơm tấm, bánh xèo, bánh bèo, bánh cuốn, bánh căn/khọt. Mỗi món `[cần Kent duyệt]` công thức + vùng + chuyện.
2. Màn bản đồ thay lưới world: **bản đồ = chuỗi mảnh** (mỗi mảnh 768×1376 nối dọc: HN→HP, HP→Huế, Huế→Đà Nẵng, ĐN→Nha Trang, NT→Sài Gòn, SG→Miền Tây), cùng phong cách và cùng tông (kiểm `contrast_report.py` giữa các mảnh). Tỉnh chưa mở = xám như demo; mở = màu + sao. Chạm quán → lưới level của world đó (giữ lưới cũ, chỉ đổi khung). Xe đậu ở quán hiện tại; chọn quán khác = xe chạy tới (rút ngắn 3 s nếu đã đi qua).
3. Mở vùng theo **tổng sao** (đang có `starsToUnlock`) — giữ.
4. Chuyển vùng = chuyến xe như demo (≈ 9 s, bỏ qua được sau lần đầu) + màn "xin vô quán" 2–3 câu thoại chủ quán `[cần Kent duyệt]`.

**Nghiệm thu.** Bản đồ hiện đúng 4 vùng, tổng level = 129 không đổi (test đếm). Chạm mỗi vùng ra đúng world. Ảnh bản đồ đọc được ở 368 px (tên vùng ≥ 14 px).

**Bẫy.** `progress.js` lưu sao theo `level.id` — id không đổi nên tiến độ cũ giữ nguyên. Đừng đặt lại thứ tự level trong world.

---

## P3 — Sổ tay món (codex): phần thưởng thật

**Mục tiêu.** Nấu đúng một món lần đầu → "mở trang sổ tay": tranh tô đầy, tên Việt + cách đọc, vùng, 3–5 dòng chuyện, cách ăn, và **công thức NẤU THẬT NGOÀI ĐỜI** (Kent 20/09: "ngoài chơi ra còn học nấu ăn ngoài đời thật"). Đây là hai lớp khác nhau, không trộn:
- *Công thức trong game* (`dishes/<id>.json` → bước ráp, trạm) — để chơi.
- *Công thức đời thật* (`dishes/<id>.recipe.<lang>.md`): nguyên liệu cho 4 người + định lượng, các bước nấu (kể cả nấu nước dùng 3–6 tiếng mà game bỏ qua), mẹo, thời gian. **Model nghiên cứu trên mạng** (WebSearch), tổng hợp từ ≥ 2 nguồn tiếng Việt uy tín, **ghi nguồn cuối trang**, viết lại bằng lời mình (không chép), gắn `[cần Kent duyệt]`. Bản en dịch từ bản vi. Có nút "In / lưu công thức".

**Hiện trạng.** Đã có: tranh tô 4 bậc (`dishArt`), `mastery.js` biết món nào đã "thuộc", công thức ở `recipeFor()`. Chưa có màn codex, chưa có chuyện.

**Spec.**
1. `src/data/codex/<dish>.json`: `{ region, story: { vi, en }, eat: { vi, en }, pairs: [...], recipe: 'dishes/<id>.recipe' }`. Model viết nháp **có dấu `[cần Kent duyệt]`** ở đầu mỗi chuỗi cho tới khi Kent xoá dấu. Chuyện ≤ 60 từ, giọng người kể chuyện quán, không wiki. Công thức đời thật theo mẫu cố định: *Nguyên liệu (4 người) · Nước dùng / phần nấu lâu · Sơ chế · Ráp tô · Ăn kèm · Mẹo · Nguồn*.
2. Trang codex: tab "Sổ tay" ở menu, lưới N ô (ô chưa mở = tranh mờ + "???"). Mở ô: tranh tô `wet` to, tên + `pron` + `gloss`, vùng, chuyện, cách ăn, công thức phổ biến (bước từ `recipeFor(dish).assembly` với `label`, định lượng gia đình từ `dishes/<id>.json`).
3. Mở khoá: lần đầu bưng món đó **sạch** (0 lỗi) → cuối ca hiện thẻ "Mở sổ tay: Phở Tái Nạm" (đã có khung thẻ mở khoá từ 0.7.0) → chạm vào là tới trang.
4. Chia sẻ: nút "Chia sẻ" tạo ảnh PNG 1080×1350 (canvas) = tranh + tên + 1 dòng chuyện + "KJ's Choices" — người chơi đăng lên mạng là quảng cáo miễn phí.

**Nghiệm thu.** 21/21 món có codex JSON (test). Bưng sạch Phở lần đầu → thẻ mở → trang đúng món. Ảnh chia sẻ tải được trên Android Chrome.

**Bẫy.** Không để lọt bất kỳ số liệu / thứ tự riêng của quán từ sim-data vào codex — test: codex chỉ đọc `data/dishes/`.

---

## P4 — Quyền chọn của người chơi

**Mục tiêu.** Người chơi *quyết* chứ không chỉ *thực thi*.

**Hiện trạng.** Phiếu khách giống nhau ngoài tên; bot và người đều làm phiếu đầu. Chuẩn bị (`prep` giây) có nhưng không được thưởng. Nâng cấp (`UPGRADES`) chỉ đổi số (thêm rọ, bàn, lò).

**Spec.**
1. **Loại khách thấy được trên phiếu** (`customers.js` đã có `type`): *Du khách* — gọi món dễ, kiên nhẫn ×1.3, tip thường; *Người địa phương* — món đủ bước, kiên nhẫn ×0.8, tip ×1.5, và **chê ra tiếng** nếu sai; *Khách sộp* (VIP, đã có sự kiện) — tip ×3, kiên nhẫn 60 s. Phiếu có huy hiệu loại + màu viền. Bot cũng phải biết ưu tiên (để test).
2. **Thưởng hàng loạt:** trong `prep` mà thả đủ 3 rọ / nấu sẵn nước / trụng sẵn tô → banner "SẴN SÀNG +Nk" đầu ca. Mỗi lần **hai tô cùng lên phiếu trong 3 giây** → "ĐÔI +Nk". Số nhỏ, cảm giác lớn.
3. **Hai nâng cấp đổi cách chơi** (thay 2 cái đổi số): *Bảng gọi món* — thấy trước khách kế tiếp (phiếu mờ) → lên kế hoạch; *Nồi trụng đôi* — 2 rọ xong cùng lúc, cho làm 2 tô song song. Data-driven như UPGRADES hiện tại.
4. Sự kiện `events` trong worlds.js (`tour/vip/rain/change-order`) **chưa chạy ở quầy POV** (Counter bỏ qua — phát hiện 19/09). Nối vào: `tour` = 4 khách một lượt, `vip`, `rain` = vắng 40 s rồi dồn, `change-order` = một phiếu đổi món giữa chừng.

**Nghiệm thu.** Bot có luật ưu tiên: test "VIP tới thì bot làm VIP trước khi VIP bỏ đi" xanh. Mỗi loại sự kiện có test kích hoạt ở quầy. Playtest (P7): người chơi tự nói được "tui làm ông kia trước vì…".

**ĐÃ LÀM (20/09, M4):** `TICKET_KINDS` (tourist ×1.15 · local ×0.9 tip ×1.5 · vip ×0.6 tip ×3) + huy hiệu loại trên phiếu ở `pov.js`. `BONUS = { ready: 40, double: 25, doubleWindow: 3 }` → banner "SẴN SÀNG" / "ĐÔI". `UPGRADES`: bỏ `fire`/`shoes`, thêm *Bảng gọi món* (`m.peek` → phiếu mờ khách kế, `nextUp()`) và *Nồi trụng đôi* (`m.twinPot` → `toPot` thả hai rọ). `runEvents()` chạy `tour/vip/rain/change-order` ngay trong `counter.js` (change-order thử lại tới 90% ca nếu chưa có phiếu nào). Bot sắp phiếu theo "đang có bàn làm dở" rồi tới "còn ít thời gian nhất". Test: `tests/p4.test.js` (15). **Còn nợ:** câu "khen" của chủ quán khi xong quán.

---

## P5d — SCENE GRAPH: bếp ráp bằng object rời (Kent 21/09)

> *"nếu mình chia thành các layer objects thì mình chỉ cần generate các objects rồi ráp vô thôi, để đâu cũng được mà không sợ bị sai vị trí hay bị chèn ảnh. ví dụ bàn prep đi, mình gen mấy cái bàn như z cho từng map. khi có di chuyển nó lên xuống, vẫn là nó. theo tui thấy là có mấy lớp như background, midground, foreground."*

**Luật cốt lõi: OBJECT CHÍNH LÀ Ô THẢ.** `src/data/scene-graph.js` khai mỗi món đồ một hộp `{x, y, w, h}` (% khung) + `zone` + `hit` (ô thả nằm trong object). `zonesFrom()` **suy ra** ZONES từ hộp object — dời cái bếp xuống 6% thì ô thả xuống theo, không phải dò lại toạ độ. Hết hẳn vòng lặp "gen tranh mới → đo lại zones".

**Ba lớp** (`layersFrom()` xếp bg → mid → fg):
- `bg` — tường + sàn, ảnh riêng từng quán: `public/art/scene/bg/<world>.webp` (`scripts/scene_bg.py` bóc từ tranh phòng trống).
- `mid` — đồ cố định: quầy sau, nồi trụng, bồn rửa, bếp lò (`public/art/ob/*.webp`, cắt từ tranh cũ bằng `scripts/scene_objects.py`, nền magenta).
- `fg` — mặt quầy ráp nằm trước mặt người chơi.
- Đồ "rời" (chồng tô, khay sợi, thùng rác, lò vi sóng, chảo chiên) vẫn là sprite theo ô thả, chỉ hiện khi level cần.

**Hộp object đo bằng máy**, không ước lượng: `scripts/objs_boxes.py` cắt nền magenta mà GIỮ khung, lấy bbox alpha rồi quy về % khung bếp → `src/data/ob-boxes.json`. Ô thả suy ra khớp đúng ZONES đo tay cũ (test `tests/scenes.test.js`).

**Thứ tự vẽ:** `.pv-ob.mid` z-index 1 · `.pv-ob.fg` z-index 2 · mọi ô chơi được (`.pv-z`) z-index 3 — đồ đạc không bao giờ che khay/phiếu.

**Đang bật ở:** Phở Cậu Hai, Bún Bò Thím Bảy. Quán chưa có nền riêng thì rơi về tranh phòng trống, rồi tới tranh nguyên tấm.

**Việc còn lại:** 10 tranh nền còn lại · biến thể object theo quán (quầy gỗ cho Huế / Chợ Lớn, bếp than, bàn prep riêng từng map như Kent nói) · ánh sáng: object đang mang ambient của bếp gốc, `tint` chỉ kéo được một phần.

---

## P5c — Bếp riêng cho từng quán (Kent 21/09: "mỗi tỉnh thành đi qua mình vẫn xài chung 1 khung cửa hàng")

**Vấn đề.** `art/scene.webp` dùng chung cho cả 12 quán: đi từ Hà Nội tới Miền Tây mà cái bếp y hệt nhau.

**Cách làm.** Mỗi quán một tranh `public/art/scene/<world>.webp`, gen bằng `scripts/shop_scenes.py` (Flow `edit-image` từ chính tranh gốc): **giữ NGUYÊN góc máy và vị trí/kích thước mọi thiết bị**, chỉ thay căn phòng — tường, sàn, ánh sáng, đồ trang trí. Nhờ vậy `ZONES` không đổi, không phải đo lại, không sợ lệch ô bấm; đồ tĩnh đã nướng vào tranh (`SCENE.baked`) cũng giữ nguyên chỗ.

- `src/data/scenes.js`: `SHOP_SCENES` (world id → `{ src?, zones?, baked? }`) + `sceneFor(worldId)`. Quán nào vẽ lệch thì **ghi đè vài ô trong `zones`** — không cần sửa code.
- `pov.js` lấy tranh + toạ độ qua `sceneFor(this.o.level?.world)`; thiếu file thì `onerror` rơi về `art/scene.webp`, game chạy y cũ.
- Màn "xin vô quán" (`playOwner`) cũng lấy nền là bếp của chính quán đó.
- Chất riêng từng quán: Phở Cậu Hai = Hà Nội cũ tường vàng vôi; Thím Bảy = Huế sơn son thếp vàng, ớt khô treo; Chú Chín = Chợ Lớn đỏ vàng, bàn thờ nhỏ; Bà Mua = Hội An tường vàng đèn lồng; Cô Hai = Nha Trang tường vôi trắng, giàn phơi cá; v.v.

**Nghiệm thu.** `tests/scenes.test.js` (4): mọi quán có mục, `sceneFor` trả đủ toạ độ, quán lạ rơi về bếp gốc.

---

## P5b — Mở app: setup → intro → vô quán (Kent 20/09: "nó bị ngược á")

**Trước đây sai:** mở app ra thẳng menu, cốt truyện chỉ chạy khi bấm Bắt đầu level đầu — người chơi thấy lưới level trước khi biết mình là ai.

**Giờ:** lần đầu mở app chạy `src/setup.js` → `playIntro()` → menu. Lần sau vô thẳng menu.
1. **Chọn ngôn ngữ** (song ngữ, 2 nút lớn — chuỗi nằm thẳng trong `setup.js` vì lúc đó chưa có ngôn ngữ; đánh dấu `// vi-src`).
2. **Tên + xưng hô** (Nam / Nữ / Không nói) + nút Bỏ qua. Lưu ở `localStorage['qb.player']`, không gửi đi đâu.
3. **Mở đầu 4 tấm** rồi vô menu. Màn "xin vô quán" (`playOwner`) vẫn ở chỗ cũ — lần đầu vô mỗi quán.
Đổi lại sau bằng nút *Đổi tên · xưng hô* trong Cách chơi · tuỳ chọn.

**Xưng hô (Kent chốt: chỉ đổi thoại, KHÔNG gen bộ nhân vật nữ).** `src/data/player.js` có `speak(text, fallback)`:
`{you}` → tên người chơi, chưa nhập thì lấy `call` của quán ("con", "cháu", "{cậu|cô}"); `{a|b}` → a nếu nam, b nếu nữ, không nói thì lấy a. Lồng được: `call: '{cậu|cô}'` + `{you}` → "cô".
Mọi thoại 12 quán + 6 bong bóng chuyến xe đã viết lại có `{you}`; bản EN có `quan.<id>.call` / `trip.<id>.call` riêng ("friend", "kid", "child"). `scripts/_sync_vi.mjs` đồng bộ `vi.json` từ `regions.js` (nguồn) để khỏi lệch.

**Tên hiện ở:** thoại chủ quán · thẻ kết quả cuối ca (`Kent · Phở 1 — …`) · ảnh chia sẻ sổ tay ("Kent nấu"). *Để dành:* bảng hiệu quán riêng ở M7/M8.

**Bộ ảnh nữ (21/09).** Chọn *Nữ* → mở đầu dùng `public/art/intro/f/intro-{1..4}.webp` (4 tấm gen lại bằng Flow, cùng nhân vật: nữ hai mươi mấy, kính tròn viền mảnh, tóc buộc đuôi ngựa, sơ mi trắng xắn tay). Nam / Không nói → bộ gốc `public/art/intro/`. Thiếu ảnh thì `onerror` tự rơi về bộ gốc nên không bao giờ bể màn. Prompt + script ở `scripts/_introf_prep.py`, ảnh gốc `art/raw/intro-f/`.

**Nghiệm thu.** `tests/player.test.js` (6): mọi quán/mảnh bản đồ có `call`, mọi thoại `{…}` giải hết, tên bị dọn sạch (cắt 16 ký tự, bỏ thẻ HTML). Đã soi Chromium: setup → intro → menu → "Bỏ việc đi học nấu ăn hả Kent?".

---

## P5 — Onboarding 60 giây

**Mục tiêu.** Người chưa biết phở là gì bưng được tô đầu trong 60 giây mà không đọc đoạn văn nào.

**Hiện trạng.** Level 1 có `hint` chữ (9 giây banner) và dòng "Kéo hoặc chạm đôi: tô vô nồi…". Người ngoài không đọc.

**Spec.** Level `pho-1` thành hướng dẫn *bằng tay*: bàn tay ký hoạ (đã có `hand` art) chỉ vào thứ cần kéo, mũi tên nét mực tới đích, chữ **≤ 3 từ** (`t()`), mỗi bước chờ người chơi làm xong mới tới bước kế. 4 bước: tô → nồi · rổ → nồi · topping → tô · tô → phiếu. Xong 4 bước là chơi tự do. Bỏ qua được (nút nhỏ).

**Nghiệm thu.** P7: 3/3 người ngoài bưng tô đầu < 60 s, không hỏi gì.

---

## P6 — Pipeline thêm món: một lệnh

**Mục tiêu.** `node scripts/add_dish.mjs <dish-id>` chạy hết mọi gen còn thiếu và in checklist.

**Hiện trạng.** Có rời rạc: `process_icons.py`, `pans_to_webp.py`, `steps_to_webp.py`, `gen_icons_map.mjs`, `_mkstamp.py`… (docs/ART-PIPELINE.md). Thêm phở gà / sốt vang / xào lăn ngày 19/09 phải sửa tay 6 chỗ (`config.js` PRICES, `SHELF_TOPPING`, `BURNER_DISHES`, `STOVETOP_DISHES`, LEVELS, i18n sau này).

**Spec.** Một món = `src/data/dishes/<id>.json` (công thức chung: bước ráp, trạm, thời gian, định lượng gia đình, giá, vùng, `pron`, `gloss`, codex). **Trạm cũng là data** — `src/data/stations.json` (tên, sprite, thời gian mặc định, ô thả): món dùng 6 trạm sẵn có (nồi trụng, bồn, thớt, chảo chiên, lò vi sóng, mặt bếp) là thuần data; món cần động tác mới (đổ bánh xèo, hấp bánh bèo, nướng than) thì thêm MỘT trạm vào `stations.json` + sprite, engine chỉ cần code mới khi cơ chế thật sự lạ. Script: validate schema → gen icon nguyên liệu thiếu → gen khay → gen 4 bậc tô → thêm key i18n → chạy test "mọi món có đủ asset". Các bảng trong `config.js` (PRICES, SHELF_TOPPING, BURNER_DISHES…) suy từ `dishes/*.json` thay vì hard-code. **P6 phải làm trước khi thêm món mới nào** — và bước đầu tiên của P6 là chuyển 21 món hiện có sang `dishes/` (bản chung, không phải bản quán), giữ id/art.

**Nghiệm thu.** Thêm một món giả `test-dish` bằng lệnh → test xanh → xoá. Không sửa file code nào.

**ĐÃ LÀM (20/09, M5 — 5 món đợt 1):** `mi-quang`, `cao-lau`, `hu-tieu-nam-vang`, `bun-thang`, `bun-cha-ca` → 26 món, **0 trạm mới**. Từ điển món game tách riêng ở `src/data/game-extras.js` (sợi/cốt/hành động mới) rồi trộn vào `SIM` trong `dishlib.js` — `sim-data.js` (dữ liệu quán thật của Kent) KHÔNG đụng tới. 4 quán mới / 34 level → 163 level; Đà Nẵng và Nha Trang hết "sắp mở". `serve()` lấy giá từ công thức (`recs[dish].price`) thay vì bảng `PRICES` của quán; `config.js` thêm `GAME_DISHES` / `DISH_PRICES`, `ALL_DISHES` vẫn chỉ là món quán. 17 ảnh qua `process_icons.py` / `cut_magenta.py`. Test level-wide chuyển sang `setSource('game')`, test 3D lọc `SHOP_WORLDS`. **Còn nợ P6.5:** ảnh từng bước cho 5 món mới + ~8 món có thứ tự ráp khác bản quán.

**ĐÃ LÀM (20/09, commit c074719):** `src/data/dishes/<id>.json` ×21 (schema v1 ghi ở đầu `src/game/dishlib.js`: serve / noodle / broth / prep / assembly / codex / real + pron, gloss, region, price) → `dishToSim()` dựng bản ghi kiểu sim-data nên engine chạy y cũ. `recipes.js`: `D` là object sống, `setSource('game')` cho level trên bản đồ (`startLevelPov`), `'shop'` cho Luyện / mini / 3D. `stations.json` 7 trạm → `stationForAction`. `art-manifest.json` sinh bởi `scripts/_art_manifest.mjs` (art.js hết hard-code). `node scripts/add_dish.mjs <id> [--scaffold|--json]` = validate + checklist asset/i18n + in lệnh gen; gen ảnh vẫn chạy tay (Flow trên PC). Test: `tests/dishes.test.js` (10). PACE đo lại với nguồn game (`POV_SECONDS`). Bảng bản chung 21 món + khác gì bản quán: `docs/ROADMAP.md` §5b `[cần Kent duyệt]`. **Phát sinh P6.5:** ảnh bước `step/*-kN` vẽ theo thứ tự quán → gen lại cho ~8 món sau khi duyệt.

---

## P7 — Playtest người ngoài (nguồn sự thật)

**Kent làm:** tìm **3 người không làm ở quán, không phải dân Việt nếu được**, đưa điện thoại, nói đúng một câu "chơi thử đi", **không giải thích**, ngồi nhìn 10 phút, ghi: phút mấy bưng tô đầu · phút mấy có vẻ chán / bỏ · câu họ nói đầu tiên · họ có đọc sổ tay không.

**Model làm:** `?log=1` ghi sự kiện local (bắt đầu, tô đầu, lỗi, bỏ level, mở codex) vào localStorage, nút "Xuất log" ra JSON — không server, không gửi đi đâu.

**Nghiệm thu = quyết định:** tô đầu < 60 s cho 3/3 → P5 đạt; ≥ 2/3 chơi hết 10 phút không được bảo → mới đáng làm P8.

**ĐÃ LÀM (20/09, M6 phần model):** `src/playlog.js` — bật bằng `?log=1` (nhớ trong localStorage, tắt `?log=0`), ghi vào `localStorage['qb.log']`, **không có server, không gửi đi đâu**. Sự kiện: `boot` (ngôn ngữ, cỡ màn, tổng ★) · `level.start` (id, quán, số món, pov/3d/drill/rush/survival) · `serve` (món, giây chờ, chất lượng — tô ĐẦU của phiên có cờ `first`) · `level.end` (★, phục vụ, bỏ đi, lỗi, tiền) · `level.quit` · `mini.start` / `mini.end` · `codex.open` (món, ★, đã mở công thức thật chưa) · `tut.done` / `tut.skip` · `lang`. Mọi `at` là giây kể từ lúc mở app → trả lời thẳng câu "phút mấy bưng tô đầu".
Hộp log nằm trong *Cách chơi · tuỳ chọn*, chỉ hiện khi bật: một dòng tóm tắt (sự kiện · tô đầu · level xong · mở sổ tay mấy lần) + **Xuất log** (tải JSON có cả `summary`) + **Xoá log**. Test `tests/playlog.test.js` (4). Đã thử bằng Chromium: `boot → level.start → serve FIRST → tut.done`, file JSON tải xuống đúng.
**Kent làm tiếp:** mở `…/quan-bun/?log=1` trên điện thoại đưa cho người chơi, xong bấm Xuất log gửi tui.

---

## P8 — Nền tảng

PWA đã có (`sw.js`, manifest). Thêm: màn "cài vào máy" cho Android/iOS; link chia sẻ có ảnh (Open Graph) bằng tiếng Anh; sau P7, cân nhắc gói **Capacitor** để lên Play Store / App Store (cùng code). Chưa bàn tiền.

---

## Không được làm

- Dịch tên món. Bịa xuất xứ, chuyện, cách ăn mà không gắn `[cần Kent duyệt]`.
- Lấy công thức / định lượng / thứ tự riêng của quán (sim-data) vào game chính. Rút gọn cho người mới chỉ bằng `simplify` như hiện tại.
- Sửa `worlds.js` để "xếp lại cho hợp vùng" bằng cách đổi id level — tiến độ người chơi treo vào id.
- Thêm ngôn ngữ thứ ba trước khi P7 xong.
- Làm P8 (app store) trước P7.
- Kết luận game cuốn hay không từ khung xem trước hay từ chính Kent.
