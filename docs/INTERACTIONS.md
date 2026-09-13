# Bảng quyết định tương tác — Quán Bún

Nguyên tắc: **người chơi quyết định, game không đoán ý**. Mỗi lần chạm phải ra đúng một kết quả dự đoán được. Mọi lỗi đều có tag nói rõ sai gì. Không bao giờ mất nguyên liệu vì lỗi.

Ký hiệu: `tay` = danh sách thứ đang cầm (tối đa 2, theo thứ tự cầm). `áp dụng(T)` = thứ trên tay có phép biến đổi tại trạm T (vd. ở nồi: sợi phở → trụng; sợi đã xả → trụng lại; tô → trụng tô; bò viên → trụng bò viên).

## 1. Kệ — chạm một ô nguyên liệu X
Bếp có **kệ sợi, kệ tô và MỘT kệ topping chung** (thịt lẫn rau, như bếp thật). Kệ chỉ bày nguyên liệu các món trong ca + vài thứ gây nhiễu (`alwaysShow`).
| Tay | Kết quả |
|---|---|
| còn chỗ | cầm X — kể cả khi đang cầm X rồi (2 tô cho 2 khách là bình thường); dù X không thuộc món nào — người chơi tự chịu trách nhiệm nhớ |
| đầy (2), có X | trả X về kệ ("Trả lại: X") |
| đầy (2), không có X | toast "Tay đầy (2 thứ) — bấm × ở ô tay để vứt" |

### 1b. Chế độ card (tuỳ chọn thử nghiệm)
Kệ chỉ có tên, 1 ô chạm cả kệ (`shelf-x`, không kèm item). Đầu bếp tới kệ → `chef.waiting = kệ`, UI mở card (danh sách items của kệ). Chọn ≤ chỗ trống trên tay → `pickFromShelf(items)` → lên tay, đi tiếp việc đã xếp. Đóng card = `pickFromShelf([])`. Trong lúc card mở đồng hồ vẫn chạy, đầu bếp đứng yên.

## 2. Nồi trụng / Bồn xả lạnh — chạm trạm
**Nồi (theo bếp thật của Kent):** 3 rọ sợi (chạm được từng rọ: `pot:0..2`) + chồng tô nóng tối đa 5 (`pot:bowl`). Trụng lần 1 và trụng tô đều **chạy nền** — thả rồi đi làm việc khác. Tô nằm trong nước nóng **để bao lâu cũng được**; **sợi chín để lâu (POT.noodleSpoilAfter giây) sẽ hư** → thành "Sợi hư (vứt)", chỉ đem ra thùng rác được, tính là lãng phí (không phải lỗi thứ tự). Chỉ **xả lạnh** (bồn) và **trụng nóng lại** là đứng làm.

Thứ tự xử lý **trong một lần tới trạm**:
1. **Thả tất cả thứ áp dụng được**, không phải chỉ một thứ. Ví dụ tay cầm [tô, sợi] tới nồi → thả sợi vào rọ trống **và** thả tô vào chồng tô (cả hai chạy nền). Thứ **chạy nền** thả trước để nó chạy trong lúc làm thứ đứng làm.
   - Nếu hết chỗ loại đó (3 rọ / 5 tô / bồn 1) → thứ đó giữ trên tay, toast "Nồi trụng đầy".
2. Việc **đứng làm** (trụng lại, xả lạnh) cộng dồn thời gian; xong thì kết quả lên tay.
3. **Lấy đồ đã xong** — chỉ khi lần chạm này **không thả gì vào** (thả xong thì thôi, muốn lấy chạm lại): chạm **thân nồi** → lấy **1 thứ** (sợi ngon trước, rồi tô, sợi hư sau cùng — không vét hết); chạm **đúng rọ** → chỉ lấy rọ đó; chạm **chồng tô** → lấy 1 tô nóng. Việc đứng làm (trụng lại, xả lạnh) xong thì kết quả của **đúng việc đó** lên tay.
4. Nếu không có gì thả và không có gì lấy:
   - chạm rọ trống → "Rọ trống"; rọ chưa chín → thời gian còn lại; chồng tô trống → "Chưa có tô nào trong nồi".
   - tay có sợi hư → toast "Sợi hư — đem vứt thùng rác".
   - tay có thứ thuộc trạm khác → lỗi **"Sai trạm: X phải đem tới T"** (vd. sợi chưa trụng đem tới bồn).
   - tay trống, trạm có đồ chưa xong → toast thời gian còn lại.
   - tay có thứ không liên quan → toast "Nồi trụng: không làm gì với thứ đang cầm".

