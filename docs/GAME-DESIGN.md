# KJ's Choices — Thiết kế game (bản duyệt)

Mục tiêu bản này: biến "công cụ luyện món" thành **một game quản lý quán bún có đầu có đuôi**. Các chế độ luyện tập hiện có (Luyện, Phản xạ, Chém, Đố, Survival) giữ nguyên nhưng dồn vào mục **Thêm** — coi là extra modes.

Nguyên tắc không đổi: **mọi công thức, thứ tự, định lượng lấy từ cooking-note. Không bịa kiến thức bếp.** Thiết kế game chỉ thêm lớp *vì sao chơi tiếp*, không đụng vào *nấu thế nào*.

---

> **Cập nhật 14/09 (0.8.0)**: vòng chơi theo NGÀY ở §1/§5 đã được thay bằng **world/level** — xem `docs/PLAN-WORLDS.md` (Kent: ngày đầu quá nhiều bước, người mới bị ngộp). Các mục 2, 3, 4 (nâng cấp, khách quen, juice) vẫn đúng và đang chạy; "ngày" ở dưới đọc là "level", nhịp 3 pha giờ là tuỳ chọn `lunch` của level đông khách.

## 1. Vòng chơi = một ngày ở quán (ĐÃ THAY — xem PLAN-WORLDS)

Mở game chỉ có một nút lớn **Mở quán**. Một ngày gồm 5 pha, mỗi pha có việc để làm và cảm giác riêng:

| Pha | Thời gian | Việc của người chơi | Cảm giác |
|---|---|---|---|
| Sáng — chuẩn bị | ~20 s, không khách | Trụng sẵn bún để nguội, nấu trước một nồi riêu, xếp tô | yên, nhạc nhẹ, tiếng dao thớt |
| Trưa — cao điểm | 2–3 phút | Khách vô dồn, 2–3 người cùng lúc, có nhóm | nhạc nhanh hơn, tiếng quán ồn |
| Xế — thở | ~1 phút | Khách lẻ tẻ, thời gian dọn hàng, nấu bù nước lèo | nhạc chậm lại |
| Chiều — đợt hai | 1–2 phút | Đông lần hai, ngắn hơn trưa, khách quen ghé | |
| Đóng cửa — kết ngày | màn tổng kết | Đếm tiền, sao, mở khoá, mua nâng cấp, sang ngày mới | thưởng |

Nhịp "sáng vắng – trưa đông – xế thở – chiều đông – đóng" thay cho kiểu rải khách đều hiện tại. Cùng một số khách nhưng có sóng thì căng và nhẹ luân phiên, đó là thứ làm Overcooked/Diner Dash không chán.

### Màn kết ngày (phải đã)
Số tiền chạy lên từng đồng có tiếng leng keng; sao rơi từng cái; **một dòng nhận xét của khách quen** ("Dì Ba: nay bún riêu ngon hơn hôm qua đó con"); nếu mở khoá món/nâng cấp mới thì hiện thẻ to có hình ký hoạ + tên; nút **Sang ngày N+1**. Điểm hiện tại (level + trang trí) chuyển thành **tiền quán** dùng chung cho nâng cấp và trang trí.

## 2. Nâng cấp làm mình *nhanh hơn* (lý do chơi ván tiếp)

Trang trí đã có nhưng chỉ đẹp. Thêm nhánh **Bếp** — nâng cấp thay đổi con số trong config (đều là data, không cần code mới cho từng cái):

| Nâng cấp | Cấp 1 → 2 → 3 | Ảnh hưởng config |
|---|---|---|
| Nồi trụng | 2 → 3 → 4 rọ | `POT.slots` |
| Bếp lò | 1 → 2 → 3 lò nấu nước | số `burner` |
| Lửa lớn | thời gian nấu nước −15% mỗi cấp | `ACTION_TIME` nhóm nấu |
| Ghế | 3 → 4 → 5 bàn | số `seat-N` |
| Tủ prep table | thêm hàng GN → bớt thời gian lấy đồ | `ACTION_TIME.take` |
| Bảng hiệu / tranh / đèn (trang trí) | kiên nhẫn khách +5–10% mỗi món | `patience` |

Mỗi ngày mở đúng **một** thứ mới để mua → luôn có mục tiêu tiền vừa tầm. Trang trí giờ có tác dụng (khách chịu chờ lâu hơn) nên không còn là "mua cho đẹp".

## 3. Khách là người, không phải đồng hồ

### Khách quen (tên kiểu quê nhà)
Mỗi người có: tên, một nét ký hoạ riêng (nón, khăn, kính…), **món ruột** cố định, ngày xuất hiện, 4–6 câu thoại. Người chơi nhớ mặt → nhìn thấy là biết làm gì, đó chính là "phản xạ món" nhưng đến một cách tự nhiên.

| Tên | Món ruột | Nét vẽ | Ngày xuất hiện |
|---|---|---|---|
| Cậu Hai | Phở tái nạm | áo sơ mi xắn tay, hay đọc báo | 1 |
| Dì Ba | Bún riêu cua | khăn rằn, giỏ đi chợ | 2 |
| Thím Bảy | Bún bò Huế | nón lá, nói to | 3 |
| Chú Tư | Phở đặc biệt | kính lão, ăn chậm | 4 |
| Út Mười | Bún chả Hà Nội | trẻ, tai nghe, hay chụp hình đồ ăn | 6 |
| Ông Năm xe ôm | Bún cá Hải Phòng | mũ bảo hiểm để trên bàn | 8 |

(Thêm dần theo món mở khoá; mỗi món có ít nhất một khách quen "đại diện".)

