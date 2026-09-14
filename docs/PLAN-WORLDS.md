# KẾ HOẠCH — Worlds & Levels (bậc thang Overcooked) cho KJ's Choices

Tài liệu bàn giao cho model/agent thực hiện. Đọc hết trước khi sửa code. Kent (chủ dự án) đã duyệt hướng này ngày 14/09/2026. Tài liệu này **tự đủ**: không cần lịch sử chat; mọi thứ cần biết nằm ở đây + các file được trỏ tới trong repo.

> **Prompt giao việc (Kent dán cho model mới):**
> "Bạn làm việc trong repo `F:\AntiGravity\Games\quan-bun`. Đọc `docs/PLAN-WORLDS.md` từ đầu tới cuối, rồi `docs/GAME-DESIGN.md`, `docs/STATUS.md`, mục 0.7.0 trong `docs/CHANGELOG.md`. Thực hiện đúng thứ tự mục 8 của PLAN-WORLDS; xong mỗi bước chạy `npx vitest run` và báo tôi kết quả trước khi sang bước sau. Tuyệt đối tuân thủ mục 0 (bất biến) và mục 10 (Không làm). Câu hỏi về bếp thật: trả lời bằng `src/data/sim-data.js`, không suy đoán; nếu sim-data không có thì hỏi tôi. Khi xong toàn bộ: cập nhật CHANGELOG 0.8.0, STATUS, build, smoke, deploy theo mục 9, gửi tôi ảnh chụp."

**Trạng thái thực hiện** (model thực hiện cập nhật bảng này sau mỗi bước, để đổi model giữa chừng vẫn tiếp được):

| Bước (mục 8) | Trạng thái | Ghi chú / commit |
|---|---|---|
| 1 worlds.js + levels.js + WORLDS + KITCHEN_VARIANTS | ✅ xong 14/09 | 8 world · 124 level; 4 bố trí bếp; `makeLevelArrivals` seed theo id |
| 1b ràng buộc / sự kiện / mục tiêu trong World | ✅ xong 14/09 | potSlots·handCapacity·brothCap·noStack; rain·vip·change-order·tour; clean·no-waste·streak·before |
| 2 recipeFor(simplify) + World cờ | ✅ xong 14/09 | thêm `maxSteps`, `skipFry`; `recipe.shelfSubs` + `World.shelfToken`; snapshot 18 món không đổi |
| 3 progress sao/mở khoá | ✅ xong 14/09 | worldStars/worldUnlocked/levelUnlocked/currentLevel; UPGRADES `unlockStars` |
| 4 UI bản đồ + kết level + smoke | ✅ xong 14/09 | hàng world + lưới level + thẻ chi tiết; màn kết "Level N →"/"Sang world" |
| 5 xoá DAYS | ✅ xong 14/09 | bỏ DAYS/makeDayArrivals/dayFor; days.test.js → customers.test.js |
| 6 docs | ✅ xong 14/09 | CHANGELOG 0.8.0, STATUS, GAME-DESIGN §1/§5 ghi chú đã thay |
| 7 build/deploy/ảnh | ✅ xong 14/09 | artifact + GitHub Pages, sw v3 |

**Ghi thêm khi làm (so với bản kế hoạch)**: thêm trục `rule` (level bật một luật bếp mới, vd sợi để lâu hư) và `mix` (level đầu trộn chung các món đã mở) để mọi level từ L6 đều có "cái mới" thật; `tight` bỏ (4 bố trí là đủ, mỗi cái phải qua test nav); world một món 12 level, hai món 16, nhiều món 20.

## 0. Bối cảnh — đọc 5 phút

