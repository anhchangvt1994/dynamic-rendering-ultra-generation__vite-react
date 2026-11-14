-- Ghép mảnh Pokémon (jigsaw): the server keeps the art and every piece's starting turn; the browser logs
-- drag / turn actions and minigame_finish replays them. Port of games/silhouette-atelier/engine.mjs (vectors.json locks parity).
create function public.minigame_jigsaw_rules()
returns jsonb language sql immutable set search_path = '' as $fn$
  select $jigsaw${"GRIDS":[[2,3],[3,3],[3,4]],"MAX_EVENTS":2000,"TURN":-2,"TRAY":-1}$jigsaw$::jsonb
$fn$;

-- starting turn of every piece: easy upright, normal any, hard always crooked
create function public.minigame_jigsaw_layout(p_seed bigint,p_difficulty int)
returns jsonb language plpgsql volatile set search_path = '' as $fn$
declare v_rules jsonb:=public.minigame_jigsaw_rules(); v_cols int; v_rows int; v_rot int[]:='{}'; v_i int;
begin
  v_cols:=(v_rules->'GRIDS'->(p_difficulty-1)->>0)::int; v_rows:=(v_rules->'GRIDS'->(p_difficulty-1)->>1)::int;
  if v_cols is null or v_rows is null then raise exception 'bad_difficulty' using errcode='P0001'; end if;
  for v_i in 1..v_cols*v_rows loop
    v_rot:=v_rot||case p_difficulty when 1 then 0 when 2 then floor(random()*4)::int else 1+floor(random()*3)::int end;
  end loop;
  return jsonb_build_object('speciesId',mod(p_seed,1025)+1,'cols',v_cols,'rows',v_rows,'rot',to_jsonb(v_rot));
end;
$fn$;

-- plays [t_ms, piece, code] events: code -2 turns a quarter, -1 returns to the tray, 0..n-1 drops into that cell
create function public.minigame_jigsaw_replay(p_layout jsonb,p_log jsonb,p_end_ms int)
returns jsonb language plpgsql stable set search_path = '' as $fn$
declare
  v_rot int[]:=array(select jsonb_array_elements_text(p_layout->'rot')::int); v_n int:=cardinality(v_rot);
  v_at int[]:=array_fill(-1,array[v_n]); v_e jsonb; v_last int:=0; v_moves int:=0; v_i int; v_code int; v_other int; v_k int; v_solved boolean:=false;
begin
  if jsonb_typeof(p_log) is distinct from 'array' or jsonb_array_length(p_log)>(public.minigame_jigsaw_rules()->>'MAX_EVENTS')::int then
    return jsonb_build_object('ok',false,'moves',0,'solved',false);
  end if;
  for v_e in select value from jsonb_array_elements(p_log) loop
    if jsonb_typeof(v_e) is distinct from 'array' or jsonb_array_length(v_e)<>3
       or jsonb_typeof(v_e->0) is distinct from 'number' or jsonb_typeof(v_e->1) is distinct from 'number' or jsonb_typeof(v_e->2) is distinct from 'number'
       or (v_e->>0)::numeric<>floor((v_e->>0)::numeric) or (v_e->>1)::numeric<>floor((v_e->>1)::numeric) or (v_e->>2)::numeric<>floor((v_e->>2)::numeric)
       or (v_e->>0)::int<v_last or (v_e->>0)::int>p_end_ms or v_solved then
      return jsonb_build_object('ok',false,'moves',v_moves,'solved',false);
    end if;
    v_i:=(v_e->>1)::int; v_code:=(v_e->>2)::int;
    if v_i<0 or v_i>=v_n or (v_at[v_i+1]=v_i and v_rot[v_i+1]=0) then return jsonb_build_object('ok',false,'moves',v_moves,'solved',false); end if;
    if v_code=-2 then v_rot[v_i+1]:=(v_rot[v_i+1]+1)%4;
    elsif v_code=-1 then
      if v_at[v_i+1]<0 then return jsonb_build_object('ok',false,'moves',v_moves,'solved',false); end if;
      v_at[v_i+1]:=-1;
    elsif v_code>=0 and v_code<v_n then
      v_other:=coalesce(array_position(v_at,v_code)-1,-1);
      if v_other=v_i then return jsonb_build_object('ok',false,'moves',v_moves,'solved',false); end if;
      if v_other>=0 then
        if v_at[v_other+1]=v_other and v_rot[v_other+1]=0 then return jsonb_build_object('ok',false,'moves',v_moves,'solved',false); end if;
        v_at[v_other+1]:=-1;
      end if;
      v_at[v_i+1]:=v_code;
    else return jsonb_build_object('ok',false,'moves',v_moves,'solved',false);
    end if;
    v_last:=(v_e->>0)::int; v_moves:=v_moves+1;
    v_solved:=true;
    for v_k in 1..v_n loop if v_at[v_k]<>v_k-1 or v_rot[v_k]<>0 then v_solved:=false; exit; end if; end loop;
  end loop;
  return jsonb_build_object('ok',true,'moves',v_moves,'solved',v_solved);
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
    return jsonb_build_object('kind','lucky-spin','difficulty',p_round.difficulty,'spun',p_round.progress->'spun');
  end if;
  raise exception 'bad_game' using errcode='P0001';
