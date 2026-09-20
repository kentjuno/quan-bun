# ROADMAP — KJ Phở Real

*Bản đồ đường đi cho cả dự án, để không quên gì. Spec chi tiết từng hạng mục nằm ở `docs/PLAN-PUBLIC.md` (P1–P8); file này là THỨ TỰ, MỐC, và CHECKLIST. Cập nhật ngày 20/09/2026.*

---

## 1. Câu chuyện (Kent chốt 20/09)

**Nhân vật chính** là một **nhân viên văn phòng chán việc**. Một ngày bỏ hết, xách xe Cub đỏ đi khắp Việt Nam để học và tìm hiểu ẩm thực Việt. Tới mỗi tỉnh, xin vô một quán, **chủ quán thử thách**: học món, rồi đứng ca làm cho ra hồn. **Vượt qua thử thách mới mở được công thức đầy đủ** của món đó — để về nấu thật ngoài đời. Mỗi màn chơi tích **sao**; sao mở công thức, mở tỉnh kế.

**Câu một dòng (en):** *You quit your desk job, hopped on a red Cub, and rode the length of Việt Nam — earning every recipe the hard way.*

**Cảnh mở đầu (30 giây, cắt giấy):** văn phòng xám → nhân vật nhìn tô phở trên bàn → đóng laptop → cửa mở, xe Cub, bản đồ trải ra, xe lăn bánh về Hà Nội. Không thoại, chỉ tiếng.

**Mở khoá bằng sao (cơ chế cốt lõi, áp cho mọi món):**

| Mốc | Điều kiện | Mở ra |
|---|---|---|
| Sổ tay: trang món | Học xong món (màn "Học món" của quán) | Tranh tô, tên + cách đọc, vùng, 3–5 dòng chuyện, cách ăn |
| Công thức trong game | ≥ 1★ ở màn "đủ bước thật" đầu tiên của món | Danh sách bước ráp đầy đủ (để chơi không cần gợi ý) |
| **Công thức nấu thật** | **≥ 6★ tích từ các màn có món đó** (≈ 2 màn 3★ hoặc 3 màn 2★) | Nguyên liệu 4 người + định lượng, nước dùng, sơ chế, ráp, mẹo, nguồn — nút in / lưu |
| Tỉnh kế | Tổng ★ của tỉnh ≥ `starsToUnlock` (đang có) | Chuyến xe sang tỉnh mới |
| Vật kỷ niệm tỉnh | Hoàn thành mini-game của tỉnh | Hiện trên bản đồ |

Số 6★ là đề xuất — chỉnh ở một chỗ (`PACE.recipeStars` hoặc `codex.js`), không sửa từng món.

**Vòng chơi:** Bản đồ → tỉnh → xin vô quán → học món → ca làm (sao) → mini-game tỉnh → sổ tay mở dần → tỉnh kế.

---

## 2. Nguyên tắc không đổi

1. Công thức game chính = **công thức chung Việt Nam** (`src/data/dishes/`), gắn `[cần Kent duyệt]` tới khi Kent gật. `sim-data.js` (bếp quán) chỉ ở tab Luyện.
2. Tên món **không dịch**; cách đọc + giải nghĩa kèm theo. Mọi chữ qua `t()`.
3. Thêm món / tỉnh / trạm = **data + script**, không sửa code.
4. Nhịp chơi chỉ chỉnh ở `src/data/pace.js`; đổi là chạy test bot 129 level.
5. Animation = **cắt giấy** (khuôn `tools/roadtrip.html`), không engine mới, không vẽ khung hình.
6. Cảm giác chỉ nghiệm thu trên điện thoại Kent và người chơi ngoài. Mỗi hạng mục = một commit + một deploy + một lần Kent thử.
7. Bẫy công cụ: `device_commit_files` với `stagedPath` ghi bản CŨ → luôn `SendUserFile` → `fileUuid`. GitHub Pages build 1–3 phút, xác nhận bằng `gh api repos/kentjuno/quan-bun/pages/builds`.

---

## 3. Mốc (M0 → M8)

