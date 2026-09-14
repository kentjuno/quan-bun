# KJ's Choices — Art Bible (hướng C: ký hoạ màu nước có kỷ luật)

Một câu: **sổ tay của người đang học nấu trong bếp tiệm** — nét mực nâu đậm, màu nước loang trên giấy có vân, nhãn viết tay. Mọi hình trong game phải trả lời được "cái này nằm trong cùng một cuốn sổ không?".

Mood board gốc: `art/moodboards/c-ky-hoa.png`. Thử nghiệm đọc được ở 48 px: `art/test-c/_test-sheet.png` (đạt).

## 1. Ba lớp, ba mức "lỏng"

| Lớp | Độ lỏng nét | Vì sao |
|---|---|---|
| **Vật phẩm cầm được** (rau, thịt, tô, chả, huyết…) | chặt nhất: hình khối to, viền mực đậm liên tục, 1 màu chủ đạo, **viền trắng sticker** | phải phân biệt ở 40–60 px trên điện thoại |
| **Nhân vật, khách** | vừa: nét ký hoạ có chỗ đứt, màu loang ra ngoài viền một chút | cần duyên, không cần đọc chi tiết |
| **Nền bếp, bàn ghế, tường** | lỏng nhất: nét run, màu nhạt, nhiều giấy trắng | làm nền cho hai lớp trên nổi |

## 2. Bảng màu theo nhóm nguyên liệu (để không nhầm ở cỡ nhỏ)

| Nhóm | Màu chủ đạo | Ghi chú |
|---|---|---|
| Rau lá (rau muống, xà lách, giá, rau thơm) | xanh lá đậm `#3f7a3a` | rau muống tối hơn xà lách; giá = trắng ngà + đầu vàng |
| Hành lá / ngò | xanh non `#79b93f` + trắng | khác hẳn rau lá đậm |
| Thịt tái / bò | đỏ hồng `#c4535a` | tái có vân trắng |
| Thịt nạm / chín / heo luộc | nâu hồng nhạt `#b98a7a` | |
| Đồ chiên (chả cá, chả giò, tôm chiên, cá chiên) | vàng nâu ấm `#d9903a` | chiếm ít diện tích tô để không lẫn với tô |
| Huyết | đỏ nâu sậm `#6b1f24` | không tím |
| Đậu hũ, bánh tráng, bún sống | trắng ngà `#f1e9d8` | luôn có viền mực rõ |
| Nước lèo: phở / riêu / bún bò / cá | hổ phách `#d9a441` / cam đỏ `#d2643a` / đỏ ớt `#c0392b` / trong nhạt `#e8c98a` | màu nước quyết định nhận diện tô |
| Tô, dĩa, mẹt | trắng ngà + mép xanh lam mờ (tô), tre `#c9a86b` (mẹt) | tô chiếm ≥ 60 % diện tích icon món nước |
| Thép prep table, nồi | xám xanh lạnh `#9aa4ab` | nét mực xám thay nâu để lùi về sau |
| Giấy nền UI | `#f3ede0` với vân giấy nhẹ | mọi bảng, thẻ, menu |
| Mực viền | nâu sẫm `#3b2a1e` (không đen tuyền) | duy nhất một màu mực trong cả game |

## 3. Quy tắc icon vật phẩm

- Vuông 1024² khi gen → xử lý xuống 256² (`scripts/process_icons.py`, nền magenta).
- Góc nhìn: hơi từ trên xuống 3/4, cùng góc cho mọi món.
- Một vật thể duy nhất, chiếm 70–80 % khung. Số lượng mặc định: món lẻ vẽ **2 đơn vị** (2 miếng chả, 2 cục huyết) trừ tô/dĩa.
- **Viền trắng sticker** ~3 % cạnh giữ lại (Flow tự sinh; nếu thiếu thì thêm bằng script) — thay cho drop-shadow đen trong game. Bóng dưới chân sticker: mờ, lệch xuống 3 px, alpha 0.25.
- Không chữ, không bóng đổ vẽ tay, không nền.
- Trạng thái của cùng một món (bún sống → trụng → nguội) đổi **màu/độ bóng**, không đổi hình dạng, để mắt bám được.

