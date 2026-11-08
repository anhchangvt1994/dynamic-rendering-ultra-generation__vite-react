# Tiến hoá Pokémon — thiết kế

Ngày: 2026-11-09 · Tiếp nối `2026-11-08-pokemon-build-design.md` (mục “Task kế tiếp”). Phạm vi: dữ liệu + RPC tiến hoá, UI dùng chung (badge, dialog, hiệu ứng), tích hợp ở `/pokemon-cua-toi/<id>` và túi đồ. Đội hình/địa điểm (battle) **chưa làm**, chỉ chừa `context`.

## Mục tiêu
Một cá thể đủ điều kiện thì tiến hoá: **server tự đánh giá và kiểm tra**, client chỉ gửi `operation_id` + nhánh đã chọn. Hiệu ứng và dialog dùng được ở mọi trang (hiện tại: hồ sơ cá thể, túi đồ; sau này: chọn vùng đấu NPC, sắp xếp đội hình).

## Quyết định đã chốt
- **Phương thức hỗ trợ:** cấp, thân thiết/thân thiện (affection)/vẻ đẹp, vật phẩm, chiêu, chỉ số, thời điểm trong ngày, địa điểm, đồng đội, giới tính. **Không** làm: tiến hoá theo sự kiện trận đấu, đếm bước chân (hạt giống có sẵn nhưng hiện “chưa khả dụng”, mờ).
- **Thay thế tiến hoá trao đổi:** trao đổi thường → vật phẩm *Linking Cord*; trao đổi kèm vật cầm → dùng thẳng vật phẩm đó lên cá thể; trao đổi với loài khác → sở hữu loài đó hoặc dùng vật phẩm riêng. Ô vật phẩm cầm **hoãn** (YAGNI), dữ liệu để mở rộng.
- **Kích hoạt (lai):**
  - nhánh theo **cấp / affection / vẻ đẹp**: hiện badge, bấm → dialog xác nhận, có “Để sau”;
  - nhánh theo **vật phẩm**: dùng vật phẩm là xác nhận, tiến hoá ngay, không dialog;
  - chỉ hỏi chọn nhánh khi **từ 2 nhánh** đủ điều kiện (nếu 1 nhánh: chọn sẵn; vật phẩm hợp ≥2 dạng thì hỏi).
- **Bộ sưu tập:** loài mới được ghi nhận, loài cũ **giữ nguyên** trong bộ sưu tập. Lần đầu tiến hoá ra loài X hiện huy hiệu “Lần đầu tiến hoá thành X!”.

## Luật giữ nguyên / đổi khi tiến hoá
Khoá theo `individual_id` (xem spec build): **giữ** IV, EV (suy ra từ care), exp, bộ chiêu (đã lưu), `appearance`, nickname, shiny/gen suy ra từ id.
**Đổi:** `pokemon_individuals.pokemon_id` (hết bất biến, chỉ đổi qua RPC tiến hoá), base stats, đặc tính, learnset.
- **Đặc tính:** `pokemon_build_genes` đã suy ra theo `(id, loài)`; chuyển loài thì tính lại theo slot (cùng hidden/regular, cùng chỉ số ô, quy về `% n` mới). Không lưu thêm.
- **Chiêu:** chiêu đã lưu mà loài mới không còn trong learnset thì bị bỏ khỏi ô (ô trống); chiêu level-up/máy vẫn theo luật cũ trên learnset mới. Bộ mặc định tính theo loài mới.
- **Giới tính:** suy ra từ id + `gender_rate` mới; đổi nếu `gender_rate` đổi (chấp nhận).
- **Cấp:** cap theo sao không đổi; level tính lại với đường cong tăng trưởng loài mới (có thể đổi nhẹ; không bao giờ tụt dưới cấp đã đạt nhờ `bonus_exp` — nếu tụt, nâng `bonus_exp` bù, ghi vào biên nhận).
- **affection ↔ thân thiết:** `min_happiness` của PokéAPI quy bằng ngưỡng affection: 220 → 220 (giữ nguyên số PokéAPI); `min_affection` / `min_beauty` dùng `pokemon_care.affection` / `pokemon_care.beauty` trực tiếp.

