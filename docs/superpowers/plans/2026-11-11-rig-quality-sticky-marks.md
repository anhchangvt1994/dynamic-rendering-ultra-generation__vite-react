# Rig quality + skin-bound marks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Room individuals render from 512px near-lossless multi-page sheets, and marks follow the skin through an affine fit of the 16-bit flow.

**Architecture:** Build side (`tools/image-build/rig`) writes `sheet-{n}.webp` pages (≤ 64 cells of 512px each), a 16-bit flow (`flow.webp` high bytes + `flow-lo.webp` low bytes) and a 256px-cell eye atlas; `RIG_VERSION` 10. The client (`src/pages/MyPokemonPage/room/canvas`) loads the pages, the shader picks a page by frame index, and `track.mjs` fits a full affine per mark, drawn whole by `drawMarks`.

**Tech Stack:** TypeScript (sharp, opencv-js; tests `node --test` + sucrase), three.js shader, canvas 2D.

**Spec:** `docs/superpowers/specs/2026-11-11-rig-quality-sticky-marks-design.md` (this plan amends it in three places, see Task 3 step 6).

## Global Constraints

- Cell longest side always 512; page ≤ 4096² (`PAGE`), 64 cells per page, at most 4 pages (256 frames, as today).
- Sheet WebP: `quality 98`, `alphaQuality 100`, `effort 6`; `SHEET_QUALITY` default 98 in `tools/image-build/cli.ts` and `buildRig` default 98.
- `RIG_VERSION` = 10; flow `bits` = 16; flow tile stays 128.
- Marks canvas `MARKS_PX` = 1024.
- Never commit `server/dist`, never push; existing git-modified files (minigame, `server/dist`, `tsconfig.tsbuildinfo`) are not part of this work: `git add` only the files named in each task.
- Tests: `yarn test:pokemon-art` (build side), `node --test src/pages/MyPokemonPage/room/canvas/*.test.mjs` (client side).

## Review Focus

