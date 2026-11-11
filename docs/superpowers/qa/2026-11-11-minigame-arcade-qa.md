# Mini game arcade: QA (2026-11-11)

Local stack only (dev 5191, local Supabase, seed `abc@gmail.com`).

| Check | Result |
|---|---|
| JS suite (`find src/pages -name '*.test.mjs' \| xargs node --test`) | 774 pass / 0 fail |
| `npx tsc --noEmit -p .` | clean |
| `minigame-shift.mjs` 320/360/390/768/1024/1280/1440/1920, guest + signed-in | ALL PASS, CLS 0 |
| `minigame-candy.mjs` | ALL PASS |
| `minigame-hub.mjs` (signed-in, zero turns, error, reduced motion, carousel swipe/keyboard, spotlight, contrast, targets, focus) | ALL PASS |
| `account-trainer.mjs` (card, avatar persists, team persists, zero-Pokémon message) | ALL PASS |
| pgTAP | only known reds: kitchen #4, build_items #22 |

## Design review (320 / 768 / 1920)
- Visual: marquee, two cabinets, felt, strip read cleanly; no overflow; carousel peeks the next cabinet at 320 with dots.
- UX fixes made during QA: zero-Pokémon team sheet now explains and links to the bag; hub status error shows a message and `Thử lại` inside the fixed strip header; account trainer card shows a loading line while the team list loads.
- Known/deferred: `Nhiệm vụ hằng ngày` truncates with an ellipsis at 320; quest chips fixed 180px on mobile.