end;
$$;

create or replace function public.minigame_start(p_game text,p_individual uuid,p_difficulty smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid:=public.quiz_user(); v_rules jsonb:=public.minigame_rules();
  v_ind public.pokemon_individuals; v_care public.pokemon_care; v_player public.minigame_players;
  v_seed bigint; v_layout jsonb; v_progress jsonb; v_round public.minigame_rounds; v_hunger numeric;
begin
  if p_game is null or p_game not in ('memory','candy','tile-safari','block-lab','silhouette-atelier','lucky-spin') then raise exception 'bad_game' using errcode='P0001'; end if;
  if p_difficulty is null or p_difficulty not between 1 and 3 then raise exception 'bad_difficulty' using errcode='P0001'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || ':mg:' || p_game,0));
  perform public.minigame_expire(v_user);
  select * into v_ind from public.pokemon_individuals where id=p_individual and user_id=v_user for update;
  if not found then raise exception 'not_found' using errcode='P0001'; end if;
  if exists(select 1 from public.minigame_rounds where user_id=v_user and game=p_game and status='open') then raise exception 'round_open' using errcode='P0001'; end if;
  select * into v_care from public.pokemon_care where individual_id=p_individual;
  if not found then v_care.hunger:=(public.pokemon_care_rules()->>'START')::numeric; v_care.clean:=v_care.hunger; v_care.fun:=v_care.hunger; v_care.needs_at:=v_ind.created_at; end if;
  v_hunger:=(public.pokemon_care_now(v_care,now())).hunger;
  if v_hunger < (v_rules->>'MIN_HUNGER')::numeric then raise exception 'hungry' using errcode='P0001'; end if;
  v_player:=public.minigame_window(v_user,p_game);
  if v_player.used >= (v_rules->>'TURNS')::int then raise exception 'no_turns' using errcode='P0001'; end if;
  update public.minigame_players set used=used+1,window_start=coalesce(window_start,now()) where user_id=v_user and game=p_game;
  v_seed:=floor(random()*4503599627370496)::bigint;
  if p_game='candy' then
    v_layout:=public.minigame_layout_candy(v_seed,p_difficulty);
    v_progress:=jsonb_build_object('moves',0,'score',0,'best',0,'movesLeft',(v_rules->'CANDY'->'MOVES'->>(p_difficulty-1))::int,'doneAt',null::text);
  elsif p_game='block-lab' then
    v_layout:=jsonb_build_object('width',10,'height',20,'speciesId',mod(v_seed,1025)+1,'queue',public.minigame_block_queue());
    v_progress:=jsonb_build_object('score',0,'lines',0,'pieces',0,'doneAt',null);
  elsif p_game='silhouette-atelier' then
    v_layout:=public.minigame_jigsaw_layout(v_seed,p_difficulty);
    v_progress:=jsonb_build_object('moves',0,'solved',false,'doneAt',null);
  elsif p_game='lucky-spin' then
    v_layout:=jsonb_build_object('reelCount',3);
    v_progress:=jsonb_build_object('spun',false,'outcome',null,'rewards',null,'doneAt',null);
  elsif p_game='tile-safari' then
    v_layout:=public.minigame_tile_layout(v_seed,p_difficulty); v_progress:='{"removed":[],"moves":0,"shuffles":0,"doneAt":null}'::jsonb;
  else
    v_layout:=public.minigame_layout_memory(v_seed,(v_rules->'GRID'->(p_difficulty-1)->>'pairs')::int);
    v_progress:='{"open":null,"matched":[],"flips":0,"doneAt":null}'::jsonb;
  end if;
  insert into public.minigame_rounds(user_id,game,individual_id,difficulty,seed,layout,progress,deadline)
    values(v_user,p_game,p_individual,p_difficulty,v_seed,v_layout,v_progress,now()+make_interval(secs=>(v_rules->>'DURATION_S')::int)) returning * into v_round;
  return jsonb_build_object('round',v_round.id,'deadline',v_round.deadline,'view',public.minigame_view(v_round));
