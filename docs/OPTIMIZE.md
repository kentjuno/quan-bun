# Cách làm nhanh — rút từ bot làm mẫu (Quán Bún)

Sinh tự động bởi `scripts/gen_optimize.mjs` từ dữ liệu bếp thật (`sim-data.js`) và bot trong game. Thời gian là giây game (rút ngắn, GIỮ tỉ lệ & thứ tự bếp thật). Mục đích: nhớ THỨ TỰ và cách XẾP VIỆC, không phải số giây.

## Nguyên tắc chung (áp dụng ngoài đời)

1. **Việc chạy nền đi trước**: vừa nhận đơn → thả tô vào nồi nóng và thả sợi vào rọ NGAY, rồi mới đi lấy topping. Trong lúc sợi trụng, tay đang lấy 2 thứ đầu của tô.
2. **Mỗi chuyến 2 thứ**: kệ topping lấy 2 món liền nhau trong thứ tự ráp rồi mới qua quầy. Không đi tay không, không đi một thứ.
3. **Tô nóng trữ sẵn**: lúc rảnh (đầu ca, giữa hai đơn) thả 2 tô vào nồi. Tô để bao lâu cũng được; sợi thì không.
4. **Sợi không nằm nồi lâu**: chỉ thả sợi cho tô sau khi tô này còn ≤ 4 bước; sợi chín để lâu là hư.
5. **Nước lèo riêu / bún bò**: hết nồi mới nấu; nấu ngay khi thấy đơn riêu/bún bò đầu tiên trong lúc sợi đang trụng (đun chạy nền). Thứ tự cho vào nồi cố định: cốt → huyết → nước.
6. **Hai đơn cùng lúc**: xong bước nền của tô 1 → mở tô 2 (tô + sợi vào nồi) → quay lại ráp tô 1 → tô 2. Ba rọ sợi là để làm 2–3 tô song song.

## Phở Đặc Biệt

- Sợi: **Sợi phở** — trụng nóng → xả lạnh → trụng nóng lại → ráo. Tô: **Tô phở** (trụng/ trữ trong nồi nóng).
- Nước lèo: **nước phở** có sẵn.
- Thứ tự ráp: tô + sợi → Nạm → Lá sách → Bò tái → Bò viên đã trụng → Hành tây → Ngò rí + ngò gai → Hành → Chan nước phở
- Bot: **32.5s / tô, 26 chạm**. Lộ trình:

  1. Kệ tô: lấy Tô phở
  2. Nồi: thả Tô phở
  3. Kệ sợi: lấy Sợi phở
  4. Nồi: thả Sợi phở
  5. Kệ topping: lấy Nạm
  6. Nồi: lấy tô phở nóng
  7. Quầy ráp: bỏ Nạm + Tô phở đã trụng
  8. Nồi: lấy rọ 1
  9. Bồn: xả lạnh
  10. Nồi: thả Sợi phở đã xả lạnh
  11. Quầy ráp: bỏ Nạm + Sợi phở đã trụng + ráo
  12. Kệ topping: lấy Lá sách
  13. Kệ topping: lấy Bò tái
  14. Quầy ráp: bỏ Lá sách + Bò tái
  15. Kệ topping: lấy Bò viên
  16. Nồi: thả Bò viên
  17. Kệ topping: lấy Hành tây
  18. Nồi: lấy rọ 1
  19. Quầy ráp: bỏ Hành tây + Bò viên đã trụng
  20. Kệ topping: lấy Ngò rí + ngò gai
  21. Kệ topping: lấy Hành
  22. Quầy ráp: bỏ Ngò rí + ngò gai + Hành
  23. Nước phở: múc
  24. Quầy ráp: bỏ Nước phở
  25. Quầy ráp: cầm tô
  26. Bàn khách: giao

## Phở Tái Nạm

