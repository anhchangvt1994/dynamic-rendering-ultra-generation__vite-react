# Bếp Pokémon: giữ nguyên liệu đúng

Approved in chat on 2026-11-03.

- A failed pot costs nothing: all of it back to the bag.
- `kitchen_cook` names `closest`: the unfound secret sharing the most (menu order on a tie), or null.
- Each unfound secret's clue carries `kept`: per ingredient, the most any attempt held, capped at the recipe; sorted. Derived from `kitchen_attempts`, no new table.
- Hunting a secret (its chip, "Tự pha chế", or after a failure: the target, else `closest`) puts its `kept` the bag has into the pot first; those slots are pinned (gold rim, tick), still removable; "Cần thêm" lists the kept not in the pot.
- Local engine: `rules.mjs` `keptOf`; UI helpers `kept.mjs`. Migration `20261107000000_kitchen_kept.sql`.