end;
$$;

create or replace function public.minigame_settle(p_round uuid,p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_rules jsonb:=public.minigame_rules(); v_round public.minigame_rounds; v_ind public.pokemon_individuals;
  v_care public.pokemon_care; v_win boolean; v_d int; v_pairs int; v_bond int:=1; v_base numeric; v_left numeric;
  v_exp int:=0; v_gifts text[]:='{}'; v_cost jsonb:='{"hunger":0,"clean":0,"fun":0}'; v_per jsonb;
  v_needs jsonb:='null'; v_floor numeric:=25; v_xp int; v_before int; v_after int; v_len int; v_combo numeric:=0; v_receipt jsonb; v_special jsonb;
  v_hunger numeric; v_clean numeric; v_fun numeric; v_flawless boolean;
begin
  select * into v_round from public.minigame_rounds where id=p_round for update;
  if not found then raise exception 'not_found' using errcode='P0001'; end if;
  if v_round.status<>'open' then return v_round.receipt; end if;
  v_d:=v_round.difficulty; v_len:=coalesce((v_round.progress->>'best')::int,0);
  if v_round.game='memory' then
    v_pairs:=(v_rules->'GRID'->(v_d-1)->>'pairs')::int;
    v_win:=p_status='won' or (p_status='expired' and jsonb_array_length(v_round.progress->'matched')=2*v_pairs);
  elsif v_round.game='candy' then v_win:=p_status='won'; v_pairs:=0;
  elsif v_round.game='tile-safari' then v_win:=p_status='won' or (p_status='expired' and jsonb_array_length(coalesce(v_round.progress->'removed','[]'::jsonb))=jsonb_array_length(v_round.layout->'tiles')); v_pairs:=0;
  elsif v_round.game='block-lab' then v_win:=p_status='won'; v_pairs:=0;
  elsif v_round.game='silhouette-atelier' then v_win:=coalesce((v_round.progress->>'solved')::boolean,false); v_pairs:=0;
  elsif v_round.game='lucky-spin' then v_win:=coalesce((v_round.progress->>'spun')::boolean,false); v_pairs:=0; p_status:='won';
  else raise exception 'bad_game' using errcode='P0001';
  end if;
  if v_round.game='tile-safari' and v_win and jsonb_array_length(coalesce(v_round.progress->'removed','[]'::jsonb))<>jsonb_array_length(v_round.layout->'tiles') then raise exception 'not_finished' using errcode='P0001'; end if;
  if v_round.game='memory' and v_win and jsonb_array_length(v_round.progress->'matched')<>2*v_pairs then raise exception 'not_finished' using errcode='P0001'; end if;
  if v_round.game='candy' and v_win then v_pairs:=0; end if;
  if v_round.game='silhouette-atelier' and v_win and not coalesce((v_round.progress->>'solved')::boolean,false) then raise exception 'not_finished' using errcode='P0001'; end if;
  if v_round.game='lucky-spin' and v_win and not coalesce((v_round.progress->>'spun')::boolean,false) then raise exception 'not_finished' using errcode='P0001'; end if;
  if v_round.individual_id is not null then
    select * into v_ind from public.pokemon_individuals where id=v_round.individual_id for update;
    if found then
      select * into v_care from public.pokemon_care where individual_id=v_ind.id for update;
      if not found then v_care.individual_id:=v_ind.id; v_care.user_id:=v_ind.user_id; v_care.hunger:=(public.pokemon_care_rules()->>'START')::numeric; v_care.clean:=v_care.hunger; v_care.fun:=v_care.hunger; v_care.needs_at:=v_ind.created_at; v_care.affection:=0; end if;
      v_bond:=public.trainer_bond(v_care.affection);
      v_base:=(v_rules->'BASE_EXP'->>(v_d-1))::numeric*(1+(v_rules->>'BOND_STEP')::numeric*(v_bond-1));
      if v_win and v_round.game in ('memory','candy') and v_len>=2 then v_combo:=least((v_rules->>'COMBO_MAX')::numeric,(v_rules->>'COMBO_STEP')::numeric*(v_len-1)); end if;
      if v_win then
        v_left := greatest(0, least(
          (v_rules->>'DURATION_S')::numeric,
          extract(epoch from v_round.deadline - coalesce((v_round.progress->>'doneAt')::timestamptz, now()))
        ));
        v_exp:=round(v_base*(1+(v_rules->>'SPEED_MAX')::numeric*v_left/(v_rules->>'DURATION_S')::numeric+v_combo))::int;
      else v_exp:=round((v_rules->>'LOSE_EXP_RATIO')::numeric*round(v_base))::int; end if;
      insert into public.pokemon_growth(individual_id,user_id,iv,bonus_exp) values(v_ind.id,v_ind.user_id,public.pokemon_birth_iv(v_ind.potential),v_exp)
        on conflict(individual_id) do update set bonus_exp=public.pokemon_growth.bonus_exp+excluded.bonus_exp;
      v_care:=public.pokemon_care_now(v_care,now()); v_per:=case when v_win then v_rules->'COST_WIN' else v_rules->'COST_LOSE' end;
      v_hunger:=greatest(v_care.hunger-(v_per->>'hunger')::numeric*v_d,least(v_care.hunger,v_floor));
      v_clean:=greatest(v_care.clean-(v_per->>'clean')::numeric*v_d,least(v_care.clean,v_floor));
      v_fun:=greatest(v_care.fun-(v_per->>'fun')::numeric*v_d,least(v_care.fun,v_floor));
      v_cost:=jsonb_build_object('hunger',v_care.hunger-v_hunger,'clean',v_care.clean-v_clean,'fun',v_care.fun-v_fun);
      v_needs:=jsonb_build_object('hunger',v_hunger,'clean',v_clean,'fun',v_fun);
      insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at) values(v_ind.id,v_ind.user_id,v_hunger,v_clean,v_fun,now())
        on conflict(individual_id) do update set hunger=excluded.hunger,clean=excluded.clean,fun=excluded.fun,needs_at=excluded.needs_at;
    end if;
  end if;
  v_before:=coalesce((select public.trainer_level(xp) from public.trainer_profiles where user_id=v_round.user_id),1);
  if v_round.game='lucky-spin' and v_win then
    v_special:=coalesce(v_round.progress->'rewards','{}'::jsonb);
    v_gifts:=array(select jsonb_array_elements_text(coalesce(v_special->'items','[]'::jsonb)));
    v_xp:=(v_special->>'xp')::int;
    insert into public.bag(user_id,item_id,count) select v_round.user_id,item,count(*) from unnest(v_gifts) item where item is not null group by item
      on conflict(user_id,item_id) do update set count=public.bag.count+excluded.count;
  elsif v_win then
    v_gifts:=public.quiz_chest((v_rules->'CHEST'->(v_d-1)->>'size')::int,(v_rules->'CHEST'->(v_d-1)->>'sure')::int,v_rules->'CHEST_SURE_W',v_rules->'CHEST_REST_W');
    insert into public.bag(user_id,item_id,count) select v_round.user_id,item,count(*) from unnest(v_gifts) item where item is not null group by item
      on conflict(user_id,item_id) do update set count=public.bag.count+excluded.count;
  end if;
  if v_win then
    insert into public.minigame_players(user_id,game,wins) values(v_round.user_id,v_round.game,1)
      on conflict(user_id,game) do update set wins=public.minigame_players.wins+1;
  end if;
  v_xp:=case when v_win then (v_rules->>'XP_WIN')::int*v_d else (v_rules->>'XP_LOSE')::int end;
  perform public.trainer_grant_xp(v_round.user_id,v_xp); perform public.quest_bump(v_round.user_id,'play',1);
  if v_win then
    perform public.quest_bump(v_round.user_id,'win',1);
    v_flawless:=case when v_round.game='candy' then (v_round.progress->>'movesLeft')::int>=ceil((v_rules->'CANDY'->>'FLAWLESS_LEFT')::numeric*(v_rules->'CANDY'->'MOVES'->>(v_d-1))::numeric)
      when v_round.game='tile-safari' then (v_round.progress->>'moves')::int<=((jsonb_array_length(v_round.layout->'tiles')/2)+2)
      else (v_round.progress->>'flips')::int=2*v_pairs end;
    if v_flawless then perform public.quest_bump(v_round.user_id,'flawless',1); end if;
  end if;
  select public.trainer_level(xp) into v_after from public.trainer_profiles where user_id=v_round.user_id;
  v_receipt:=jsonb_build_object('round',v_round.id,'status',case when v_win then 'won' else p_status end,'difficulty',v_d,
    'exp',v_exp,'gifts',to_jsonb(v_gifts),'cost',v_cost,'xp',v_xp,'level',v_after,'levelUp',v_after>v_before,
    'comboLen',v_len,'combo',v_combo,'needs',v_needs,'flips',(v_round.progress->>'flips')::int,
    'spinOutcome',v_round.progress->'outcome','spinRewards',v_special,'score',(v_round.progress->>'score')::int,'moves',(v_round.progress->>'moves')::int);
  update public.minigame_rounds set status=case when v_win then 'won' else p_status end,receipt=v_receipt where id=p_round;
  return v_receipt;
