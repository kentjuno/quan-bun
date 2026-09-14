# KẾ HOẠCH — Worlds & Levels (bậc thang Overcooked) cho KJ's Choices

Tài liệu bàn giao cho model/agent thực hiện. Đọc hết trước khi sửa code. Kent (chủ dự án) đã duyệt hướng này ngày 14/09/2026.

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
}
```

`LEVELS` cũ (10 level) và `DAYS` (21 ngày) **giữ nguyên trong config** cho tests/par cũ nhưng **không dùng trong UI** nữa (có thể xoá `DAYS` sau khi world chạy ổn; ghi CHANGELOG).

## 2. Bậc thang World 1 — Phở (Kent duyệt; L1 có trụng sợi 1 lần)

| L | title | dishes | simplify | khách / thời gian | challenge | unlocks |
|---|---|---|---|---|---|---|
| 1 | Tô phở đầu tiên | pho-tai-nam | skipRinse, hotBowl, toppings [nam, bo-tai], noSpoil | 2 khách, patience 200, 120 s | | |
| 2 | Đủ topping | pho-tai-nam | skipRinse, hotBowl, noSpoil | 3 khách, 200, 140 s | | |
| 3 | Tự trụng tô nóng | pho-tai-nam | skipRinse, noSpoil | 3 khách, 180, 150 s | | |
| 4 | Nóng → lạnh → nóng (đủ bước thật) | pho-tai-nam | noSpoil | 4 khách, 170, 160 s | | |
| 5 | ⭐ Ba khách một lúc | pho-tai-nam | noSpoil | 3 khách tới t=1,2,3, 160 | rush 3 | |
| 6 | Sợi để lâu hư | pho-tai-nam | — | 5 khách, 150, 180 s | | |
| 7 | Đông hơn | pho-tai-nam | — | 6 khách, 140, 180 s | | |
| 8 | Khách gọi 2 tô | pho-tai-nam | — | 5 khách, 2 người trong đó `pair` (2 tô), 140 | | |
| 9 | Nhịp trưa | pho-tai-nam | — | 7 khách dồn 0–60 %, 130, 200 s | | |
| 10 | ⭐ Đợt trưa + Cậu Hai | pho-tai-nam | — | 6 khách, 130 | lunch 6 | regular cau-hai |
| 11 | Phở đặc biệt: bò viên, lá sách | pho-dac-biet | — | 3 khách, 170, 160 s | | dish pho-dac-biet |
| 12 | Hai món xen | tai-nam, dac-biet | — | 5 khách, 150, 180 s | | |
| 13 | Đông hơn | tai-nam, dac-biet | — | 7 khách, 140, 200 s | | upgrade bowl-stack |
| 14 | Cậu Hai + cặp | tai-nam, dac-biet | — | 7 khách, 1 cặp, 130 | | |
| 15 | ⭐ Chỉ đặc biệt | pho-dac-biet | — | 5 khách, 140 | only pho-dac-biet | |
| 16 | Phở tái đập: thớt | + pho-tai-dap | — | 4 khách, 160, 180 s | | dish pho-tai-dap |
| 17 | Ba món xen | 3 món | — | 7 khách, 140, 200 s | | upgrade shoes |
| 18 | Phở sườn tái: lò vi sóng | + pho-suon-tai | — | 4 khách, 170, 200 s | | dish pho-suon-tai |
| 19 | Bốn món xen | 4 món | — | 8 khách, 130, 220 s | | |
| 20 | ⭐ Boss cuối tuần | 4 món | — | 6 khách + đoàn 4, 140, 240 s | boss 4 | world bun-rieu |

Các world sau dùng **khuôn 20 level giống nhau** (hàm `makeWorldLevels(world, ladder)`), khác ở món và cờ:
- Bún riêu: L1–2 nước riêu **có sẵn trên lò** (cờ `soupReady: true` — burner đã có 2 phần nước sẵn, không cần nấu), L3 dạy nấu cốt → huyết → nước, L4 đủ bước. Topping rút gọn L1: [ca-chua, dau-hu].
- Bún bò Huế: workflow gốc đã là `noodle-hot-only` → không có skipRinse; rút gọn topping L1: [thit-luoc, cha-lua]; L1–2 `soupReady`.
- Hải Phòng: L1–3 `skipPrep: true` (bước thớt — cắt chả cá, thì là — coi như đã cắt sẵn: kệ phát token `*-ready`), L4 đủ.
- Món khô: L1–3 `skipRinse` (bún trụng 1 lần), L4 đủ (nóng→lạnh→nóng như Kent xác nhận).
- Khai vị / Cháo / Chả cá: L1 rút topping, không có sợi nên không có skipRinse.
Ghi rõ ladder từng world trong `src/data/worlds.js` (tách khỏi config cho dễ sửa; config chỉ import).

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

- Tab **Quán** → đổi thành màn **Bản đồ**: hàng world (thẻ tròn có icon + tên + `x/60 ★`, khoá nếu chưa đủ sao), dưới là **lưới 20 level** của world đang chọn (ô vuông: số, 0–3 ★, khoá; mốc 5/10/15/20 có viền vàng "⭐ thử thách"; level đang tới có badge "tiếp"). Bấm ô → thẻ chi tiết (title, món, "bản tập — thiếu…", mục tiêu, khách quen) + nút **Chơi**. Vuốt ngang đổi world. Giữ id `btnStart`, `btnBot` (smoke test dùng).
- Màn kết: tiêu đề `Phở 7 — ${title}`; sao rơi, tiền chạy (đã có); thẻ mở khoá dùng `level.unlocks` (dish / regular / upgrade / world); nút **Level tiếp →** (ẩn nếu chưa ≥1★ hoặc hết world → "Sang world ${tên}" nếu đã đủ sao). Câu nhận xét khách quen chỉ khi level có regular.
- Hint đầu level = mô tả bước mới của level (`level.hint`), ví dụ L3: "Hôm nay tự trụng tô: lấy tô ở kệ → bỏ vô nồi → lấy tô nóng ra".
- Tab **Nâng cấp**: hiện "Mở khi đủ N★" thay "Mở bán từ Ngày N". Tab **Thêm**: không đổi.
- Xoá text "Ngày" còn sót (grep `Ngày`, `dayN`, `DAYS`, `currentDay`).

## 7. Bot / par

- `botDecide` không cần đổi (đọc `w.recipes` đã rút gọn). Kiểm tra bot chơi được level có `hotBowl` (bot lấy tô: `bot.js:129` dùng `recipe.bowl` → kệ phát `bowl-hot`, bot phải hiểu tô đã nóng, không đem vào nồi: check `w.recipes[d].transforms.some(t => t.action === 'blanch-bowl')`).
- `par.js`: truyền `simplify` vào World; `parFor` cache key phải gồm level id.

## 8. Thứ tự làm & tiêu chí xong

1. `src/data/worlds.js` (ladder 8 world) + `src/game/levels.js` (`makeLevelArrivals`) + `config.WORLDS` — **test**: 8 world × 20 level, id duy nhất, level 1 mỗi world có `simplify`, từ L4 `simplify` rỗng; arrivals seed ổn định; challenge đúng dạng.
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
