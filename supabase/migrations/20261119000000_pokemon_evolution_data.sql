-- Pokémon evolution, part 1: the items that stand in for trade evolutions and
-- the games' special evolution items join the Who's That Pokémon catalogue
-- (src/pages/QuizPage/items.mjs, kept equal by catalogue.test.mjs). They are
-- appended after the last rank so no existing rank moves.

insert into public.quiz_items (id, tier, hard, rank) values
  ('linking-cord', 1, false, 62),
  ('kings-rock', 1, false, 63),
  ('metal-coat', 1, false, 64),
  ('protector', 1, false, 65),
  ('dragon-scale', 1, false, 66),
  ('black-augurite', 1, false, 67),
  ('electirizer', 1, false, 68),
  ('magmarizer', 1, false, 69),
  ('up-grade', 1, false, 70),
  ('dubious-disc', 1, false, 71),
  ('peat-block', 1, false, 72),
  ('prism-scale', 1, false, 73),
  ('reaper-cloth', 1, false, 74),
  ('deep-sea-tooth', 1, false, 75),
  ('deep-sea-scale', 1, false, 76),
  ('sachet', 1, false, 77),
  ('whipped-dream', 1, false, 78),
  ('tart-apple', 1, false, 79),
  ('sweet-apple', 1, false, 80),
  ('syrupy-apple', 1, false, 81),
  ('metal-alloy', 1, false, 82),
  ('auspicious-armor', 1, false, 83),
  ('malicious-armor', 1, false, 84);
