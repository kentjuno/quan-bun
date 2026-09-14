# KJ's Choices (mã nguồn `quan-bun`) — trạng thái (2026-09-14, bản 0.7.0)

## Hướng mới (Kent duyệt 14/09) — xem `docs/GAME-DESIGN.md`, `art/ART-BIBLE.md`
Kent: "làm hết mà game vẫn nhàm chán, người ta kêu AI slop" → phân tích: thiếu vòng chơi, thiếu lý do chơi tiếp, khách là đồng hồ, không có juice, art mặc định. Quyết định: **game thật**, chế độ luyện = extra modes (tab Thêm). Tên quán **KJ's Choices**. Art: 3 mood board (A tiệm tối, B giấy cắt, C ký hoạ màu nước) → chốt **C** ("lạ, dễ cuốn hút"); thử 5 sprite kiểu C ở 48 px đọc được (`art/test-c/`).
- 0.7.0: ngày ở quán 21 ngày (3 pha trưa/xế/chiều, seed), 6 khách quen tên quê + thoại (`src/data/customers.js` — Kent sửa thoại ở đây), menu một nút, kết ngày (sao rơi, tiền chạy, nhận xét khách quen, thẻ mở khoá), 5 nâng cấp bếp data-driven + trang trí tăng kiên nhẫn, nhạc theo pha + nồi sôi + sfx + banner + tiền bay + rung.
- **Còn lại theo GAME-DESIGN §6**: (5) art C — gen icon 3 món đầu theo bible → nhân vật → nền bếp → khách ký hoạ; chữ viết tay của Kent cho bảng hiệu/tên món (đang chờ Kent chụp); (6) Kent chơi thử 3 ngày đầu trên điện thoại, ghi 3 điều chán nhất. Chưa làm: animation cầm/đặt thật, giọng người thật "cảm ơn nghe".
- Flow gen ảnh hiện dùng **flowkit gốc** (extension của Kent bật): `POST 127.0.0.1:8100/api/flow/generate-image {prompt, project_id:"c20ed4c0-…", aspect_ratio:"IMAGE_ASPECT_RATIO_SQUARE"}` → `media[0].image.generatedImage.fifeUrl` (KHÔNG còn lớp `data`). Mỗi ảnh ~1–2 phút; chạy trong thread Blender, ghi json trạng thái.

---
(bản cũ 0.5.2 bên dưới)

Thư mục: `F:\AntiGravity\Games\quan-bun`. Dữ liệu bếp thật từ `F:\AntiGravity\cooking-note\sim-data.js` (nguồn sự thật; không bịa quy trình). **Mục tiêu của Kent: nhớ món và tối ưu cách làm để nhanh + hiệu quả khi có đơn thật. Chưa tính buôn bán. Game chill.**

## Hướng đã chốt
Game = công cụ luyện. Báo cáo sau ca (đứng nghĩ, chạm, từng tô so với bot, lỗi có mốc giây, lộ trình bot), **Tiến độ nhớ món** (`mastery.js`; ≥3 tô sạch liên tiếp = thuộc → card ẩn tên).

## 0.4.x — Level / Survival / Luyện tập / Trang trí / menu gọn
- **Level 1–9** thay "ca" (cùng dữ liệu): ≥1★ mở level kế; `progress.js` (localStorage `qb.progress.v1`): sao tốt nhất, điểm, đồ đã mua, kỷ lục survival, món đang luyện. `?level=N`, `?shift=N`, `?all` bỏ khoá (dev).
- **Điểm** = tiền + tip mỗi lần chơi (survival ×1.5) + 60/sao mới → tab **Quán** (8 món trang trí: cây cảnh, đèn lồng, bảng hiệu, tranh, gạch hoa, bể cá, sơn tường vàng, chậu mai; `view.buildDecor`).
- **Survival**: 16 món, khách tới mãi (gap 42→18 s), kiên nhẫn 170 s, 3 bỏ đi là hết; kỷ lục lưu.
- **Luyện**: chọn món trong 16 → Luyện 8 đơn / Rush 3 đơn.
- **Menu 0.4.1** (Kent thấy bản tab + 9 nút rối): tên + điểm; 4 tab segmented; level = carousel một thẻ ‹ › (bấm/vuốt) + chấm tiến độ; "Cách chơi · tuỳ chọn" gấp lại. Vừa một màn điện thoại.
- **Sợi theo loại**: `noodle-blanched:<sợi>`… (bún ≠ phở ≠ bánh đa ≠ bánh hỏi); alias sim-data `dry-bun-*`/`bh-bun-*`/`banh-hoi-*` → `noodle-*:<sợi>`; `World.transformAt` ưu tiên món khách đang chờ.
- Tests 38 + smoke (menu/carousel/decor/survival). Artifact Version 19. Đã ghi F: (game + cooking-note).