- Sợi: **Sợi phở** — trụng nóng → xả lạnh → trụng nóng lại → ráo. Tô: **Tô phở** (trụng/ trữ trong nồi nóng).
- Nước lèo: **nước phở** có sẵn.
- Thứ tự ráp: tô + sợi → Nạm → Bò tái → Hành tây → Ngò rí + ngò gai → Hành → Chan nước phở
- Bot: **23.1s / tô, 21 chạm**. Lộ trình:

  1. Kệ tô: lấy Tô phở
  2. Nồi: thả Tô phở
  3. Kệ sợi: lấy Sợi phở
  4. Nồi: thả Sợi phở
  5. Kệ topping: lấy Nạm
  6. Nồi: lấy tô phở nóng
  7. Quầy ráp: bỏ Nạm + Tô phở đã trụng
  8. Nồi: lấy rọ 1
  9. Bồn: xả lạnh
  10. Nồi: thả Sợi phở đã xả lạnh
  11. Quầy ráp: bỏ Nạm + Sợi phở đã trụng + ráo
  12. Kệ topping: lấy Bò tái
  13. Kệ topping: lấy Hành tây
  14. Quầy ráp: bỏ Bò tái + Hành tây
  15. Kệ topping: lấy Ngò rí + ngò gai
  16. Kệ topping: lấy Hành
  17. Quầy ráp: bỏ Ngò rí + ngò gai + Hành
  18. Nước phở: múc
  19. Quầy ráp: bỏ Nước phở
  20. Quầy ráp: cầm tô
  21. Bàn khách: giao

## Phở Tái Đập

- Sợi: **Sợi phở** — trụng nóng → xả lạnh → trụng nóng lại → ráo. Tô: **Tô phở** (trụng/ trữ trong nồi nóng).
- Nước lèo: **nước phở** có sẵn.
- Thứ tự ráp: tô + sợi → Nạm → Tái đập → Hành tây → Ngò rí + ngò gai → Hành → Chan nước phở
- Bot: **25.5s / tô, 23 chạm**. Lộ trình:

  1. Kệ tô: lấy Tô phở
  2. Nồi: thả Tô phở
  3. Kệ sợi: lấy Sợi phở
  4. Nồi: thả Sợi phở
  5. Kệ topping: lấy Nạm
  6. Nồi: lấy tô phở nóng
  7. Quầy ráp: bỏ Nạm + Tô phở đã trụng
  8. Nồi: lấy rọ 1
  9. Bồn: xả lạnh
  10. Nồi: thả Sợi phở đã xả lạnh
  11. Quầy ráp: bỏ Nạm + Sợi phở đã trụng + ráo
  12. Kệ topping: lấy Bò tái
  13. Kệ topping: lấy Gừng
  14. Thớt: đặt Bò tái + Gừng
  15. Kệ topping: lấy Hành tây
  16. Quầy ráp: bỏ Tái đập + Hành tây
  17. Kệ topping: lấy Ngò rí + ngò gai
  18. Kệ topping: lấy Hành
  19. Quầy ráp: bỏ Ngò rí + ngò gai + Hành
  20. Nước phở: múc
  21. Quầy ráp: bỏ Nước phở
  22. Quầy ráp: cầm tô
  23. Bàn khách: giao

## Phở Sườn Tái

