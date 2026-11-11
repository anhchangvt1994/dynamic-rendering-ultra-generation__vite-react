# Rig quality + skin-bound marks — design

## Goal
The room's individual (rig build) looks soft because the sheet is over-compressed
and over-shrunk. Marks (stars, hearts, snowflakes, scars, spots…) slide on the
skin instead of deforming with it. Raise image quality to near-lossless at full
cell size, and make marks follow the skin through every frame.

## Findings (current state)
- `tools/image-build/cli.ts:70` `SHEET_QUALITY` default 80 (`buildRig` default 90).
- `tools/image-build/rig/sheet.ts`: one WebP page ≤ 4096²; cell side drops
  512→384→320→256 as frames grow, then is upscaled in the canvas.
- Marks layer is a 512px canvas, LINEAR filtered (`RoomCanvas.tsx` `MARKS_PX`).
- Marks tracking (`track.mjs` `fit`) is a similarity per mark (move, turn,
  uniform scale): no shear / anisotropic stretch, each frame fitted independently.
- Flow: `TILE = 128`, 8-bit u/v (`flow.ts` `writeTile`) ≈ 2px error at 512 cells.
- `shader.ts` documents that a per-pixel flow lookup tore marks on fast tails
  (Pikachu). **Rejected here**; marks stay whole shapes.

## Decisions
User picked: near-lossless, 512px cells, multi-page (not lossless, not same-size).

## Design

### 1. Image quality
- `sheetPlan`: cell side fixed at 512 (`SIDES = [512]`); frames split across
  pages of ≤ 4096² (8×8 = 64 cells/page). `SheetPlan` gains `pages`, per-page
  `cols/rows`; frame K → page `floor(K/64)`, cell `K % 64`. `MAX_FRAMES` stays
  bounded (keep evenly-dropped frames beyond the cap; cap chosen so ≤ 4 pages
  = 256 frames, same cap as today).
- `encodeSheet` writes one WebP per page, `quality 98`, `alphaQuality 100`,
  `effort 6`. `SHEET_QUALITY` default 98; `buildRig` default 98.
- Server/API: `sheet.webp` → `sheet-{page}.webp` (page 0 keeps working for
  one-page rigs); `rig.json` lists `sheet.pages`.
- Client: `rig.ts` loads all pages; `gl.ts` creates up to 4 textures
  (`uSheet0..3`), `shader.ts` picks the page by frame index. Textures get
  LINEAR (no mipmaps needed at ≤ cell size). The eye mask follows the same paging.
- Marks canvas 512 → 1024 (`MARKS_PX`; shader feather taps use the new size).
- `RIG_VERSION` 9 → 10: every species rebuilds. Estimated 1.5–3MB/species.

### 2. Marks bound to skin
Approach A (chosen): per-mark full **affine** (6 DOF) fitted by weighted least
squares on the flow samples in the mark's gaussian neighbourhood (same weights
as today). Whole shape drawn with a 2×3 matrix → cannot tear.
- Fallback to the existing similarity when the normal matrix is ill-conditioned
  or the determinant leaves [1/GROW², GROW²]; then to the previous frame's
  transform when total weight < `MIN_WEIGHT` (existing behaviour).
- Temporal smoothing over the loop (circular, small window) on each mark's
  matrix, so per-frame fit noise does not shimmer; the visibility fade logic
  (`fade`, `shown`) is unchanged.
- `drawMarks` (`marks.mjs`) takes the matrix instead of `x, y, angle, size`;
  frame 0 is the identity of the planned shape.
- Flow precision: add `flow-lo.webp` (lossless, low bytes of u/v); client
  recombines to 16-bit. Flow tile stays 128 unless the QA shows aliasing
  (then 192/256). Confidence channel unchanged in `flow.webp`.

Rejected: per-pixel flow lookup (tears), 4×4 control mesh per mark (ripples,
more code than the gain).

### 3. Compatibility / rollout
- Rig version gate: old clients never see v10 files (same URL scheme through
  `/api/image/rig/{id}/`), rebuild via `tools/image-build/cli.ts --force` locally.
- Never commit `server/dist`, never push (project rule).

## Testing
- Unit: `build.test.mjs` (paging: 1, 64, 65, 256 frames; cell always 512);
  `track.test.mjs` (affine recovers synthetic shear/stretch/rotation; fallback
  on degenerate neighbourhood; smoothing keeps loop closure);
  `marks.test.mjs` (matrix drawing equals old drawing under similarity).
- Flow 16-bit round trip test.
- Browser QA (`.superpowers/qa`): before/after contact sheets, Pikachu (fast
  tail), Gengar (dark body), Chansey (hearts); mark anchored on a distinctive
  skin pixel must stay on it across frames; no WebGL errors; memory with 4
  pages stays reasonable.

## Out of scope
Upscale pipeline (`anim.webp` stays 512), recolour shader, mark planning.
