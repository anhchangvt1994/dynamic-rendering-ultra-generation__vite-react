-- Mini-game: 5 turns per refill window (was 3). Only the rules constant changes.
create or replace function public.minigame_rules()
returns jsonb language sql immutable set search_path = '' as $fn$
  select $rules${
  "TURNS": 5,
  "REFILL_HOURS": 2,
  "DURATION_S": 300,
  "TOLERANCE_S": 5,
  "MIN_HUNGER": 40,
  "BASE_EXP": [6, 10, 16],
  "BOND_STEP": 0.05,
  "SPEED_MAX": 0.2,
  "COMBO_STEP": 0.02,
  "COMBO_MAX": 0.1,
  "QUEST_SLOTS": 3,
  "STREAK_DAYS": 7,
  "LOSE_EXP_RATIO": 0.25,
  "COST_WIN": { "hunger": 8, "clean": 4, "fun": 5 },
  "COST_LOSE": { "hunger": 12, "clean": 6, "fun": 8 },
  "XP_WIN": 10,
  "XP_LOSE": 3,
  "XP_SOURCE": { "quiz": 5, "cook": 3, "care": 1, "evolve": 15 },
  "CARE_XP_DAILY": 10,
  "LEVEL_MAX": 30,
  "XP_CURVE": 40,
  "XP_POWER": 1.5,
  "TEAM_MAX": 6,
  "TEAM_EVERY": 5,
  "BOND_WEIGHT": 2,
  "GRID": [
    { "cols": 4, "pairs": 6 },
    { "cols": 4, "pairs": 8 },
    { "cols": 5, "pairs": 10 }
  ],
  "CHEST": [
    { "size": 1, "sure": 0 },
    { "size": 2, "sure": 1 },
    { "size": 3, "sure": 1 }
  ],
  "CHEST_SURE_W": { "3": 92, "4": 8 },
  "CHEST_REST_W": { "1": 40, "2": 48, "3": 10, "4": 2 },
  "CANDY": {
    "COLS": 6,
    "ROWS": 7,
    "KINDS": [4, 5, 6],
    "MOVES": [20, 18, 16],
    "TARGET": [3000, 3000, 2400],
    "CELL": 10,
    "TAPE": 1000,
    "FLAWLESS_LEFT": 0.25
  }
}$rules$::jsonb
$fn$;