- Sợi: **Sợi phở** — trụng nóng → xả lạnh → trụng nóng lại → ráo. Tô: **Tô phở** (trụng/ trữ trong nồi nóng).
- Nước lèo: **nước phở** có sẵn.
- Thứ tự ráp: tô + sợi → Bò tái → Hành tây → Ngò rí + ngò gai → Chan nước phở → Sườn đã ủ ấm → 2 tô đã chuẩn bị
- Bot: **40.3s / tô, 25 chạm**. Lộ trình:

  1. Kệ tô: lấy Tô phở
  2. Nồi: thả Tô phở
  3. Kệ sợi: lấy Sợi phở
  4. Nồi: thả Sợi phở
  5. Kệ topping: lấy Bò tái
  6. Nồi: lấy tô phở nóng
  7. Quầy ráp: bỏ Bò tái + Tô phở đã trụng
  8. Nồi: lấy rọ 1
  9. Bồn: xả lạnh
  10. Nồi: thả Sợi phở đã xả lạnh
  11. Quầy ráp: bỏ Bò tái + Sợi phở đã trụng + ráo
  12. Kệ topping: lấy Hành tây
  13. Kệ topping: lấy Ngò rí + ngò gai
  14. Quầy ráp: bỏ Hành tây + Ngò rí + ngò gai
  15. Nước phở: múc
  16. Quầy ráp: bỏ Nước phở
  17. Kệ topping: lấy Sườn cây
  18. Lò vi sóng: quay Sườn cây
  19. Kệ tô: lấy Tô phụ
  20. Lò vi sóng: lấy
  21. Thớt: đặt Tô phụ + Sườn đã quay nóng
  22. Nồi: thả Sườn đã cắt
  23. Quầy ráp: bỏ 2 tô đã chuẩn bị + Sườn đã ủ ấm
  24. Quầy ráp: cầm tô
  25. Bàn khách: giao

## Bún Riêu Cua

- Sợi: **Bún** — trụng nóng → xả lạnh → trụng nóng lại → ráo. Tô: **Tô món nước** (trụng/ trữ trong nồi nóng).
- Nước lèo: **Nước riêu cua** nấu ở lò: Nước cốt cua → Huyết → Miếng nước trắng → đun.
- Thứ tự ráp: tô + sợi → Cà chua → Bò tái → Đậu hũ chiên → Tôm chiên → Đổ nước riêu cua → Hành
- Bot: **30.6s / tô, 24 chạm**. Lộ trình:

  1. Kệ tô: lấy Tô phở
  2. Kệ tô: lấy Tô món nước
  3. Kệ tô: lấy Tô phở
  4. Nồi: thả Tô món nước
  5. Kệ sợi: lấy Bún
  6. Nồi: thả Bún
  7. Kệ topping: lấy Cà chua
  8. Nồi: lấy tô món nước nóng
  9. Quầy ráp: bỏ Cà chua + Tô món nước đã trụng
  10. Nồi: lấy rọ 1
  11. Bồn: xả lạnh
  12. Nồi: thả Bún đã xả lạnh
  13. Quầy ráp: bỏ Cà chua + Bún đã trụng + ráo
  14. Kệ topping: lấy Bò tái
  15. Kệ topping: lấy Đậu hũ chiên
  16. Quầy ráp: bỏ Bò tái + Đậu hũ chiên
  17. Kệ topping: lấy Tôm chiên
  18. Quầy ráp: bỏ Tôm chiên
  19. Lò đun 1: nấu
  20. Kệ topping: lấy Hành
  21. Kệ nước: lấy nước riêu cua đã nóng
  22. Quầy ráp: bỏ Hành + Nước riêu cua đã nóng
  23. Quầy ráp: cầm tô
  24. Bàn khách: giao

## Bánh Đa Cua Hải Phòng

