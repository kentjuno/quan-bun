# CONCEPT — Quán Bún (tên tạm)

> Game quản lý quán ăn kiểu Cooking Fever, nhưng **nấu như bếp thật**: mọi món đều theo đúng quy trình trong bếp của một quán bún/phở Việt. Người chơi học được thứ tự thật trong lúc chơi mà không biết mình đang học.

Tên khác để cân nhắc: *Bún Ơi!*, *Tô Nóng*, *Quán Nhà Mình*, *Nước Lèo*. Ưu tiên tên ngắn, không dấu vẫn đọc được (`Bun Oi`), có domain/handle trống.

## 1. Mô tả ngắn
Bạn mở một quán bún nhỏ ở Sài Gòn. Khách bước vào, ngồi xuống, gọi phở tái nạm hay bún riêu. Bạn trụng sợi, chan nước, xếp topping đúng thứ tự, đưa ra bàn trước khi khách hết kiên nhẫn. Kiếm tiền, nâng bếp, mở món mới, rồi mở quán ở Hà Nội, Huế, Hải Phòng — mỗi nơi món khác, quy trình khác.

## 2. Thể loại / góc nhìn / thiết bị
- Thể loại: **Time-management / restaurant sim** (Cooking Fever, Cooking Madness) + lớp meta nâng cấp.
- **3D low-poly, góc nhìn kiểu Overcooked**: camera cố định nhìn từ trên cao chếch ~45–50°, cả bếp nằm trong một khung hình, quầy khách ở mép trên. **Portrait** cho mobile (bếp xếp theo chiều dọc), landscape cho web/PC.
- Mục tiêu thiết bị: **mobile** (iOS/Android). Prototype trên web/PWA để chốt gameplay, sau đó port Godot.
- Điều khiển: **chạm-là-đi** (kiểu Diner Dash). Chạm kệ → đầu bếp tự chạy tới lấy; chạm nồi → chạy tới thả vào; chạm tô → chạy tới ráp. Chạm liên tiếp nhiều thứ = **hàng đợi việc** (hiện số thứ tự nhỏ trên mỗi trạm), chạm lại để huỷ. Không joystick — chơi một tay hoàn toàn.
- Vì có khoảng cách thật, **đường đi là tài nguyên**: đứng chờ nồi là lãng phí, bố trí bếp hợp lý là kỹ năng.

## 3. Bối cảnh và phong cách hình ảnh
- Quán vỉa hè / quán nhỏ Việt Nam: ghế nhựa, bàn inox, nồi nước lèo bốc khói, biển hiệu vẽ tay, ánh đèn vàng buổi sáng.
- **3D low-poly stylized** (flat shading, bo góc, màu phẳng ấm) như Overcooked: đầu bếp chibi đầu to tay ngắn, trạm bếp là khối rõ hình, món ăn phóng đại chi tiết nhận diện (khói, sợi, topping to) để đọc được từ camera cao. Không photorealistic.
- Bảng màu: sàn gạch `#C98B4A`, inox `#B8C0C8`, nước lèo `#E8A33C`, rau `#5FA55A`, ớt/nhấn `#E84A3B`, xanh ngọc UI `#2A9D8F`, chữ tối `#2B2118`.
- Pipeline: dựng trong **Blender** (script `build_*.py` như Dino Arena) → GLB; **Flow chỉ tạo ảnh concept tham chiếu** (đầu bếp, bếp, món) trước khi dựng 3D. Ảnh thực tế trong cooking-note giữ làm tham chiếu quy trình.

## 4. Nhân vật, khách, vật phẩm
- **Người chơi**: đầu bếp/chủ quán, tuỳ chỉnh (tên, kiểu tóc, tạp dề). Không cần animation phức tạp — tay bếp hiện khi bấm thao tác.
- **Khách** (mỗi loại = hành vi khác nhau, không phải chỉ đổi skin):
  - *Cô công sở* — kiên nhẫn trung bình, tip cao nếu đúng giờ.
  - *Bác xe ôm* — kiên nhẫn thấp, gọi món nhanh (phở tái), tip thấp nhưng tới nhiều.
  - *Học sinh nhóm 2–3* — gọi cùng lúc, hết kiên nhẫn chậm nhưng nếu bỏ đi thì mất cả nhóm.
  - *Du khách* — gọi món lạ (bún đậu, bánh hỏi), kiên nhẫn cao, tip rất cao, chụp ảnh → bonus danh tiếng.
  - *Food reviewer* (hiếm) — món phải đúng 100% thứ tự, thưởng danh tiếng lớn hoặc phạt.
- **Vật phẩm/booster** (mua bằng tiền trong game hoặc nhận thưởng): *Ly trà đá* (khách kiên nhẫn +30% trong 1 ca), *Nồi nước lèo dự phòng*, *Phụ bếp* (tự trụng sợi 1 ca), *Bảng "Hôm nay khuyến mãi"* (khách đông hơn, tiền ít hơn).