- Repo: `F:\AntiGravity\Games\quan-bun` (Three.js + Vite, không framework UI). Bản hiện tại **0.7.0**: vòng chơi theo "ngày" (`config.DAYS`), khách quen + thoại (`src/data/customers.js`), nâng cấp bếp (`config.UPGRADES` → `modsFor` → `World(shift, ev, kitchen, mods)`), nhạc theo pha, kết ngày. Đọc `docs/GAME-DESIGN.md`, `docs/CHANGELOG.md` (mục 0.7.0), `docs/STATUS.md`.
- Vấn đề Kent nêu: **Ngày 1 bắt người mới làm đủ quy trình thật của phở** (trụng tô, sợi nóng→lạnh→nóng, 5 topping đúng thứ tự, chan nước) → ngộp. Kent chơi mấy ngày rồi vẫn thấy khó.
- Hướng mới: **World mỗi món, ~20 level/world, level 1 cực dễ, mỗi level thêm vài bước, mốc 5 level là thử thách, sao mở level/world** — như Overcooked. Chủ đề: "khám phá ẩm thực Việt Nam".
- **Bất biến quan trọng nhất**: `src/data/sim-data.js` (đồng bộ từ `F:\AntiGravity\cooking-note\sim-data.js`) là **sự thật về bếp**. KHÔNG sửa công thức gốc, KHÔNG bịa bước/định lượng. Công thức gốc = "kết quả cuối" và là thứ các chế độ **Thêm** (Luyện, Rush, Survival, Đố, Chém, Phản xạ) dùng — đó là phần Kent luyện để áp dụng ngoài đời. Bậc thang world/level chỉ **rút gọn bằng cờ** trên level, áp lên công thức lúc tạo World, không đụng dữ liệu.
- Từ level ~4 của mỗi world trở đi công thức phải **đủ bước thật** và giữ nguyên tới hết world (để người chơi không thuộc bản sai). Level rút gọn hiện nhãn "bản tập — chưa đủ bước thật" trên thẻ level.

## 1. Mô hình dữ liệu mới (`src/config.js`)

```js
// Một world = một món chủ đạo (+ món anh em mở dần). Mở world khi đủ `starsToUnlock` sao ở world trước.
export const WORLDS = [
  { id: 'pho', name: 'Phở', icon: '🍜', dishes: ['pho-tai-nam', 'pho-dac-biet', 'pho-tai-dap', 'pho-suon-tai'], starsToUnlock: 0, levels: PHO_LEVELS },
  { id: 'bun-rieu', name: 'Bún riêu', icon: '🦀', dishes: ['bun-rieu-cua'], starsToUnlock: 40, levels: [...] },
  { id: 'bun-bo', name: 'Bún bò Huế', icon: '🌶️', dishes: ['bun-bo-hue'], starsToUnlock: 40 },
  { id: 'hai-phong', name: 'Hải Phòng', icon: '🐟', dishes: ['bun-ca-hai-phong', 'banh-da-cua'], starsToUnlock: 40 },
  { id: 'mon-kho', name: 'Món khô', icon: '🧺', dishes: ['bun-cha-ha-noi', 'bun-nem-cua-thit-nuong-tom-nuong', 'bun-ga-nuong', 'bun-dau-mam-tom', 'banh-hoi-thit-heo'], starsToUnlock: 40 },
  { id: 'chao', name: 'Cháo', icon: '🥣', dishes: ['chao-long', 'chao-suon'], starsToUnlock: 40 },
  { id: 'khai-vi', name: 'Khai vị', icon: '🥢', dishes: ['cha-gio-viet-nam', 'goi-cuon-tom-thit'], starsToUnlock: 40 },
  { id: 'cha-ca', name: 'Chả cá Lã Vọng', icon: '🍳', dishes: ['cha-ca-la-vong'], starsToUnlock: 40 },
];
```

