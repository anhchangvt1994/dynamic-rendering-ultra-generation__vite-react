-- "Who's That Pokémon?": Palkia's help (docs/quiz-server-game.md)
-- Half of the stops with the Roar of Time also bend space: 2 of the round's
-- wrong options are taken away (typed rounds have none: never). On a draw of
-- its own, 1 stop in 5 tells the first letter of the name (typed rounds too).
-- Both are kept on the round and sent to the page. PALKIA_ODDS, HINT_ODDS
-- and LETTERS in src/pages/QuizPage/engine/ mirror this file.

alter table public.quiz_rounds
  add column removed smallint[],
  add column letter text;

-- Palkia's draw for a round: 2 of its wrong options, or nothing
create function public.quiz_palkia(p_round public.quiz_rounds)
returns smallint[]
language sql
volatile
set search_path = ''
as $$
  select case when p_round.hard or random() >= 0.5 then null
    else array(
      select o from unnest(p_round.options) o
      where o <> p_round.answer_id order by random() limit 2
    ) end
$$;

-- Palkia's other draw: the first letter of the answer's name as the quiz
-- shows it (pokemonLabel), from 1 to 1025, or nothing
create function public.quiz_hint(p_round public.quiz_rounds)
returns text
language sql
volatile
set search_path = ''
as $$
  select case when random() < 0.2 then substr(
    'BIVCCCSWBCMBWKBPPPRRSFEAPRSSNNNNNNCCVNJWZGOGVPPVVDDMPPGMPGAPPPAKAMMMBWVTTGGGPRSSMMFDDSDGMSCGHGODHKKVEEECMHHLKWRRCTKHSGSSSMSJEMPTMGLDEVJFPOOKKASAZMDDDMMCBMCQTTCFSFHNLLSACCLPCITTNXMFABMASPHSJASSYWQEUMSMUWGPFDGSSGQSSHSTUSMSPCRODMSHHKPDPSSTHSEMMBRESLPTLHCTGSTCBMMSPMZLWSBCDLLLSNSTSWPRKGSMSBSVSNNSWLEMHANSDSMALAMMEMPMVIRGSCSWWNCTSGSTVFCCSAZSLSBWCCBCLCAAFMCKSBDDTCAWSGSSWCHGRLBSSBMMRRRLLKGRJDTGTCMIPPESSSBBKKSLLBRCRSBBWMCVPBFCCSGADDBLMHGPCSSBBBMHCSGGGMRLHHSDCTCFLMSAWMLRTEMTYLGGMPGPDFRUMADPHRGCPMDSAVSSSTPEODSPWLHSPLPSPSPSMMPTUBZRBGWSDEATGCTPSTSSSLVWSCWPLBSKKDDMDCSSSYCTCAATGZZMCGGGSDRDSVVVDSEKEFAFJAJGFFKKKTEEEBLLCAFHCBCSASMMDGGPBBRBVMHDDZHLVCTVTTRZLKKMGCQCFBDFFGBDFFTSSVLPFFFSGPPFEMHDASASSIMBBSDCCHHTTAASHDCGSGKPTPGBANNXYZDHVRDDLTIPBPPTTYGGCVCCOCRRLWMTMMDAFLMSSSSBBSTCOPWGSPPTSMKTTMBDDJHKTTTTCCSLNBPXCKGNMMPNSBZMMGTRSRCSDISGRCCBDONTGEWDCDYBRCCAFASSCABTTSCCGSPHHHIMGOPCSMRMAFPSFSEIMCCDADADDDDZZEKUZRRGSCWKUBSOESFMFCSQQQLOTSNLPPPTMFDSDASNNGCACTBWKMMSGBBTTKCSRRFETTTWWBFPVRCOGGGHFCCVDTACFDKGSBFSSIIIIIIFABGGWCTCRIKMWIDPSOMFOAHGRIITP',
    p_round.answer_id, 1
  ) end
$$;

-- what the browser may know of a round: and what Palkia took away or told
create or replace function public.quiz_public(p_round public.quiz_rounds)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_round.id,
    'options', case when p_round.hard then null else to_jsonb(p_round.options) end,
    'veil', p_round.veil,
    'hard', p_round.hard,
    'gifts', to_jsonb(p_round.gifts),
    'bonus', p_round.bonus_slot,
    'duration_ms', p_round.duration_ms,
    'started_at', p_round.started_at,
    'frozen_at', p_round.frozen_at,
    'removed', to_jsonb(p_round.removed),
    'letter', p_round.letter,
    'now', now()
  )
$$;

-- the stop: Palkia's draw with it
create or replace function public.quiz_time_stop(p_round uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.quiz_user();
  v_player public.quiz_players;
  v_round public.quiz_rounds;
begin
  -- NOTE - The round first, then the player (quiz_time_window locks it):
  -- quiz_answer's order, or an answer sent with the stop deadlocks
  select * into v_round from public.quiz_rounds
  where id = p_round and user_id = v_user for update;
  v_player := public.quiz_time_window(v_user);
  if v_round.id is null then
    raise exception 'no_round' using errcode = 'P0001';
  end if;
  if v_round.answered_at is not null then
    raise exception 'answered' using errcode = 'P0001';
  end if;
  if v_round.frozen_at is not null then
    raise exception 'time_used' using errcode = 'P0001';
  end if;
  if public.quiz_clock(v_round) >= v_round.duration_ms then
    raise exception 'time_over' using errcode = 'P0001';
  end if;
  if v_player.time_used >= 10 then
    raise exception 'no_time' using errcode = 'P0001';
  end if;
  update public.quiz_players
  set time_used = time_used + 1, time_start = coalesce(time_start, now())
  where user_id = v_user;
  update public.quiz_rounds set
    frozen_at = now(),
    removed = public.quiz_palkia(v_round),
    letter = public.quiz_hint(v_round)
  where id = v_round.id
  returning * into v_round;
  return public.quiz_public(v_round);
end;
$$;

revoke execute on function
  public.quiz_palkia(public.quiz_rounds),
  public.quiz_hint(public.quiz_rounds)
from public, anon, authenticated;
