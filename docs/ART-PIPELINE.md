

## 12. Xả lạnh ở bồn + thùng rác (18/09)

Kent báo: *"lúc xả lạnh nó vẫn ở nồi trụng"*. Đúng: `toSink()` giữ rổ trong `C.baskets[i]`
và chỉ đổi `state='rinsing'`, mà `pvBaskets` vẽ theo `C.baskets` → rổ vẫn nằm trong nồi.

Sửa ở **lớp vẽ**, không đụng luật chơi: rổ có `state` là `rinsing`/`rinsed` thì
vẽ trong `#pvSink`, còn chỗ của nó trong nồi để mờ (`.pv-basket.away`) và không nhận thả.
Đang xả thì có `fx-splash-water`; xả xong đổi nhãn "đã xả lạnh" và kéo được.

**Bậy:** `fx-splash-water` vẽ màu trắng, đặt lên cái bồn sáng thì **không thấy gì**.
Phải nhuộm: `filter: hue-rotate(175deg) saturate(2.2)`. Hiệu ứng trắng trên nền sáng
lúc nào cũng phải kiểm bằng mắt, đừng tin là đã gắn đúng chỗ là xong.

Thùng rác trước là emoji nên mỗi máy vẽ một kiểu — giờ là sprite `st-trash.webp`,
vứt vô thì thùng giật một cái kèm bụi bay lên (`toss()` trong `pov.js`).