end;
$$;

create or replace function public.minigame_finish(p_round uuid,p_moves jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=public.quiz_user(); v_tol int:=(public.minigame_rules()->>'TOLERANCE_S')::int; v_round public.minigame_rounds; v_pairs int; v_res jsonb; v_late boolean; v_ms int;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text||':mg:finish',0));
  select * into v_round from public.minigame_rounds where id=p_round and user_id=v_user;
  if not found then raise exception 'not_found' using errcode='P0001'; end if;
  if v_round.status<>'open' then return v_round.receipt; end if;
  v_late:=now()>v_round.deadline+make_interval(secs=>v_tol);
  if v_round.game='candy' then
    v_res:=public.minigame_candy_replay(v_round.layout,v_round.difficulty,coalesce(p_moves,'[]'::jsonb));
    if not (v_res->>'ok')::boolean then raise exception 'bad_move' using errcode='P0001'; end if;
    if not v_late and not ((v_res->>'won')::boolean or (v_res->>'over')::boolean) then raise exception 'not_finished' using errcode='P0001'; end if;
    update public.minigame_rounds set progress=jsonb_build_object('moves',v_res->'moves','score',v_res->'score','best',v_res->'best',
      'movesLeft',v_res->'movesLeft','doneAt',case when (v_res->>'won')::boolean and not v_late then to_jsonb(now()) else null end) where id=p_round;
    return public.minigame_settle(p_round,case when (v_res->>'won')::boolean and not v_late then 'won' else 'lost' end);
  elsif v_round.game='block-lab' then
    v_ms:=least(floor(extract(epoch from now()-v_round.started_at)*1000)::int,(public.minigame_rules()->>'DURATION_S')::int*1000);
    if coalesce(jsonb_typeof(p_moves),'')<>'array' then raise exception 'bad_move' using errcode='P0001'; end if;
    v_res:=public.minigame_block_replay(v_round.layout,v_round.difficulty,p_moves,v_ms);
    if not (v_res->>'ok')::boolean then raise exception 'bad_move' using errcode='P0001'; end if;
    if not v_late and not ((v_res->>'won')::boolean or (v_res->>'over')::boolean) then raise exception 'not_finished' using errcode='P0001'; end if;
    update public.minigame_rounds set progress=jsonb_build_object('score',v_res->'score','lines',v_res->'lines','pieces',v_res->'pieces',
      'doneAt',case when (v_res->>'won')::boolean and not v_late then to_jsonb(now()) else null end) where id=p_round;
    return public.minigame_settle(p_round,case when (v_res->>'won')::boolean and not v_late then 'won' else 'lost' end);
  elsif v_round.game='silhouette-atelier' then
    v_res:=public.minigame_jigsaw_replay(v_round.layout,p_moves,((public.minigame_rules()->>'DURATION_S')::int+v_tol)*1000);
    if not (v_res->>'ok')::boolean then raise exception 'bad_move' using errcode='P0001'; end if;
    if not v_late and not (v_res->>'solved')::boolean then raise exception 'not_finished' using errcode='P0001'; end if;
    update public.minigame_rounds set progress=jsonb_build_object('moves',v_res->'moves','solved',v_res->'solved',
      'doneAt',case when (v_res->>'solved')::boolean and not v_late then to_jsonb(now()) else null end) where id=p_round;
    return public.minigame_settle(p_round,case when (v_res->>'solved')::boolean and not v_late then 'won' else 'lost' end);
  elsif v_round.game='tile-safari' then
    if jsonb_array_length(coalesce(v_round.progress->'removed','[]'::jsonb))=jsonb_array_length(v_round.layout->'tiles') then return public.minigame_settle(p_round,'won'); end if;
    if not v_late then raise exception 'not_finished' using errcode='P0001'; end if;
    return public.minigame_settle(p_round,'lost');
  end if;
  v_pairs:=(public.minigame_rules()->'GRID'->(v_round.difficulty-1)->>'pairs')::int;
  if jsonb_array_length(v_round.progress->'matched')=2*v_pairs then return public.minigame_settle(p_round,'won'); end if;
  if not v_late then raise exception 'not_finished' using errcode='P0001'; end if;
  return public.minigame_settle(p_round,'lost');
end;
$$;

-- Retired guess-by-species RPC and active rounds from its layout.
drop function if exists public.minigame_silhouette_answer(uuid,integer);
select public.minigame_settle(id,'expired') from public.minigame_rounds where game='silhouette-atelier' and status='open';
revoke execute on function public.minigame_jigsaw_rules(),public.minigame_jigsaw_layout(bigint,int),public.minigame_jigsaw_replay(jsonb,jsonb,int),
  public.minigame_view(public.minigame_rounds),public.minigame_start(text,uuid,smallint),public.minigame_settle(uuid,text),public.minigame_finish(uuid,jsonb)
  from public,anon,authenticated;
grant execute on function public.minigame_start(text,uuid,smallint),public.minigame_finish(uuid,jsonb) to authenticated;
