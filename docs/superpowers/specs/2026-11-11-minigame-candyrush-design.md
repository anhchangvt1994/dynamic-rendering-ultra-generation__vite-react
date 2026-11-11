# Candy Rush — thiết kế

Ngày: 2026-11-11. Nền: `2026-11-11-minigame-platform-design.md` và `2026-11-11-minigame-v2-design.md` (đã xong). Game thứ hai của mini game, sau lật thẻ.

## Mục tiêu

Thêm game xếp 3 ô giống nhau (hoán đổi ô kề nhau) vào nền tảng mini game. Dùng lại lượt, exp, bond, combo, rương quà, care cost, XP trainer và nhiệm vụ hằng ngày.

## Ngoài phạm vi

- Ghép hình, xếp khối: spec riêng, làm sau.
- Ô đặc biệt (sọc, bom), chướng ngại, màn có mục tiêu riêng.
- Bảng xếp hạng. Âm thanh.
- Lưu ván trên server giữa chừng: tải lại trang chỉ khôi phục từ `sessionStorage` (xem "Giới hạn").

## Đã chốt

| Quyết định | Chọn |
|---|---|
| Cơ chế | Hoán đổi 2 ô kề nhau, hàng/cột ≥ 3 thì nổ, ô rơi, dây chuyền |
| Chống gian lận | Client mô phỏng, server replay danh sách nước đi khi kết thúc |
| Kẹo | Sprite item/berry của bag |
| Combo | Tầng dây chuyền sâu nhất trong 1 nước, cùng công thức v2 |
| Số lượt | Bộ 3 lượt / 2 giờ riêng cho `candy` (nền tảng đã tách theo game) |

## 1. Luật (`games/candy/rules.mjs`, song song với SQL)

Hằng số `MINIGAME.CANDY`:

| Hằng | Giá trị |
|---|---|
| `COLS`, `ROWS` | 6, 7 |
| `KINDS` theo độ khó 1/2/3 | 4, 5, 6 loại kẹo |
| `MOVES` | 20, 18, 16 |
| `TARGET` | 600, 800, 1000 điểm |
| `CELL` | 10 điểm cơ bản mỗi ô |
| `TAPE` | 1000 giá trị |
| `FLAWLESS_LEFT` | 0.25 (thắng còn ≥ 25% nước đi) |

Thời gian dùng `DURATION_S` (300 giây) và `TOLERANCE_S` như lật thẻ.

Ô đánh số `row * COLS + col`, hàng 0 ở trên. Nước đi là `[a, b]`, hai chỉ số kề nhau (cùng hàng cách 1 cột, hoặc cùng cột cách 1 hàng).

**Băng kẹo:** dãy `TAPE` số nguyên trong `0..KINDS-1`, sinh từ seed bằng `md5(seed || ':t:' || i)` (cùng cách `minigame_layout_memory`). Chỉ số băng quay vòng theo `TAPE` khi dùng hết.

**Lưới đầu:** duyệt ô theo thứ tự hàng rồi cột, lấy giá trị kế tiếp trên băng; nếu giá trị đó tạo hàng/cột 3 ô giống nhau với 2 ô đã đặt bên trái hoặc phía trên thì bỏ giá trị đó, lấy giá trị kế. Sau khi đặt xong, nếu lưới không có nước đi hợp lệ nào thì sinh lại toàn bộ từ vị trí băng hiện tại.

**Một nước đi:**
1. Hoán đổi `a` và `b`. Không tạo được hàng/cột ≥ 3 thì nước đi không hợp lệ (không đổi trạng thái, không tính nước).
2. Tầng `d = 1, 2, …`: gom mọi ô thuộc hàng hoặc cột ≥ 3 ô cùng loại (hợp các đoạn), xoá, cộng `CELL × d` cho mỗi ô xoá.
3. Trọng lực: mỗi cột, ô còn lại rơi xuống đáy. Ô trống ở đầu cột được lấp bằng giá trị kế tiếp của băng, duyệt cột từ trái sang phải, trong cột từ ô trống thấp nhất lên trên.
4. Lặp bước 2–3 đến khi không còn đoạn nào. `comboLen` của nước = số tầng.
5. Sau nước, nếu lưới không còn nước đi hợp lệ thì sinh lại như lưới đầu (từ vị trí băng hiện tại), không tốn nước đi.

**Kết cục:** thắng khi tổng điểm ≥ `TARGET[d]` trong số nước cho phép; ngay khi đạt thì kết thúc. Hết nước mà chưa đạt hoặc hết giờ là thua.

**Combo:** `combo_len` = `comboLen` lớn nhất của các nước; `combo = min(0.10, 0.02 × (combo_len − 1))` khi `combo_len ≥ 2` và chỉ khi thắng (như v2).

**Flawless (nhiệm vụ):** thắng với số nước còn lại ≥ `ceil(FLAWLESS_LEFT × MOVES[d])`.

## 2. Server

`minigame_rounds` giữ `layout = {tape, board}` (như lật thẻ, cột `layout` không đọc được trực tiếp). Hàm xem của vòng (`minigame_view`) cho candy trả `board` và `tape` cho chính người chơi: client cần chúng để mô phỏng; server vẫn replay nên không tin client.