Một **level** (id dạng `pho-3`):
```js
{
  id: 'pho-3', world: 'pho', n: 3, name: 'Phở 3', title: 'Tự trụng tô nóng',
  dishes: ['pho-tai-nam'],                 // món có thể ra trong level
  simplify: {                              // CỜ RÚT GỌN — null/rỗng = đủ bước thật
    skipRinse: true,                       // bỏ xả lạnh + trụng lại: sợi trụng 1 lần → noodle-drained (như workflow 'noodle-hot-only')
    hotBowl: true,                         // tô lấy ở kệ đã nóng sẵn: bỏ transform blanch-bowl, kệ tô phát ra 'bowl-hot:<bowl>' trực tiếp
    toppings: ['nam', 'bo-tai'],           // chỉ giữ các topping này trong assembly (bỏ hành tây, ngò, hành lá); thứ tự giữ theo công thức gốc
    noSpoil: true,                         // sợi trong nồi không hư
  },
  seconds: 150, prep: 15,
  arrivals: [...],                         // sinh bằng makeLevelArrivals(level) — seed theo id
  patience: 150, moneyTargets: [a, b, c],  // 1/2/3 sao (tiền); khách bỏ đi tối đa [2,1,0] như RULES.leaveLimitFor
  challenge: null | { kind: 'rush', count: 3 } | { kind: 'lunch', count: 6 } | { kind: 'only', dish: 'pho-dac-biet' } | { kind: 'boss', group: 4 },
  regulars: ['cau-hai'],                   // khách quen ghé level này (customers.js), rỗng = không
  unlocks: { regular: 'cau-hai' } | { dish: 'pho-dac-biet' } | { upgrade: 'burners' } | null,   // thẻ mở khoá trên màn kết
  training: true,                          // = simplify không rỗng → nhãn "bản tập"
  // --- TRỤC BIẾN THIÊN (mục 2b) — mỗi level từ L6 phải có ít nhất một thứ khác rỗng ---
  layout: 'default' | 'far-pot' | 'left-topping' | 'tight' | 'island',   // biến thể bố trí bếp (config.KITCHEN_VARIANTS)
  constraints: { potSlots?: 1|2, handCapacity?: 1, sinkFar?: true, brothCap?: 3, noStack?: true },
  events: [{ at: 0.5, kind: 'tour', n: 4 } | { at: 0.4, kind: 'vip' } | { at: 0.3, kind: 'rain' } | { at: 0.6, kind: 'change-order' }],
  goal: null | { kind: 'clean', bowls: 8 } | { kind: 'no-waste' } | { kind: 'streak', n: 5 } | { kind: 'before', seconds: 120 } | { kind: 'money' },
  whatsNew: 'Nồi trụng dời ra xa kệ tô',    // BẮT BUỘC, một dòng: level này có gì level trước không có (ngoài số khách). Không viết được → cắt level.
}
```

`LEVELS` cũ (10 level) và `DAYS` (21 ngày) **giữ nguyên trong config** cho tests/par cũ nhưng **không dùng trong UI** nữa (có thể xoá `DAYS` sau khi world chạy ổn; ghi CHANGELOG).

## 2. Bậc thang World 1 — Phở (Kent duyệt; L1 có trụng sợi 1 lần)

Nguyên tắc (mục 2b giải thích): L1–5 học bước; **từ L6 mỗi level phải có một "cái mới" không phải bước công thức**; mốc 5/10/15/20 gộp hai trục. Cột **Cái mới** là bắt buộc — level nào không điền được thì cắt.

