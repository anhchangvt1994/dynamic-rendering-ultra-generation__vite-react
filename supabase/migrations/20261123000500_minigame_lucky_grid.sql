-- Lucky Spin: 3 rows x 5 reels, 3 spins per round, one reward when the third spin lands.
-- Port of src/pages/MiniGamePage/games/lucky-spin/rules.mjs: keep both in step (sqlParity.test.mjs).

create function public.minigame_spin_rules()
returns jsonb language sql immutable set search_path = '' as $fn$
  select $spin${
 "COLS": 5,
 "ROWS": 3,
 "SPINS": 3,
 "SPECIES": [
  25,
  133,
  448,
  6,
  150
 ],
 "WEIGHTS_CUM": [
  34,
  60,
  80,
  93,
  100
 ],
 "SYMBOL_PTS": [
  1,
  2,
  3,
  5,
  8
 ],
 "RUN_MULT": [
  0,
  0,
  0,
  1,
  3,
  8
 ],
 "SWEEP_MULT": 2,
 "STREAK10": [
  10,
  15,
  20
 ],
 "TIERS": {
  "uncommon": 4,
  "rare": 12
 },
 "XP_STEP": 3,
 "XP_MAX": 5,
 "ITEM_STEP": 2,
 "ITEM_MAX": 5
}$spin$::jsonb
$fn$;

-- runs of 3+ equal symbols along each row (grid is row-major, 15 symbols)
create function public.minigame_spin_score(p_grid int[])
returns jsonb language plpgsql immutable set search_path = '' as $fn$
declare v_r jsonb:=public.minigame_spin_rules(); v_lines jsonb:='[]'::jsonb; v_base int:=0; v_row int; v_c int; v_sym int; v_len int; v_pts int;
begin
  for v_row in 0..2 loop
    v_c:=0;
    while v_c<5 loop
      v_sym:=p_grid[v_row*5+v_c+1]; v_len:=1;
      while v_c+v_len<5 and p_grid[v_row*5+v_c+v_len+1]=v_sym loop v_len:=v_len+1; end loop;
      if v_len>=3 then
        v_pts:=(v_r->'SYMBOL_PTS'->>v_sym)::int*(v_r->'RUN_MULT'->>v_len)::int;
        v_lines:=v_lines||jsonb_build_object('row',v_row,'start',v_c,'len',v_len,'sym',v_sym,'pts',v_pts);
        v_base:=v_base+v_pts;
      end if;
      v_c:=v_c+v_len;
    end loop;
  end loop;
  return jsonb_build_object('lines',v_lines,'swept',jsonb_array_length(v_lines)=3,
    'pts',case when jsonb_array_length(v_lines)=3 then v_base*(v_r->>'SWEEP_MULT')::int else v_base end);
end;
$fn$;

create or replace function public.minigame_view(p_round public.minigame_rounds)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_grid jsonb := public.minigame_rules()->'GRID'->(p_round.difficulty - 1);
  v_candy jsonb := public.minigame_rules()->'CANDY';
  v_open jsonb := p_round.progress->'open';
  v_matched int[] := array(select jsonb_array_elements_text(coalesce(p_round.progress->'matched','[]'::jsonb))::int);
  v_shown int[] := v_matched;
  v_removed int[] := array(select jsonb_array_elements_text(coalesce(p_round.progress->'removed','[]'::jsonb))::int);