## Bếp thật Kent đã xác nhận (12/09)
- 3 kệ (sợi, tô, một kệ topping chung); vị trí đồ thật hay đổi → không mô phỏng.
- Nồi trụng: 3 rọ + chồng tô nóng (≤5, trữ vô hạn); sợi chín 25 s hư. Tô theo LOẠI.
- Nước phở sẵn; nước khác nấu ở lò đun đúng thứ tự → **4 tô**.
- V4/V5 = tô khô (không trụng nóng) + bún **nóng→xả lạnh→nóng** + salad/dưa leo/đồ chua cắt; V6 = mẹt + rau bộ bún đậu + bún nóng→lạnh→nóng + 3 dưa leo **sau** bún; dưa chua trong nước chấm; **bánh hỏi** cũng nóng→lạnh→nóng (bún kèm cũng vậy); V11 không bao tử cá basa; P3 có bò tái. Bug "2 tay cùng món" đã hết.

## 0.4.2 → 0.5.2 (13/09)
- Kệ nước lèo: mỗi nồi 1 phần, stack nhiều loại (`burner:ready`). Bỏ quầy giao (giao tại bàn khách). Kệ topping = tủ prep table (khối three.js) với 2 thớt trên mặt (`prep.onTable`). Item trên kệ/tay = sprite ảnh Flow + drop-shadow. 82 icon (17 mới gen qua AudioBook Studio :8000). Bánh đa cua theo Kent; bánh hỏi nóng→lạnh→nóng. Sợi token theo loại `noodle-*:<sợi>`.
- Tab 🎮 Mini: Đố nhanh (xếp thứ tự, kẻ lạ, bước giấu) + Chém (Fruit Ninja canvas). `src/puzzle.js`, kết quả vào mastery.
- PWA (manifest, sw.js, icon). **GitHub**: repo public `kentjuno/quan-bun` (gh trên máy Kent đã login), Pages từ nhánh `gh-pages`: https://kentjuno.github.io/quan-bun/ — deploy bằng `scripts\deploy_pages.cmd` (chạy qua Blender subprocess). Nhớ `git add/commit/push` main sau mỗi lần ghi file lên F:.
- Flow gen ảnh: khi app AudioBook Studio mở → `POST 127.0.0.1:8000/api/generate-scene-frame {prompt, project_id, aspect_ratio:'1:1'}` → url; tải về F:\...\art\icons_raw2 rồi `C:\Python314\python.exe scripts/process_icons.py` trên máy Kent (device_stage_files bị lỗi nlink với PNG → chuyển base64 qua Blender). Extension flowkit bản KJStickman trỏ cổng 8000.

## Code / pipeline
- `src/game/`: world, bot, par, mastery, progress, recipes, view, nav; `src/audio.js`. Icons Flow (65) qua `scripts/process_icons.py`. `scripts_single.mjs` → artifact.
- Artifact (cùng URL, republish file scratchpad `quan-bun-artifact.html`): https://claude.ai/code/artifact/e35ff289-32a4-41af-9d15-a0a5ea96488a
- Dev server `http://192.168.50.164:5173`. Ghi F: bằng `device_commit_files`. Flowkit: `C:\Python314\python.exe -u -m agent.main` trong `F:\AntiGravity\flowkit`.

## cooking-note (repo của Kent)
- `menu.js` 56 món + tab 🧾; SW v0.44.1; AGENTS.md §12 (đã ghi xác nhận 12/09); sim-data không còn `todo`. ≈40 món menu còn `recipe: null` — KHÔNG bịa, hỏi Kent.

## Việc mở
- Survival: bot chỉ trụ được vài khách với món dài → cân bằng gap/kiên nhẫn sau khi Kent chơi thử.
- Trang trí mới / giá điểm tuỳ phản hồi. Kent hỏi "có cần hoàn thiện menu đầu game không" → đã trả lời: chỉ cần gọn (đã làm), không đầu tư thêm cho tới khi có phản hồi chơi thật.
