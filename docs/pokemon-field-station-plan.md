# Pokémon Field Station

User intent: continue the existing frontend and invest in a distinctive, polished Pokémon experience. Implementation proceeds in the supplied workspace on its existing feature branch; no deployment or unrelated backend changes.

## Direction

An illustrated field station, with an ink-blue editorial hero, oversized official Pokémon artwork, yellow encounter stage, red Poké Ball identity, and a calm pale-blue catalogue. Keep Vietnamese copy and Be Vietnam Pro; Dela Gothic One is reserved for short Latin display labels. The signature is a switchable featured encounter, not background decoration.

Considered: retain glass (weak contrast and hierarchy); retro pixel console (less suited to the detailed artwork); field station (selected by the implementer under the user's creative latitude, balances expressive discovery and readable data).

## Delivery

1. Catalogue: reuse the RTK Query API/proxy; load the small national name index once, fetch type membership only on demand. Search, generation, type, caught status, sorting, and visible item count live in URL parameters. Render 24 at a time with explicit load more. Regression tests cover combined filters, boundaries, URL validation and immutable sorting.
2. Presentation: replace the shell/header, build a switchable three-Pokémon encounter hero and a collection progress panel, redesign list cards with official artwork and restrained hover effects. Retain immersive dark detail and blog surfaces within the shared shell.
3. Recovery/accessibility: explicit retry and no-results states, labelled native selects (platform popup accepted), local search clear, focus rings, keyboard operation, reduced motion, mobile layout. Reuse the existing search dialog and caught store.
4. QC: unit suite, TypeScript, lint, formatting, production build, static premium audit; inspect desktop/mobile, filters, collection round trip, detail and search dialog in the browser. Save factual results in a QC report.

## Acceptance

- Every card opens its correct existing detail route; detail carousel/Shiny/evolution stay functional.
- Filters combine over all 1,025 supported species; forms above #1025 never appear.
- Filter state is shareable and restored by browser history; more results never require automatic infinite scrolling.
- Collection counts match the existing caught marks and update on return from a detail page.
- Missing data, failed requests and no matches offer a clear recovery action.
- No horizontal page overflow at 390px; focus is visible and imagery reserves its layout footprint.


## User refinements implemented

- Mobile-first widths 375–460px, no visible physical main/chip scrollbars (explicit preference overrides skill scrollbar visibility default).
- Removed carousel step buttons; swipe, neighbour taps and keyboard arrows remain.
- Back control: 36px high, 16px side inset and 20px below header, subtle fill/border, no heavy shadow.
- Evolution items preserve item/held-item identities; use official 30px item sprites at 26px. Prefer a stone evolution alternative over an older location route when the API supplies both.
- Review fixes: same-path query links compare pathname/search/hash; POP Back restores saved list scroll despite keepPage metadata.
