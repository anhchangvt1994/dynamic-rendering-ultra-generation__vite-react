# Mini-game v2 — thiết kế

Ngày: 2026-11-11. Nền: `2026-11-11-minigame-platform-design.md` (đã làm xong, commit `d2890b2`).

## Mục tiêu

Nâng cấp game lật thẻ và trang `/mini-game`: hiệu ứng, combo ảnh hưởng exp, nhiệm vụ hằng ngày có streak. Bỏ huy hiệu khỏi mini-game (để dành cho gym). Bổ sung test hồi quy cho 4 trigger trainer XP.

## Ngoài phạm vi

- Bảng xếp hạng (không làm).
- Game mới: Candy Rush (xếp 3 ô giống nhau), ghép hình, xếp khối: spec riêng, làm sau.
- Nhiệm vụ tuần.
- Âm thanh. Giữ rung nhẹ, `prefers-reduced-motion`, chữ tiếng Việt.

## Đã chốt

| Quyết định | Chọn |
|---|---|
| Phạm vi | Hiệu ứng ván + màn kết quả + nhiệm vụ/streak |
| Thưởng nhiệm vụ | Trainer XP + 1 quà túi đồ ngẫu nhiên (tái dùng hàm quà của ván) |
| Nhiệm vụ | 3 nhiệm vụ/ngày chọn ngẫu nhiên theo seed từ danh mục: quiz, nấu ăn, chăm sóc, mini-game |
| Combo | Cộng vào exp ván thắng, server tính từ log lượt |
| Streak | Ngày có nhận ≥ 1 nhiệm vụ thì +1; đủ 7 ngày nhận thêm 1 quà rồi về 0 |
| Huy hiệu | Tắt hẳn trong mini-game; giữ bảng và catalog cho gym |

## 1. Bỏ huy hiệu khỏi mini-game

- `minigame_finish`, `minigame_settle`, `minigame_status` ngừng gọi `trainer_award_badges`.
- Hành động có XP khác (trigger) cũng không cấp huy hiệu qua mini-game.
- UI ẩn mục huy hiệu ở `TrainerCard` và màn kết quả.
- Bảng `trainer_badges`, catalog `badges.mjs` và hàm `trainer_award_badges` giữ nguyên.

## 2. Combo

- `minigame_settle` tính `combo_len` = chuỗi ghép đúng liên tiếp dài nhất trong log lượt.
- Chỉ ván thắng. `combo = min(0.10, 0.02 × (combo_len − 1))` khi `combo_len ≥ 2`, ngược lại 0.
- Exp thắng = `round(base[d] × (1 + 0.05·(b−1)) × (1 + speed + combo))`. Thua không đổi.
- Biên lai thêm `combo_len` và `combo`.
- Client tính cùng công thức trong `combo.mjs` chỉ để hiển thị. Chung bộ test vector với SQL.

## 3. Nhiệm vụ hằng ngày

Bảng `minigame_quests(user_id, day date, slot smallint 1..3, kind text, goal int, progress int, claimed_at timestamptz, gift jsonb)`, khóa chính `(user_id, day, slot)`, RLS chỉ đọc dòng của mình, ghi qua RPC `security definer`.

- Ngày tính theo UTC, như `care_xp_day`.
- Danh mục trong `quests.mjs`, bản SQL cùng giá trị, test so khớp. Mỗi mục: `kind`, `goal`, `xp`, nhãn tiếng Việt. Loại: `quiz_win`, `cook`, `care`, `evolve`, `play`, `win`, `flawless`.
- Chọn 3 loại khác nhau theo `hashtext(user || day)`.
- `quest_bump(user, kind, n)`: tạo 3 dòng hôm nay nếu thiếu; cộng `progress` (trần `goal`) cho dòng khớp `kind`; không có dòng khớp thì no-op; không bao giờ raise.
- Gọi từ 4 trigger XP hiện có (sau `trainer_grant_xp`) và từ `minigame_finish` (`play`, `win`, `flawless`).
- `minigame_status` tạo nhiệm vụ hôm nay và trả về danh sách kèm streak.
- `minigame_quest_claim(slot)`: cấp XP và 1 quà ngẫu nhiên (seed `(user, day, slot)`), ghi `claimed_at` và `gift`. Idempotent: gọi lại trả biên lai cũ. Raise `not_done` nếu chưa xong, `bad_slot` nếu slot sai.

## 4. Streak

Thêm `quest_streak smallint default 0`, `quest_streak_day date` vào `trainer_profiles`.

Khi claim: nếu `quest_streak_day` = hôm nay thì giữ; = hôm qua thì +1; khác thì đặt 1. Đặt `quest_streak_day` = hôm nay. Streak đạt 7: cấp thêm 1 quà, đặt streak về 0. Ngày kế tiếp (lúc đó streak = 0, `quest_streak_day` = hôm qua) sẽ +1 lên 1.