| Mốc | Tên | Gồm | Công | Kent cần làm |
|---|---|---|---|---|
| **M0** | Đã xong (19–20/09) | J1–J9 juice · nhịp thật (pace) · hết dán ghép · i18n phần 1 · tên KJ Phở Real · demo roadtrip chốt | — | — |
| **M1** | Nền tảng nội dung | P1 phần 2 (i18n đủ) · P6: schema `dishes/`, chuyển 21 món sang bản chung, `stations.json`, `add_dish.mjs` | 3 phiên | Duyệt 21 công thức chung |
| **M2** | Hành trình | P2: 5 mảnh bản đồ, đường + quán mỗi mảnh, gắn vào game thay lưới world, chủ quán + màn xin vô quán, cảnh mở đầu văn phòng, cơ chế sao mở tỉnh | 3 phiên | Duyệt thoại chủ quán, tên quán |
| **M3** | Học & thưởng | P5 học món cho mọi món · P3 sổ tay 3 mốc sao · **công thức nấu thật** 21 món (nghiên cứu mạng, ghi nguồn) · nút in/lưu · chia sẻ ảnh | 3 phiên | Duyệt 21 công thức thật + chuyện |
| **M4** | Chơi cho ra game | P4: loại khách, thưởng hàng loạt, 2 nâng cấp đổi cách chơi, nối sự kiện vào quầy · P6b mini-game theo tỉnh · vật kỷ niệm | 3 phiên | Chơi thử, chỉnh PACE |
| **M5** | Mở rộng món đợt 1 | mì Quảng, cao lầu, hủ tiếu Nam Vang, bún thang, bún chả cá (0 trạm mới) qua `add_dish.mjs`; level cho tỉnh Quảng Nam / Nha Trang | 2 phiên | Duyệt 5 món |
| **M6** | Playtest | P7: 3 người ngoài × 10 phút, log local, sửa theo kết quả | 1 phiên + Kent | Tìm 3 người, ngồi nhìn |
| **M7** | Phát hành web | P8: PWA hoàn chỉnh, màn cài app, Open Graph tiếng Anh, trang landing một màn, nút chia sẻ | 1 phiên | Kiểm tên/handle, chọn domain |
| **M8** | Trạm mới + store | `stations.json` thêm nướng / đổ chảo / hấp / khuôn; cơm tấm, bánh xèo, bánh bèo, bánh cuốn, bánh căn; gói Capacitor lên Play / App Store | 3–4 phiên | Tài khoản store |

Tổng còn lại ≈ 19–20 phiên. **Không nhảy cóc M6 → M7.**

---

## 4. Chi tiết từng mốc (việc + nghiệm thu)

### M1 — Nền tảng nội dung
- [x] **(20/09, commit 4ae5d18)** P1.2: `counter.js` thông báo lỗi → `t()`; màn kết quả; tab Thêm/Luyện; thoại khách; `hint` 129 level (en); `items.json` cách đọc + giải nghĩa cho 21 món + ~90 nguyên liệu; `scripts/i18n_lint.mjs` chạy trong test. *Nghiệm thu:* lint = 0; chơi hết Phở 1 bằng EN không thấy chữ Việt ngoài tên món.
- [x] **(20/09, c074719)** P6.1: schema `dishes/<id>.json` (id, tên, pron, gloss, vùng, giá, bước ráp + trạm + thời gian, định lượng gia đình, codex, recipeStars). Test schema.
- [x] **(20/09)** P6.2: chuyển 21 món sang bản chung `[cần Kent duyệt — xem bảng §5b]`; `recipes.js` đọc từ `dishes/` cho game chính, `sim-data` cho tab Luyện. *Nghiệm thu:* 94 test xanh; không chuỗi nào từ sim-data lọt vào sổ tay.
- [x] **(20/09)** P6.3: `stations.json` (7 trạm: 6 POV + lò nước) → `stationForAction` + `STATIONS`; giá lấy từ `dish.price` (PRICES giữ cho bản quán/3D). SHELF_TOPPING / BURNER_DISHES chỉ bếp 3D bản cũ → không đụng.
- [x] **(20/09)** P6.4: `node scripts/add_dish.mjs <id> [--scaffold|--json]` — validate → checklist asset/i18n (in lệnh gen cần chạy) → cập nhật `art-manifest.json`. Gen ảnh vẫn chạy tay trên PC (Flow) — script chỉ báo thiếu gì. *Nghiệm thu:* test `zz-test-dish` qua CLI + `test-dish` in-memory bot chơi được.
- [ ] **P6.5 (mới, phát sinh):** ảnh từng bước `public/art/step/<dish>-kN.webp` được vẽ theo THỨ TỰ BẢN QUÁN → với bản chung, bậc `k` lệch ở món đổi thứ tự (bún riêu, bánh đa cua, bún đậu, bánh hỏi, bún nem…). Tô 4 bậc (s0/dry/top/wet) vẫn đúng. Gen lại step cho ~8 món sau khi Kent duyệt bảng §5b (1 phiên art).