- A 256-frame species (#6, 4 pages = 4×64MB textures): sheet plan yields exactly 4 pages; browser QA checks no context loss (Task 7).
- A 1-frame still and a ≤ 64-frame species: exactly one page, no padding beyond `cols×rows` (Task 1 tests).
- A v9 rig still on the server (not rebuilt yet): client refuses it and the `<img>` stays (Task 4 `isCurrentRig` test).
- Zero-confidence or degenerate flow around a mark (all cells in a line, or no cells): no NaN, mark keeps its last place (Task 6 tests).
- Smoothing never moves frame 0 or breaks the loop's closing frames (Task 6 test).

---

### Task 1: Paged sheet plan, paged encoder, eye atlas shrink

**Files:**
- Modify: `tools/image-build/rig/sheet.ts` (whole file)
- Modify: `tools/image-build/rig/eye.ts` (append)
- Test: `tools/image-build/rig/build.test.mjs` (replace the two `sheetPlan` tests), `tools/image-build/rig/eye.test.mjs` (append)

**Interfaces:**
- Produces (`sheet.ts`):
  ```ts
  export const PAGE = 4096, CELL = 512, PER_PAGE = 64, MAX_PAGES = 4
  export type SheetPlan = {
    size: 512; cols: number; rows: number   // per page
    per: number                             // frames per page (last page may hold fewer)
    pages: number
    keep: number[]; delays: number[]
  }
  export function sheetPlan(m: number, delays?: number[]): SheetPlan
  export function encodeSheet(frames: Uint8Array[], w: number, h: number,
    plan: Pick<SheetPlan, 'cols'|'rows'|'per'|'pages'>, quality?: number): Promise<Buffer[]>
  export const cellOf  // unchanged
  ```
- Produces (`eye.ts`): `export const EYE_SIDE = 256`; `export function shrinkMask(mask: Uint8Array, w: number, h: number, ew: number, eh: number): Uint8Array` (max-pool: an output pixel is 255-valued if any covered source pixel is > 0, else 0).

- [ ] **Step 1: Write failing tests** in `build.test.mjs`, replacing the first two tests:
  - `sheetPlan(m)` returns `[size, pages, per, cols, rows, keep.length]`: `1 → [512,1,1,1,1,1]`; `8 → [512,1,8,3,3,8]`; `64 → [512,1,64,8,8,64]`; `65 → [512,2,64,8,8,65]`; `130 → [512,3,64,8,8,130]`; `300 → [512,4,64,8,8,256]`.
  - `keep` of `sheetPlan(300)` starts at 0, strictly ascending, last < 300; `sheetPlan(300, Array(300).fill(10)).delays` has 256 entries summing to 3000 and `delays[0] === (keep[1]-keep[0])*10` (the existing delay test, unchanged otherwise).
  - `encodeSheet` with 130 solid 4×4 frames (frame K filled `[K, 0, 0, 255]`) and `{cols:8, rows:8, per:64, pages:3}` returns 3 buffers; each decodes (sharp metadata) to 32×32 webp; page 1 cell 0 (pixels 0–3, 0–3) has red within ±6 of 64; page 2 cell 1 red within ±6 of 129.
- [ ] **Step 2:** Run `node --test tools/image-build/rig/build.test.mjs` — Expected: FAIL (old `sheetPlan` shape).
- [ ] **Step 3:** Rewrite `sheet.ts`: `size` is always `CELL`; `count = min(m, PER_PAGE*MAX_PAGES)`; `keep`/`delays` logic unchanged; if `count ≤ PER_PAGE` then `per = count, cols = ceil(sqrt(count)), rows = ceil(count/cols)` else `per = 64, cols = 8, rows = 8`; `pages = ceil(count/per)`. `encodeSheet` composes each page at `cols*w × rows*h` (every page the same size, unused cells transparent) and encodes with `.webp({ quality, alphaQuality: 100, effort: 6 })`.
- [ ] **Step 4:** Append to `eye.test.mjs`: `shrinkMask` of an 8×8 mask with one 255 pixel at (5,2) to 4×4 has exactly one 255 at (2,1); an all-zero mask stays all zero. Implement `shrinkMask`/`EYE_SIDE` in `eye.ts`. Run both test files that compile (`build.test.mjs` still fails on `buildRig` tests until Task 3 — run the new tests with `--test-name-pattern 'sheetPlan|encodeSheet|shrinkMask|delay'`). Expected: PASS.
- [ ] **Step 5: Commit** `tools/image-build/rig/sheet.ts tools/image-build/rig/eye.ts tools/image-build/rig/build.test.mjs tools/image-build/rig/eye.test.mjs` — `feat(image-build): paged 512px sheet plan, eye mask shrink`.

### Task 2: 16-bit flow

**Files:**
- Modify: `tools/image-build/rig/flow.ts` (`FlowSheet`, `flowSheet`, `writeTile`, `encodeFlow`)
- Test: `tools/image-build/rig/flow.test.mjs` (append)

**Interfaces:**
- Produces: `FlowSheet = { data: Buffer; low: Buffer; width: number; height: number; cols: number }`. Encoding per cell, with `q16(x) = round(clamp(x,0,1)·65535)`: `data` R = `q16(u)>>8`, G = `q16(v)>>8`, B = confidence·255, A = 255; `low` R = `q16(u)&255`, G = `q16(v)&255`, B = 0, A = 255. Decoded value is `(hi·256+lo)/65535`.

- [ ] **Step 1: Failing test** `flow is 16-bit: a tile written with u = 0.123456, v = 0.654321 reads back within 1/65535`: build `flowSheet(2)`, call `writeTile(sheet, 1, field, w, h)` with a uniform field (u/v constants, conf 1, any w=h=8), then recombine `data`/`low` at the tile's first cell and compare. Second test: frame 0 (identity) recombines to `(0.5/TILE)` and `((TILE-0.5)/TILE)` at cells 0 and TILE−1 within 1/65535.
- [ ] **Step 2:** Run `node --test tools/image-build/rig/flow.test.mjs` — Expected: FAIL (`low` undefined).
- [ ] **Step 3:** Implement the encoding above in `writeTile`; allocate `low` in `flowSheet`.
- [ ] **Step 4:** Run the same command — Expected: PASS (existing flow tests still pass).
- [ ] **Step 5: Commit** `tools/image-build/rig/flow.ts tools/image-build/rig/flow.test.mjs` — `feat(image-build): 16-bit flow`.

### Task 3: buildRig, CLI and server serve the new files

**Files:**
- Modify: `tools/image-build/rig/build.ts` (header comment line for version 10, `RIG_VERSION`, `RigJson`, `buildRig`)
- Modify: `tools/image-build/cli.ts` (`SHEET_QUALITY`, header usage text, `RIG_OUTPUT`, `rigTask` writes)
- Create: `server/src/api/routes/image/rigFiles.ts`, `server/src/api/routes/image/rigFiles.test.mjs`
- Modify: `server/src/api/routes/image/serve.ts` (use `rigFileType`), comment in `server/src/utils/PathHandler/index.ts:193`
- Modify: `docs/superpowers/specs/2026-11-11-rig-quality-sticky-marks-design.md`
- Test: `tools/image-build/rig/build.test.mjs`

**Interfaces:**
- Consumes: `sheetPlan`, `encodeSheet`, `CELL` (Task 1); `shrinkMask`, `EYE_SIDE` (Task 1); `FlowSheet.low` (Task 2).
- Produces:
  ```ts
  export const RIG_VERSION = 10
  export type RigJson = { v: 10; frame: {w,h}; sheet: { cols; rows; size: 512; pages; per }
    frames; delays; src; flow: { cols; tile: 128; bits: 16 }
    eye: { cols: number; w: number; h: number }   // eye atlas: one cell per kept frame, cell = cellOf(W,H,EYE_SIDE)
    clusters; lock; primary; branches; noMarks? }
  buildRig(...): Promise<{ json: RigJson; sheets: Buffer[]; flow: Buffer; flowLow: Buffer; eye: Buffer }>
  // server: rigFileType(file: string): string | null  -> mime for rig.json, sheet-[0-3].webp, flow.webp, flow-lo.webp, eye.png, amber.webp
  ```

- [ ] **Step 1: Update `buildRig` tests**: `RIG_VERSION` and `json.v` are 10; `json.sheet` deepEquals `{ cols: 3, rows: 3, size: 512, pages: 1, per: 8 }`; `sheets` has length 1, 1536×1536 webp; `json.flow` deepEquals `{ cols: 3, tile: 128, bits: 16 }`; `json.eye` deepEquals `{ cols: 3, w: 256, h: 256 }` and the eye PNG is `3*256 × 3*256`; `flowLow` is a webp of the flow's size; the 16-bit check recombines `flow` R/`flowLow` R at frame 6's cell as in the existing `r` assertion with tolerance `0.1` px of 12; the lossless test also asserts `flowLow` is webp; the still test: `json.sheet` `{cols:1, rows:1, size:512, pages:1, per:1}`, eye PNG 256 wide, `at(64,64)` check recombined within 1/65535 of `64.5/128`.
  `rigFiles.test.mjs` (sucrase like `build.test.mjs`): `rigFileType('sheet-0.webp')`, `'sheet-3.webp'`, `'flow-lo.webp'`, `'rig.json'`, `'eye.png'` return their mime; `'sheet-4.webp'`, `'sheet.webp'`, `'../rig.json'`, `''` return `null`.
- [ ] **Step 2:** Run `yarn test:pokemon-art` and `node --test server/src/api/routes/image/rigFiles.test.mjs` — Expected: FAIL.
- [ ] **Step 3:** `build.ts`: per kept frame, shrink `eyeMask(big, cell.w, cell.h)` to `cellOf(W,H,EYE_SIDE)` and paste it into an eye atlas of `cols = ceil(sqrt(frames))` columns (same code shape as today); `sheetQuality` default 98; `encodeSheet(cells, cell.w, cell.h, plan, sheetQuality)`; add the flow `low` webp (`lossless: true, effort: 6`) built exactly like `flow`; fill `json` per the Interfaces block; replace the "9:" version note with a "10:" line (512px paged sheet q98, 16-bit flow, 256px eye atlas).
- [ ] **Step 4:** `cli.ts`: `SHEET_QUALITY` default 98 (also the `--sheet-quality` help line); `RIG_OUTPUT` = `build.json, rig.json, sheet-0.webp, flow.webp, flow-lo.webp, eye.png`; `rigTask` writes every `sheet-${i}.webp`, `flow-lo.webp`, and removes the stale `sheet.webp` and any `sheet-${i}.webp` with `i >= pages`; update the header comment. `rigFiles.ts`: `rigFileType` by exact names plus `/^sheet-[0-3]\.webp$/`; `serve.ts` `readRigUrl`/`serveRig` use it instead of the `RIG_FILES` record; fix the two comments that list the rig files.
- [ ] **Step 5:** Run `yarn test:pokemon-art` and the `rigFiles` test — Expected: PASS.
- [ ] **Step 6:** Amend the spec to match: paging files are always `sheet-{n}.webp` (no `sheet.webp`); the eye mask is one atlas with 256px cells (keeps the fragment shader at 6 samplers, WebGL minimum is 8); `rig.json.sheet` carries `rows`, `pages`, `per`; `rig.json.eye` is `{cols,w,h}`.
- [ ] **Step 7: Commit** the files above (`git add -f` for the spec, `docs` is ignored) — `feat(image-build): rig v10, paged q98 sheets, 16-bit flow, eye atlas`.

### Task 4: Client loads and renders the paged sheet

**Files:**
- Modify: `src/pages/MyPokemonPage/room/canvas/rig.ts`, `gl.ts`, `shader.ts`, `RoomCanvas.tsx`
- Create: `src/pages/MyPokemonPage/room/canvas/rig.test.mjs`

**Interfaces:**
- Produces (`rig.ts`):
  ```ts
  export const RIG_VERSION = 10   // keep equal to tools/image-build/rig/build.ts
  export type RigJson = { v: number; frame; sheet: { cols; rows; size; pages; per }; frames; delays; src;
    flow: { cols; tile; bits }; eye: { cols; w; h }; clusters; lock; primary; branches; noMarks? }
  export type Rig = { json: RigJson; sheets: ImageBitmap[]; flow: ImageBitmap; flowLow: ImageBitmap; eye: ImageBitmap }
  export const isCurrentRig = (json: { v?: number }) => boolean
  export const cellAt = (json: Pick<RigJson,'sheet'>, K: number) => ({ page: number; col: number; row: number })
  ```
- Consumes: server files from Task 3.

- [ ] **Step 1: Failing tests** (`rig.test.mjs`, sucrase): `isCurrentRig({v:10})` true, `{v:9}` and `{}` false; `cellAt` with `sheet {cols:8,rows:8,per:64,pages:3}`: `K=0 → {0,0,0}`, `K=9 → {0,1,1}`, `K=64 → {1,0,0}`, `K=129 → {2,1,0}`; with `{cols:3,rows:3,per:8,pages:1}`: `K=7 → {0,1,2}`.
- [ ] **Step 2:** Run `node --test src/pages/MyPokemonPage/room/canvas/rig.test.mjs` — Expected: FAIL.
- [ ] **Step 3: `rig.ts`:** add the Interfaces; `fetchRig` returns `null` (and does not cache) when `!isCurrentRig(json)`; otherwise loads `sheet-${i}.webp` for `i < json.sheet.pages`, `flow.webp`, `flow-lo.webp`, `eye.png` with the existing `bitmap` helper.
- [ ] **Step 4: `shader.ts`/`gl.ts`:** replace `uSheet` by `uSheet0..uSheet3` plus `uPer`; add `vec4 sheetAt(vec2 uv)` (page = `floor((uFrame+0.5)/uPer)`, `local = uFrame - page*uPer`, `cellUv(uv, local, uCols, uCell, uSheetSize)`, an `if` chain over the four samplers) and use it for every former `texture2D(uSheet, cellUv(...))` (main, `reliefAt`, `darkAt`, `glintAt`); eye lookups use `cellUv(uv, uFrame, uEyeCols, uEyeCell, uEyeSize)` (new uniforms from `json.eye` and `rig.eye` size); delete the unused `uFlow*`/`uTile` uniforms and the flow texture in `gl.ts` (`uMarks` defaults to the eye texture when there are no marks); `startScene` creates one texture per page (pages beyond `pages` reuse page 0's texture), `uSheetSize` = page bitmap size, `dispose` frees all of them. Leave the feather/emboss tap offsets in the shader as they are.
- [ ] **Step 5: `RoomCanvas.tsx`:** `MARKS_PX = 1024`; `bodyOf` draws `rig.sheets[0]`; `sheetAlphaOf` draws each frame's cell from `rig.sheets[page]` using `cellAt(rig.json, K)` and `json.frame` (its flow-tile destination is unchanged).
- [ ] **Step 6:** Run the `rig.test.mjs` command — Expected: PASS; run `yarn tsc --noEmit -p .` — Expected: no new errors in the files touched.
- [ ] **Step 7: Commit** the four modified files plus `rig.test.mjs` — `feat(room): render 512px paged sheet, eye atlas, 1024 marks layer`.

### Task 5: Flow reader for 16-bit

**Files:**
- Modify: `src/pages/MyPokemonPage/room/canvas/track.mjs` (read sites at `trackMarks` and `shown`), `RoomCanvas.tsx` (`flowOf`)
- Test: `src/pages/MyPokemonPage/room/canvas/track.test.mjs`

**Interfaces:**
- Produces (`track.mjs`): `export const flowUv = (flow, o) => [u, v]` where `flow = { data, width, height, low? }` (RGBA bytes); with `low` the value is `(data[o]·256 + low[o]) / 65535` (and `o+1` for v), without it `data[o]/255` (every existing test keeps passing).
- `RoomCanvas.flowOf` returns `{ width, height, data, low }` read from `rig.flow` and `rig.flowLow`.

- [ ] **Step 1: Failing test:** `a 16-bit flow places a mark more exactly than the 8-bit one` — same synthetic flow as the existing tests quantised both ways (extend `flowOf` with an option `bits: 16` producing `data` hi bytes and `low`); a heart tracked through the 16-bit flow is within 0.15 isotropic px of the exact forward-mapped place on frames 1–3 (8-bit stays ≤ 2 px).
- [ ] **Step 2:** Run `node --test src/pages/MyPokemonPage/room/canvas/track.test.mjs` — Expected: FAIL.
- [ ] **Step 3:** Replace `flow.data[o] / 255`, `flow.data[o + 1] / 255` in `trackMarks` and `shown` by `flowUv(flow, o)`; update `flowOf` in `RoomCanvas.tsx` (draw both bitmaps, return `low: lowImage.data`; unreadable → null as now); update the doc comment at `track.mjs:30` (`flow` shape).
- [ ] **Step 4:** Run the track tests — Expected: PASS. **Step 5: Commit** `track.mjs track.test.mjs RoomCanvas.tsx` — `feat(room): read the 16-bit flow`.

### Task 6: Affine fit, residual drawing, temporal smoothing

**Files:**
- Modify: `src/pages/MyPokemonPage/room/canvas/track.mjs` (`fit`, `trackMarks`), `marks.mjs` (`drawMarks`, `src/pages/MyPokemonPage/room/canvas/marks.mjs:801`)
- Test: `track.test.mjs`, `marks.test.mjs`

**Interfaces:**
- Produces: a tracked shape may carry `lin?: [a, b, c, d]`, the 2×2 residual (row-major) applied in the mark's own frame after `rotate(angle)`, so a mark point `u` (long-side units, relative to the mark's centre) sits at `centre + R(angle)·size·long·(lin·u)` in isotropic px. Absent `lin` = identity.
- `drawMarks`: when `s.lin` is set, `ctx.transform(a, b, c, d, 0, 0)` right after `ctx.rotate(s.angle)`.

- [ ] **Step 1: Failing tests** (`track.test.mjs`, new synthetic flow with a non-similar motion: frame K maps frame-0 isotropic px by `p' = pivot + M_K·(p - pivot) + move_K`, `M_1 = [[1.25,0.3],[0,0.85]]`, `M_2 = [[0.9,-0.2],[0.25,1.1]]`; reuse `flowOf`'s noise option):
  - `a mark follows a shear and a stretch, not just a similarity`: for frames 1–2 and local points `u ∈ {(±0.5,0),(0,±0.5)}·size`, the tracked mark's `centre + R(angle)·size·long·(lin·u)` is within 1.5 isotropic px of the true mapped point (the old similarity-only fit exceeds 3 px here).
  - `a pure similarity flow leaves lin at identity within 0.02` (existing `ANGLE/MOVE/SCALE` flow).
  - `a degenerate neighbourhood falls back without NaN`: a flow whose sure cells within reach are collinear (only one row of cells sure) and a flow with no sure cell both give finite `x,y,angle,size` and `lin` equal to identity.
  - `lin never stretches past a third`: singular values of `lin` within `[3/4, 4/3]` on every frame of a wildly stretched flow (`M = diag(3, 0.3)`).
  - `smoothing: frame 0 equals the planned shape exactly, and a noisy constant-velocity flow has a smaller second difference of x than the unsmoothed fit` (compare by calling `trackMarks` with `json.smooth === false` as the unsmoothed baseline).
  - `marks.test.mjs`: with a stub ctx recording calls, `drawMarks` of a shape with `lin: [1,0,0,1]` and the same shape without `lin` issue the same calls apart from one extra `transform(1,0,0,1,0,0)`; a shape with `lin: [1.2,0.3,0,0.8]` records `transform(1.2,0.3,0,0.8,0,0)` after `rotate`.
- [ ] **Step 2:** Run both test files — Expected: FAIL.
- [ ] **Step 3: `fit`:** keep the existing weights, `near` list and Procrustes similarity (`turn`, `k`, `GROW` clamp) as the fallback; additionally solve the weighted least-squares affine `A` (2×2) with `q − q̄ = A·(p − p̄)`; if `det(Spp)` relative to `trace(Spp)²` is below `1e-3` or the result is not finite, `lin` stays identity. Otherwise `L = (k·R(turn))⁻¹·A`, clamp the singular values of `L` to `[3/4, 4/3]`, and `lin = R(−θ0)·L·R(θ0)` with `θ0 = s.angle`. New centre = `q̄ + A·(c − p̄)` (replaces the similarity-only centre; use the clamped `L` composed back so centre and `lin` agree).
- [ ] **Step 4: smoothing:** after all frames are fitted and before `fade`, replace frames `1..n−1` of each mark's `x, y, size, lin[*]` and unwrapped `angle` by the `[1,2,1]/4` circular average over neighbouring frame indices (frame 0 is neighbour of frame `n−1`, but frame 0 itself is never changed); `json.smooth === false` disables it (tests only).
- [ ] **Step 5:** `drawMarks` per the Interfaces block. Run `node --test src/pages/MyPokemonPage/room/canvas/*.test.mjs` — Expected: PASS (existing tests included; loosen an existing tolerance only if smoothing is the sole cause, and say so in the commit).
- [ ] **Step 6: Commit** `track.mjs marks.mjs track.test.mjs marks.test.mjs` — `feat(room): marks follow the skin with a full affine, smoothed over the loop`.

### Task 7: Rebuild samples, browser QA, roll-out notes

**Files:**
- Create: `.superpowers/qa/rig-sticky.mjs` (git-ignored, like the other QA scripts)

- [ ] **Step 1:** Rebuild samples into a scratch dir: `node tools/image-build/cli.cjs --ids 25,94,113,6,1 --force --out <scratchpad>/pokemon-art` (bundle first as `yarn build:pokemon-art` does if `cli.cjs` is stale). Expected: each key's folder has `sheet-0.webp…`, `flow.webp`, `flow-lo.webp`, `eye.png`, `rig.json` with `v: 10`; #6 has `sheet.pages === 4`. Record sizes per species.
- [ ] **Step 2:** Write `.superpowers/qa/rig-sticky.mjs` (puppeteer, dev server on 5191 with `POKEMON_ART_DIR` pointing at the scratch dir; caches cleared first): for #25, #94, #113 open the room with a marked individual, capture 8 evenly spaced frames to `.superpowers/qa/shots/rig-sticky/<id>-<k>.png` and a contact sheet; assert no `webglcontextlost`, no console errors, canvas painted (`onReady('on')`).
- [ ] **Step 3:** Run it. Look at the shots: (a) sharpness against a pre-change screenshot taken from `git stash`-free baseline (the old art dir), (b) a star/heart/scar stays on the same skin feature across frames, (c) #6 (4 pages) paints and no context loss. Report honestly any mark that still slides or tears; if flow tile 128 aliases small marks, raise `TILE` to 192 in `flow.ts` and rerun.
- [ ] **Step 4:** Write the roll-out note in the final message (no file): full rebuild is `yarn build:pokemon-art --force`, upload `pokemon-art/`, rigs stay on v9 until uploaded and the room keeps its `<img>` meanwhile; est. size 1.5–3MB/species. No commit; do not push.
