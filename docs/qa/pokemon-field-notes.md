# Frontend QC — Pokémon Field Notes

Date: 2026-10-29. Scope: frontend source, shared shell, discovery catalogue, collection and the user's detail-screen refinements. No deployment performed.

## Executed engineering checks

- Frontend Node unit suite: **81 passed, 0 failed** across search, catalogue, formatting, navigation, habitat, power, species/evolution and caught store.
- `tsc --noEmit --pretty false`: passed.
- ESLint over `src/**/*.{ts,tsx,mjs}` with `--quiet`: passed, no errors.
- Prettier check of changed frontend files and asset script: passed.
- `npm run build`: passed (includes TypeScript, frontend ESLint and Vite production build).
- `git diff --check`: passed.
- Premium strict project audit: **0 errors, 0 warnings**; report in `premium-audit.json`.
- `designmd lint DESIGN.md`: **0 errors**, 10 warnings about optional primary/component token references. Runtime CSS token values and mapping were inspected directly; the document is descriptive Model B rather than a token export source.
- Independent review identified two navigation defects, both fixed and exercised in browser. Follow-up review: no remaining Critical/Important findings.

## Executed browser checks

Chromium mobile/touch emulation (not real-device Safari), widths **375, 390, 430, 460px**:

| Screen | Check | Observed |
|---|---|---|
| Home | Document and main horizontal extent | Exactly 375 / 390 / 430 / 460px respectively; no overflow |
| Home | Cards | Two columns at all four widths |
| Home | First visible artwork | No broken image resources |
| Main scroll | Physical scrollbar | Computed `scrollbar-width: none`; scrolling works |
| Detail | Document and main extent | Exactly the viewport width at all four widths |
| Detail | Back control | x=16px, y=85px, 92×36px; 20px below 65px header |
| Detail | Redundant previous/next overlay buttons | 0 |
| Eevee evolution | Branch layout at 375px | Three columns, centered base Pokémon |
| Eevee evolution | Item sprites | Water, Thunder, Fire, Leaf, Ice Stone decoded successfully |

Functional checks:

- Fast typing `pikachu` preserves the entire input and filters immediately to one result. URL commits `q=pikachu` after 300ms; the first implementation's per-key URL updates lost letters, which was reproduced and fixed.
- Combining query Pikachu + Electric yields one result. Adding Johto yields zero and a recovery action. Clearing returns all 1025 names and 24 rendered cards.
- Load more increases rendered count to 48 and persists `shown=48` in URL.
- Scrolling list to **3290px**, opening Pikachu, then browser Back restores **3290px** and all 48 cards.
- Menu and desktop header collection links navigate from home to `/?view=caught`; active navigation reflects collection state.
- Caught toggle updates collection progress and list mark. The Bulbasaur test mark was removed afterward; the original empty collection was restored.
- Empty collection explains how to catch a Pokémon and offers discovery.
- Shiny switches Bulbasaur artwork to the actual shiny URL and toggles back.
- Keyboard ArrowRight navigates Eevee → Vaporeon after removing overlay arrows.
- Search dialog opens with focus in the input; header and main are inert. `#25` ranks Pikachu first. Escape closes, removes inert state and returns focus to the search opener.
- Native generation selector opens and accepts ArrowDown/Enter, updating URL to Gen 1.
- Reduced-motion emulation exercised. No app animation is required to navigate.
- Offline request for uncached Fairy type displays an inline error and retry. Restoring network and retrying recovers **64 Pokémon**, 24 initially rendered.
- Desktop 1280×900 visually inspected: split encounter, readable catalogue, navigation and collection links.

## Assets

151 catalogue artworks (192px WebP) and 3 hero artworks (480px WebP), sourced from the official PokéAPI sprites repository. Source PNG bytes: **21,935,134**; generated WebP bytes: **1,345,014**, about **94% smaller** in aggregate. Images are requested lazily in the catalogue. Item sprites use official tiny 30×30 PNGs and retain condition text if an image cannot load.

## External limitations

The existing external article service did not return a usable article list. Its error/retry screen was checked; article-list/detail success could not be verified against live content. No Strapi backend or fabricated article data was introduced. Full screen-reader certification, real iOS/Android device tests and production deployment are outside the checks executed here.


## Follow-up upgrades and regressions

- Authored Radix Select replaces both native selects. At375/390/430/460px popup width equals trigger width exactly (165/172.5/192.5/207.5px). Text and chevron inset both15px including1px border; CSS padding14px. Mobile trigger44px. Keyboard Home/End/Arrow/Enter/Escape, focus restoration and bottom-edge flip tested.
- Reproduced Radix optional scroll-button bug: requested10px, actual158px. Removed optional scroll buttons; stable318px viewport and328px client popup height. Regression passes50,100,160,80,20,0 in both directions at all four mobile widths.
- Added incoming weakness/resistance/immunity chart. Charizard: Rock4×, Water2×, Electric2×, Ground0×; resistant groups inspected. Scope excludes abilities/items/weather/move-specific mechanics, as shown to users.
- Moveset now selects a game, defaults by verified chronological order (not resourceID), filters only moves/learning routes from that game, supports local name search and method chips, and initially renders12 rows. Scarlet/Violet Charizard:75 moves; TM + solar beam produces one Solar Beam TM row; invalid name gives clear recovery; load more gives24 rows. Champions train method is explicitly Huấn luyện. Newest available versions respect official version_groups.csv order; late-added Japanese Gen1 IDs28/29 no longer outrank modern games.
- User-reported duplicate chart reproduced: carousel Perrserker→Cursola produced2 charts and duplicate-key console errors. Fixed sibling key namespaces and keyed the entire settled detail subtree. Automated browser keyboard regression now passes Cursola→Sirfetchd→Cursola→Perrserker→Cursola, each with exactly1chart and1moveset, no console warnings/errors.
- Regional evolution now uses required/evolved Pokémon forms at every edge, resolves form resources to actual Pokémon IDs, and filters the selected form's lineage. Perrserker shows GalarMeowth artwork10161 and link/pokemon/meowth-galar, then PerrserkerLv28; no Persian. NormalZigzagoon shows normalLinooneLv20 and stops. Obstagoon shows GalarZigzagoon→GalarLinooneLv20→ObstagoonLv35night. UrshifuSingleStrike shows Kubfu→correctSingleStrikeform and exactly one chart.
- Regional-form caught marks use national speciesID; chart/form requests use currentData and show honest pending/error states.

The browser screenshots were inspected; saved select audit evidence is in01-select-before.png and04-select-stable-scroll.png. Scripted browser checks are scripts/qa/select-scroll.browser.js and scripts/qa/detail-panels.browser.js. Browser regression fixtures, not screenshots alone, establish the scroll/duplication fixes. Broader evolution-condition exceptions beyond represented API fields are not a competitive battle/evolution simulator.


Form-identity review added default cosmetic forms: Shellos/Gastrodon West/East and Burmy plant/sandy/trash. Filtering uses actual pokemon.forms identities rather than assuming form names equal Pokémon names. Required gender, weather, beauty and relative physical-stat constraints are retained in evolution condition text. Final species regression suite has18 tests; full frontend suite81.


Cosmetic artwork regression: Shellos-East and Burmy-Sandy use the exact form sprites/official-artwork URLs (422-east.png,412-sandy.png), even though their Pokémon IDs are shared with other cosmetic forms. This prevents a correct form label from showing the base form image. Source data was verified live against PokéAPI form resources.
