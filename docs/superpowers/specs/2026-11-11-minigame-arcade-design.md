# Mini game: "Phố máy arcade" (redesign 2)

Date: 2026-11-11 · Scope: `/mini-game` hub, skeleton, trainer card move to the account page.
Out of scope: engine, RPCs, DB, play sheet chrome (kept), SEO (stays `noindex`).
Supersedes the hub layout of `2026-11-11-minigame-redesign-design.md` (tokens, shell, zero-shift contract, play sheet stay).

## 1. Brief (user)
- Trainer profile is not a section of this page: it belongs to the account page (account-trigger → account page). Remove it here, add it there.
- Hub still looks ordinary (layout, UI/UX, effects). Make it genuinely wow.
- Chosen direction: **1, self-playing arcade cabinets.**

## 2. Trainer profile moves to the account page
- Remove the `trainer` region, `HoloCard` render and its sheets from `/mini-game` (grid, skeleton, regions, QA gates).
- `AccountPage` signed-in view ("Sổ tay của bạn") gets a **TrainerCard** above the collection count: avatar, level, xp bar, team dots, buttons "Đổi avatar" and "Đội hình". Reuses `HoloCard` markup/style, `AvatarPicker`, `TeamPicker`, `useMiniGame` (status.trainer). Moves to `src/pages/AccountPage/TrainerCard.tsx` (+ its styles). Fixed-height box, so no shift when data arrives; loading/error states inside the same box.
- Guest/signed-out account page is unchanged. Mini game page keeps one line of status in the quests strip ("Lv n · trainer") linking to `/dang-nhap`.
- Risk: account page now loads the mini-game client; load it lazily only when signed in.

## 2b. Concept
A night street of arcade cabinets under the bulb string. Two tall cabinets (Candy Rush, Lật thẻ) are the page. Each one **plays itself** on its screen (attract mode), so the player sees the game before pressing Chơi.

```
mobile (<640)               tablet/desktop (≥640)
[ marquee sign       ]      [ marquee sign (bulbs light letter by letter) ]
[ cabinet ◀ swipe ▶  ]      [ cabinet A          ][ cabinet B           ]
  • •  (2 dots)                (large, side by side, bases on the felt)
[ stamp strip        ]      [ stamp strip (3 tasks + 7-day streak)        ]
```

## 3. Components
- **Marquee** (title region): "Chơi cùng Pokémon" as a lit sign. Letters light left→right once per visit, then a slow chase. Fixed height; `aria-label` is the plain text.
- **Cabinet** (one per game): body (side art, neon edge in the game's hue), screen, marquee cap with game name, control deck (joystick + 2 buttons, decorative), coin slot, `Chơi` button, ticket stubs (`TicketRow`, existing), rule line (2 lines, clamped).
  - **Screen attract demo** (decorative, `aria-hidden`):
    - Candy: a 6×7 board of the real berry sprites replaying a fixed scripted run computed once from `engine.mjs` (`trySwap` on a committed layout): swap, pop, drop, combo flash, score counter ticking. Loop ≈ 9 s. Transform/opacity only.
    - Memory: 3×4 face-down cards flipping in pairs, matches glow, loop ≈ 8 s. CSS only.
  - Demos pause when the cabinet is off-screen (IntersectionObserver) or `document.hidden`; reduced-motion = one static frame.
  - **Hover / touch:** a spotlight (pointer-follow radial light, rAF, `--sx/--sy`) brightens the cabinet and screen; joystick tilts toward the pointer; buttons depress on press.
  - **Play:** pressing `Chơi` inserts a ticket (stub slides into the slot, 260 ms), screen flashes "Sẵn sàng", then the sheet opens. Failure/zero turns: slot blinks red, button text "Hết lượt".
- **Mobile carousel:** the two cabinets in a scroll-snap row (one nearly full width, next one peeking 12%), dots below, keyboard operable (buttons prev/next, focus moves with snap). No JS layout measurement.
- **Stamp strip** (quests region): a slim horizontal strip instead of a tall card: 3 task chips with progress fill, then a 7-stamp streak line ending in a chest. Claim = stamp slam (existing). Guest: same strip, locked, one `Đăng nhập` CTA. Mobile: strip scrolls horizontally inside its fixed box.
- **Background:** same night sky, bulbs and felt; felt top aligns with cabinet bases so cabinets stand on it; a soft light cone per cabinet; stars drift slowly (CSS only).

## 4. Zero shift (contract kept)
- One `HubShell`, regions: `title`, `cabinets` (2 `booth` boxes), `quests`. `trainer` is deleted from `REGIONS` and the skeleton.
- Fixed heights: title 120/140; cabinet 440 (mobile) / 520 (md) / 600 (lg); quests 168 (mobile) / 136 (md+). Demo and sprites fill their boxes only.
- Skeleton = same shell with cabinet-shaped bones.
- Gate `minigame-shift.mjs`: rect diff ≤1px, overflow, hub-scoped CLS 0 at 320…1920, guest + signed-in; carousel snap must not shift layout.

## 5. Effects budget
Entrance (once per visit): bulbs on, cabinets rise 80 ms apart, screens power on (CRT flicker 300 ms). Reactive: spotlight, joystick, button press, ticket slide, stamp slam. Ambient: demo loops, bulb sway. All transform/opacity; demos ≤ 60 animated nodes per cabinet, `will-change` scoped, no blur on animated layers. `prefers-reduced-motion`: no demo/sway/spotlight, instant states.

## 6. Files
- New: `hub/Marquee.tsx`, `hub/Cabinet.tsx` (replaces `Booth.tsx`), `hub/demo/candyDemo.mjs` (+test: script is deterministic, every swap legal), `hub/demo/CandyScreen.tsx`, `hub/demo/MemoryScreen.tsx`, `hub/Carousel.tsx`, `hub/spotlight.mjs` (+test), `hub/styles.cabinet.ts`, `src/pages/AccountPage/TrainerCard.tsx`.
- Change: `index.tsx`, `hub/HubShell.tsx`, `hub/styles.hub.tsx`, `hub/regions.mjs` (+test), `hub/StampCard.tsx` (strip layout), `hub/styles.cards.ts`, `MiniGameSkeleton.tsx`, `AccountPage/index.tsx`, QA scripts' selectors.
- Remove from the hub: `HoloCard` usage (code moves to `TrainerCard`).
- Untouched: engine, RPCs, `useMiniGame` API, play sheet, boards.

## 7. QC
Widths 320, 360, 390, 768, 1024, 1280, 1440, 1920; guest, signed-in, 0 turns, open round, error, reduced-motion. Per width: no horizontal overflow, targets ≥ 44px, contrast 4.5:1, focus visible, no console errors, CLS 0, carousel works by touch and keyboard. Flows: candy and memory still play (candy QA ALL PASS), claim quest, avatar and team change on the **account page**. Then design review (visual + UX).

## 8. Risks
- Demo cost on low-end phones: pause off-screen, one rAF-free CSS timeline per demo, static frame under reduced motion.
- Account page grows: TrainerCard lazy-loads the mini-game client, fixed box, no shift.
- Scripted candy run must stay legal if the engine changes: unit test replays it through `engine.mjs`.
