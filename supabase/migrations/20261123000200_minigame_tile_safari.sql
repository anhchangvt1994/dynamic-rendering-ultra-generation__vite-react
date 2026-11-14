-- Pokémon Tile Safari: server-owned paired tiles, legal exposure/removal, shared settlement.
-- Chọn cặp (Pikachu classic): two equal tiles vanish when a line of at most two turns joins them
-- through empty cells; the one-cell ring around the board counts as empty. Same rules as games/tile-safari/rules.mjs.
create function public.minigame_tile_empty(p_rows int,p_cols int,p_removed int[],p_r int,p_c int)
returns boolean language sql immutable set search_path = '' as $$
  select case when p_r < -1 or p_r > p_rows or p_c < -1 or p_c > p_cols then false
    when p_r < 0 or p_r >= p_rows or p_c < 0 or p_c >= p_cols then true
    else (p_r*p_cols+p_c) = any(p_removed) end
$$;

create function public.minigame_tile_clear(p_rows int,p_cols int,p_removed int[],p_r1 int,p_c1 int,p_r2 int,p_c2 int)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v_dr int:=sign(p_r2-p_r1); v_dc int:=sign(p_c2-p_c1); v_r int; v_c int;
begin
  if p_r1<>p_r2 and p_c1<>p_c2 then return false; end if;
  v_r:=p_r1+v_dr; v_c:=p_c1+v_dc;
  while v_r<>p_r2 or v_c<>p_c2 loop
    if not public.minigame_tile_empty(p_rows,p_cols,p_removed,v_r,v_c) then return false; end if;
    v_r:=v_r+v_dr; v_c:=v_c+v_dc;
  end loop;
  return true;
end;
$$;

create function public.minigame_tile_turn(p_rows int,p_cols int,p_removed int[],p_r1 int,p_c1 int,p_r2 int,p_c2 int)
returns boolean language sql immutable set search_path = '' as $$
  select (public.minigame_tile_empty(p_rows,p_cols,p_removed,p_r1,p_c2)
      and public.minigame_tile_clear(p_rows,p_cols,p_removed,p_r1,p_c1,p_r1,p_c2)
      and public.minigame_tile_clear(p_rows,p_cols,p_removed,p_r1,p_c2,p_r2,p_c2))
    or (public.minigame_tile_empty(p_rows,p_cols,p_removed,p_r2,p_c1)
      and public.minigame_tile_clear(p_rows,p_cols,p_removed,p_r1,p_c1,p_r2,p_c1)
      and public.minigame_tile_clear(p_rows,p_cols,p_removed,p_r2,p_c1,p_r2,p_c2))
$$;

create function public.minigame_tile_connect(p_rows int,p_cols int,p_removed int[],p_a int,p_b int)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v_r1 int:=p_a/p_cols; v_c1 int:=p_a%p_cols; v_r2 int:=p_b/p_cols; v_c2 int:=p_b%p_cols; v_d int; v_dr int; v_dc int; v_r int; v_c int;
begin
  if public.minigame_tile_clear(p_rows,p_cols,p_removed,v_r1,v_c1,v_r2,v_c2) then return true; end if;
  if public.minigame_tile_turn(p_rows,p_cols,p_removed,v_r1,v_c1,v_r2,v_c2) then return true; end if;
  for v_d in 0..3 loop
    v_dr:=(array[-1,1,0,0])[v_d+1]; v_dc:=(array[0,0,-1,1])[v_d+1];
    v_r:=v_r1+v_dr; v_c:=v_c1+v_dc;
    while public.minigame_tile_empty(p_rows,p_cols,p_removed,v_r,v_c) loop
      if public.minigame_tile_turn(p_rows,p_cols,p_removed,v_r,v_c,v_r2,v_c2) then return true; end if;
      v_r:=v_r+v_dr; v_c:=v_c+v_dc;
    end loop;
  end loop;
  return false;
end;
$$;

create function public.minigame_tile_has_move(p_rows int,p_cols int,p_tiles int[],p_removed int[])
returns boolean language plpgsql immutable set search_path = '' as $$
declare i int; j int; n int:=cardinality(p_tiles);
begin
  for i in 0..n-2 loop
    if i=any(p_removed) then continue; end if;
    for j in i+1..n-1 loop
      if not(j=any(p_removed)) and p_tiles[j+1]=p_tiles[i+1] and public.minigame_tile_connect(p_rows,p_cols,p_removed,i,j) then return true; end if;
    end loop;
  end loop;
  return false;