## 5. Thứ tự khóa

Thứ tự toàn cục: Pokémon → care → bag → trainer → quests.

`minigame_quest_claim`: chọn quà và cấp vào bag, khóa `trainer_profiles`, khóa dòng quest `for update` rồi kiểm tra đã xong và chưa nhận; không đạt thì raise (rollback huỷ cả quà). Trigger XP: `trainer_grant_xp` rồi `quest_bump` (trainer → quests).

Plan phải xác minh quiz và kitchen khóa `bag` trước trigger trainer; nếu thứ tự khác thì sửa claim cho khớp. Mở rộng `deadlock.sh` cho claim chạy song song quiz, kitchen, care.

## 6. UI và hiệu ứng

Màu theo Pokémon đã chọn (`--hue`, `--accent`, `--glow`).

**Trong ván (`MiniGameHost`)**
- Ghép đúng: 10 hạt CSS màu `--accent`, bạn đồng hành nhảy, rung 10ms.
- Ghép sai: thẻ lắc 180ms, bạn đồng hành nghiêng, rung 30ms.
- `ComboMeter`: chip `×N` từ chuỗi 2, dòng "+X% exp" dưới chip. Chuỗi ≥ 4: viền sân chơi phát sáng `--glow`, rung `[10,40,10]`. Chuỗi ≥ 6: viền nhịp nhẹ, 16 hạt. Ghép sai: chip mờ dần.
- Nền: ảnh tĩnh Pokémon mờ, phóng to, độ mờ 8% sau bàn chơi.
- `Burst`: lớp hạt dùng chung, tối đa 16, tự gỡ sau 700ms, không canvas.

**Màn kết quả**
1. Pokémon phản ứng. 2. Thanh exp đầy, dòng "Chuỗi dài nhất ×N · +X% exp". 3. `GiftChest`: chạm "Mở quà" (tự mở sau 1.2s). 4. Level-up `mg-levelup`.

**Trang `/mini-game`**: `QuestCard` dưới `TrainerCard`, trên danh sách game. Mỗi dòng có 3 trạng thái: đang làm (thanh tiến độ), xong ("Nhận quà"), đã nhận (✓, mờ). Dải streak 7 chấm, chấm 7 là quà lớn; chấm hôm nay chỉ sáng sau khi nhận ít nhất 1 nhiệm vụ. Guest: thẻ mờ, "Đăng nhập để nhận nhiệm vụ". Ngày mới: các dòng lướt 200ms.

**Reduced-motion:** không hạt, không lắc, chip tĩnh, kết quả và rương hiện ngay, thẻ lật bằng đổi mặt.

**File:** component mới `ComboMeter.tsx`, `Burst.tsx`, `GiftChest.tsx`, `QuestCard.tsx`, hook `useQuests.ts`; logic `combo.mjs`, `quests.mjs`; CSS mới ở `styles.play.tsx`, `styles.quests.tsx`.

## 7. Lỗi và biên

- Qua nửa đêm UTC giữa chừng: bump ghi vào ngày mới. Nhiệm vụ hôm trước vẫn nhận được trong ngày đó nhưng streak tính theo ngày claim.
- Guest và chế độ local/practice không có nhiệm vụ.
- `quest_bump` lỗi dữ liệu không được làm hỏng hành động gốc (quiz, nấu ăn, chăm sóc, tiến hóa).

## 8. Công việc 2B: test hồi quy trainer XP

Cả 4 trigger (`quiz` +5, `cook` +3, `care` +1 tối đa 10/ngày, `evolve` +15) đã chạy từ migration `20261121000000_trainer.sql`; không sửa RPC cũ. Chỉ bổ sung pgTAP cho từng trigger, trần 10 XP/ngày của chăm sóc, và việc ngày mới đặt lại bộ đếm.

## 9. Kiểm thử

- pgTAP: 4 trigger XP; `quest_bump` theo từng loại, kể cả no-op; chọn nhiệm vụ ổn định theo seed; claim idempotent, `not_done`, `bad_slot`; chuyển trạng thái streak (hôm nay, hôm qua, bỏ lỡ, ngày 7); combo với chuỗi 1, 2, 6+ và ván thua; không còn huy hiệu từ mini-game.
- Unit `.mjs`: `combo.mjs`, `quests.mjs` (khớp danh mục SQL).
- Script deadlock: claim song song quiz, kitchen, care.
- Browser QA trong `.superpowers/qa`: combo ×2/×4/×6, rương mở, thẻ nhiệm vụ 3 trạng thái, guest, reduced-motion. Chạy `design-review` trước khi báo xong.
- Tài khoản test: `abc@gmail.com` (local).