**Prompt gốc (item)** — chỉ thay `{subj}` và `{col}`:
```
Hand-drawn watercolor sticker illustration of {subj}, single object centered, bold confident dark-brown ink outline,
loose watercolor wash with slight bleeding and paper grain, simple big readable shape, one dominant color ({col}),
slight top-down 3/4 view like a game inventory icon, no text, no shadow, solid flat pure magenta background #FF00FF, nothing else.
```

## 4. Nhân vật và khách

- Đầu hơi to (tỉ lệ 1:4), tay rõ để thấy cầm tô. Đầu bếp: tạp dề xanh chàm, khăn buộc đầu; đây là "bro" trong game nên bro chọn nét.
- Khách quen: mỗi người **một vật nhận diện** (khăn rằn, nón lá, kính lão, tai nghe, mũ bảo hiểm) + một màu áo cố định. Khách lạ: bộ 8–10 sketch xoay vòng, áo màu nhạt.
- Trong game 3D, nhân vật vẫn là sprite billboard 2 hướng (trái/phải) với 3 frame: đứng / bước 1 / bước 2 và 1 frame cầm đồ. Đủ cho ký hoạ, hơn nữa là thừa.
- Bong bóng thoại: viền mực run, nền giấy, chữ tay.

**Prompt gốc (nhân vật)**:
```
Loose watercolor and brown ink sketch of {desc}, full body, standing, facing {left|right}, slightly big head cartoon proportion,
gentle color bleeding outside the lines, visible paper grain, white sticker outline, no text, solid flat pure magenta background #FF00FF.
```

## 5. Nền bếp và đồ nội thất

- Vẽ dưới dạng **texture đắp lên mesh đơn giản hiện có** (sàn, tường, prep table, nồi, bàn): nét mực nhạt, màu loang, nhiều khoảng trắng giấy. Không cần model lại.
- Gạch sàn: hoa văn gạch bông Sài Gòn mờ. Tường: gạch men xanh ngọc chỉ ở phần bếp, giấy trắng phần khách.
- Bảng hiệu **KJ's Choices** chữ tay, treo ở cửa, là vật đầu tiên camera nhìn thấy khi vào.
- Hơi nước, bọt sôi = sprite mực loang xám nhạt, không dùng particle sáng bóng.

## 6. UI

- Nền giấy `#f3ede0`, viền thẻ là nét mực run (SVG stroke có jitter), góc dán một mẩu băng keo giấy.
- Font: chữ tay cho tên món / tên khách / bảng hiệu (**ưu tiên chụp chữ thật của bro** → font từ chữ viết tay hoặc ảnh cắt); chữ đọc số liệu (tiền, thời gian) dùng sans gọn để không lem.
- Nút: hình vẽ tay, bấm thì "dập" xuống 2 px và đậm mực hơn — không gradient, không bóng mềm.
- Màu nhấn duy nhất: đỏ ớt `#c0392b` (cảnh báo, khách sắp bỏ đi, nút chính).

## 7. Việc cấm (để không trượt về "AI render")
Không render bóng bẩy, không highlight trắng lấp lánh, không gradient mượt, không hai màu mực, không icon có nền riêng, không font hệ thống cho tiêu đề, không chữ do AI sinh trong hình (luôn no text rồi thêm chữ tay sau).

## 8. Danh sách tài sản lát cắt dọc (ngày 1–3)

Icon (theo đúng `requiredItems` của 3 món trong sim-data, không thêm): tô, bún to (3 trạng thái), bánh phở (3 trạng thái), bò tái, nạm, thịt luộc, bắp bò, chả lụa, chả rế, cốt cua, huyết, đậu hũ, tôm, cà chua, hành lá, hành tây, rau răm, giá, rau thơm, miếng nước, nước phở, nước riêu, nước bún bò, rọ trụng. (Đối chiếu lại danh sách này với `src/data/sim-data.js` trước khi gen.)
Nhân vật: đầu bếp (4 frame × 2 hướng), Cậu Hai, Dì Ba, Thím Bảy, 4 khách lạ.
Nền: gạch sàn, tường men, mặt prep table, thân nồi, mặt bàn khách, bảng hiệu.
UI: nền giấy, khung thẻ, băng keo, bong bóng thoại, 3 nút.