- Sợi: **Bánh đa** — trụng nóng → xả lạnh → trụng nóng lại → ráo. Tô: **Tô món nước** (trụng/ trữ trong nồi nóng).
- Nước lèo: **Nước riêu cua** nấu ở lò: Nước cốt cua → Miếng nước trắng → đun.
- Thứ tự ráp: tô + sợi → Rau đã trụng → Chả cá chiên → Tôm chiên → Cà chua → Hành tây → Hành → Tóp mỡ → Hành phi → Đổ nước riêu cua
- Bot: **37.6s / tô, 28 chạm**. Lộ trình:

  1. Kệ tô: lấy Tô món nước
  2. Nồi: thả Tô món nước
  3. Kệ sợi: lấy Bánh đa
  4. Nồi: thả Bánh đa
  5. Kệ topping: lấy Rau muống
  6. Nồi: lấy tô món nước nóng
  7. Quầy ráp: bỏ Rau đã trụng + Tô món nước đã trụng
  8. Nồi: lấy rọ 1
  9. Bồn: xả lạnh
  10. Nồi: thả Bánh đa đã xả lạnh
  11. Quầy ráp: bỏ Rau đã trụng + Bánh đa đã trụng + ráo
  12. Kệ topping: lấy Chả cá chiên
  13. Kệ topping: lấy Tôm chiên
  14. Quầy ráp: bỏ Chả cá chiên + Tôm chiên
  15. Kệ topping: lấy Cà chua
  16. Kệ topping: lấy Hành tây
  17. Quầy ráp: bỏ Cà chua + Hành tây
  18. Kệ topping: lấy Hành
  19. Kệ topping: lấy Tóp mỡ
  20. Quầy ráp: bỏ Hành + Tóp mỡ
  21. Kệ topping: lấy Hành phi
  22. Quầy ráp: bỏ Hành phi
  23. Lò đun 1: nấu
  24. Kệ nước: lấy nước riêu cua đã nóng
  25. Quầy ráp: bỏ Nước riêu cua đã nóng
  26. Quầy ráp: cầm tô
  27. Bàn khách: giao

## Bún Bò Huế

- Sợi: **Bún cọng to** — trụng nóng 1 lần → ráo (KHÔNG xả lạnh). Tô: **Tô món nước** (trụng/ trữ trong nồi nóng).
- Nước lèo: **Nước bún bò** nấu ở lò: Nước bún bò → Huyết → Miếng nước trắng → đun.
- Thứ tự ráp: tô + sợi → Thịt luộc → Bắp bò → Nạm → Chả lụa → Chả rế → Hành tây → Rau răm → Hành → Đổ nước bún bò
- Bot: **31.1s / tô, 27 chạm**. Lộ trình:

  1. Kệ tô: lấy Tô phở
  2. Kệ tô: lấy Tô món nước
  3. Kệ tô: lấy Tô phở
  4. Nồi: thả Tô món nước
  5. Kệ sợi: lấy Bún cọng to
  6. Nồi: thả Bún cọng to
  7. Kệ topping: lấy Thịt luộc
  8. Nồi: lấy tô món nước nóng
  9. Quầy ráp: bỏ Thịt luộc + Tô món nước đã trụng
  10. Nồi: lấy rọ 1
  11. Quầy ráp: bỏ Thịt luộc + Bún cọng to đã trụng + ráo
  12. Kệ topping: lấy Bắp bò
  13. Kệ topping: lấy Nạm
  14. Quầy ráp: bỏ Bắp bò + Nạm
  15. Kệ topping: lấy Chả lụa
  16. Kệ topping: lấy Chả rế
  17. Quầy ráp: bỏ Chả lụa + Chả rế
  18. Kệ topping: lấy Hành tây
  19. Kệ topping: lấy Rau răm
  20. Quầy ráp: bỏ Hành tây + Rau răm
  21. Kệ topping: lấy Hành
  22. Quầy ráp: bỏ Hành
  23. Lò đun 1: nấu
  24. Kệ nước: lấy nước bún bò đã nóng
  25. Quầy ráp: bỏ Nước bún bò đã nóng
  26. Quầy ráp: cầm tô
  27. Bàn khách: giao

## Bún Cá Hải Phòng