| Tay | Nồi có | Chạm | Kết quả |
|---|---|---|---|
| [sợi phở] | trống | thân nồi | thả vào rọ 0 (nền 4 s), đi làm việc khác |
| [sợi phở, tô] | trống | thân nồi | thả sợi rọ 0 + tô vào chồng (nền 1.5 s) → tay [] (không tự lấy gì ra) |
| [tô, sợi đã xả] | trống | thân nồi | tô vào chồng (nền) + trụng lại sợi (đứng 1.5 s) → tay [sợi đã ráo]; tô nằm lại trong nồi |
| [] | rọ 0 chín, 3 tô nóng | rọ 0 | tay [sợi đã trụng lần 1] |
| [] | rọ 0 chín, 3 tô nóng | chồng tô | tay [tô đã trụng] (còn 2 tô trong nồi) |
| [] | rọ 0 chín, 3 tô nóng | thân nồi | tay [sợi đã trụng lần 1] (1 thứ) |
| [nạm, bò tái] | sợi xong | bất kỳ | tay đầy → toast "Tay đầy — không lấy được" |
| [] | rọ 1 hư | rọ 1 | tay [Sợi hư (vứt)] → chỉ thùng rác nhận; bỏ vào tô = lỗi "Sợi hư không được cho vào tô" |
| [sợi đã trụng lần 1] | — | thân nồi | lỗi "Sai trạm: … phải đem tới Bồn xả lạnh" (nồi không nhận sợi chưa xả) |
| [nạm] | trống | thân nồi | toast "Nồi trụng: không làm gì với thứ đang cầm" |

Bồn xả lạnh tương tự với một phép duy nhất: sợi đã trụng lần 1 → xả lạnh (đứng 2 s).

## 3. Nước lèo
**Nồi nước phở** (`stove`): có sẵn, chạm → múc (0.6 s) → tay + [Nước phở]. Đang cầm rồi → toast; tay đầy → toast.

**Lò đun** (`burner`, 2 bếp `burner:0/1`, chỉ hiện từ ca có bún riêu / bún bò) — bếp thật: lấy nồi, cho cốt → huyết → nước, đun.
| Bếp lò | Chạm | Kết quả |
|---|---|---|
| trống | bếp lò | đầu bếp đứng lại, card nước lèo mở: bấm nguyên liệu **theo thứ tự cho vào nồi** rồi "Đun". Khớp công thức (sim-data extraStages tới `heat-soup`) → đun nền 6 s. Sai thứ tự → lỗi **"Nước lèo sai thứ tự: Nước riêu cua phải Nước cốt cua → Huyết → Miếng nước trắng"**; sai bộ → lỗi **"Không có nước lèo nào nấu từ: …"**. Đóng × = không nấu. |
| đang đun | bếp lò | toast còn N s |
| đã nóng (còn k phần) | bếp lò | múc (0.6 s) → tay + [Nước riêu cua]; hết `SOUP.servings` (4) phần → bếp trống lại |
Nước lèo là token `broth:<action>` riêng từng loại: chan sai (nước phở vào bún riêu) = lỗi "Không có trong <món>: Nước phở".

## 3b. Nồi nước phở — chạm
| Tay | Kết quả |
|---|---|
| có nước lèo | toast "Đang cầm nước lèo rồi" |
| đầy | toast "Tay đầy" |
| còn chỗ | múc (0.6 s) → tay + [nước lèo] |

## 3c. Thớt (`prep`, 2 thớt `prep:0/1`) — bước cần NHIỀU nguyên liệu
Bếp thật: cắt, đập, lót mẹt, làm chén, múc cháo. Mỗi phép biến đổi có `inputs` (1–4 thứ). Tới thớt với đồ trên tay → từng thứ rơi vào thớt đang cần nó (ưu tiên thớt đã có một phần), hoặc thớt trống. Đủ nguyên liệu → làm (đứng, hoặc nền nếu action passive) → kết quả lên tay (đứng làm xong lấy luôn; nền thì chạm lại lấy). Không thả gì: thớt xong → lấy; thớt thiếu → "còn thiếu …"; thớt trống → "Thớt trống". `bowl-ready` trong sim-data = tô nóng bất kỳ loại (`bowl-hot:*`).