## Dữ liệu mới
- `pokemon_evolutions(from_species, to_species, branch_id, trigger, min_level, item, min_affection, min_beauty, time_of_day, known_move, known_move_type, min_stat_rel, gender, location, party_species, party_type, needs_battle, needs_steps, …)` — seed từ PokéAPI một lần (đọc công khai). Cột ngoài danh sách hỗ trợ lưu nhưng không được đánh giá (điều kiện không khả dụng).
- `pokemon_dex(user_id, pokemon_id, first_at, via)` — loài đã ghi nhận; backfill từ `pokemon_individuals` hiện có; RPC tiến hoá `upsert` loài mới.
- `pokemon_evolution_log(user_id, operation_id, individual_id, from_species, to_species, branch_id, receipt jsonb, created_at)` — idempotency + nguồn cho huy hiệu lần đầu.
- Vật phẩm mới trong `quiz_items` nhóm `evo`: *Linking Cord* và các vật phẩm thay trao đổi cần thiết.
- RLS “read own”, mọi ghi qua RPC `security definer`, thu hồi quyền ghi trực tiếp (như các bảng build).

## RPC
- `pokemon_evolution_options(p_individual, p_context jsonb default '{}') → jsonb`: danh sách nhánh `{branch, to, eligible, kind: level|friend|beauty|item|…, reasons[{ok,text}], progress?}` — lý do tiếng Việt, kèm tiến độ (ví dụ “Cần cấp 16, đang Lv 12”). `p_context = {where, party, time}`; trang cá thể truyền `{}`, thời gian lấy từ server.
- `pokemon_evolve(p_op, p_individual, p_branch, p_context jsonb default '{}', p_item text default null) → jsonb`: kiểm tra lại toàn bộ điều kiện, trừ vật phẩm trong `bag` (nếu nhánh vật phẩm), đổi `pokemon_id`, áp luật ở trên, ghi `pokemon_dex`, `pokemon_evolution_log`; trả `{from, to, first, buildDiff, receipt}`. Idempotent theo `operation_id`. Nhánh không đủ điều kiện → lỗi mã có lý do.
- Rare Candy: nếu cấp mới đạt đủ điều kiện cấp thì vẫn **chỉ hiện badge** (không tự tiến hoá).
- Tham số `context` do client gửi chỉ dùng cho điều kiện địa điểm/đội hình; các điều kiện dựa trên dữ liệu server (cấp, affection, giờ) không tin client.

## Client
`src/pages/MyPokemonPage/evolution/` (module dùng chung, không phụ thuộc trang):
- `client.mjs` + `useEvolution(individualId)` theo mẫu `build/` và `care/`: nạp options, trả `{options, evolve(branch, item?)}`.
- `EvolveBadge` — nhãn trên thẻ cá thể.
- `EvolveDialog` — app-level, có **hàng đợi** như welcome-dialog (mở từ bất kỳ trang).
- `EvolveFx` — toàn bộ hiệu ứng, nhận `{fromSprite, toSprite, toType, diff, first}`.
- Hồ sơ cá thể: khối “Tiến hoá” liệt kê nhánh chưa đủ điều kiện (thanh tiến độ, lý do), không badge/dialog. Túi đồ: nút “Dùng” trên đá → chạy `EvolveFx` ngay.
- Chế độ `local` (dev) và khách: ẩn, ghi chú cần đăng nhập. Mọi vùng cuộn dùng `scrollbar-width: none` + `::-webkit-scrollbar{display:none}`. Vừa 320px, tôn trọng reduced-motion.