| L | title | dishes | simplify | khách / patience / giây | Cái mới (trục) | challenge / goal | unlocks |
|---|---|---|---|---|---|---|---|
| 1 | Tô phở đầu tiên | pho-tai-nam | skipRinse, hotBowl, toppings [nam, bo-tai], noSpoil | 2 / 200 / 120 | học: chạm là đi, trụng, ráp, bưng | | |
| 2 | Đủ topping | pho-tai-nam | skipRinse, hotBowl, noSpoil | 3 / 200 / 140 | học: 5 topping đúng thứ tự | | |
| 3 | Tự trụng tô nóng | pho-tai-nam | skipRinse, noSpoil | 3 / 180 / 150 | học: tô → nồi → tô nóng, trữ trong nồi | | |
| 4 | Nóng → lạnh → nóng | pho-tai-nam | noSpoil | 4 / 170 / 160 | học: đủ bước thật | | |
| 5 | ⭐ Ba khách một lúc | pho-tai-nam | noSpoil | 3 tới t=1,2,3 / 160 | học: 3 rọ song song | challenge rush 3 | |
| 6 | Sợi để lâu hư | pho-tai-nam | — | 5 / 150 / 180 | ràng buộc: bật hư sợi (25 s) | | |
| 7 | Nồi ở xa | pho-tai-nam | — | 5 / 150 / 180 | layout `far-pot`: nồi trụng dời sang góc xa kệ tô → phải gom việc | | |
| 8 | Khách gọi 2 tô | pho-tai-nam | — | 5 (1 pair) / 140 / 180 | sự kiện: khách đôi cùng bàn | | |
| 9 | Một rọ thôi | pho-tai-nam | — | 5 / 150 / 180 | ràng buộc `potSlots: 1` → xếp hàng sợi | goal clean 6 (không lỗi thứ tự) | |
| 10 | ⭐ Đợt trưa + Cậu Hai | pho-tai-nam | — | 6 dồn 0–50 % / 130 | sự kiện: khách quen đầu tiên (bong bóng tên, thoại) + lunch | challenge lunch 6 | regular cau-hai |
| 11 | Phở đặc biệt | pho-dac-biet | — | 3 / 170 / 160 | món mới: bò viên trụng rọ, lá sách | | dish pho-dac-biet |
| 12 | Hai món xen | tai-nam, dac-biet | — | 5 / 150 / 180 | kỹ năng: đọc bong bóng để chọn tô/topping đúng khách | | |
| 13 | Tủ topping bên trái | tai-nam, dac-biet | — | 6 / 140 / 200 | layout `left-topping`: tủ topping đổi bên, thớt đổi theo | | upgrade bowl-stack |
| 14 | Mưa | tai-nam, dac-biet | — | 7 / 130 / 200 | sự kiện `rain` ở 30 %: 40 s không khách rồi 4 người vô dồn | | |
| 15 | ⭐ Chỉ đặc biệt, một tay | pho-dac-biet | — | 5 / 140 / 200 | ràng buộc `handCapacity: 1` + only | challenge only pho-dac-biet | |
| 16 | Phở tái đập | + pho-tai-dap | — | 4 / 160 / 180 | món mới: thớt đập thịt với gừng | | dish pho-tai-dap |
| 17 | Không vứt gì | 3 món | — | 6 / 140 / 200 | goal `no-waste`: sợi hư = thua sao | | upgrade shoes |
| 18 | Phở sườn tái | + pho-suon-tai | — | 4 / 170 / 200 | món mới: lò vi sóng (chờ nền 5 s), tô phụ | | dish pho-suon-tai |
| 19 | Khách VIP đổi ý | 4 món | — | 7 / 130 / 220 | sự kiện `vip` (tip ×3, kiên nhẫn 60 s) + `change-order` ở 60 %: một khách đang chờ đổi món (tô đang ráp giữ lại cho khách sau) | | |
| 20 | ⭐ Boss cuối tuần | 4 món | — | 6 + đoàn 4 ở 60 % / 140 / 240 | layout `island` (quầy ráp giữa sàn, khách vây 2 bên) + boss | challenge boss 4 | world bun-rieu |

### 2a. Các world sau — khuôn và độ dài

`makeWorldLevels(world, ladder)` dùng chung; **world chỉ có 1 món → 12 level** (không gượng 20): 4 học bước · 7 biến thiên · 1 boss. World nhiều món (Phở 4, Món khô 5, Hải Phòng 2, Cháo 2, Khai vị 2) → 20 level (Hải Phòng/Cháo/Khai vị: 16). Số sao mở world = 60 % số sao tối đa của world trước, làm tròn xuống 5 (Phở 60★ → 35; world 12 level 36★ → 20).
- Bún riêu (12): L1–2 `soupReady` (nước riêu có sẵn 2 phần trên kệ nước), topping L1 [ca-chua, dau-hu]; L3 dạy nấu cốt → huyết → nước (đúng thứ tự, sai thì card mở lại); L4 đủ bước; L6 `brothCap: 1` (kệ nước chỉ chứa 1 phần → phải nấu đúng nhịp); L8 `far-pot`; L10 Dì Ba + `rain`; L12 boss.
- Bún bò Huế (12): workflow gốc đã `noodle-hot-only` → không skipRinse; L1 topping [thit-luoc, cha-lua], `soupReady`; L3 nấu nước; L5 hai loại nước cùng lúc trên kệ (`stack`) — đây là bài chính của world; L7 `noStack` (lò xong phải lấy ngay); L10 Thím Bảy; L12 boss.
- Hải Phòng (16): bún cá trước, bánh đa cua từ L9; L1–3 `skipPrep` (chả cá/thì là đã cắt sẵn), L4 đủ; L6 `left-topping`; L8 goal clean; L13 Ông Năm; L16 boss.
- Món khô (20): bún chả HN → bún nem/gà (tô khô) → bún đậu → bánh hỏi; L1–3 `skipRinse`; L4 đủ nóng→lạnh→nóng; mẹt/tô khô là "cái mới" tự nhiên mỗi 4 level; L10 Út Mười.
- Cháo (16), Khai vị (16), Chả cá Lã Vọng (12): L1 rút topping/chén; không có sợi nên không skipRinse; Khai vị: chảo chiên (chờ nền 8 s) là bài chính; Chả cá: `assemblyFlexible` → goal `before` (xong trước giờ) thay clean.
Ghi ladder từng world trong `src/data/worlds.js` (tách khỏi config; config chỉ import). Mỗi level trong file phải có `whatsNew`.