## 3d. Lò vi sóng (`microwave`, 1 chỗ)
Như nồi một ngăn: thả sườn cây → quay nền → chạm lấy "Sườn đã quay nóng" → thớt cắt → nồi ủ ấm.

## 3e. Token nước lèo / cháo
Nồi phở: `broth:pour-pho-broth`. Lò đun: token = output của bước heat-* trong sim-data (`crab-broth-ready`, `bun-bo-broth-ready`, `fish-broth-ready`, `porridge-ready`). Hai món cùng token (bún riêu và bánh đa cua đều ra `crab-broth-ready`) → nồi nào cũng dùng được cho cả hai, nhưng công thức cho vào nồi khác nhau (riêu có huyết, bánh đa không) và game nhận cả hai.

## 4. Quầy ráp — chạm một ô tô i
Ô trống mở bằng **token đầu của chuỗi ráp** (`recipe.opener`): tô nóng đúng loại (phở/bún nước), "Mẹt đã lót giấy" (mẹt), "Tô bún khô" (bún khô), "Phần Level 1 đã xong" (cháo), "Chén mắm tôm + mỡ hành" (chả cá). Cầm sai tô = lỗi "Sai tô"; cầm topping mà chưa có opener = "Ráp sớm: X (chưa có …)". Món có `@finish` (mẹt, tô khô): hết chuỗi = xong, không chan nước.
| Ô i | Tay | Kết quả |
|---|---|---|
| tô xong | còn chỗ | cầm tô lên |
| tô xong | đầy | toast |
| trống | không có tô đã trụng | nếu có thứ thuộc món → lỗi **"Ráp sớm: X (tô chưa trụng)"**, không thì toast "Cần tô đã trụng trước" |
| trống | có tô đã trụng | mở tô cho khách chờ lâu nhất chưa có tô (không có khách → toast) rồi tiếp bước dưới |
| đang làm | bất kỳ | **bỏ vào theo đúng thứ tự** mọi thứ khớp bước kế tiếp (liên tiếp); sau đó, **chỉ khi không bỏ được gì**: thứ thuộc món nhưng chưa tới lượt → lỗi **"Ráp sớm: X — tiếp theo phải là Y"**; thứ không thuộc món → lỗi **"Không có trong <món>: X"**. Có bỏ được → toast "Tiếp theo: Y" (cầm sẵn đồ cho bước sau là bình thường, không phải lỗi); tay trống → toast "Tiếp theo: Y" |

Ví dụ: tô đã có [tô, sợi], tay [bò tái, nạm] → bỏ nạm rồi bò tái (đúng vì game bỏ theo thứ tự công thức, không theo thứ tự cầm), không lỗi. Tay [hành lá, nạm] → bỏ nạm; hành lá còn trên tay → **không lỗi**, toast "Tiếp theo: Bò tái". Tay [hành lá] (không bỏ được gì) → lỗi "Ráp sớm: Hành — tiếp theo phải là Bò tái".

## 5. Quầy giao — chạm
| Tay | Kết quả |
|---|---|
| có tô xong | giao cho khách của tô; nếu khách đó đã đi → giao cho khách khác gọi cùng món; không có → toast "Chưa có khách nào gọi X" (tô giữ trên tay) |
| không có tô | toast "Chưa có tô nào xong" |

## 5b. Thùng rác
| Chạm | Kết quả |
|---|---|
| thân thùng (`trash`) | vứt **tất cả** trên tay (kể cả tô dở) |
| nút × trên ô tay i của HUD (`trash:i`) | đầu bếp đi tới thùng, vứt **riêng** thứ ở ô tay i (chạm × lần nữa = huỷ) |
Không tính lỗi thứ tự; ghi `wasted` + tag "Vứt: …" để xem lãng phí. Tay trống → "Tay trống".

## 5c. Hai ô tay (HUD đáy màn hình)
Luôn hiện 2 thứ đang cầm (tô: tên món + số lớp/tổng, ✓ khi xong). Mỗi ô có nút × để vứt riêng. Đây là nơi nhìn nhanh "tay đang có gì" thay cho nhãn trên đầu nhân vật.