- Sợi: **Bún** — trụng nóng → xả lạnh → trụng nóng lại → ráo. Tô: **Tô món nước** (trụng/ trữ trong nồi nóng).
- Nước lèo: **Nước cá** nấu ở lò: Nước cá → Miếng nước trắng → đun.
- Thứ tự ráp: tô + sợi → Cà chua → Rau đã trụng → Cá chiên → Chả cá đã cắt → Hành → Đổ nước cá → Thì là đã cắt 3 khúc
- Bot: **42.4s / tô, 27 chạm**. Lộ trình:

  1. Kệ tô: lấy Tô món nước
  2. Nồi: thả Tô món nước
  3. Kệ sợi: lấy Bún
  4. Nồi: thả Bún
  5. Kệ topping: lấy Cà chua
  6. Nồi: lấy tô món nước nóng
  7. Quầy ráp: bỏ Cà chua + Tô món nước đã trụng
  8. Nồi: lấy rọ 1
  9. Bồn: xả lạnh
  10. Nồi: thả Bún đã xả lạnh
  11. Quầy ráp: bỏ Cà chua + Bún đã trụng + ráo
  12. Kệ topping: lấy Cần nước
  13. Nồi: thả Cần nước
  14. Kệ topping: lấy Cá chiên
  15. Quầy ráp: bỏ Rau đã trụng + Cá chiên
  16. Kệ topping: lấy Chả cá chiên
  17. Thớt: đặt Chả cá chiên
  18. Kệ topping: lấy Hành
  19. Quầy ráp: bỏ Chả cá đã cắt + Hành
  20. Lò đun 1: nấu
  21. Kệ topping: lấy Thì là
  22. Kệ nước: lấy nước cá đã nóng
  23. Quầy ráp: bỏ Thì là + Nước cá đã nóng
  24. Thớt: đặt Thì là
  25. Quầy ráp: bỏ Thì là đã cắt 3 khúc
  26. Quầy ráp: cầm tô
  27. Bàn khách: giao

## Chả Cá Lã Vọng

- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.
- Thứ tự ráp: Chén mắm tôm + mỡ hành → Chén nước cốt chanh → Chén đậu phộng rang → Chén ớt đỏ → Chén rau kinh giới + tía tô + bạc hà → Dĩa thì là + gốc hành + hành tây → Chảo áp cá đã có hành tây + thì là
- Bot: **36.8s / tô, 34 chạm**. Lộ trình:

  1. Kệ topping: lấy Mắm tôm
  2. Kệ topping: lấy Mỡ hành
  3. Thớt: đặt Mắm tôm + Mỡ hành
  4. Quầy ráp: bỏ Chén mắm tôm + mỡ hành
  5. Kệ topping: lấy Nước cốt chanh
  6. Thớt: đặt Nước cốt chanh
  7. Quầy ráp: bỏ Chén nước cốt chanh
  8. Kệ topping: lấy Đậu phộng rang
  9. Thớt: đặt Đậu phộng rang
  10. Quầy ráp: bỏ Chén đậu phộng rang
  11. Kệ topping: lấy Ớt đỏ xắt
  12. Thớt: đặt Ớt đỏ xắt
  13. Quầy ráp: bỏ Chén ớt đỏ
  14. Kệ topping: lấy Kinh giới
  15. Kệ topping: lấy Tía tô
  16. Thớt: đặt Kinh giới + Tía tô
  17. Kệ topping: lấy Bạc hà
  18. Thớt: đặt Bạc hà
  19. Quầy ráp: bỏ Chén rau kinh giới + tía tô + bạc hà
  20. Kệ tô: lấy Dĩa lớn
  21. Kệ topping: lấy Thì là
  22. Thớt: đặt Dĩa lớn + Thì là
  23. Kệ topping: lấy Gốc hành lá cắt sợi
  24. Kệ topping: lấy Hành tây
  25. Thớt: đặt Gốc hành lá cắt sợi + Hành tây
  26. Quầy ráp: bỏ Dĩa thì là + gốc hành + hành tây
  27. Kệ tô: lấy Chảo áp cá
  28. Kệ topping: lấy Hành tây
  29. Thớt: đặt Chảo áp cá + Hành tây
  30. Kệ topping: lấy Thì là
  31. Thớt: đặt Thì là
  32. Quầy ráp: bỏ Chảo áp cá đã có hành tây + thì là
  33. Quầy ráp: cầm tô
  34. Bàn khách: giao