## UI / hiệu ứng (đã duyệt qua mockup)
### Dialog chọn nhánh (hướng C “bong bóng nhánh”)
Cùng một khung, nội dung đổi theo số nhánh (mockup `dialog-c-cases`):
1. **Một nhánh**: một bong bóng lớn đập nhịp, nút “Tiến hoá” + “Để sau”.
2. **≥2 nhánh đủ điều kiện**: bong bóng nhỏ quanh cá thể; chọn một; nút đổi tên “Tiến hoá thành X”. Xếp vị trí để **không đè** sprite giữa.
3. **Nhiều nhánh nhưng 1 đủ**: nhánh đủ được chọn sẵn; nhánh khác nhỏ, mờ, viền đứt, kèm lý do ✓/✕.
4. **Chưa đủ**: không badge, không dialog; chỉ thanh tiến độ ở hồ sơ.
5. **Vật phẩm**: không dialog.

### Hiệu ứng tiến hoá (12 s, đã duyệt `fx-combined-water`)
1. vòng hệ hiện và xoay; 2. tia quét hologram: dạng cũ tan thành bóng trắng; 3. phát sáng + sóng nước (`feTurbulence` + `feDisplacementMap` như `QuizPage/Veil.tsx`, scale 46·k, vòng sóng đồng tâm); 4. vòng co lại, loé, tia + mảnh; 5. dạng mới bật ra, vòng tái tạo theo màu hệ mới, sóng lắng; 6. dạng mới trượt trái, trang Field Notes lật ra, dấu “ĐÃ GHI NHẬN”, +HP/+Atk/+Spe (từ `buildDiff`), huy hiệu “Lần đầu tiến hoá thành X!” khi `first`.
- Reduced-motion: sóng tĩnh, không noise chuyển động, không nháy.

### Nhấp nháy ánh sáng trước tiến hoá
- **Trong màn tiến hoá (0–3 s, trước bước 1):** nền tối phủ dần (0,8 s), rồi sprite nháy trắng-rồi-trả-màu với tần số tăng 2 → 12 Hz, rung nhẹ, thanh năng lượng đầy; sau đó trắng giữ lại và vòng hệ hiện. Lớp tối rút đi khi kết thúc.
- **Trên thẻ cá thể đủ điều kiện (trang nền sáng):** ánh sáng trắng không hiện trên nền sáng, nên dùng **đĩa xanh đêm** “mở ống kính” sau sprite (sprite trắng lên trong đĩa), viền hào quang xanh bão hoà bên ngoài, sao xanh/vàng có viền tối. Nhịp thở chậm, mỗi 4 s loé hai nhịp. Không chặn thao tác.
- Reduced-motion: sáng tĩnh ở mức thở, không loé, không sao.

## Kiểm thử
- pgTAP: từng loại điều kiện (đủ/thiếu), chọn nhánh, idempotent theo `operation_id`, từ chối nhánh không đủ, trừ vật phẩm một lần, `pokemon_dex` + `first`, giữ IV/exp/chiêu, chiêu bị bỏ khi không còn trong learnset, level không tụt.
- Mjs: bản sao luật đánh giá phía client (nếu có) kiểm parity với SQL như `sqlParity.test.mjs`; `format` cho lý do/tiến độ; hàng đợi dialog.
- E2E (`.superpowers/qa`): 320 và 1280 px — badge, dialog 1 nhánh, nhiều nhánh, vật phẩm; chạy hiệu ứng tới “ĐÃ GHI NHẬN”; reduced-motion.

## Ngoài phạm vi
Tiến hoá theo sự kiện trận đấu/bước chân, ô vật phẩm cầm, màn chọn vùng/đội hình (chỉ chừa `context`), tiến hoá ngược, huỷ tiến hoá (đã nêu “không đảo ngược”).

## Điểm cần bạn xem lại
- Ngưỡng quy đổi thân thiết → affection (giữ số PokéAPI) và danh sách vật phẩm thay trao đổi.
- Level có thể đổi khi đổi đường cong tăng trưởng; spec chọn “không tụt, bù `bonus_exp`”.
- Giới tính có thể đổi theo `gender_rate` mới.
