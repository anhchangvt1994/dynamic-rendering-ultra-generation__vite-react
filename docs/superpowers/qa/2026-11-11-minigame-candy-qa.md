# Candy Rush QA (2026-11-11, local stack only)

## What ran
- `node --test` on `src/pages/MiniGamePage` (engine, vectors, SQL parity, client, practice, moves).
- pgTAP `minigame_candy.test.sql` (85 tests) + `npx supabase test db`.
- `bash supabase/tests/deadlock-minigame.sh`: candy `minigame_finish` in parallel with claim, quiz/kitchen (bag→trainer) holders and a memory settle; 3 runs, no 40P01.
- `node .superpowers/qa/minigame-candy.mjs` (puppeteer, dev 5191, caches cleared and server restarted): ALL PASS.
  Covers: card on the page with its own 3 turns; round opens on server; score/moves row; 42 cells ≥ 44px at 390 and 1280; no horizontal scroll; cell labels; invalid move shakes and is not counted; reload mid-round restores score and moves (sessionStorage replay); win via vector → combo chip, chest, round `won`; out of moves → "Hết nước đi rồi" + score/moves, round `lost`; reduced motion applies a move with no pop/drop phases; clock expiring while a cascade animates ends cleanly; guest practice (no reward text); no console/network errors.
- Screenshots: `.superpowers/qa/shots/candy-*.png`.

## Design review
- Board, score bar and moves read clearly at 390px; result screen shows score/moves and out-of-moves copy.
- Fixed: result said "Hết giờ rồi" after running out of moves → now "Hết nước đi rồi"; added a first-move hint ("Chạm hai ô kề nhau hoặc vuốt để đổi chỗ.").

## Known limits (spec §4)
- The client simulates; the server only replays on finish, so an invalid list is rejected at the end, not per move.
- Moves are kept in sessionStorage; clearing it mid-round loses the replay and the board restarts from the layout (server still validates).
- Tape of 1000 values wraps; very long chains never run out.
- Known flaky pgTAP reds elsewhere: kitchen 4, build_items 22, moveset 8.
