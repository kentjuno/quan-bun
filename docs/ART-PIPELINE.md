

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

## 13. Kéo thả trong POV — hai cái bẫy đã dính

**Bẫy 1: quầy render lại GIỮA LÚC ĐANG KÉO.** `tick()` gọi `render()` liên tục, nên mọi
phần tử `.drop` bị thay mới mỗi khung hình. Hai hệ quả:

- Gắn class `over` lên ô để làm viền sáng thì viền bị xoá ngay trong khung đó — người chơi
  không bao giờ thấy. Viền phải là **một khối riêng** (`.pv-hl`) nằm ngoài cây DOM của quầy,
  chỉ dời `left/top/width/height` theo ô đang hít.
- Đo danh sách ô một lần lúc nhấc lên rồi dùng suốt cú kéo là sai: các `rect` trỏ vào node đã
  rụng. Phải `measure()` lại ở **mỗi lần dò** (và một lần nữa ngay tại điểm nhả).

**Bẫy 2: đừng treo phần bám con trỏ vào `requestAnimationFrame`.** Tab nền / cửa sổ bị hãm
nhịp thì rAF gần như đứng, bóng kéo chết cứng trong khi ngón vẫn đi. Đặt `transform` thẳng
trong `pointermove` — việc đó rẻ, không đọc layout. Chỉ **phần dò ô** mới cần chặn lại
(`t - tt < 16ms` hoặc đi chưa đủ 3px), vì nó vừa `measure()` vừa `elementsFromPoint`.

**Hít (SNAP = 34px):** thả hụt trong 34px vẫn tính là trúng ô gần nhất. Ưu tiên ô đang nằm
trong (`elementsFromPoint`), không có mới tính khoảng cách tới `rect`. Không có hít thì ô nhỏ
(rổ, khay) gần như không thả trúng bằng ngón tay.

**Cách kiểm tra:** rAF trong khung xem trước của Claude bị hãm gần như đứng hẳn — đừng dùng nó
để đo phần chuyển động. Bắn `PointerEvent` tổng hợp rồi đọc `.pv-hl.on`, `style.transform` của
`.pv-ghost`, và câu thông báo của game là đủ chắc.

## 14. Trang chỉnh ZONES — `tools/zones.html`

Vite dựng hai trang (xem `vite.config.js`). Mở `tools/zones.html`, kéo/kéo góc từng ô trên
chính tấm `scene.webp`, bấm **Chép code** rồi dán đè khối `ZONES` trong
`src/data/counter-layout.js`. Chú thích từng ô nằm trong `NOTE` của trang này để đoạn code
xuất ra dán lại được nguyên vẹn — sửa tên ô thì nhớ sửa luôn `NOTE`.

Mũi tên nhích 0.1%, Shift nhích 1%, Alt + mũi tên đổi kích thước. Dải kẻ đỏ hai mép là vùng
cử chỉ Back của Android quy theo máy rộng 412px (5.3%) — đừng để thứ kéo được nằm trong đó.

`#stage` phải tính **chiều rộng** từ chiều cao khung chứa (`100cqh`); đặt `max-height:100%`
thì `aspect-ratio` hết suy ra được chiều cao và ô xẹp thành số không.
