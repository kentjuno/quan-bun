# ASSET-LIST — Quán Bún (MVP: 1 quán, 4 món)

Phong cách: **3D low-poly stylized** (flat shading, bo góc, màu phẳng ấm), góc nhìn camera cao ~45–50°. Dựng trong Blender bằng script (`art/scripts/build_*.py`, thư viện `build_lib.py` kế thừa từ Dino Arena) → GLB, Y-up, gốc tại sàn, mặt +Z. Flow (Nano Banana) chỉ tạo **ảnh concept tham chiếu** trước khi dựng. Ảnh thực tế trong `cooking-note/images/` chỉ dùng làm tham chiếu hình dạng món.

## Bắt buộc cho MVP

### Nguyên liệu — ~35 mesh nhỏ (≤ 60 tam giác), hiện trên kệ và trên tay đầu bếp
Lấy từ `requiredItems` của 4 món trong `cooking-note/sim-data.js`:
- Sợi & tô: sợi phở (M/L), bún, bún cọng to, tô phở, tô món nước, rọ trụng sợi, rọ trụng topping.
- Thịt/topping: nạm, bò tái, lá sách, bò viên, thịt luộc, bắp bò, chả lụa, chả rế, đậu hũ chiên, tôm chiên, huyết, cà chua.
- Rau: hành tây, ngò rí + ngò gai, hành lá, rau răm.
- Nước: nước dùng phở, nước cốt cua, nước bún bò, miếng nước trắng.
- Gừng (phở tái đập — dự phòng nếu thêm món).

### Trạm bếp — ~9 GLB riêng (để kéo-thả sắp bếp), ô lưới 1×1 m hoặc 2×1 m
Kệ sợi, kệ topping (4 ô), kệ rau (3 ô), nồi trụng (rỗng / sôi / có rọ), bồn xả lạnh, bếp + nồi nước (nguội / sôi), thớt, quầy ráp (2–3 vị trí tô), quầy giao món. Mỗi trạm có **điểm đứng** (empty) và **điểm hiện timer**.

### Đầu bếp — 1 rig (chibi ~1.4 m)
Idle, Run, Carry (tay nâng đồ), Work (khom người thao tác), Happy, Oops. Điểm gắn đồ trên tay (bone `Hand`).

### Hiệu ứng
Khói nồi (particle đơn giản), giọt nước xả lạnh, vòng timer trên trạm, mũi tên chỉ trạm đang chờ trong hàng đợi.

### Món — 4 món, mỗi món là **tô + các lớp mesh** bật dần theo assembly (sợi → topping → nước → hành), + ảnh menu 1:1 (render từ Blender)
Phở tái nạm, phở đặc biệt, bún riêu cua, bún bò Huế.

### Khách — 3 rig (chibi) × animation Sit / Wait / Impatient / Angry / Happy / Leave
Cô công sở, bác xe ôm, du khách. Bong bóng gọi món là sprite 2D gắn trên đầu (icon món).

### Môi trường & UI
- Quán (GLB): sàn, tường, quầy khách với 3 ghế, biển hiệu, đèn; ánh sáng sun + đèn vàng.
- UI DOM/2D: bong bóng gọi món, thanh kiên nhẫn, icon tiền/sao/danh tiếng, số thứ tự hàng đợi trên trạm, khung kết quả, màn Sắp bếp (lưới kéo-thả).
- Logo game (sau khi chốt tên).

### Âm thanh — tổng hợp WebAudio trước, file thật sau
Tap nguyên liệu, thả vào tô, trụng (sôi lục bục), chan nước, "ting" phục vụ, khách giận, khách bỏ đi, hết ca, 3 sao, nhạc nền vui (loop 60 s).

## Làm sau (không chặn MVP)
- Quán 2–4 (Hà Nội / Huế / Hải Phòng): thêm ~9 món và nguyên liệu tương ứng (đã có quy trình cho bánh đa cua, bún cá, chả cá, bún đậu, bánh hỏi, cháo lòng, cháo sườn, phở sườn tái, phở tái đập).
- Khách: học sinh nhóm, food reviewer.
- Trang phục/tuỳ chỉnh đầu bếp, trang trí quán.
- Hiệu ứng: khói, bóng dầu, confetti 3 sao.
- Localization: EN (tên món giữ tiếng Việt).