### 2b. Bốn trục biến thiên (vì sao & cách hiện thực)

Overcooked lặp lại vài công thức suốt game nhưng không chán vì **cái đổi là bếp và tình huống, không phải công thức**. Công thức cố định để người chơi thấy mình tiến bộ; sự khác biệt đến từ bốn trục sau. Từ L6 mỗi level lấy ít nhất một; mốc 5/10/15/20 lấy hai.

1. **Bố trí bếp** (`layout`) — rẻ nhất vì `KITCHEN_*` đã là data. Thêm `config.KITCHEN_VARIANTS = { default, 'far-pot', 'left-topping', tight, island }`, mỗi biến thể là hàm `(base) => stations đã dời` cho cả landscape và portrait (dời `x/z` của vài trạm; `nav.js` tự tính đường). `island`: quầy ráp ra giữa, ghế khách hai bên; `tight`: mọi trạm sát nhau nhưng thêm vật cản giữa (bàn phụ) → đi vòng. World tạo bằng `kitchenFor(portrait, level.layout)`. View dựng lại theo `world.stations` (đã làm mỗi lần `rebuild()`), không cần code view mới trừ model vật cản (dùng hộp gỗ có sẵn).
2. **Ràng buộc** (`constraints`) — `potSlots` ghi đè `this.pot.noodleSlots` (view đọc `world.pot.noodleSlots` thay `POT.noodleSlots` ở `view.js:220,303`); `handCapacity` ghi đè `CHEF.handCapacity` qua `this.handCap` (world.js dùng `CHEF.handCapacity` ở 3 chỗ → đổi sang `this.handCap`; HUD ẩn ô tay thứ 2); `sinkFar`: dùng layout có bồn ở góc xa (chỉ là layout, gộp vào 1); `brothCap` ghi đè `SOUP.stackMax`; `noStack`: lò xong không tự đẩy sang kệ nước, phải lấy tay (nhánh `s.ready.length < stackMax` trong `updateStations`).
3. **Sự kiện** (`events`, xử lý trong `World.update` theo `time/seconds`): `tour` = đoàn n người tới cùng lúc (đã có qua arrivals `group:'tour'` — chuyển thành event để đặt mốc); `vip` = một khách tipMult 3, patience 60, bong bóng viền vàng; `rain` = xoá arrivals trong 40 s kế rồi dồn chúng vào 10 s sau đó (banner "Mưa — quán vắng… rồi ào vô"); `change-order` = một khách đang chờ (không phải regular) đổi `dish` sang món khác trong menu, bong bóng đổi, toast; tô đang ráp cho khách đó thì `bowl.customer = null` (tô vẫn giữ, giao khách sau cùng món — luật hiện có). Mỗi event có banner + sfx (`audio.js` đã có `chatter`, `bell`).
4. **Mục tiêu** (`goal`, tính trong `World.finish` thay/ngoài tiền): `money` (mặc định: 3 mốc tiền + khách bỏ đi); `clean` = ≥ n tô không lỗi thứ tự → sao theo n×[0.6,0.8,1]; `no-waste` = 0 lỗi `waste` mới có 3★ (1 lỗi 2★, 2 lỗi 1★); `streak` = chuỗi tô đúng liên tiếp dài nhất ≥ n; `before` = phục vụ hết khách trước `seconds` giây (đồng hồ chạy ngược đỏ). Thẻ level ghi rõ mục tiêu bằng chữ; màn kết hiện mục tiêu đạt/không.

Quy tắc kiểm tra chán: khi viết `worlds.js`, đọc dọc cột `whatsNew` của một world — nếu 3 level liên tiếp cùng một trục, đổi trục. Chưa làm ở bản này (ghi để không quên): đầu bếp thứ hai (co-op/AI phụ bếp) — trục lớn nhất của Overcooked nhưng đụng điều khiển chạm-là-đi trên điện thoại; để sau khi World Phở chạy được.