## Bún Đậu Mắm Tôm

- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.
- Thứ tự ráp: Mẹt đã lót giấy → Bún → Xà lách → Kinh giới → Bạc hà → Tía tô → Hoàn tất món
- Bot: **16.2s / tô, 13 chạm**. Lộ trình:

  1. Kệ tô: lấy Mẹt
  2. Kệ tô: lấy Giấy lót mẹt
  3. Thớt: đặt Mẹt + Giấy lót mẹt
  4. Kệ sợi: lấy Bún
  5. Quầy ráp: bỏ Mẹt đã lót giấy + Bún
  6. Kệ topping: lấy Xà lách
  7. Kệ topping: lấy Kinh giới
  8. Quầy ráp: bỏ Xà lách + Kinh giới
  9. Kệ topping: lấy Bạc hà
  10. Kệ topping: lấy Tía tô
  11. Quầy ráp: bỏ Bạc hà + Tía tô
  12. Quầy ráp: cầm tô
  13. Bàn khách: giao

## Bánh Hỏi Thịt Heo

- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.
- Thứ tự ráp: Mẹt đã lót giấy → Bánh hỏi đã trụng + ráo → Mỡ hành → Dưa leo → Xoài → Bún đã trụng + để ráo → Xà lách → Kinh giới → Tía tô → Bạc hà → Thịt nướng → Hoàn tất món
- Bot: **43.2s / tô, 29 chạm**. Lộ trình:

  1. Kệ tô: lấy Mẹt
  2. Kệ tô: lấy Giấy lót mẹt
  3. Thớt: đặt Mẹt + Giấy lót mẹt
  4. Quầy ráp: bỏ Mẹt đã lót giấy
  5. Kệ sợi: lấy Bánh hỏi
  6. Nồi: thả Bánh hỏi
  7. Kệ topping: lấy Mỡ hành
  8. Nồi: lấy rọ 1
  9. Bồn: xả lạnh
  10. Nồi: thả Bánh hỏi đã xả lạnh
  11. Quầy ráp: bỏ Mỡ hành + Bánh hỏi đã trụng + ráo
  12. Kệ topping: lấy Dưa leo
  13. Kệ topping: lấy Xoài
  14. Quầy ráp: bỏ Dưa leo + Xoài
  15. Kệ sợi: lấy Bún
  16. Nồi: thả Bún
  17. Kệ topping: lấy Xà lách
  18. Nồi: lấy rọ 1
  19. Bồn: xả lạnh
  20. Nồi: thả Bún đã xả lạnh
  21. Quầy ráp: bỏ Xà lách + Bún đã trụng + ráo
  22. Kệ topping: lấy Kinh giới
  23. Kệ topping: lấy Tía tô
  24. Quầy ráp: bỏ Kinh giới + Tía tô
  25. Kệ topping: lấy Bạc hà
  26. Kệ topping: lấy Thịt nướng
  27. Quầy ráp: bỏ Bạc hà + Thịt nướng
  28. Quầy ráp: cầm tô
  29. Bàn khách: giao

## Bún Nem Cua, Thịt Nướng, Tôm Nướng

- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.
- Thứ tự ráp: Tô bún khô → Bún đã trụng + để ráo → Xà lách + dưa leo + đồ chua đã cắt → Hoàn tất món
- Bot: **22.2s / tô, 16 chạm**. Lộ trình:

  1. Kệ tô: lấy Tô bún khô
  2. Quầy ráp: bỏ Tô bún khô
  3. Kệ sợi: lấy Bún
  4. Nồi: thả Bún
  5. Kệ topping: lấy Xà lách
  6. Nồi: lấy rọ 1
  7. Bồn: xả lạnh
  8. Nồi: thả Bún đã xả lạnh
  9. Quầy ráp: bỏ Xà lách + Bún đã trụng + ráo
  10. Kệ topping: lấy Dưa leo
  11. Thớt: đặt Xà lách + Dưa leo
  12. Kệ topping: lấy Đồ chua
  13. Thớt: đặt Đồ chua
  14. Quầy ráp: bỏ Xà lách + dưa leo + đồ chua đã cắt
  15. Quầy ráp: cầm tô
  16. Bàn khách: giao

