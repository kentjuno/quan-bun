# Quán Bún — prototype

Game quản lý quán bún Việt: bếp 3D góc nhìn kiểu Overcooked, **chạm-là-đi**, nấu theo **quy trình bếp thật** (dữ liệu từ `cooking-note/sim-data.js`). Three.js + Vite. Đây là **prototype bằng khối tạm** để kiểm tra vòng lặp chơi; chưa có model/ảnh thật.

## Chạy
```bash
npm install
npm run dev        # mở địa chỉ terminal in ra
npm test           # unit test: adapter công thức + mô phỏng world với bot
npm run build && node tests/smoke.browser.mjs   # smoke test Chromium headless (landscape + portrait), ảnh vào tests/out/
npm run build:single   # đóng gói 1 file: dist-single/index.html (mở trực tiếp / gửi qua điện thoại) + artifact.html
```

## Test trên điện thoại
- **Nhanh nhất**: Claude đăng bản `artifact.html` thành Artifact → mở link trên điện thoại (cùng tài khoản Claude).
- **Cùng Wi-Fi**: `npm run dev -- --host` rồi mở `http://<IP máy tính>:5173` trên điện thoại (IP xem bằng `ipconfig`).
- **Không cần máy tính**: copy `dist-single/index.html` lên điện thoại, mở bằng Chrome (file 1 khối, không cần server).

## Chơi
Chạm kệ → đầu bếp chạy tới lấy đúng thứ đang cần. Chạm nồi trụng → thả sợi (chạy nền, vòng tròn xanh = xong, chạm lại để lấy). Phở: sợi phải **nóng → xả lạnh (bồn) → nóng lại (nồi)**. Tô cũng trụng ở nồi. Chạm quầy ráp để bỏ vào tô đúng thứ tự (sai → báo lỗi, trừ điểm, không mất đồ). Chạm nồi nước phở để múc, chan vào tô, cầm tô ra quầy giao. Chạm liên tiếp = hàng đợi việc (số trên trạm), chạm lại để huỷ.

## Đồ hoạ
Model trong `public/models/*.glb` được sinh bởi `art/scripts/build_kitchen.py` chạy trong Blender (sửa số → chạy lại → GLB tự cập nhật). Ảnh preview trong `art/`. Renderer khối tạm cũ giữ ở `src/game/view.blockout.js` để tham chiếu.

## Cấu trúc
```
src/config.js            THÔNG SỐ: tốc độ, thời gian thao tác, khách, ca, BỐ TRÍ BẾP (lưới mét)
src/data/sim-data.js     dữ liệu bếp thật (copy từ cooking-note — nguồn sự thật là repo đó)
src/game/recipes.js      sim-data → công thức game: chuỗi ráp + phép biến đổi ở trạm (được gộp bước, không đổi thứ tự)
src/game/world.js        trạng thái game thuần (đầu bếp, hàng đợi, trạm, tô, khách, ca) — test được không cần trình duyệt
src/game/bot.js          bot chơi tự động (test; sau này = phụ bếp AI)
src/game/view.js         vẽ world bằng Three.js từ GLB + nhãn CSS2D; raycast chạm từng nguyên liệu/tô
art/scripts/build_kitchen.py  Blender: dựng & export toàn bộ model
src/main.js              nối view ↔ world ↔ HUD
tests/                   recipes.test.js, world.test.js, smoke.browser.mjs
```

## Số đo hiện tại (bot ngây thơ, không song song)
- 1 tô phở tái nạm: **30 s** từ lúc khách ngồi tới lúc giao (20 lượt chạm). Người chơi biết cầm 2 thứ/lượt và chạy song song sẽ nhanh hơn.
- Ca 1 (150 s, 6 khách): bot phục vụ 3, 2 bỏ đi, 135k → 1 sao. Mục tiêu người chơi: 2–3 sao.

## Việc tiếp theo
Xem `docs/CHANGELOG.md`.