## 3. Cách rút gọn công thức (không đụng sim-data)

Điểm chạm: `src/game/recipes.js` — `recipeFor(dishId)` gọi `transformsFor` + `assemblyFor`. Thêm tham số tuỳ chọn:

```js
export function recipeFor(dishId, simplify = null)
```
- `skipRinse`: trong `transformsFor`, khi có cờ, thay 3 transform noodle-base bằng 1 transform `{ station:'pot', inputs:[noodle], output:`noodle-drained:${noodle}`, action:'blanch-noodle-once', passive:true }` (đúng như workflow `noodle-hot-only`).
- `hotBowl`: bỏ transform `blanch-bowl`; **World** khi tạo item kệ tô cho level có cờ này, `pickFromShelf`/`pickItem` đổi token `bowl` → `bowl-hot:${bowl}` ngay khi lấy (chỗ `c.hand.push(item)` — thêm hàm `World.shelfToken(item)`). View: icon `bowl-hot:*` đã có (`iconUrl` xử lý `bowl-hot:<tô>`).
- `toppings: [...]`: trong `assemblyFor`, lọc bỏ các token là **item topping** (có trong `D.items`, không phải bowl/noodle/broth/`*-ready`) mà không nằm trong danh sách. Giữ thứ tự gốc. `shelfItems` tính lại từ assembly đã lọc → kệ chỉ bày thứ cần (+ `alwaysShow`).
- `noSpoil`: `World` đọc `shift.simplify?.noSpoil` → bỏ nhánh hư sợi trong `updateStations` (dòng `j.hold >= POT.noodleSpoilAfter`).
- `soupReady`: `World` constructor: burner `s.ready` khởi tạo với 2 phần `{ name, output, ... }` của soup món đó (dùng `soupRecipeFor`), và `spawn`/`useBurner` không cho nấu (card lò không mở; toast "Nước đã nấu sẵn hôm nay"). Bot: `brothAvailable` đã đọc `s.ready`.
- `skipPrep`: transforms có `station === 'prep'` bị bỏ, và item đầu vào của chúng khi lấy từ kệ phát thẳng token output (`World.shelfToken`).
- `World` nhận `shift.simplify` → `this.recipes = Object.fromEntries(shift.dishes.map(d => [d, recipeFor(d, shift.simplify)]))`. `par.js` gọi `parFor(shift, kitchen, dish)` → truyền `shift.simplify` để "so với bot" đúng với level.
- **Mọi chế độ Thêm và puzzle gọi `recipeFor(d)` không tham số → công thức đầy đủ. Không sửa.**
- Nhãn UI: thẻ level và hint đầu level: "Bản tập — chưa đủ bước thật (thiếu: xả lạnh, trụng tô…)" lấy từ hàm `simplifyLabel(simplify)`.

## 4. Sao, mở khoá, tiến trình (`src/game/progress.js`)

- `stars[levelId]` như hiện tại (`recordLevel(levelId, result)`).
- `worldStars(worldId)` = tổng sao các level của world. `worldUnlocked(w)` = w là world đầu hoặc `worldStars(worldTrước) >= w.starsToUnlock`. `levelUnlocked(level)` = level 1 hoặc level trước ≥ 1★. `?all` mở hết (dev), `?world=pho&level=5` chọn (dev).
- `currentLevel()` = level đầu tiên chưa ≥1★ trong world đầu tiên chưa hoàn tất.
- Nâng cấp: `UPGRADES[i].unlockDay` → đổi thành `unlockStars` (tổng sao toàn game): bowl-stack 8, burners 20 (mở khi vào world bún riêu), fire 26, seats 14, shoes 32. `modsFor` không đổi. Mặc định lò: `burners: 1` — **World bún riêu L1–2 dùng `soupReady`, L3+ cần lò → đảm bảo 1 lò đủ chơi** (mỗi lần 1 phần).
- Bỏ `currentDay/dayFor/dayUnlocked/unlocksAt` khỏi UI (giữ hàm hoặc xoá + xoá test tương ứng, tuỳ; ưu tiên xoá sạch để không có 2 hệ).

## 5. Khách theo level (`makeLevelArrivals(level)`)

