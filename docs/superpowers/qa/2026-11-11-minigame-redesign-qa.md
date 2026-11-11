# Mini game redesign QA (2026-11-11)

Local only: dev server 5191, local Supabase, seed account `abc@gmail.com`.

## What ran
| Check | Command | Result |
|---|---|---|
| JS unit | `find src/pages/MiniGamePage -name '*.test.mjs' \| xargs node --test` | 105/105 |
| Types | `npx tsc --noEmit -p .` | clean |
| Zero-shift gate | `node .superpowers/qa/minigame-shift.mjs` (320–1920, guest + signed-in) | ALL PASS, CLS 0.000, skeleton vs loaded rects ≤1px |
| Candy round | `node .superpowers/qa/minigame-candy.mjs` | ALL PASS (win, out of moves, time out, reduced motion, guest) |
| QC matrix | `node .superpowers/qa/minigame-hub.mjs` | ALL PASS |
| pgTAP | `npx supabase test db` | only known reds: kitchen #4, build_items #22 |

## QC matrix
Widths 320, 360, 390, 768, 1024, 1280, 1440, 1920 × states guest, signed-in, zero-turns, resume, no-pokemon, error, reduced-motion.
Per run: no horizontal overflow, no region overflow, tap targets ≥44px, text contrast (pixel-sampled, ≥4.5:1 body / ≥3:1 large), Tab reaches every control with visible focus, no console/page/network errors.
Extra: reduced-motion leaves no running decorative animation and no opacity-0 content; hidden tab sets `data-paused`; open round resumes after reload.

## Findings fixed
- Holo card line "48/113 điểm, n Pokémon" 3.4–4.4:1 → full-white text and softer foil glare (≥4.5:1).
- QA tooling: contrast sampler uses rendered pixels (gradients/blend), samples centre of tilted boxes.

## Screenshots
`.superpowers/qa/shots/`: `hub-<state>-<width>.png`, `t4-<width>-<state>[-skel].png`, `sheet-<WxH>-<phase>.png` (pick, level, count, play, confirm; 320×568, 390×844, 640×360, 1280×800).

## Known limits
- Device tilt (iOS permission) not exercised in headless; falls back to pointer/idle by code path only.
- Sheet phases win/loss/confirm covered by candy QA assertions, screenshots only for pick/level/count/play/confirm.
- `/design-review` skill needs a clean tree and a browser driver; design review done by direct screenshot audit at 320/768/1920 instead.