## Bún Gà Nướng

- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.
- Thứ tự ráp: Tô bún khô → Bún đã trụng + để ráo → Xà lách + dưa leo + đồ chua đã cắt → Hoàn tất món
- Bot: **22.2s / tô, 16 chạm**. Lộ trình:

  1. Kệ tô: lấy Tô bún khô
  2. Quầy ráp: bỏ Tô bún khô
  3. Kệ sợi: lấy Bún
  4. Nồi: thả Bún
  5. Kệ topping: lấy Xà lách
  6. Nồi: lấy rọ 1
  7. Bồn: xả lạnh
  8. Nồi: thả Bún đã xả lạnh
  9. Quầy ráp: bỏ Xà lách + Bún đã trụng + ráo
  10. Kệ topping: lấy Dưa leo
  11. Thớt: đặt Xà lách + Dưa leo
  12. Kệ topping: lấy Đồ chua
  13. Thớt: đặt Đồ chua
  14. Quầy ráp: bỏ Xà lách + dưa leo + đồ chua đã cắt
  15. Quầy ráp: cầm tô
  16. Bàn khách: giao

## Bún Chả Hà Nội

- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.
- Thứ tự ráp: Mẹt đã lót giấy → Xà lách → Kinh giới → Bạc hà → Tía tô → Bún đã trụng + để ráo → Dưa leo → Hoàn tất món
- Bot: **27s / tô, 19 chạm**. Lộ trình:

  1. Kệ tô: lấy Mẹt
  2. Kệ tô: lấy Giấy lót mẹt
  3. Thớt: đặt Mẹt + Giấy lót mẹt
  4. Kệ topping: lấy Xà lách
  5. Quầy ráp: bỏ Mẹt đã lót giấy + Xà lách
  6. Kệ topping: lấy Kinh giới
  7. Kệ topping: lấy Bạc hà
  8. Quầy ráp: bỏ Kinh giới + Bạc hà
  9. Kệ topping: lấy Tía tô
  10. Quầy ráp: bỏ Tía tô
  11. Kệ sợi: lấy Bún
  12. Nồi: thả Bún
  13. Kệ topping: lấy Dưa leo
  14. Nồi: lấy rọ 1
  15. Bồn: xả lạnh
  16. Nồi: thả Bún đã xả lạnh
  17. Quầy ráp: bỏ Dưa leo + Bún đã trụng + ráo
  18. Quầy ráp: cầm tô
  19. Bàn khách: giao

## Chả Giò Việt Nam

- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.
- Thứ tự ráp: Dĩa dài → Chả giò đã cắt chéo → Đồ chua → Hoàn tất món
- Bot: **22.5s / tô, 10 chạm**. Lộ trình:

  1. Kệ tô: lấy Dĩa dài
  2. Quầy ráp: bỏ Dĩa dài
  3. Kệ topping: lấy Chả giò (2 cây)
  4. Chảo chiên: chiên Chả giò (2 cây)
  5. Kệ topping: lấy Đồ chua
  6. Chảo chiên: lấy
  7. Thớt: đặt Đồ chua + Chả giò đã chiên
  8. Quầy ráp: bỏ Đồ chua + Chả giò đã cắt chéo
  9. Quầy ráp: cầm tô
  10. Bàn khách: giao

## Gỏi Cuốn Tôm Thịt

- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.
- Thứ tự ráp: Bánh tráng đã nhúng → Thịt luộc → Tôm luộc → Bún → Xà lách → Dĩa dài → Hoàn tất món
- Bot: **18.9s / tô, 12 chạm**. Lộ trình:

  1. Kệ tô: lấy Bánh tráng
  2. Bồn: xả lạnh
  3. Kệ topping: lấy Thịt luộc
  4. Quầy ráp: bỏ Bánh tráng đã nhúng + Thịt luộc
  5. Kệ topping: lấy Tôm luộc
  6. Kệ sợi: lấy Bún
  7. Quầy ráp: bỏ Tôm luộc + Bún
  8. Kệ topping: lấy Xà lách
  9. Kệ tô: lấy Dĩa dài
  10. Quầy ráp: bỏ Xà lách + Dĩa dài
  11. Quầy ráp: cầm tô
  12. Bàn khách: giao

## Cháo Lòng

- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.
- Nước lèo: **Cháo** nấu ở lò: Cháo lòng → Miếng nước trắng → đun.
- Thứ tự ráp: Phần Level 1 đã xong → Quẩy đã cắt
- Bot: **25.5s / tô, 13 chạm**. Lộ trình:

  1. Lò đun 1: nấu
  2. Kệ topping: lấy Quẩy
  3. Kệ nước: lấy cháo đã nóng
  4. Thớt: đặt Quẩy + Cháo đã nóng
  5. Kệ tô: lấy Tô món nước
  6. Nồi: thả Tô món nước
  7. Nồi: lấy tô món nước nóng
  8. Thớt: đặt Quẩy đã cắt + Tô món nước đã trụng
  9. Kệ tô: lấy Dĩa lót
  10. Thớt: đặt Quẩy đã cắt + Dĩa lót
  11. Quầy ráp: bỏ Quẩy đã cắt + Phần Level 1 đã xong
  12. Quầy ráp: cầm tô
  13. Bàn khách: giao

## Cháo Sườn

- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.
- Nước lèo: **Cháo** nấu ở lò: Cháo sườn → Miếng nước trắng → đun.
- Thứ tự ráp: Phần Level 1 đã xong → Quẩy đã cắt
- Bot: **25.5s / tô, 13 chạm**. Lộ trình:

  1. Lò đun 1: nấu
  2. Kệ topping: lấy Quẩy
  3. Kệ nước: lấy cháo đã nóng
  4. Thớt: đặt Quẩy + Cháo đã nóng
  5. Kệ tô: lấy Tô món nước
  6. Nồi: thả Tô món nước
  7. Nồi: lấy tô món nước nóng
  8. Thớt: đặt Quẩy đã cắt + Tô món nước đã trụng
  9. Kệ tô: lấy Dĩa lót
  10. Thớt: đặt Quẩy đã cắt + Dĩa lót
  11. Quầy ráp: bỏ Quẩy đã cắt + Phần Level 1 đã xong
  12. Quầy ráp: cầm tô
  13. Bàn khách: giao

## Trạm mới (từ 0.3.0)

- **Thớt** (2 thớt): đem đủ nguyên liệu của một bước (vd. rau salad + dưa leo + đồ chua; mẹt + giấy lót; bò tái + gừng) rồi đứng làm. Thiếu thứ gì thớt báo. Tay chỉ cầm 2 thứ nên bước 3–4 nguyên liệu phải đi 2 chuyến — lộ trình bot cho thấy cách gom.
- **Lò vi sóng**: sườn cây quay nền, rồi thớt cắt, rồi ủ ấm trong nồi.
- **Lò đun** cũng nấu cháo (cháo + nước → đun) → múc cháo ở thớt cùng tô đã trụng + dĩa lót.

## Ghi chú

- Thời gian bot là mốc để so trong bảng tổng kết sau ca ("so với bot"). Người thật khó nhanh hơn bot vì bot không đứng nghĩ; mục tiêu thực tế là ≤ +10 s và 0 lỗi.
- Món đã "thuộc" (≥ 3 tô sạch liên tiếp) → card ẩn tên nguyên liệu, và ra đơn ít hơn; món hay sai ra nhiều hơn (trọng số 1–4).