## 6. Khách bỏ đi
Tô đang làm cho khách đó **giữ nguyên** trên quầy (tô không có chủ). Khách mới gọi cùng món tới → tự nhận tô đó.

## 6b. Giai đoạn chuẩn bị
`RULES.prepSeconds` (10 s) trước khi mở cửa: đồng hồ ca chưa chạy, khách chưa tới, nồi và đầu bếp hoạt động bình thường → trụng sẵn tô/sợi. Hết giờ → toast "Mở cửa!", khách bắt đầu tới.

## 7. Hàng đợi việc
Chạm liên tiếp tối đa 3 mục tiêu → làm lần lượt. Chạm lại mục tiêu đang chờ → huỷ. Mục tiêu đang đi tới hiện ▶, mục tiêu chờ hiện số.

## Trường hợp chưa xử lý (ghi để không quên)
- Cầm 2 thứ đều đứng làm ở nồi trong khi nồi đang có 2 việc nền → "Nồi trụng đầy". Nâng cấp nồi thứ 2 sẽ giải quyết.


## 6. Chế độ chơi (0.4.0)
- **Level** (1–9): như "ca" cũ; ≥1★ mở level kế. Kết quả: sao + điểm (tiền + tip + 60/sao mới).
- **Survival**: `SURVIVAL` trong config — `dishes` = đủ 16, `startGap/minGap/gapDecay`, `patience`, `lives`. `World.spawnCustomers` nhánh survival: `nextArrival`, loại khách ngẫu nhiên, chờ ghế trống. Kết thúc khi `left >= lives`. HUD đồng hồ đếm lên ("Đã trụ").
- **Luyện tập**: `practice[]` (lưu `progress.practice`) → drill 8 đơn / rush 3 đơn với `weights` từ mastery.
- **Trang trí**: `DECOR` (id, cost) → `progress.decor[]` → `view.buildDecor(ids, w, d, floor, wall)`; dựng lại khi mua (`rebuild()`).
- **Token sợi theo loại**: `noodle-blanched:bun`, `noodle-rinsed:bun`, `noodle-drained:bun`… `assembly` của món nước = `bowl-hot:<tô>`, `noodle-drained:<sợi>`, …; alias sim-data `dry-bun-*`/`bh-bun-*` → `noodle-*:bun`. `World.transformAt` xếp món khách đang chờ lên trước khi một nguyên liệu có 2 phép biến đổi cùng trạm.

## 7. Kệ nước lèo (0.4.2)
- Lò đun: 2 bếp (`burner:0/1`), mỗi nồi = 1 phần. `updateStations`: nồi xong → `s.ready.push(b)` (tối đa `SOUP.stackMax`), lò trống. Kệ đầy → nồi nằm lại trên lò, chạm lò để cầm.
- `burner:ready` = lấy 1 phần trên kệ; `wantedBroth(s, want)`: ưu tiên token tô đang cầm/tô trên quầy cần kế tiếp, rồi món khách đang chờ, rồi phần trên cùng. `burner:ready.<token>` = đúng loại (bot dùng).
- View: badge số phần ở giữa phía trên lò, nhãn loại (× số) ở mép trước, chồng nồi nhỏ.

## 8. Bố trí 0.4.6
- Không còn `serve`: `interact` case `seat` → `serve(s)`. Bot/par: đích = `cu.seat.station.id` (bàn của khách).
- `prep.onTable = 'shelf-topping'`: trạm thớt trùng vị trí/kích cỡ với tủ topping; view vẽ 2 tấm thớt trên dải trắng phía trước, hitbox `prep:i` ở đó; hitbox card của kệ chỉ nửa sau. Nav bỏ vật cản của thớt.
- Tủ topping = `buildPrepTable` (khối three.js): item sprite nằm đúng ô khay 2 hàng.

## 9. Đố (0.5.0)
- `Puzzle` (src/puzzle.js) chạy trên overlay `#puzzle`, không cần World. `solution()` trả nhãn cần bấm (test). `finish()` → result cùng dạng ca bếp (`puzzle: true`, `stats.bowls`) → `showResult` (ẩn cột bot) → `recordResult` + `recordPlay`.