## 5. Điều khiển và vòng nấu (lõi từ cooking-note)
Ba khái niệm giữ nguyên từ Simulator, nhưng thêm **giới hạn thời gian** và **nhiều đơn song song**:

| Khái niệm | Trong bếp thật | Trong game |
|---|---|---|
| **ITEM** (lấy) | Cầm sợi, tô, topping | Chạm kệ → đầu bếp chạy tới, nguyên liệu hiện trên tay (cầm tối đa N thứ, N tăng khi nâng cấp) |
| **ACTION** (làm) | Trụng, xả lạnh, đun, cắt, chiên | Chạm trạm (nồi trụng, bếp, thớt, chảo) → chạy tới, thả vào, **timer chạy trên trạm** trong lúc bạn đi làm việc khác; trạm bận thì hiện đồng hồ |
| **ASSEMBLY** (ráp) | Xếp lên tô theo thứ tự thật | Chạm tô trên quầy ráp → chạy tới bỏ thứ đang cầm vào; **sai thứ tự = tô hỏng** (mất nguyên liệu, khách chờ thêm) |

- **Song song là cốt lõi**: trong lúc sợi trụng 8 s, bạn chạy đi lấy tô, bật bếp đun nước, chuẩn bị topping cho đơn khác. Kỹ năng chơi = xếp lịch cho 2–4 tô cùng lúc **và** đi đường ngắn nhất.
- **Hàng đợi việc**: chạm A, B, C liên tiếp → đầu bếp làm lần lượt; huỷ bằng cách chạm lại. Tối đa 3 việc chờ (nâng cấp lên 5).
- **Bố trí bếp** (từ quán 1, sau ca 6): kéo-thả các trạm trong màn hình sắp xếp giữa các ca. Dời nồi trụng lại gần kệ sợi, đặt quầy ráp giữa bếp và quầy khách — đây là nâng cấp bằng trí, không tốn tiền.
- **Timer thật rút ngắn**: giữ tỉ lệ tương đối (trụng 8 → 4 s, đun 8 → 4 s, microwave sườn 30 → 10 s), không đổi thứ tự.
- **Hai workflow sợi** từ dữ liệu thật: `noodle-base` (phở/bún riêu/bánh đa/bún cá: nóng → xả lạnh → nóng → ráo) và `noodle-hot-only` (bún bò Huế: trụng một lần → ráo). Người chơi mới học sẽ **quen tay sai** ở bún bò — đó là chỗ tạo độ khó có chủ ý, không phải bug.
- **Gợi ý thứ tự**: 3 ca đầu của mỗi món hiện bóng mờ "bước tiếp theo"; sau đó tắt. Sai ≥3 lần liên tiếp → gợi ý bật lại 1 ca.

## 6. Vòng chơi chính và điểm tạo hứng thú
Một **màn = một ca** 2–3 phút (mượn từ ý B):
1. Trước ca: xem mục tiêu (kiếm ≥ X đồng, phục vụ ≥ Y khách, không để quá Z khách bỏ đi), chọn tối đa 2 booster.
2. Trong ca: khách tới theo kịch bản (cao trào giữa ca), gọi 1–2 món; nấu và phục vụ.
3. Sau ca: 1–3 sao theo mục tiêu, tiền + danh tiếng; **chọn 1 trong 3 nâng cấp** (bếp / kệ / khách / món / đầu bếp) — nâng cấp cố định, không ngẫu nhiên mất đi. Có thể vào màn **Sắp bếp** để đổi vị trí trạm.
4. Meta: mở khoá món mới bằng danh tiếng, mở quán mới bằng tổng sao. Mỗi quán thêm 3–4 món và 1 cơ chế bếp mới (Huế: nồi nước bún bò riêng; Hải Phòng: chảo chiên chả cá, cắt chả cua).

Điểm gây nghiện: "chỉ một ca nữa" (ca ngắn), thấy rõ tiến bộ tay nghề khi thuộc quy trình, khách mới lạ mỗi quán, và cảm giác "mình biết nấu bún riêu thật" khi kể lại cho người khác.

## 7. Thắng / thua / điểm / chơi lại
- Ca **đạt** khi đủ mục tiêu tối thiểu (1 sao). **Thua ca** khi quá số khách bỏ đi hoặc hết giờ chưa đủ tiền → chơi lại ca (miễn phí, không giới hạn — không bán "mạng").
- Điểm ca = tiền + tip (đúng giờ ×, đúng thứ tự ×) + combo (phục vụ liên tiếp không lỗi).
- Sao lưu theo màn; điểm cao nhất mỗi màn; tổng sao mở quán.
- Không có thua vĩnh viễn. Không có cơ chế chờ thời gian thật (energy) trong bản đầu.