### M2 — Hành trình
- [ ] Gen 5 mảnh (HP→Huế, Huế→ĐN, ĐN→Nha Trang, NT→Sài Gòn, SG→Miền Tây) cùng prompt khuôn; kiểm tông giữa các mảnh (`contrast_report.py`).
- [ ] Đường + điểm quán cho mỗi mảnh bằng `roadtrip.html?edit=1`; lưu vào `src/data/regions.js` (tỉnh, mảnh, PTS, ranh, quán → world id).
- [ ] Màn bản đồ trong game thay hàng world: xe đậu ở quán hiện tại, tỉnh khoá xám, chạm quán → lưới level cũ; chuyến xe khi mở tỉnh mới (bỏ qua được sau lần đầu).
- [ ] Chủ quán: 8 khách quen → chủ 8 quán (tên quán, 3 câu: chào / thử thách / khen). Màn "xin vô quán" cắt giấy: cửa mở, chủ quán trượt vào, bong bóng.
- [ ] Cảnh mở đầu văn phòng 30 s (4 tấm Flow + chuyển cảnh), bỏ qua được.
- [ ] Sao mở tỉnh dùng `starsToUnlock` sẵn có; hiện số ★ cần trên tỉnh khoá.
- *Nghiệm thu:* 129 level còn nguyên id; tiến độ cũ giữ; Kent đi hết HN → Miền Tây trên điện thoại không kẹt; mỗi chuyến ≤ 12 s.

### M3 — Học & thưởng
- [ ] P5: màn "Học món" = level 1 của mỗi món nhưng chủ quán chỉ tay (bàn tay + mũi tên mực, chữ ≤ 3 từ), chờ người chơi làm xong từng bước. Bỏ qua được. *Nghiệm thu:* tô đầu < 60 s cho người mới (đo ở M6).
- [ ] P3: sổ tay 3 mốc sao (bảng §1). `src/data/codex/<dish>.json` + `dishes/<id>.recipe.vi.md` + `.en.md`.
- [ ] Công thức nấu thật 21 món: mỗi món ≥ 2 nguồn tiếng Việt uy tín, viết lại bằng lời mình, mẫu cố định (*Nguyên liệu 4 người · Nước dùng / phần nấu lâu · Sơ chế · Ráp · Ăn kèm · Mẹo · Nguồn*), `[cần Kent duyệt]`. Bản en dịch từ vi.
- [ ] Thẻ "Mở công thức!" cuối ca khi đủ sao; nút in / lưu PDF; nút chia sẻ ảnh 1080×1350.
- *Nghiệm thu:* 21/21 món có codex + recipe vi/en (test); đủ 6★ ở món → trang công thức thật mở đúng; ảnh chia sẻ tải được trên Android.

### M4 — Chơi cho ra game
- [ ] Loại khách trên phiếu (du khách / địa phương / sộp) + bot biết ưu tiên (test VIP).
- [ ] Thưởng hàng loạt ("SẴN SÀNG", "ĐÔI").
- [ ] Nâng cấp *Bảng gọi món* (thấy trước khách kế) và *Nồi trụng đôi*.
- [ ] Sự kiện `tour / vip / rain / change-order` chạy ở quầy POV (test mỗi loại).
- [ ] P6b: 5 mini-game hiện có đổi data theo tỉnh (HN rau thơm, HP bóc cua, Huế nêm cay, ĐN…, SG…), thưởng vật kỷ niệm hiện trên bản đồ.
- *Nghiệm thu:* bot 129 level vẫn 3★ sau khi thêm loại khách; Kent nói được "tui làm ông kia trước vì…".

