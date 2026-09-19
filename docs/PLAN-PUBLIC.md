# PLAN-PUBLIC — "Món Việt cho thế giới" (KJ's Choices → game cho người chơi)

Kent quyết 19/09: **game chính là game cho người chơi, mục đích giới thiệu món Việt ra thế giới.** Chế độ luyện của Kent nằm ở tab *Thêm* (mini games), không đụng. Ba quyết định đã chốt: **hành trình Bắc → Nam**, **vi + en trước**, **giữ công thức thật của quán** (thứ tự thật, định lượng thật, ghi "theo cách làm của quán KJ").

Kế hoạch này viết để **bất kỳ model nào** cũng làm đúng ý. Đọc §0 trước. Mỗi P = một hạng mục, có *Hiện trạng* (đọc code trước khi tin), *Spec*, *Nghiệm thu đo được*, *Bẫy*. Làm xong một P = **một commit + một deploy + Kent thử trên điện thoại**, không gộp.

---

## 0. Luật cho model (đọc trước, không bỏ)

1. **Sự thật bếp chỉ từ `src/data/sim-data.js`** (gốc `F:\AntiGravity\cooking-note\sim-data.js`). Không bịa bước, định lượng, xuất xứ món. Chuyện kể về món (sổ tay) **model được viết nháp**, nhưng mọi câu về lịch sử / vùng miền / cách ăn phải gắn thẻ `[cần Kent duyệt]` cho tới khi Kent gật — game này đại diện ẩm thực Việt, sai một câu là mất uy tín.
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

**Câu một dòng của game:** *Bạn là đầu bếp mới, đi từ Hà Nội vào Sài Gòn, mỗi vùng học nấu vài món thật của người ở đó — nấu đúng, nấu kịp, và mang được món đó về trong sổ tay của mình.*

---

## 2. Thứ tự làm và công (tính bằng "phiên" ≈ một buổi làm của model)

| P | Việc | Công | Vì sao thứ tự này |
|---|---|---|---|
| P1 | i18n nền (vi + en) | 2 phiên | Làm trước khi thêm chữ mới, không thì phải dịch hai lần |
| P2 | Bản đồ Việt Nam, world = vùng | 2 phiên | Cái "lý do" — mọi thứ sau treo lên nó |
| P3 | Sổ tay món (codex) | 2 phiên + Kent viết chuyện | Phần thưởng thật của game |
| P4 | Quyền chọn: loại khách, hàng loạt, nâng cấp đổi cách chơi | 2 phiên | Lỗ hổng lớn nhất về gameplay |
| P5 | Onboarding 60 giây | 1 phiên | Người ngoài bỏ ở phút 2 nếu không có |
| P6 | Pipeline thêm món một lệnh | 1 phiên | Scalable = data, không code |
| P7 | Playtest người ngoài + đo | 0.5 phiên + Kent tìm 3 người | Nguồn sự thật duy nhất về "cuốn" |
| P8 | Nền tảng: PWA hoàn chỉnh, chia sẻ, (sau) gói app | 1 phiên | Sau khi P7 nói là đáng |

Tổng ≈ 11–12 phiên. **Không làm P8 trước P7.**

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

---

## P2 — Bản đồ Việt Nam: world = vùng, đi Bắc → Nam

**Mục tiêu.** Mở game thấy bản đồ Việt Nam ký hoạ màu nước, các vùng sáng dần; mỗi vùng vài món của vùng đó.

**Hiện trạng.** 8 world theo món: `pho`, `bun-rieu`, `bun-bo`, `hai-phong`, `mon-kho`, `chao`, `khai-vi`, `cha-ca` (`src/data/worlds.js`, `buildWorlds`). Màn chọn level là lưới số. Không có bản đồ.

**Spec.**
1. `src/data/regions.js`: danh sách vùng theo thứ tự hành trình, mỗi vùng gom world hiện có (**không đổi id world, không đổi level**):

   | Vùng | World gom vào | Ghi chú `[cần Kent duyệt]` |
   |---|---|---|
   | Hà Nội | `pho`, `cha-ca`, `mon-kho` (bún chả, bún đậu, bún nem) | bánh hỏi thịt heo trong `mon-kho` là món Nam/Trung — Kent quyết để đâu |
   | Hải Phòng | `hai-phong` | |
   | Huế | `bun-bo` | |
   | Sài Gòn | `khai-vi` (gỏi cuốn, chả giò), `chao`, `bun-rieu` | bún riêu gốc Bắc nhưng bản quán là kiểu Nam — Kent quyết |

   Kent có thể tách thêm vùng (Nha Trang, Cần Thơ…) sau khi có món; cấu trúc cho phép vùng 1 world.
2. Màn bản đồ thay lưới world: ảnh `art/map-vn.webp` (gen Flow, kiểu C, bản đồ Việt Nam cách điệu, các vùng là "ghim" tranh nhỏ). Vùng khoá = xám mờ + ổ khoá; mở = màu + số sao. Chạm vùng → danh sách level của vùng (lưới cũ giữ, chỉ đổi khung).
3. Mở vùng theo **tổng sao** (đang có `starsToUnlock`) — giữ.
4. Chuyển vùng có một màn "đi đường" 2 giây: đường vẽ nét mực chạy từ vùng cũ tới vùng mới trên bản đồ + tên vùng + 1 dòng `[cần Kent duyệt]` ("Huế — cố đô, ăn cay, nước lèo có sả và mắm ruốc").