Viết lại từ `makeDayArrivals` (config) thành `src/game/levels.js`:
- Seed theo `level.id` (hash chuỗi → số) để chơi lại thấy giống.
- `count`, `patience`, `seconds` từ level; phân bố: mặc định rải đều trong 5–85 % thời gian với jitter; `challenge.kind === 'rush'` → `count` khách ở t = 1,2,3…; `'lunch'` → dồn 0–50 %; `'only'` → tất cả `dish` cố định; `'boss'` → thêm đoàn `group` người cùng lúc ở 60 % (`group: 'tour'`).
- `pair`: 2 arrival cách 1 s, `group: 'pair'` (World đã hỗ trợ `a.group`).
- Khách quen: `level.regulars` → gán `regular` cho một arrival ở giữa level (World đọc `a.regular`, đã có).
- Món: `dish` cố định cho ~40 % khách khi level có `unlocks.dish` (món mới ra nhiều), còn lại `pickDish()` theo trọng số mastery (đã có).
- `moneyTargets`: `[0.4, 0.6, 0.8] × Σ(giá trung bình × count)` làm tròn 10 (như DAYS).

## 6. UI (`index.html`, `src/main.js`)

- Tab **Quán** → đổi thành màn **Bản đồ**: hàng world (thẻ tròn có icon + tên + `x/60 ★`, khoá nếu chưa đủ sao), dưới là **lưới 20 level** của world đang chọn (ô vuông: số, 0–3 ★, khoá; mốc 5/10/15/20 có viền vàng "⭐ thử thách"; level đang tới có badge "tiếp"). Bấm ô → thẻ chi tiết (title, **`whatsNew`** in đậm, món, "bản tập — thiếu…", mục tiêu bằng chữ từ `goal`, ràng buộc bằng chữ, khách quen) + nút **Chơi**. Vuốt ngang đổi world. Giữ id `btnStart`, `btnBot` (smoke test dùng).
- Màn kết: tiêu đề `Phở 7 — ${title}`; sao rơi, tiền chạy (đã có); thẻ mở khoá dùng `level.unlocks` (dish / regular / upgrade / world); nút **Level tiếp →** (ẩn nếu chưa ≥1★ hoặc hết world → "Sang world ${tên}" nếu đã đủ sao). Câu nhận xét khách quen chỉ khi level có regular.
- Hint đầu level = mô tả bước mới của level (`level.hint`), ví dụ L3: "Hôm nay tự trụng tô: lấy tô ở kệ → bỏ vô nồi → lấy tô nóng ra".
- Tab **Nâng cấp**: hiện "Mở khi đủ N★" thay "Mở bán từ Ngày N". Tab **Thêm**: không đổi.
- Xoá text "Ngày" còn sót (grep `Ngày`, `dayN`, `DAYS`, `currentDay`).

## 7. Bot / par

- `botDecide` không cần đổi (đọc `w.recipes` đã rút gọn). Kiểm tra bot chơi được level có `hotBowl` (bot lấy tô: `bot.js:129` dùng `recipe.bowl` → kệ phát `bowl-hot`, bot phải hiểu tô đã nóng, không đem vào nồi: check `w.recipes[d].transforms.some(t => t.action === 'blanch-bowl')`).
- `par.js`: truyền `simplify` vào World; `parFor` cache key phải gồm level id.

## 8. Thứ tự làm & tiêu chí xong

