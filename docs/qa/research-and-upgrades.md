# Research and next upgrades — 2026-10-29

Audience: Vietnamese Pokémon readers using 375–460px screens. Scope: current public Pokédex patterns and reported lookup/scroll friction; improve the existing detail flow, not a separate redesign. Sources were read in this session. This is a focused public scan, not representative market research; no frequency estimates can be inferred from the anecdotes.

## Ranked findings

| Priority | Evidence | User consequence | Decision / acceptance |
|---|---|---|---|
| P1, high confidence | Reproduced select viewport jump 10→158px; upstream [Radix #3686](https://github.com/radix-ui/primitives/issues/3686) describes same optional scroll-button problem | Slow scroll repeatedly loses place | Removed scroll buttons; actual menu regression now passes forward/reverse positions at four mobile widths |
| P1, high confidence from source | Current moveset renders every move from all historical game versions, and derives method from last array entry; [Pokémon Database](https://pokemondb.net/pokedex/bulbasaur) separates game versions | User can mistake old moves for currently learnable moves and must scroll hundreds of rows | Explicit game version, newest available by default; methods restricted to that version, search and method filter; render 12 then load 12; preserve multiple methods accurately |
| P2, medium confidence | Database shows type defenses; [community type calculator discussion](https://www.reddit.com/r/pokemon/comments/1s3ergg/i_made_a_type_effectiveness_app_for_quick_lookups/) values immediate 4× dual-type lookup; [scanner author](https://www.reddit.com/r/EmulationOnAndroid/comments/1quh6p8/live_pokedex_scanner_for_dualscreen_handhelds_eg/) describes repeated weakness searches | Reader must mentally combine two types or leave the app | Show incoming damage multipliers from PokéAPI current damage_relations; 4× distinct from 2×; combine immunities correctly; state ability/item/weather exclusions |

## Technical authority

[PokéAPI type contract](https://pokeapi.co/docs/v2#types) defines `no_damage_from`, `half_damage_from`, `double_damage_from`, and separately historical relations. Use current relations for current main-series mechanics; do not imply Pokémon GO battle rules. [Radix Select](https://www.radix-ui.com/primitives/docs/components/select) supplies keyboard, focus and typeahead; our component owns geometry and stable native scrolling.

## BA / QC boundaries

No guessed damage chart and no per-card payload requests. At most two cached type lookups per active detail. Type defense is based on typing only, without abilities, held items, weather or move-specific exceptions. Do not display a partial dual-type result while a second type is loading or failing. Moves are filtered by the selected version group before deriving methods; a method filter must find every matching method within that game, not only an arbitrary last detail. Search/learning filters are transient detail controls; reset for a newly selected Pokémon. Show honest loading/error/no-results states, clear actions and explicit load-more counts. Test Grass/Poison cancellation, Fire/Flying 4× Rock, Water/Flying 4× Electric, immunity dominance, selected-game absence, multi-method moves, empty and long names.

## Opportunities deferred

Team building, ability-aware simulations and multi-game evolution alternatives deserve separate domain/UI work. They are not implied by the small research sample. No authentication, account sync, competitive recommendation engine or fabricated article content is added.