end;
$$;

-- the tiles still on the board dealt again on the same cells, until a move exists
create function public.minigame_tile_deal(p_tiles int[],p_removed int[],p_rows int,p_cols int)
returns int[] language plpgsql volatile set search_path = '' as $$
declare v_cells int[]; v_kinds int[]; v_out int[]; v_try int; i int;
begin
  v_cells:=array(select c from generate_series(0,cardinality(p_tiles)-1) c where not(c=any(p_removed)) order by c);
  for v_try in 1..80 loop
    v_kinds:=array(select p_tiles[c+1] from unnest(v_cells) c order by random());
    v_out:=p_tiles;
    for i in 1..coalesce(cardinality(v_cells),0) loop v_out[v_cells[i]+1]:=v_kinds[i]; end loop;
    if public.minigame_tile_has_move(p_rows,p_cols,v_out,p_removed) then return v_out; end if;
  end loop;
  return p_tiles;
end;
$$;

create function public.minigame_tile_layout(p_seed bigint, p_difficulty int)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare
  v_rows int:=case p_difficulty when 1 then 6 when 2 then 8 when 3 then 8 else 0 end;
  v_cols int:=case p_difficulty when 1 then 6 when 2 then 6 when 3 then 7 else 0 end;
  v_kinds int:=v_rows*v_cols/4; v_ids int[]; v_tiles int[];
begin
  if v_rows=0 then raise exception 'bad_difficulty' using errcode='P0001'; end if;
  select array_agg(id order by md5(p_seed::text||':'||id::text)) into v_ids from generate_series(1,1025) id;
  v_tiles:=v_ids[1:v_kinds]||v_ids[1:v_kinds]||v_ids[1:v_kinds]||v_ids[1:v_kinds];
  v_tiles:=public.minigame_tile_deal(v_tiles,'{}',v_rows,v_cols);
  return jsonb_build_object('tiles',to_jsonb(v_tiles),'rows',v_rows,'cols',v_cols);
end;
$$;

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
    return jsonb_build_object('kind','block-lab','difficulty',p_round.difficulty,'board',p_round.progress->'board',
      'score',p_round.progress->'score','pieces',p_round.progress->'pieces','width',p_round.layout->'width',
      'height',p_round.layout->'height','speciesId',p_round.layout->'speciesId','target',case p_round.difficulty when 1 then 500 when 2 then 1000 else 1500 end);
  elsif p_round.game='silhouette-atelier' then
    return jsonb_build_object('kind','silhouette-atelier','difficulty',p_round.difficulty,'pieceCount',p_round.layout->'pieceCount',
      'artSpeciesId',p_round.layout->'speciesId','placed',p_round.progress->'placed','guesses',p_round.progress->'guesses','solved',p_round.progress->'solved');
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
    v_layout:=jsonb_build_object('width',10,'height',20,'speciesId',mod(v_seed,1025)+1);
    v_progress:=jsonb_build_object('board','[]'::jsonb,'score',0,'moves',0,'pieces',0,'doneAt',null);
  elsif p_game='silhouette-atelier' then
    v_layout:=jsonb_build_object('speciesId',mod(v_seed,1025)+1,'pieceCount',case p_difficulty when 1 then 4 when 2 then 6 else 9 end);
    v_progress:=jsonb_build_object('placed','[]'::jsonb,'guesses',0,'solved',false,'doneAt',null);
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