## 8. Phạm vi bản đầu (MVP)
**Một quán (Sài Gòn), 4 món, 3 loại khách, 12 ca, 6 nâng cấp.**
- Món: **Phở tái nạm** (dễ, không stage phụ) → **Phở đặc biệt** (thêm trụng bò viên song song) → **Bún riêu cua** (nấu nước: cốt cua → huyết → nước → đun) → **Bún bò Huế** (workflow sợi khác, 11 nguyên liệu — món "boss" của quán 1).
- Khách: cô công sở, bác xe ôm, du khách.
- Nâng cấp: tay cầm 2→3 món, nồi trụng thứ 2, nước lèo đun sẵn (bỏ bước chờ), khách kiên nhẫn +15%, đầu bếp chạy nhanh +20%, hàng đợi việc 3→5. Màn **Sắp bếp** (kéo-thả trạm) mở sau ca 6.
- Bếp MVP: 1 kệ sợi, 1 kệ topping (4 ô), 1 kệ rau (3 ô), 1 nồi trụng, 1 bồn xả lạnh, 1 bếp đun nước, 1 quầy ráp (2 tô), 1 quầy giao món, 3 ghế khách.
- Menu, chọn màn, ca chơi, kết quả 3 sao, cửa hàng nâng cấp, lưu tiến độ localStorage.
- **Không** có: IAP, quảng cáo, nhiều quán, sự kiện, âm thanh file thật (dùng tổng hợp như Dino Arena).

Một lượt chơi mục tiêu: 2–3 phút/ca; người chơi mới hoàn thành 12 ca trong ~45–60 phút.

### Thông số cân bằng ban đầu (để trong config, sẽ chỉnh theo test)
| Thông số | Giá trị |
|---|---|
| Thời gian ca | 150 s (ca 1–4), 180 s (ca 5–12) |
| Kiên nhẫn khách | công sở 45 s · xe ôm 30 s · du khách 70 s |
| Tô cùng lúc | 2 (ca 1–3) → 3 (ca 4+) → 4 (nâng cấp) |
| Tốc độ đầu bếp / kích thước bếp | 3.5 m/s / ~8 × 6 m (xa nhất ~2.5 s đi) |
| Hàng đợi việc | 3 (→5) |
| Timer: trụng / xả lạnh / trụng lại / đun / bò viên | 4 / 2 / 1.5 / 4 / 3 s |
| Giá món | phở tái nạm 45k · đặc biệt 60k · bún riêu 50k · bún bò 55k |
| Tip | đúng giờ +20%, còn >50% kiên nhẫn +40% |
| Khách bỏ đi tối đa | 2 (1 sao) · 1 (2 sao) · 0 (3 sao) |

## 9. Danh sách tài nguyên cần tạo
Xem `concept/ASSET-LIST.md`. Tóm tắt (3D): 1 bếp + quán (GLB, tách trạm thành object riêng để sắp bếp), 1 đầu bếp rig (Idle/Run/Carry/Work), ~35 nguyên liệu low-poly (mesh nhỏ cầm trên tay), 4 món × các lớp ráp, 3 khách rig (Sit/Wait/Angry/Happy), ~12 icon UI, ~10 SFX.

## 10. Hướng thương mại (ghi để nhớ, không làm trong MVP)
- F2P chuẩn thể loại: quảng cáo thưởng (xem ad → booster), IAP gỡ quảng cáo + gói tiền. **Không** bán energy/mạng — giữ lời hứa "học nấu thật".
- Khác biệt marketing: "học được cách nấu phở thật khi chơi"; nội dung TikTok/Reels so sánh game ↔ bếp thật.
- Hướng mở rộng C (training cho quán ăn): cùng dữ liệu, thêm mode "không giới hạn giờ + chấm điểm" — đã có sẵn trong cooking-note.
- Đối tượng đầu: người Việt 18–35 chơi casual, cộng đồng người Việt ở nước ngoài, người thích ẩm thực Việt.

## 11. Rủi ro đã thấy
- Thể loại đông đúc; ông lớn chi quảng cáo lớn → phải thắng bằng nội dung độc nhất và cộng đồng, không thắng bằng chi tiền.
- Quy trình thật có thể **kém vui** hơn quy trình bịa (nhiều bước lặp). Prototype web là để trả lời câu này sớm; được phép **rút gọn bước** trong game (gộp xả lạnh + trụng lại thành một tap) nhưng **không đổi thứ tự**.
- Dữ liệu bếp hiện là Level 1 của một quán cụ thể; khi mở rộng món mới vẫn giữ nguyên tắc *không bịa quy trình* — hỏi người đứng bếp.

---
*Chi tiết do AI đề xuất (có thể sửa): tên tạm, loại khách và hành vi, bảng thông số, thứ tự 4 món MVP, cơ chế "tô hỏng khi sai thứ tự", chọn 1/3 nâng cấp sau ca, hàng đợi việc, màn Sắp bếp, danh sách quán mở rộng.*

*Lịch sử quyết định: 2026-09-11 chọn 2D minh hoạ; 2026-09-12 đổi sang 3D low-poly góc nhìn Overcooked + chạm-là-đi (Kent).*