### Thoại (giọng quê, ngắn, một dòng, không dấu chấm than lạm)
Ngồi xuống: "Cho dì tô bún riêu nghe con." / "Nay quán đông dữ hen." / "Bữa nay nóng quá, cho tô phở cho mát ruột." / "Cậu Hai nay đói lắm đó, làm lẹ nghe."
Chờ hơi lâu: "Con ơi, tô của dì tới đâu rồi." / "Từ từ không sao, bác chờ được." (khách quen kiên nhẫn hơn khách lạ)
Nhận tô đúng: "Chu cha nước phở này nó ngon." / "Đúng ý dì rồi đó." / "Cha, thơm dữ."
Nhận tô sai: "Ủa con, dì đâu có kêu cái này." (không phạt nặng, khách quen chỉ lắc đầu, trả lại tô)
Ra về: "Mai dì ghé nữa." / "Tính tiền nghe con." / "Ngon, để tao dắt thêm mấy đứa nữa tới."
Kết ngày: "Nay con làm lẹ hơn hôm qua đó." / "Riêu bữa nay hơi lâu nghe, mai ráng."

→ File `src/data/customers.js`: `{ id, name, dish, sketch, unlockDay, lines: { sit:[], wait:[], good:[], wrong:[], leave:[], recap:[] } }`. Bro sửa thoại trực tiếp trong file này, không cần đụng code.

### Khách lạ và nhóm
Khách lạ không tên, ký hoạ ngẫu nhiên từ bộ 8–10 nét, gọi món bất kỳ trong menu đã mở. Từ ngày 5: **nhóm 2–3 người** vào cùng lúc ngồi cùng bàn, gọi khác món → phải trụng 2–3 tô song song (đây là kỹ năng thật ở tiệm). Cuối tuần (ngày 7, 14…): **đoàn 4–6 người** đến một lần — "boss" nhỏ.

## 4. Cảm giác tay (juice) — rẻ mà đổi nhiều nhất

- Âm thanh: nước sôi ục ục khi đứng gần nồi, xèo khi chiên, "cạch" đặt tô, "tinh" khi giao đúng, tiếng đũa muỗng nền ở bàn khách, "cảm ơn nghe" giọng người thật (bro thu điện thoại được, càng quê càng hay).
- Nhạc: 3 bản loop ngắn (sáng / cao điểm / kết ngày), chuyển mượt theo pha.
- Nhân vật: cầm — đặt có animation tay 0.15 s thay vì tele; đi có nhún; đứng trước nồi thì hơi nghiêng người.
- Hiệu ứng: hơi nước từ nồi và tô nóng, số tiền bay lên khi giao, tô rung nhẹ khi khách sắp hết kiên nhẫn, rung máy 1 nhịp khi giao đúng.
- Bảng hiệu **KJ's Choices** viết tay treo trước cửa, thấy ngay khi vào game.

## 5. Độ khó có nhịp (ĐÃ THAY bằng bậc thang world/level — xem PLAN-WORLDS §2)

| Ngày | Mở | Cơ chế mới |
|---|---|---|
| 1 | Phở tái nạm, Cậu Hai | học di chuyển, trụng, giao |
| 2 | Bún riêu cua, Dì Ba | nồi nấu nước ở bếp lò |
| 3 | Bún bò Huế, Thím Bảy | nhiều loại nước cùng lúc, stack |
| 4 | Phở đặc biệt, Chú Tư | trưa đông hơn, nâng cấp Nồi trụng cấp 2 mở bán |
| 5 | — | khách nhóm 2 người |
| 6 | Bún chả Hà Nội, Út Mười | món khô: nóng–lạnh–nóng, mẹt |
| 7 | — | **Cuối tuần**: đoàn 4 người, thưởng gấp đôi |
| 8+ | theo LEVELS hiện có | mỗi ngày một trong: món mới / nâng cấp mới / khách quen mới |

Không ngày nào mở 2 thứ cùng lúc. Thua ngày (khách bỏ đi ≥ 3) thì **chơi lại ngày đó**, giữ tiền đã có — không phạt, game chill như bro muốn.

## 6. Lát cắt dọc (làm trước, chơi trên điện thoại rồi mới mở rộng)

**Phạm vi**: ngày 1–3, ba món phở tái nạm / bún riêu cua / bún bò Huế, ba khách quen, mọi lớp ở trên đầy đủ (art C cho icon + nhân vật + nền, âm thanh, kết ngày, một nâng cấp mua được, nhóm khách chưa cần).

**Câu hỏi lát cắt phải trả lời**: chơi 3 ngày này xong có muốn bấm "Sang ngày 4" không? Nếu có → phần còn lại là lắp data (18 món đã có sẵn workflow). Nếu không → lỗi ở gameplay, sửa ở đây rẻ hơn sửa sau khi có 60 icon.

**Thứ tự làm**:
1. `customers.js` + hệ khách quen + thoại (bong bóng chữ ký hoạ) — nhanh, thấy ngay khác biệt.
2. Nhịp ngày 5 pha + màn kết ngày mới; gom menu về một nút **Mở quán**, dồn chế độ cũ vào **Thêm**.
3. Nâng cấp bếp (data-driven) + tiền quán thống nhất.
4. Âm thanh/nhạc + juice.
5. Art C: icon 3 món đầu → nhân vật → nền bếp → khách ký hoạ (theo `art/ART-BIBLE.md`).
6. Chơi thử trên điện thoại, ghi lại 3 điều chán nhất, sửa, rồi mới mở rộng.

## 7. Những gì giữ nguyên
Toàn bộ engine hiện tại (world/recipes/bot/par/progress/puzzle), pipeline icon, PWA, GitHub Pages, tests. Các chế độ luyện → tab **Thêm**. Tên mã nguồn vẫn `quan-bun`; tên hiển thị **KJ's Choices**.