- `minigame_start('candy', individual, difficulty)`: giống lật thẻ (chủ sở hữu, hunger, cửa sổ lượt, advisory lock); sinh seed, băng, lưới đầu bằng `minigame_layout_candy(seed, difficulty)`.
- `minigame_finish(round, moves jsonb)`: tham số `moves` (mảng `[a,b]`) chỉ dùng cho candy; lật thẻ gọi như cũ. Chạy lại luật trong SQL từng nước:
  - nước không hợp lệ hoặc quá `MOVES[d]`: lỗi `bad_move`;
  - đã đạt mục tiêu giữa chừng mà còn nước thừa: lỗi `bad_move`;
  - đạt mục tiêu: thắng; hết nước mà chưa đạt: thua; còn nước, còn giờ, chưa đạt: `not_finished`; quá `deadline + TOLERANCE_S`: thua.
  - Kết quả (`score`, `moves`, `comboLen`, `movesLeft`, `flawless`) ghi vào `progress`, rồi gọi `minigame_settle`.
- `minigame_settle` đọc `progress` theo game: điều kiện thắng, `best` combo, cờ flawless. exp, bond, speed (`doneAt` = lúc `finish` được gọi, client gọi ngay khi đạt mục tiêu), rương, care cost, XP trainer, `minigame_players.wins`, `quest_bump` (`play`, `win`, `flawless`) dùng chung.
- `minigame_expire` với vòng candy quá hạn: thua (không có danh sách nước đi).
- `minigame_status` thêm `candy` vào `games` (lượt, giờ hồi, `wins`).
- Khoá: giữ thứ tự Pokémon → care → bag → trainer → quests; `finish` replay chỉ đọc `layout`, không thêm khoá.

Biên lai thêm `score`, `moves`.

## 3. Client (`src/pages/MiniGamePage/`)

- `games/candy/engine.mjs`: luật thuần (cùng thuật toán SQL): `initialBoard(tape, kinds)`, `trySwap(state, a, b)` trả trạng thái mới + `{cleared, score, depth}`, `hasMove`, `moveCount`. Chung bộ test vector với pgTAP.
- `games/candy/Board.tsx`: chạm 2 ô kề nhau hoặc vuốt; ô sai thì rung nhẹ; nổ/rơi bằng CSS (transform, không canvas); reduced-motion đổi chỗ tức thì, không hạt. Dùng `Burst` khi nổ, `ComboMeter` theo `comboLen` (tầng ≥ 2), `GiftChest` ở màn kết quả.
- Host (`MiniGameHost`): đăng ký game theo `GAMES`; HUD hiện điểm / mục tiêu, nước còn lại, đồng hồ; khi thắng gọi `finish` ngay.
- Khách chưa đăng nhập: practice cục bộ (băng sinh bằng PRNG client), không thưởng, như lật thẻ.
- `/mini-game`: thêm thẻ game Candy Rush. SEO description không đổi ngoài tên game.
- Chữ tiếng Việt, rung nhẹ như lật thẻ, màu theo Pokémon (`--accent`, `--glow`).

## 4. Giới hạn đã chấp nhận

- **Nhìn trước băng, giải offline:** vì client mô phỏng nên người chơi có thể dùng bot/giải thử nhiều lần trước khi gửi danh sách nước đi. Server vẫn chặn điểm giả, nước sai và quá nước. Rủi ro thực tế là thưởng nhiều hơn mong muốn; được hạn chế bởi 3 lượt / 2 giờ và thưởng nhỏ. Nếu cần chặt hơn: trả kẹo từng nước (`minigame_move`) ở bản sau.
- **Tải lại giữa ván:** client lưu danh sách nước vào `sessionStorage` theo id vòng; mất thì ván tiếp tục từ lưới đầu với 0 nước (server chỉ tính nước gửi lên, không gây lợi). Hết giờ vẫn tính từ `deadline` của server.

## 5. Kiểm thử

- Unit `engine.test.mjs`: nước hợp lệ/không hợp lệ, hàng và cột, giao nhau (chữ L, chữ T), rơi và lấp băng, dây chuyền nhiều tầng, điểm `CELL × d`, lưới đầu không có đoạn 3, tạo lại khi hết nước đi, băng quay vòng.
- `sqlParity.test.mjs`: `MINIGAME.CANDY` bằng khối `minigame_rules()` mới.
- pgTAP `minigame_candy.test.sql`: vector chung (seed → lưới đầu, một chuỗi nước → điểm và `comboLen` bằng JS); `bad_move` (không kề, không tạo hàng, quá nước, nước thừa sau khi thắng); thắng, thua hết nước, `not_finished`, thua quá giờ; flawless; combo; replay lần hai trả biên lai cũ; chủ sở hữu, hunger, lượt riêng theo game; `quest_bump` `play`/`win`/`flawless`.
- `deadlock-minigame.sh` bổ sung finish candy song song claim, quiz, kitchen, care.
- QA browser (`.superpowers/qa`): chơi một ván thắng bằng bộ giải đơn giản, combo, rương, thua hết nước, reduced-motion, khách practice, 390 và 1280. Chạy `design-review` trước khi báo xong.
- Tài khoản test: `abc@gmail.com` (local).
