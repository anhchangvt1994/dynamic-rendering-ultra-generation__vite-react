# UX Contract

Product: Vietnamese Pokémon discovery and personal collection, mobile widths 375–460px first. Visual contract: [DESIGN.md](DESIGN.md). Runtime tokens: `src/assets/styles/main.css`.

## Evidence and scope

- User request (2026-10-29): creative redesign, continue existing frontend, optimize mobile, compact copy/images/loading, hide physical scroll indicators.
- Species boundary: `src/pages/PokemonPage/navigation.mjs` (1–1025).
- API resource shape: [PokéAPI v2](https://pokeapi.co/docs/v2), existing `src/app/apis/pokemon.ts` / proxy layer.
- Collection lifecycle: `src/utils/caught.mjs`, reversible local marks; no account, billing, permissions, remote writes or irreversible deletion introduced.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Shared `components/common/Select` (Radix); existing search combobox | This contract | Authored generation/sort popup and search results | Keyboard and mobile browser |
| Scrollbar | `src/assets/styles/main.css` | DESIGN.md | Main, type chips and existing modal/result scrollers hide indicators at explicit user request | Computed style + width checks |
| Search | `SearchPokemonBar`, Home catalogue | API cached name index | Modal navigation / local URL filter | Unit search + browser |
| Dialog | `hooks/useDialog.ts` | This contract | Menu / search | Escape, focus trap/return, inert background |
| Collection | `utils/caught.mjs` | Local supported national IDs | Detail action / list and progress reflection | Store tests + round trip |
| Feedback | Inline states; existing PokemonActions status | This contract | Loading / error / empty / caught feedback | Browser and unit tests |

## Dataset and navigation

Catalogue loads the small name index once, initially displays 24 cards, and adds 24 via an explicit button. No automatic infinite scrolling. Type membership is requested only for the active type. Never flash another type's stale response. URL owns `q`, `gen`, `type`, `sort`, `view`, `shown`; validate all values, reset shown on filter changes, exclude alternate forms above 1025. Local search is immediate and does not send per-keystroke requests. Typing filters locally immediately; a 300ms IME-safe debounce commits the URL after typing settles. Typing replaces history; intentional filter changes create entries. `keepPage` preserves the mounted page and scroll for URL-only changes. Existing internal scroll restoration owns Back from details.

Cards navigate to the existing `/pokemon/:name` route. Random exploration chooses from current matching results, with an unfiltered/curated fallback before data is ready. Empty caught view explains how to use the detail “Bắt” action. Failure offers retry without clearing filters. Loading is compact and announced. Full result count is distinct from rendered card count.

## Interaction and recovery

Search inputs have labelled clear buttons that restore input focus. Global search provides suggestions, keyboard arrows/Enter, IME-safe Enter, Escape and a close button. Authored Radix selects own popup geometry, Vietnamese labels, keyboard/typeahead, Escape/outside dismissal and trigger focus restoration. Type chips are native toggle buttons; selected state is conveyed by aria-pressed and tonal change.

Caught marks are synchronous and reversible. localStorage is primary; blocked/full storage falls back to session memory. Supported national IDs only. Changes notify this tab and sync storage events from other tabs. No confirmation for reversible caught toggles. The detail live region reports each outcome.

Background header and main are inert while menu/search are open. Modal cleanup restores opener focus. Long card names truncate visually but remain complete in link accessible names and the detail heading. Main scroll and horizontal chip indicators are intentionally hidden; scrolling is operable. Reduced motion is respected. All new buttons have meaningful labels and native semantics.

## Verification

Run the frontend `.test.mjs` suite, TypeScript, ESLint, Prettier, production build, premium static audit, and browser checks documented in `docs/qa/pokemon-field-notes.md`. Scope does not claim a full WCAG certification, assistive-technology matrix or real-device Safari testing.


Detail refinements: navigation is by swipe, neighbour tap or keyboard arrows; no overlaid step buttons. Back is a light, non-sticky control with breathing room below the header. Evolution item sprites accompany the complete condition text; when PokéAPI supplies location and item alternatives, the item method is preferred. Browser POP always restores its history entry's saved internal scroll position, even when that entry was created with keepPage metadata.


Select scrolling: menu viewport dimensions remain stable while scrolling; no hover auto-scroll controls or scroll-driven React state. Scroll gestures stay in the menu via overscroll containment. Regression: with Galar & Hisui selected, scroll to 0 then 10px; the viewport must remain at 10px rather than jumping to 158px. Also verify reverse scrolling and popup flipping near the viewport bottom. `scripts/qa/select-scroll.browser.js` runs this check against the actual open menu.


## Detail data accuracy

Incoming type defenses combine complete current damage_relations responses; no partial dual-type chart. Effect labels distinguish4×,2×,½×,¼× and0×, with text labels independent of color. Explicit scope excludes ability/item/weather/move overrides. One chart and one moveset per settled Pokémon; keyed child namespaces must be distinct and settled detail subtree identity follows PokémonID.

Moveset controls select a verified game version (chronological order from official PokéAPI version_groups.csv, not ID), then filter learning details before deriving a method. Multiple learning methods remain discoverable through method filters. Available method chips reflect the selected game; version changes reset method, query changes reset page size. Transient detail filters reset on a newly selected Pokémon. Render12 initially, load12 explicitly. Champions training is Huấn luyện.

Evolution routes are form aware. Each required/evolved form constraint applies to its specific edge; intermediate default forms cannot silently become regional forms. Only compatible routes containing the selected Pokémon/form appear. Resolve pokemon-form→pokemon for image IDs and links. National collection records speciesID across forms. Tests cover ordinary/GalarMeowth,Perrserker,ordinary/GalarZigzagoon,Obstagoon,regionalPersian,Eevee and default names with suffixes. Loading/failure of a regional artwork resource must never show the wrong base form as a fallback.