begin
  if p_round.game='candy' then
    return jsonb_build_object('kind','candy','cols',v_candy->'COLS','rows',v_candy->'ROWS',
      'kinds',v_candy->'KINDS'->(p_round.difficulty-1),'movesMax',v_candy->'MOVES'->(p_round.difficulty-1),
      'target',v_candy->'TARGET'->(p_round.difficulty-1),'board',p_round.layout->'board',
      'tape',p_round.layout->'tape','pos',p_round.layout->'pos');
  elsif p_round.game='memory' then
    if v_open is not null and jsonb_typeof(v_open)='number' then v_shown:=v_shown || (v_open #>> '{}')::int; end if;
    return jsonb_build_object('cols',v_grid->'cols','cards',jsonb_array_length(p_round.layout->'cards'),
      'kind','memory','matched',p_round.progress->'matched','open',v_open,
      'faces',(select coalesce(jsonb_object_agg(i::text,p_round.layout->'cards'->i),'{}'::jsonb) from unnest(v_shown) i));
  elsif p_round.game='tile-safari' then
    return jsonb_build_object('kind','tile-safari','rows',p_round.layout->'rows','cols',p_round.layout->'cols','tiles',p_round.layout->'tiles',
      'removed',to_jsonb(v_removed),'shuffles',3-coalesce((p_round.progress->>'shuffles')::int,0));
  elsif p_round.game='block-lab' then
    return jsonb_build_object('kind','block-lab','difficulty',p_round.difficulty,'width',10,'height',20,
      'queue',p_round.layout->'queue','speciesId',p_round.layout->'speciesId',
      'goal',(public.minigame_block_rules()->'LINE_GOALS'->>(p_round.difficulty-1))::int,
      'elapsedMs',least(floor(extract(epoch from now()-p_round.started_at)*1000)::int,(public.minigame_rules()->>'DURATION_S')::int*1000),
      'durationMs',(public.minigame_rules()->>'DURATION_S')::int*1000);
  elsif p_round.game='silhouette-atelier' then
    return jsonb_build_object('kind','silhouette-atelier','difficulty',p_round.difficulty,'cols',p_round.layout->'cols','rows',p_round.layout->'rows',
      'rot',p_round.layout->'rot','artSpeciesId',p_round.layout->'speciesId',
      'elapsedMs',least(floor(extract(epoch from now()-p_round.started_at)*1000)::int,(public.minigame_rules()->>'DURATION_S')::int*1000),
      'durationMs',(public.minigame_rules()->>'DURATION_S')::int*1000);
  elsif p_round.game='lucky-spin' then
    return jsonb_build_object('kind','lucky-spin','difficulty',p_round.difficulty,'spun',p_round.progress->'spun',
      'spins',coalesce(p_round.progress->'spins','[]'::jsonb),'total',coalesce((p_round.progress->>'total')::int,0),
      'streak',coalesce((p_round.progress->>'streak')::int,0));
  end if;
  raise exception 'bad_game' using errcode='P0001';
end;
$$;

drop function public.minigame_spin(uuid);
create function public.minigame_spin(p_round uuid)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  v_user uuid:=public.quiz_user(); v_r jsonb:=public.minigame_spin_rules(); v_round public.minigame_rounds;
  v_spins jsonb; v_n int; v_grid int[]:='{}'; v_i int; v_draw int; v_sym int; v_score jsonb; v_streak int; v_mult int; v_pts int; v_gain int; v_total int;
  v_step jsonb; v_outcome text; v_rewards jsonb; v_receipt jsonb;
begin
  select * into v_round from public.minigame_rounds where id=p_round and user_id=v_user for update;
  if not found or v_round.game<>'lucky-spin' then raise exception 'not_found' using errcode='P0001'; end if;
  v_spins:=coalesce(v_round.progress->'spins','[]'::jsonb); v_n:=jsonb_array_length(v_spins);
  if v_round.status<>'open' or v_n>=(v_r->>'SPINS')::int then
    return jsonb_build_object('spin',v_spins->(v_n-1),'spins',v_n,'total',coalesce((v_round.progress->>'total')::int,0),'done',v_n>=(v_r->>'SPINS')::int,
      'outcome',v_round.progress->'outcome','rewards',v_round.progress->'rewards','receipt',v_round.receipt);
  end if;
  if now()>v_round.deadline+make_interval(secs=>(public.minigame_rules()->>'TOLERANCE_S')::int) then raise exception 'round_closed' using errcode='P0001'; end if;
  for v_i in 1..(v_r->>'COLS')::int*(v_r->>'ROWS')::int loop
    v_draw:=floor(random()*100)::int; v_sym:=0;
    while v_draw>=(v_r->'WEIGHTS_CUM'->>v_sym)::int loop v_sym:=v_sym+1; end loop;
    v_grid:=v_grid||v_sym;
  end loop;
  v_score:=public.minigame_spin_score(v_grid); v_pts:=(v_score->>'pts')::int;
  v_streak:=case when v_pts>0 then coalesce((v_round.progress->>'streak')::int,0)+1 else 0 end;
  v_mult:=case when v_pts>0 then (v_r->'STREAK10'->>(least(v_streak,jsonb_array_length(v_r->'STREAK10'))-1))::int else 10 end;
  v_gain:=(v_pts*v_mult)/10; v_total:=coalesce((v_round.progress->>'total')::int,0)+v_gain;
  v_step:=jsonb_build_object('grid',to_jsonb(v_grid),'lines',v_score->'lines','swept',v_score->'swept','pts',v_pts,'streak',v_streak,'mult10',v_mult,'score',v_gain,'total',v_total);
  v_n:=v_n+1;
  update public.minigame_rounds set progress=progress||jsonb_build_object('spins',v_spins||v_step,'total',v_total,'streak',v_streak) where id=p_round;
  if v_n<(v_r->>'SPINS')::int then
    return jsonb_build_object('spin',v_step,'spins',v_n,'total',v_total,'done',false);
  end if;
  v_outcome:=case when v_total>=(v_r->'TIERS'->>'rare')::int then 'rare' when v_total>=(v_r->'TIERS'->>'uncommon')::int then 'uncommon' else 'common' end;
  v_rewards:=jsonb_build_object('xp',1+least((v_r->>'XP_MAX')::int-1,v_total/(v_r->>'XP_STEP')::int),
    'items',to_jsonb(array_fill('oran-berry'::text,array[least((v_r->>'ITEM_MAX')::int,v_total/(v_r->>'ITEM_STEP')::int)])));
  update public.minigame_rounds set progress=progress||jsonb_build_object('spun',true,'outcome',v_outcome,'rewards',v_rewards,'doneAt',now()) where id=p_round;
  v_receipt:=public.minigame_settle(p_round,'won');
  return jsonb_build_object('spin',v_step,'spins',v_n,'total',v_total,'done',true,'outcome',v_outcome,'rewards',v_rewards,'receipt',v_receipt);
end;
$fn$;

revoke execute on function public.minigame_spin(uuid),public.minigame_spin_score(int[]),public.minigame_spin_rules() from public,anon,authenticated;
grant execute on function public.minigame_spin(uuid) to authenticated;