**Nghiệm thu.** Bản đồ hiện đúng 4 vùng, tổng level = 129 không đổi (test đếm). Chạm mỗi vùng ra đúng world. Ảnh bản đồ đọc được ở 368 px (tên vùng ≥ 14 px).

**Bẫy.** `progress.js` lưu sao theo `level.id` — id không đổi nên tiến độ cũ giữ nguyên. Đừng đặt lại thứ tự level trong world.

---

## P3 — Sổ tay món (codex): phần thưởng thật

**Mục tiêu.** Nấu đúng một món lần đầu → "mở trang sổ tay": tranh tô đầy, tên Việt + cách đọc, vùng, 3–5 dòng chuyện, cách ăn, và **công thức thật của quán** (từ sim-data, trình bày đẹp).

**Hiện trạng.** Đã có: tranh tô 4 bậc (`dishArt`), `mastery.js` biết món nào đã "thuộc", công thức ở `recipeFor()`. Chưa có màn codex, chưa có chuyện.

**Spec.**
1. `src/data/codex/<dish>.json`: `{ region, story: { vi, en }, eat: { vi, en }, pairs: [...] }`. Model viết nháp **có dấu `[cần Kent duyệt]`** ở đầu mỗi chuỗi cho tới khi Kent xoá dấu. Chuyện ≤ 60 từ, giọng người kể chuyện quán, không wiki.
2. Trang codex: tab "Sổ tay" ở menu, lưới 21 ô (ô chưa mở = tranh mờ + "???"). Mở ô: tranh tô `wet` to, tên + `pron` + `gloss`, vùng, chuyện, cách ăn, công thức thật (danh sách bước từ `recipeFor(dish).assembly` với `label`, định lượng từ sim-data nếu có), dòng "Theo cách làm của quán KJ".
3. Mở khoá: lần đầu bưng món đó **sạch** (0 lỗi) → cuối ca hiện thẻ "Mở sổ tay: Phở Tái Nạm" (đã có khung thẻ mở khoá từ 0.7.0) → chạm vào là tới trang.
4. Chia sẻ: nút "Chia sẻ" tạo ảnh PNG 1080×1350 (canvas) = tranh + tên + 1 dòng chuyện + "KJ's Choices" — người chơi đăng lên mạng là quảng cáo miễn phí.

**Nghiệm thu.** 21/21 món có codex JSON (test). Bưng sạch Phở lần đầu → thẻ mở → trang đúng món. Ảnh chia sẻ tải được trên Android Chrome.

**Bẫy.** Định lượng thật của quán là tài sản của Kent — Kent chốt "giữ thật", nhưng nếu đổi ý thì chỉ ẩn phần `qty`, không xoá data.

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

**Spec.** Một món = một thư mục `dishes/<id>/`: `recipe` (trỏ sim-data), `meta.json` (giá, trạm, vùng), `codex.json`, art gen ra `public/art/...`. Script: kiểm sim-data có món → gen icon nguyên liệu thiếu → gen khay → gen 4 bậc tô → tạo codex nháp `[cần Kent duyệt]` → thêm key i18n → chạy test "mọi món có đủ asset". Các bảng trong `config.js` (PRICES, SHELF_TOPPING…) đọc từ `meta.json` thay vì hard-code.

**Nghiệm thu.** Thêm một món giả `test-dish` bằng lệnh → test xanh → xoá. Không sửa file code nào.

---

## P7 — Playtest người ngoài (nguồn sự thật)

**Kent làm:** tìm **3 người không làm ở quán, không phải dân Việt nếu được**, đưa điện thoại, nói đúng một câu "chơi thử đi", **không giải thích**, ngồi nhìn 10 phút, ghi: phút mấy bưng tô đầu · phút mấy có vẻ chán / bỏ · câu họ nói đầu tiên · họ có đọc sổ tay không.

**Model làm:** `?log=1` ghi sự kiện local (bắt đầu, tô đầu, lỗi, bỏ level, mở codex) vào localStorage, nút "Xuất log" ra JSON — không server, không gửi đi đâu.

**Nghiệm thu = quyết định:** tô đầu < 60 s cho 3/3 → P5 đạt; ≥ 2/3 chơi hết 10 phút không được bảo → mới đáng làm P8.

---

## P8 — Nền tảng

PWA đã có (`sw.js`, manifest). Thêm: màn "cài vào máy" cho Android/iOS; link chia sẻ có ảnh (Open Graph) bằng tiếng Anh; sau P7, cân nhắc gói **Capacitor** để lên Play Store / App Store (cùng code). Chưa bàn tiền.

---

## Không được làm

- Dịch tên món. Bịa xuất xứ, chuyện, cách ăn mà không gắn `[cần Kent duyệt]`.
- Đơn giản hoá công thức trong game (Kent chốt giữ thật). Rút gọn chỉ ở thang tập bằng `simplify` như hiện tại.
- Sửa `worlds.js` để "xếp lại cho hợp vùng" bằng cách đổi id level — tiến độ người chơi treo vào id.
- Thêm ngôn ngữ thứ ba trước khi P7 xong.
- Làm P8 (app store) trước P7.
- Kết luận game cuốn hay không từ khung xem trước hay từ chính Kent.