1. `src/data/worlds.js` (ladder 8 world, mỗi level có `whatsNew`) + `src/game/levels.js` (`makeLevelArrivals`) + `config.WORLDS` + `config.KITCHEN_VARIANTS` — **test**: số level đúng theo mục 2a (Phở 20, Bún riêu 12…), id duy nhất, level 1 mỗi world có `simplify`, từ L4 `simplify` rỗng, từ L6 có ≥1 trong {layout≠default, constraints, events, goal, unlocks.dish}; `whatsNew` không rỗng; arrivals seed ổn định; mọi layout variant dựng `NavGrid` mà mọi trạm đều tới được từ `chefStart` (dùng `nav.reachableFrom`).
1b. Ràng buộc + sự kiện + mục tiêu trong `World` (mục 2b) — **test**: `potSlots:1` → `capacityFor(pot,'noodle') === 1`; `handCapacity:1` → lấy thứ 2 bị từ chối; `rain` dời arrivals đúng; `change-order` đổi dish và gỡ `bowl.customer`; `goal clean/no-waste/streak/before` cho ra sao đúng với result giả lập; bot vẫn chơi hết một level `island` + `potSlots:1` không lỗi.
2. `recipeFor(dish, simplify)` + `World` đọc cờ — **test**: với `skipRinse` chỉ còn 1 transform pot cho sợi; `hotBowl` không có `blanch-bowl` và tay nhận `bowl-hot:pho-bowl` khi lấy tô; `toppings` lọc đúng và giữ thứ tự; `recipeFor(d)` không tham số **bằng y** kết quả cũ (snapshot test cho 18 món để chắc chế độ Thêm không đổi); bot chơi hết Phở L1 phục vụ ≥ 2 khách không lỗi; bot chơi Bún riêu L1 (`soupReady`) không cần lò.
3. `progress.js` sao/mở khoá/nâng cấp theo sao — test.
4. UI bản đồ + thẻ level + kết level; cập nhật `tests/smoke.browser.mjs` (thay các đoạn `?day=` bằng `?world=&level=`; kiểm tra lưới 20 ô, khoá, mở, chơi L1 bằng bot → kết quả có sao; L11 có `pho-dac-biet`).
5. Xoá `DAYS`/`dayFor`… và test `tests/days.test.js` phần ngày (giữ test khách quen & mods, chuyển sang `tests/worlds.test.js`).
6. Docs: CHANGELOG **0.8.0**, STATUS, GAME-DESIGN §1/§5 sửa "ngày" → "world/level" (giữ ý 3 pha cho level ≥ 9 dạng `lunch`), ART-BIBLE không đổi.
7. Build + smoke + deploy (mục 9). Gửi Kent ảnh chụp bản đồ, L1, kết L1.

Định nghĩa "xong": `npx vitest run` xanh; `node tests/smoke.browser.mjs` in `ERRORS none`; Kent mở Pages trên điện thoại thấy bản đồ Phở, chơi L1 xong trong < 2 phút không cần đọc hướng dẫn.

## 9. Lệnh & môi trường

- Máy Kent (Windows): Node + `npx vite`, Python `C:\Python314\python.exe`. Test: `npx vitest run`; smoke: `node tests/smoke.browser.mjs` (Playwright Chromium; trên cloud dùng `/opt/pw-browsers/chromium`).
- Build: `npx vite build`. Artifact một file: `node scripts_single.mjs` → `dist-single/artifact.html` (đăng lên artifact claude.ai id `e35ff289-32a4-41af-9d15-a0a5ea96488a`).
- Git: commit với `-c user.name="Kent Juno" -c user.email="akissforyou.forever@gmail.com"`, `git push origin HEAD` (repo public `kentjuno/quan-bun`). Deploy Pages: `scripts\deploy_pages.cmd` → https://kentjuno.github.io/quan-bun/ . Tăng `VERSION` trong `public/sw.js` (`-v3`) mỗi lần deploy để PWA nhận bản mới.
- Nếu làm từ cloud (Cowork): ghi file lên F: bằng `device_commit_files` (stagedPath dưới `/mnt/user-data/outputs/`, `force:true`); chạy lệnh trên máy Kent qua Blender MCP `execute_blender_code` (subprocess, giới hạn 60 s → dùng thread + file json trạng thái). `device_stage_files` lỗi với PNG (nlink) → chuyển ảnh bằng base64 qua Blender.

## 10. Không làm

- Không sửa `sim-data.js`, `recipes.js` phần đọc dữ liệu gốc, hay bất kỳ số liệu bếp (thời gian thật, định lượng). Không thêm món/topping không có trong sim-data.
- Không đổi luật nấu nước lèo (mỗi lần 1 phần, stack), không đổi quy trình nóng→lạnh→nóng ở level đủ bước.
- Không đụng chế độ Thêm (Survival/Luyện/Rush/Đố/Chém/Phản xạ) ngoài việc đổi tab.
- Không đổi hướng art (C — ký hoạ màu nước, `art/ART-BIBLE.md`); icon mới nếu cần thì theo bible.
- Không viết thoại mới cho khách quen trừ khi Kent yêu cầu; thoại nằm ở `src/data/customers.js` là của Kent.
