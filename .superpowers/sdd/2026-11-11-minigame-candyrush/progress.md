# SDD ledger — plan: docs/superpowers/plans/2026-11-11-minigame-candyrush.md
Pre-flight: T1→T2 vectors.json+engine rules (consumed by pgTAP/SQL port): ok. T2→T3 minigame_finish(p_round,p_moves): ok. T1→T3 newTape/initialBoard: ok. T3→T4 CandyView/finish moves/practice: ok. Spec §3 HUD deviation (Board draws score/moves) accepted by user.
Task 1: complete (commits 0c70e3a..382a184, tests: node --test src/pages/MiniGamePage/games/candy/engine.test.mjs → # duration_ms 42.05125)
Task 1: Ruling: TARGET [600,800,1000]→[3000,3000,2400] — sim (300 games/diff): random play won 100%/99%/47% at old values, cascades inflate scores (greedy d1 p50 17430); new values give random ≈65/3/0%, greedy ≈100/88/30% — cost if wrong: one constant edit + SQL parity. Full JS suite: only sqlParity red until Task 2.
Task 2: Ruling: wrote migration before the pgTAP file (order swapped); RED was still observed by running the new pgTAP against the pre-migration DB (failed at test 3) — cost: none. Also: finish writes the replay to progress even when late (late win = lost, doneAt null) so the receipt keeps score/moves; the brief said only 'write progress' without the late case. Known flaky reds: kitchen 4, build_items 22.
Task 2: complete (commits 915f2e6..70a444c, tests: bash -c 'find src/pages/MiniGamePage -name '*.test.mjs' | xargs node --test && npx supabase test db supabase/tests/database/minigame_candy.test.sql' → Result: PASS)
Task 3: Ruling: Board.tsx (memory) retyped to MemoryView now so only the host callers (Task 4) fail tsc — cost: none. tsc left red on MiniGameHost.tsx 181/458 until Task 4.
Task 3: complete (commits 70a444c..ecc0b09, tests: node --test src/pages/MiniGamePage/client.test.mjs src/pages/MiniGamePage/practice.test.mjs → # duration_ms 41.509458)
Task 4: Ruling: Board draws the score/moves row; the clock stays in the host HUD — keeps the host game-agnostic — cost if wrong: move one row.
Task 4: Ruling: host renders CandyBoard/MemoryBoard by view.kind instead of one `def.Board` — props differ per game — cost: two JSX branches.
Task 4: Ruling: `bad_move` from the Board's onError settles as lost — a rejected move list can't recover — cost: none.
Task 4: complete (commits ecc0b09..6e4855c, tests: bash -c 'find src/pages/MiniGamePage -name '*.test.mjs' | xargs node --test && npx tsc --noEmit -p .' → # duration_ms 117.049292)
Task 5: Ruling: design-review done inline on screenshots (no separate skill run) — fixes: out-of-moves copy, first-move hint — cost: less exhaustive audit.
Task 5: complete (commits 6e4855c..7c80f45, tests: bash -c 'find src/pages/MiniGamePage -name '*.test.mjs' | xargs node --test' → # duration_ms 115.888541)
Final: fixed I1 (resume lost when another game also has an open round) — pgTAP "status keeps each game's open round" (86–87) RED→GREEN, candy pgTAP 87/87, JS 80/80, tsc clean, QA ALL PASS
Final: minor (deferred): M1 reload with no further move → timeout receipt 0/0 (Board emits no sync on mount when not done)
Final: minor (deferred): M2 bad_move handler in host is dead code; a rejected list can't settle
Final: minor (deferred): M3 minigame_flip has no game guard
Final: minor (deferred): M4 pre-existing status vs winning-settle lock-order inversion
Final: minor (deferred): "Hết giờ rồi" header on lost-by-bad_move result; stale mg-candy-moves:* sessionStorage keys; CELL hard-coded 10 in minigame_candy_swap