### M5 — Mở rộng món đợt 1
- [ ] mì Quảng → cao lầu → hủ tiếu Nam Vang → bún thang → bún chả cá Nha Trang, mỗi món: `add_dish.mjs` + công thức game + công thức thật + codex + 4–6 level ở tỉnh tương ứng.
- *Nghiệm thu:* mỗi món thêm không sửa file code nào; bot 3★ level mới.

### M6 — Playtest
- [ ] `?log=1` ghi sự kiện local, nút xuất JSON.
- [ ] Kent: 3 người ngoài, 10 phút, không giải thích; ghi phút tô đầu / phút bỏ / câu nói đầu / có mở sổ tay không.
- *Quyết định:* tô đầu < 60 s cho 3/3 → M3 đạt; ≥ 2/3 chơi hết 10 phút → làm M7.

### M7 — Phát hành web
- [ ] PWA: màn "cài vào máy" Android/iOS, icon KJ Phở Real, splash.
- [ ] Open Graph (en) + trang landing một màn (bản đồ + xe + 3 dòng + nút Play).
- [ ] Nút chia sẻ (Web Share API) từ sổ tay và kết quả.
- [ ] Kent: domain (không phải phoreal), handle TikTok / IG / YouTube cùng tên.

### M8 — Trạm mới + store
- [ ] `stations.json` thêm: nướng than (bún chả thật, cơm tấm), đổ chảo (bánh xèo), hấp (bánh bèo, bánh cuốn), khuôn (bánh căn / khọt). Mỗi trạm: sprite + luật thời gian + ô thả.
- [ ] Món đợt 2: cơm tấm sườn bì chả, bánh xèo, bánh bèo, bánh cuốn, bánh căn, bánh khọt, bún mắm, cơm hến, bánh mì cay.
- [ ] Capacitor: gói Android trước, iOS sau; kiểm quyền, âm thanh nền, safe-area.

---

## 5. Kho nội dung phải làm (để không sót)

| Loại | Số lượng | Ai | Trạng thái |
|---|---|---|---|
| Mảnh bản đồ | 6 (1 xong) | model + Flow | 1/6 |
| Đường + quán mỗi mảnh | 6 | model | 1/6 (HN→HP tạm) |
| Chủ quán (tên, 3 câu thoại, tranh) | 8 | model nháp, Kent duyệt | 0/8 |
| Cảnh mở đầu | 4 tấm | model + Flow | 0 |
| Công thức game bản chung | 21 (+5 M5, +9 M8) | model nháp, Kent duyệt | 0/21 |
| Công thức nấu thật (vi + en, có nguồn) | 21 (+14) | model nghiên cứu, Kent duyệt | 0/21 |
| Chuyện + cách ăn (codex) | 21 (+14) | model nháp, Kent duyệt | 0/21 |
| Cách đọc + giải nghĩa (items.json) | 21 món + ~90 nguyên liệu | model | 0 |
| Level title/whatsNew (en) | 129 | model | 129/129 ✅ |
| Level hint (en) | 129 | model | 0/129 |
| Mini-game theo tỉnh (data) | 6 tỉnh × 1 | model | 0/6 |
| Vật kỷ niệm (sprite) | 6 | model + Flow | 0/6 |

---

## 5b. Bản CHUNG 21 món (P6.2, 20/09) — `[cần Kent duyệt]`

Nguồn: `src/data/dishes/<id>.json`. Bản quán (sim-data) vẫn dùng ở Luyện / mini-game / 3D. Khác bản quán ở 13/21 món.