create function public.minigame_tile_remove(p_round uuid,p_a integer,p_b integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid:=public.quiz_user(); v_round public.minigame_rounds; v_tiles int[]; v_removed int[]; v_rows int; v_cols int; v_moves int; v_done boolean;
begin
  select * into v_round from public.minigame_rounds where id=p_round and user_id=v_user for update;
  if not found then raise exception 'not_found' using errcode='P0001'; end if;
  if v_round.game<>'tile-safari' then raise exception 'not_found' using errcode='P0001'; end if;
  if v_round.status<>'open' then return jsonb_build_object('removed',v_round.progress->'removed','moves',v_round.progress->'moves','done',v_round.status='won'); end if;
  if now()>v_round.deadline+make_interval(secs=>(public.minigame_rules()->>'TOLERANCE_S')::int) then raise exception 'round_closed' using errcode='P0001'; end if;
  v_tiles:=public.minigame_candy_arr(v_round.layout->'tiles'); v_rows:=(v_round.layout->>'rows')::int; v_cols:=(v_round.layout->>'cols')::int;
  v_removed:=array(select jsonb_array_elements_text(coalesce(v_round.progress->'removed','[]'::jsonb))::int);
  if p_a is null or p_b is null or p_a<0 or p_b<0 or p_a>=cardinality(v_tiles) or p_b>=cardinality(v_tiles) or p_a=p_b
    or p_a=any(v_removed) or p_b=any(v_removed) or v_tiles[p_a+1]<>v_tiles[p_b+1]
    or not public.minigame_tile_connect(v_rows,v_cols,v_removed,p_a,p_b) then
    raise exception 'bad_pair' using errcode='P0001';
  end if;
  v_removed:=array(select x from unnest(v_removed||p_a||p_b) x order by x);
  v_moves:=coalesce((v_round.progress->>'moves')::int,0)+1;
  v_done:=cardinality(v_removed)=cardinality(v_tiles);
  update public.minigame_rounds set progress=progress||jsonb_build_object('removed',to_jsonb(v_removed),'moves',v_moves,'doneAt',case when v_done then to_jsonb(now()) else 'null'::jsonb end) where id=p_round;
  return jsonb_build_object('removed',to_jsonb(v_removed),'moves',v_moves,'done',v_done,
    'stuck',not v_done and not public.minigame_tile_has_move(v_rows,v_cols,v_tiles,v_removed));
end;
$$;

create function public.minigame_tile_shuffle(p_round uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid:=public.quiz_user(); v_round public.minigame_rounds; v_tiles int[]; v_removed int[]; v_used int;
begin
  select * into v_round from public.minigame_rounds where id=p_round and user_id=v_user for update;
  if not found or v_round.game<>'tile-safari' then raise exception 'not_found' using errcode='P0001'; end if;
  if v_round.status<>'open' then raise exception 'round_closed' using errcode='P0001'; end if;
  if now()>v_round.deadline+make_interval(secs=>(public.minigame_rules()->>'TOLERANCE_S')::int) then raise exception 'round_closed' using errcode='P0001'; end if;
  v_used:=coalesce((v_round.progress->>'shuffles')::int,0);
  if v_used>=3 then raise exception 'no_shuffles' using errcode='P0001'; end if;
  v_removed:=array(select jsonb_array_elements_text(coalesce(v_round.progress->'removed','[]'::jsonb))::int);
  v_tiles:=public.minigame_tile_deal(public.minigame_candy_arr(v_round.layout->'tiles'),v_removed,(v_round.layout->>'rows')::int,(v_round.layout->>'cols')::int);
  update public.minigame_rounds set layout=jsonb_set(layout,'{tiles}',to_jsonb(v_tiles)),progress=progress||jsonb_build_object('shuffles',v_used+1) where id=p_round;
  return jsonb_build_object('tiles',to_jsonb(v_tiles),'shuffles',2-v_used);
end;
$$;

create function public.minigame_block_drop(p_round uuid,p_piece integer,p_x integer,p_rotation integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid:=public.quiz_user(); v_round public.minigame_rounds; v_cells int[]; v_moves int; v_score int; v_target int; v_done boolean;
  v_shapes jsonb:='[[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[1,1],[2,1]],[[2,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[0,1],[1,1]],[[1,0],[2,0],[0,1],[1,1]],[[1,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[2,0],[1,1]]]'::jsonb;
  v_xs int[]; v_ys int[]; v_tx int; v_ty int; v_minx int; v_miny int; v_y int:=0; v_fit boolean; v_k int; i int; v_row int; v_lines int:=0; v_full int[]; v_next int[]; v_c int;
begin
  select * into v_round from public.minigame_rounds where id=p_round and user_id=v_user for update;
  if not found then raise exception 'not_found' using errcode='P0001'; end if;
  if v_round.game<>'block-lab' then raise exception 'not_found' using errcode='P0001'; end if;
  if v_round.status<>'open' then return jsonb_build_object('done',v_round.status='won','score',v_round.receipt->'score'); end if;
  if now()>v_round.deadline+make_interval(secs=>(public.minigame_rules()->>'TOLERANCE_S')::int) then raise exception 'round_closed' using errcode='P0001'; end if;
  if p_piece is null or p_rotation is null or p_x is null or p_piece not between 0 and 6 or p_rotation not between 0 and 3 or p_x<0 or p_x>9 then raise exception 'bad_move' using errcode='P0001'; end if;
  v_xs:=array(select (c->>0)::int from jsonb_array_elements(v_shapes->p_piece) c);
  v_ys:=array(select (c->>1)::int from jsonb_array_elements(v_shapes->p_piece) c);
  for v_k in 1..p_rotation loop
    for i in 1..4 loop v_tx:=-v_ys[i]; v_ty:=v_xs[i]; v_xs[i]:=v_tx; v_ys[i]:=v_ty; end loop;
    select min(x),min(y) into v_minx,v_miny from unnest(v_xs,v_ys) t(x,y);
    for i in 1..4 loop v_xs[i]:=v_xs[i]-v_minx; v_ys[i]:=v_ys[i]-v_miny; end loop;
  end loop;
  v_cells:=array(select jsonb_array_elements_text(coalesce(v_round.progress->'board','[]'::jsonb))::int);
  v_fit:=true;
  for i in 1..4 loop
    if p_x+v_xs[i]>9 or v_ys[i]>19 or ((v_ys[i])*10+p_x+v_xs[i])=any(v_cells) then v_fit:=false; end if;
  end loop;
  if not v_fit then raise exception 'bad_move' using errcode='P0001'; end if;
  loop
    v_fit:=true;
    for i in 1..4 loop
      if v_y+1+v_ys[i]>19 or ((v_y+1+v_ys[i])*10+p_x+v_xs[i])=any(v_cells) then v_fit:=false; end if;
    end loop;
    exit when not v_fit;
    v_y:=v_y+1;
  end loop;
  for i in 1..4 loop v_cells:=v_cells||((v_y+v_ys[i])*10+p_x+v_xs[i]); end loop;
  select coalesce(array_agg(r),'{}') into v_full from generate_series(0,19) r
    where (select count(*) from unnest(v_cells) c where c/10=r)=10;
  v_lines:=cardinality(v_full);
  if v_lines>0 then
    v_next:='{}';
    foreach v_c in array v_cells loop
      if not (v_c/10=any(v_full)) then
        v_next:=v_next||(v_c+10*(select count(*) from unnest(v_full) f where f>v_c/10)::int);
      end if;
    end loop;
    v_cells:=v_next;
  end if;
  v_moves:=coalesce((v_round.progress->>'moves')::int,0)+1; v_score:=coalesce((v_round.progress->>'score')::int,0)+v_lines*100;
  v_target:=case v_round.difficulty when 1 then 500 when 2 then 1000 else 1500 end; v_done:=v_score>=v_target;
  update public.minigame_rounds set progress=jsonb_build_object('board',to_jsonb(v_cells),'score',v_score,'moves',v_moves,'pieces',coalesce((progress->>'pieces')::int,0)+1,'doneAt',case when v_done then to_jsonb(now()) else 'null'::jsonb end) where id=p_round;
  if v_done then perform public.minigame_settle(p_round,'won'); end if;
  return jsonb_build_object('board',to_jsonb(v_cells),'score',v_score,'moves',v_moves,'lines',v_lines,'done',v_done);
end;
$$;

create function public.minigame_silhouette_answer(p_round uuid,p_species integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=public.quiz_user(); v_round public.minigame_rounds; v_guesses int; v_done boolean; v_placed int[]; v_piece int;
begin
  select * into v_round from public.minigame_rounds where id=p_round and user_id=v_user for update;
  if not found then raise exception 'not_found' using errcode='P0001'; end if;
  if v_round.game<>'silhouette-atelier' then raise exception 'not_found' using errcode='P0001'; end if;
  if v_round.status<>'open' then return jsonb_build_object('solved',v_round.status='won','guesses',v_round.progress->'guesses'); end if;
  if now()>v_round.deadline+make_interval(secs=>(public.minigame_rules()->>'TOLERANCE_S')::int) then raise exception 'round_closed' using errcode='P0001'; end if;
  if p_species is null or p_species<1 or p_species>1025 then raise exception 'bad_answer' using errcode='P0001'; end if;
  v_guesses:=coalesce((v_round.progress->>'guesses')::int,0)+1;
  v_done:=p_species=(v_round.layout->>'speciesId')::int;
  v_placed:=array(select jsonb_array_elements_text(coalesce(v_round.progress->'placed','[]'::jsonb))::int);
  if v_done then
    for v_piece in 0..((v_round.layout->>'pieceCount')::int-1) loop
      if not(v_piece=any(v_placed)) then v_placed:=v_placed||v_piece; end if;
    end loop;
  elsif cardinality(v_placed)<(v_round.layout->>'pieceCount')::int-1 then
    v_placed:=v_placed||cardinality(v_placed);
  end if;
  update public.minigame_rounds set progress=jsonb_build_object('placed',to_jsonb(v_placed),'guesses',v_guesses,'solved',v_done,'doneAt',case when v_done then to_jsonb(now()) else 'null'::jsonb end) where id=p_round;
  if v_done then perform public.minigame_settle(p_round,'won'); end if;
  return jsonb_build_object('solved',v_done,'guesses',v_guesses,'placed',to_jsonb(v_placed));
end;
$$;

create function public.minigame_spin(p_round uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=public.quiz_user(); v_round public.minigame_rounds; v_draw numeric; v_result text; v_rewards jsonb; v_receipt jsonb;
begin
  select * into v_round from public.minigame_rounds where id=p_round and user_id=v_user for update;
  if not found then raise exception 'not_found' using errcode='P0001'; end if;
  if v_round.game<>'lucky-spin' then raise exception 'not_found' using errcode='P0001'; end if;
  if coalesce((v_round.progress->>'spun')::boolean,false) then return jsonb_build_object('outcome',v_round.progress->'outcome','rewards',v_round.progress->'rewards'); end if;
  if v_round.status<>'open' then return jsonb_build_object('outcome',v_round.progress->'outcome','rewards',v_round.progress->'rewards','receipt',v_round.receipt); end if;
  if now()>v_round.deadline+make_interval(secs=>(public.minigame_rules()->>'TOLERANCE_S')::int) then raise exception 'round_closed' using errcode='P0001'; end if;
  v_draw:=random();
  v_result:=case when v_draw<0.80 then 'common' when v_draw<0.97 then 'uncommon' else 'rare' end;
  v_rewards:=case v_result when 'common' then '{"xp":1,"items":[]}'::jsonb when 'uncommon' then '{"xp":2,"items":["oran-berry"]}'::jsonb else '{"xp":3,"items":["oran-berry","oran-berry"]}'::jsonb end;
  update public.minigame_rounds set progress=progress||jsonb_build_object('spun',true,'outcome',v_result,'rewards',v_rewards,'doneAt',now()) where id=p_round;
  v_receipt:=public.minigame_settle(p_round,'won');
  return jsonb_build_object('outcome',v_result,'rewards',v_rewards,'receipt',v_receipt);
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
  elsif v_round.game='block-lab' then v_win:=p_status='won' and (v_round.progress->>'score')::int >= (case v_d when 1 then 500 when 2 then 1000 else 1500 end); v_pairs:=0;
  elsif v_round.game='silhouette-atelier' then v_win:=coalesce((v_round.progress->>'solved')::boolean,false); v_pairs:=0;
  elsif v_round.game='lucky-spin' then v_win:=coalesce((v_round.progress->>'spun')::boolean,false); v_pairs:=0; p_status:='won';
  else raise exception 'bad_game' using errcode='P0001';
  end if;
  if v_round.game='tile-safari' and v_win and jsonb_array_length(coalesce(v_round.progress->'removed','[]'::jsonb))<>jsonb_array_length(v_round.layout->'tiles') then raise exception 'not_finished' using errcode='P0001'; end if;
  if v_round.game='memory' and v_win and jsonb_array_length(v_round.progress->'matched')<>2*v_pairs then raise exception 'not_finished' using errcode='P0001'; end if;
  if v_round.game='candy' and v_win then v_pairs:=0; end if;
  if v_round.game='block-lab' and v_win and (v_round.progress->>'score')::int < (case v_d when 1 then 500 when 2 then 1000 else 1500 end) then raise exception 'not_finished' using errcode='P0001'; end if;
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

create or replace function public.minigame_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid:=public.quiz_user(); v_rules jsonb:=public.minigame_rules(); v_profile public.trainer_profiles; v_level int;
  v_games jsonb:='{}'; v_player public.minigame_players; v_game text; v_round public.minigame_rounds; v_open jsonb; v_one jsonb; v_opens jsonb:='{}';
begin
  perform public.minigame_expire(v_user); perform public.trainer_grant_xp(v_user,0); perform public.quest_ensure(v_user);
  select * into v_profile from public.trainer_profiles where user_id=v_user; v_level:=public.trainer_level(v_profile.xp);
  foreach v_game in array array['memory','candy','tile-safari','block-lab','silhouette-atelier','lucky-spin'] loop
    v_player:=public.minigame_window(v_user,v_game);
    v_games:=v_games||jsonb_build_object(v_game,jsonb_build_object('left',greatest(0,(v_rules->>'TURNS')::int-v_player.used),
      'resetAt',case when v_player.window_start is null then null else v_player.window_start+make_interval(hours=>(v_rules->>'REFILL_HOURS')::int) end,'wins',v_player.wins));
  end loop;
  for v_round in select * from public.minigame_rounds where user_id=v_user and status='open' order by started_at desc loop
    v_one:=jsonb_build_object('round',v_round.id,'game',v_round.game,'individualId',v_round.individual_id,'difficulty',v_round.difficulty,
      'startedAt',v_round.started_at,'deadline',v_round.deadline,'view',public.minigame_view(v_round));
    v_open:=coalesce(v_open,v_one); v_opens:=v_opens||jsonb_build_object(v_round.game,v_one);
  end loop;
  return jsonb_build_object('trainer',jsonb_build_object('xp',v_profile.xp,'level',v_level,'avatar',v_profile.avatar,'team',to_jsonb(v_profile.team),
    'slots',public.trainer_team_slots(v_level),'owned',(select count(*) from public.pokemon_individuals where user_id=v_user)),
    'games',v_games,'quests',jsonb_build_object('day',(now() at time zone 'utc')::date,'streak',v_profile.quest_streak,'streakDay',v_profile.quest_streak_day,
      'items',(select coalesce(jsonb_agg(jsonb_build_object('slot',q.slot,'kind',q.kind,'goal',q.goal,'progress',q.progress,'xp',(k.c->>'xp')::int,
       'claimed',q.claimed_at is not null,'gift',q.gift) order by q.slot),'[]') from public.minigame_quests q
       join lateral(select c from jsonb_array_elements(public.minigame_quest_catalog()) c where c->>'kind'=q.kind) k on true
       where q.user_id=v_user and q.day=(now() at time zone 'utc')::date)),
    'open',v_open,'opens',v_opens,'now',now());
end;
$$;

create or replace function public.minigame_finish(p_round uuid,p_moves jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=public.quiz_user(); v_tol int:=(public.minigame_rules()->>'TOLERANCE_S')::int; v_round public.minigame_rounds; v_pairs int; v_res jsonb; v_late boolean;
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

revoke execute on function public.minigame_tile_empty(int,int,int[],int,int),public.minigame_tile_clear(int,int,int[],int,int,int,int),public.minigame_tile_turn(int,int,int[],int,int,int,int),public.minigame_tile_connect(int,int,int[],int,int),public.minigame_tile_has_move(int,int,int[],int[]),public.minigame_tile_deal(int[],int[],int,int),public.minigame_tile_layout(bigint,int),public.minigame_tile_remove(uuid,integer,integer),public.minigame_tile_shuffle(uuid),public.minigame_block_drop(uuid,integer,integer,integer),public.minigame_silhouette_answer(uuid,integer),public.minigame_spin(uuid) from public,anon,authenticated;
grant execute on function public.minigame_block_drop(uuid,integer,integer,integer),public.minigame_silhouette_answer(uuid,integer),public.minigame_spin(uuid) to authenticated;
revoke execute on function public.minigame_view(public.minigame_rounds),public.minigame_settle(uuid,text),public.minigame_finish(uuid,jsonb),public.minigame_status(),public.minigame_start(text,uuid,smallint) from public,anon,authenticated;
grant execute on function public.minigame_tile_remove(uuid,integer,integer),public.minigame_tile_shuffle(uuid),public.minigame_finish(uuid,jsonb),public.minigame_status(),public.minigame_start(text,uuid,smallint) to authenticated;