| Món | Vùng | Bản chung (thứ tự bỏ vào) | Khác bản quán |
|---|---|---|---|
| Phở tái nạm | Hà Nội | tô nóng, phở, nạm, bò tái, hành tây, hành lá, ngò, nước | ngò/hành đổi chỗ |
| Phở đặc biệt | Hà Nội | + lá sách, bò viên (trụng) | thứ tự tái/lá sách |
| Phở tái đập / sốt vang / xào lăn | Hà Nội | như quán, bớt ngò ở sốt vang & xào lăn | nhỏ |
| Phở sườn tái | Hà Nội | sườn ủ ấm trong nồi (bỏ vi sóng + cắt + tô phụ) | đơn giản hơn |
| Phở gà | Hà Nội | gà chặt, nước: cốt gà + nước phở đun | giống |
| Bún riêu cua | miền Trung (Kent) | đậu hũ, chả cua, cà chua, nước (cốt cua + huyết + nước), hành lá | **bỏ bò tái, tôm; thêm chả cua** |
| Bánh đa cua | Hải Phòng | rau muống trụng, chả cá, **chả lá lốt**, tôm, cà chua, hành phi, nước | bỏ hành tây/tóp mỡ/hành lá |
| Bún bò Huế | Huế | bắp bò, thịt luộc (giò), chả cua, hành tây, rau răm, hành lá, nước | bỏ nạm/chả lụa/chả rế |
| Bún cá Hải Phòng | Hải Phòng | cà chua, cá chiên, chả cá cắt, cần trụng, hành, nước, thì là | thứ tự |
| Chả cá Lã Vọng | Hà Nội | 7 phần như quán | giống |
| Bún đậu mắm tôm | Hà Nội | mẹt, bún, **đậu hũ, chả lụa**, dưa leo, kinh giới, tía tô, **chén mắm tôm** | quán không có đậu/mắm tôm trong chuỗi |
| Bánh hỏi thịt heo | miền Trung (Kent) | mẹt, bánh hỏi, mỡ hành, **thịt luộc**, dưa leo, xà lách, tía tô, đồ chua | bỏ bún + xoài + thịt nướng |
| Bún nem cua thịt nướng | Sài Gòn | tô khô, bún, salad cắt, nem (chiên sẵn), thịt nướng, tôm, đậu phộng, hành phi | quán chỉ có bún + salad |
| Bún gà nướng | Sài Gòn | bún, salad, gà (tạm gà luộc — thiếu sprite), đậu phộng, hành phi | thêm topping |
| Bún chả Hà Nội | Hà Nội | mẹt, bún, rau ×3, **thịt nướng, đồ chua** | thêm thịt + đồ chua |
| Chả giò | Sài Gòn | chiên → cắt, xà lách, đồ chua | + xà lách |
| Gỏi cuốn | Sài Gòn | như quán | giống |
| Cháo lòng / cháo sườn | SG / HN | như quán + hành lá | + hành |

Sprite còn thiếu cho bản chung: gà nướng, tôm nướng, giò heo (đang mượn gà luộc / tôm luộc / thịt luộc).

## 6. Quy trình mỗi phiên (cho model)

1. Đọc `docs/ROADMAP.md` §3 → chọn mốc đang mở → đọc mục tương ứng trong `docs/PLAN-PUBLIC.md`.
2. Đọc code trước khi tin "Hiện trạng" (đã có 3 lần spec sai vì code khác).
3. Làm → test → deploy → xác nhận Pages build → Kent thử điện thoại.
4. Ghi "ĐÃ LÀM" + lệch spec + bẫy mới vào PLAN-PUBLIC ngay dưới mục đó; tick checklist ở đây; cập nhật project doc `quan-bun-status.md`.
5. Mọi chuỗi mới sinh ra đi thẳng qua `t()` và có bản en.

---

## 7. Đang chờ Kent

- [ ] Kiểm "KJ Phở Real" trên Play / App Store / domain / TikTok / IG.
- [ ] Duyệt danh sách món theo tỉnh (PLAN-PUBLIC §P2) — đã ok mặc định, sửa nếu muốn.
- [ ] Số sao mở công thức thật (đề xuất 6★).
- [ ] Nhân vật chính: nam hay nữ, hay cho chọn? (ảnh hưởng cảnh mở đầu + sprite xe). Đề xuất: cho chọn 2 tấm, cùng xe.
