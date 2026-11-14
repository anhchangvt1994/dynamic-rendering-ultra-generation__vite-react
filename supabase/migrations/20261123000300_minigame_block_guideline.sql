-- Block Lab: automatic falling blocks (SRS rotation, 7-bag queue). The browser logs timed
-- inputs; minigame_finish replays them here against the server clock. Port of
-- src/pages/MiniGamePage/games/block-lab/engine.mjs: keep both in step (vectors.json).

create function public.minigame_block_rules()
returns jsonb language sql immutable set search_path = '' as $fn$
  select $block${
 "W": 10,
 "H": 20,
 "MAX_EVENTS": 6000,
 "GRAVITY_MS": [
  800,
  764,
  728,
  693,
  659,
  626,
  593,
  561,
  530,
  500,
  471,
  442,
  414,
  388,
  362,
  336,
  312,
  289,
  267,
  246,
  225,
  206,
  188,
  171,
  156,
  141,
  128,
  117,
  107,
  99,
  93
 ],
 "LOCK_MS": 450,
 "TIME_STEP_MS": 10000,
 "START_STEPS": [
  0,
  6,
  12
 ],
 "LINE_SCORE": [
  0,
  100,
  300,
  500,
  800
 ],
 "LINE_GOALS": [
  10,
  20,
  30
 ],
 "SHAPES": [
  [
   [
    [
     0,
     1
    ],
    [
     1,
     1
    ],
    [
     2,
     1
    ],
    [
     3,
     1
    ]
   ],
   [
    [
     2,
     0
    ],
    [
     2,
     1
    ],
    [
     2,
     2
    ],
    [
     2,
     3
    ]
   ],
   [
    [
     3,
     2
    ],
    [
     2,
     2
    ],
    [
     1,
     2
    ],
    [
     0,
     2
    ]
   ],
   [
    [
     1,
     3
    ],
    [
     1,
     2
    ],
    [
     1,
     1
    ],
    [
     1,
     0
    ]
   ]
  ],
  [
   [
    [
     1,
     0
    ],
    [
     2,
     0
    ],
    [
     1,
     1
    ],
    [
     2,
     1
    ]
   ],
   [
    [
     1,
     0
    ],
    [
     2,
     0
    ],
    [
     1,
     1
    ],
    [
     2,
     1
    ]
   ],
   [
    [
     1,
     0
    ],
    [
     2,
     0
    ],
    [
     1,
     1
    ],
    [
     2,
     1
    ]
   ],
   [
    [
     1,
     0
    ],
    [
     2,
     0
    ],
    [
     1,
     1
    ],
    [
     2,
     1
    ]
   ]
  ],
  [
   [
    [
     1,
     0
    ],
    [
     0,
     1
    ],
    [
     1,
     1
    ],
    [
     2,
     1
    ]
   ],
   [
    [
     2,
     1
    ],
    [
     1,
     0
    ],
    [
     1,
     1
    ],
    [
     1,
     2
    ]
   ],
   [
    [
     1,
     2
    ],
    [
     2,
     1
    ],
    [
     1,
     1
    ],
    [
     0,
     1
    ]
   ],
   [
    [
     0,
     1
    ],
    [
     1,
     2
    ],
    [
     1,
     1
    ],
    [
     1,
     0
    ]
   ]
  ],
  [
   [
    [
     1,
     0
    ],
    [
     2,
     0
    ],
    [
     0,
     1
    ],
    [
     1,
     1
    ]
   ],
   [
    [
     2,
     1
    ],
    [
     2,
     2
    ],
    [
     1,
     0
    ],
    [
     1,
     1
    ]
   ],
   [
    [
     1,
     2
    ],
    [
     0,
     2
    ],
    [
     2,
     1
    ],
    [
     1,
     1
    ]
   ],
   [
    [
     0,
     1
    ],
    [
     0,
     0
    ],
    [
     1,
     2
    ],
    [
     1,
     1
    ]
   ]
  ],
  [
   [
    [
     0,
     0
    ],
    [
     1,
     0
    ],
    [
     1,
     1
    ],
    [
     2,
     1
    ]
   ],
   [
    [
     2,
     0
    ],
    [
     2,
     1
    ],
    [
     1,
     1
    ],
    [
     1,
     2
    ]
   ],
   [
    [
     2,
     2
    ],
    [
     1,
     2
    ],
    [
     1,
     1
    ],
    [
     0,
     1
    ]
   ],
   [
    [
     0,
     2
    ],
    [
     0,
     1
    ],
    [
     1,
     1
    ],
    [
     1,
     0
    ]
   ]
  ],
  [
   [
    [
     0,
     0
    ],
    [
     0,
     1
    ],
    [
     1,
     1
    ],
    [
     2,
     1
    ]
   ],
   [
    [
     2,
     0
    ],
    [
     1,
     0
    ],
    [
     1,
     1
    ],
    [
     1,
     2
    ]
   ],
   [
    [
     2,
     2
    ],
    [
     2,
     1
    ],
    [
     1,
     1
    ],
    [
     0,
     1
    ]
   ],
   [
    [
     0,
     2
    ],
    [
     1,
     2
    ],
    [
     1,
     1
    ],
    [
     1,
     0
    ]
   ]
  ],
  [
   [
    [
     2,
     0
    ],
    [
     0,
     1
    ],
    [
     1,
     1
    ],
    [
     2,
     1
    ]
   ],
   [
    [
     2,
     2
    ],
    [
     1,
     0
    ],
    [
     1,
     1
    ],
    [
     1,
     2
    ]
   ],
   [
    [
     0,
     2
    ],
    [
     2,
     1
    ],
    [
     1,
     1
    ],
    [
     0,
     1
    ]
   ],
   [
    [
     0,
     0
    ],
    [
     1,
     2
    ],
    [
     1,
     1
    ],
    [
     1,
     0
    ]
   ]
  ]
 ],
 "KICKS_JLSTZ": {
  "10": [
   [
    0,
    0
   ],
   [
    1,
    0
   ],
   [
    1,
    -1
   ],
   [
    0,
    2
   ],
   [
    1,
    2
   ]
  ],
  "12": [
   [
    0,
    0
   ],
   [
    1,
    0
   ],
   [
    1,
    -1
   ],
   [
    0,
    2
   ],
   [
    1,
    2
   ]
  ],
  "21": [
   [
    0,
    0
   ],
   [
    -1,
    0
   ],
   [
    -1,
    1
   ],
   [
    0,
    -2
   ],
   [
    -1,
    -2
   ]
  ],
  "23": [
   [
    0,
    0
   ],
   [
    1,
    0
   ],
   [
    1,
    1
   ],
   [
    0,
    -2
   ],
   [
    1,
    -2
   ]
  ],
  "30": [
   [
    0,
    0
   ],
   [
    -1,
    0
   ],
   [
    -1,
    -1
   ],
   [
    0,
    2
   ],
   [
    -1,
    2
   ]
  ],
  "32": [
   [
    0,
    0
   ],
   [
    -1,
    0
   ],
   [
    -1,
    -1
   ],
   [
    0,
    2
   ],
   [
    -1,
    2
   ]
  ],
  "01": [
   [
    0,
    0
   ],
   [
    -1,
    0
   ],
   [
    -1,
    1
   ],
   [
    0,
    -2
   ],
   [
    -1,
    -2
   ]
  ],
  "03": [
   [
    0,
    0
   ],
   [
    1,
    0
   ],
   [
    1,
    1
   ],
   [
    0,
    -2
   ],
   [
    1,
    -2
   ]
  ]
 },
 "KICKS_I": {
  "10": [
   [
    0,
    0
   ],
   [
    2,
    0
   ],
   [
    -1,
    0
   ],
   [
    2,
    1
   ],
   [
    -1,
    -2
   ]
  ],
  "12": [
   [
    0,
    0
   ],
   [
    -1,
    0
   ],
   [
    2,
    0
   ],
   [
    -1,
    2
   ],
   [
    2,
    -1
   ]
  ],
  "21": [
   [
    0,
    0
   ],
   [
    1,
    0
   ],
   [
    -2,
    0
   ],
   [
    1,
    -2
   ],
   [
    -2,
    1
   ]
  ],
  "23": [
   [
    0,
    0
   ],
   [
    2,
    0
   ],
   [
    -1,
    0
   ],
   [
    2,
    1
   ],
   [
    -1,
    -2
   ]
  ],
  "30": [
   [
    0,
    0
   ],
   [
    1,
    0
   ],
   [
    -2,
    0
   ],
   [
    1,
    -2
   ],
   [
    -2,
    1
   ]
  ],
  "32": [
   [
    0,
    0
   ],
   [
    -2,
    0
   ],
   [
    1,
    0
   ],
   [
    -2,
    -1
   ],
   [
    1,
    2
   ]
  ],
  "01": [
   [
    0,
    0
   ],
   [
    -2,
    0
   ],
   [
    1,
    0
   ],
   [
    -2,
    -1
   ],
   [
    1,
    2
   ]
  ],
  "03": [
   [
    0,
    0
   ],
   [
    -1,
    0
   ],
   [
    2,
    0
   ],
   [
    -1,
    2
   ],
   [
    2,
    -1
   ]
  ]
 }
}
$block$::jsonb
$fn$;

-- 200 shuffled bags: the 7-bag queue the round plays, drawn once at the start
create function public.minigame_block_queue()
returns jsonb language sql volatile set search_path = '' as $fn$
  select jsonb_agg(p order by bag, r) from generate_series(1,200) bag,
    lateral (select p, random() r from generate_series(0,6) p) t
$fn$;

create function public.minigame_block_fits(p_cells int[], p_shape jsonb, p_x int, p_y int)
returns boolean language plpgsql immutable set search_path = '' as $fn$
declare c jsonb; v_col int; v_row int;
begin
  for c in select value from jsonb_array_elements(p_shape) loop
    v_col:=p_x+(c->>0)::int; v_row:=p_y+(c->>1)::int;
    if v_col<0 or v_col>=10 or v_row>=20 then return false; end if;
    if v_row>=0 and p_cells[v_row*10+v_col+1]<>0 then return false; end if;
  end loop;
  return true;
end;
$fn$;

create function public.minigame_block_interval(p_t int, p_difficulty int)
returns int language sql immutable set search_path = '' as $fn$
  select (r->'GRAVITY_MS'->>least(jsonb_array_length(r->'GRAVITY_MS')-1,(p_t / (r->>'TIME_STEP_MS')::int)+(r->'START_STEPS'->>(p_difficulty-1))::int))::int
  from (select public.minigame_block_rules() r) q
$fn$;

-- the wait to the next gravity step after a move: resting pieces lock within LOCK_MS
create function public.minigame_block_wait(p_s jsonb, p_t int)
returns jsonb language plpgsql stable set search_path = '' as $fn$
declare
  v_rules jsonb:=public.minigame_block_rules(); v_a jsonb:=p_s->'active'; v_cells int[]:=array(select jsonb_array_elements_text(p_s->'cells')::int);
  v_fall int:=(p_s->>'fallAt')::int; v_pace int:=public.minigame_block_interval(p_t,(p_s->>'difficulty')::int);
begin
  if not public.minigame_block_fits(v_cells,v_rules->'SHAPES'->(v_a->>'type')::int->(v_a->>'rot')::int,(v_a->>'x')::int,(v_a->>'y')::int+1) then
    return jsonb_set(p_s,'{fallAt}',to_jsonb(least(v_fall,p_t+(v_rules->>'LOCK_MS')::int)));
  end if;
  if v_fall-p_t>v_pace or v_fall-p_t<v_pace then return jsonb_set(p_s,'{fallAt}',to_jsonb(greatest(v_fall,p_t+1))); end if;
  return p_s;
end;
$fn$;

-- lock the active piece: place it, clear rows, score, level, spawn the next one
create function public.minigame_block_lock(p_s jsonb)
returns jsonb language plpgsql stable set search_path = '' as $fn$
declare
  v_rules jsonb:=public.minigame_block_rules(); v_shapes jsonb:=v_rules->'SHAPES';
  v_cells int[]:=array(select jsonb_array_elements_text(p_s->'cells')::int);
  v_next int[]:=array_fill(0,array[200]);
  v_type int:=(p_s->'active'->>'type')::int; v_rot int:=(p_s->'active'->>'rot')::int;
  v_x int:=(p_s->'active'->>'x')::int; v_y int:=(p_s->'active'->>'y')::int;
  v_now int:=(p_s->>'t')::int; v_d int:=(p_s->>'difficulty')::int;
  c jsonb; v_row int; v_col int; r int; v_to int; v_cleared int:=0; v_lines int; v_level int; v_idx int; v_active jsonb; v_queue jsonb:=p_s->'queue';
  v_full boolean; v_t int; v_s jsonb:=p_s; v_above boolean:=false;
begin
  for c in select value from jsonb_array_elements(v_shapes->v_type->v_rot) loop
    v_row:=v_y+(c->>1)::int; v_col:=v_x+(c->>0)::int;
    if v_row<0 then v_above:=true; else v_cells[v_row*10+v_col+1]:=v_type+1; end if;
  end loop;
  if v_above then return jsonb_set(jsonb_set(jsonb_set(v_s,'{over}','true'),'{cells}',to_jsonb(v_cells)),'{t}',to_jsonb(v_now)); end if;
  v_to:=19;
  for r in reverse 19..0 loop
    v_full:=true;
    for v_col in 0..9 loop if v_cells[r*10+v_col+1]=0 then v_full:=false; exit; end if; end loop;
    if v_full then v_cleared:=v_cleared+1;
    else
      for v_col in 0..9 loop v_next[v_to*10+v_col+1]:=v_cells[r*10+v_col+1]; end loop;
      v_to:=v_to-1;
    end if;
  end loop;
  v_lines:=(p_s->>'lines')::int+v_cleared;
  v_level:=v_d+floor(v_lines/10)::int;
  v_idx:=(p_s->>'idx')::int+1;
  v_s:=jsonb_set(v_s,'{cells}',to_jsonb(v_next));
  v_s:=jsonb_set(v_s,'{lines}',to_jsonb(v_lines));
  v_s:=jsonb_set(v_s,'{score}',to_jsonb((p_s->>'score')::int+(v_rules->'LINE_SCORE'->>v_cleared)::int*(p_s->>'level')::int));
  v_s:=jsonb_set(v_s,'{level}',to_jsonb(v_level));
  v_s:=jsonb_set(v_s,'{idx}',to_jsonb(v_idx));
  v_s:=jsonb_set(v_s,'{pieces}',to_jsonb((p_s->>'pieces')::int+1));
  if v_lines>=(v_rules->'LINE_GOALS'->>(v_d-1))::int then return jsonb_set(v_s,'{won}','true'); end if;
  v_t:=(v_queue->>(v_idx % jsonb_array_length(v_queue)))::int;
  v_active:=jsonb_build_object('type',v_t,'rot',0,'x',3,'y',-1);
  v_s:=jsonb_set(v_s,'{active}',v_active);
  if not public.minigame_block_fits(v_next,v_shapes->v_t->0,3,-1) then return jsonb_set(v_s,'{over}','true'); end if;
  return jsonb_set(v_s,'{fallAt}',to_jsonb(v_now+public.minigame_block_interval(v_now,v_d)));
end;
$fn$;

-- gravity ticks due at or before p_t
create function public.minigame_block_advance(p_s jsonb, p_t int)
returns jsonb language plpgsql stable set search_path = '' as $fn$
declare
  v_shapes jsonb:=public.minigame_block_rules()->'SHAPES'; v_s jsonb:=p_s; v_cells int[]; v_due int; a jsonb;
begin
  v_cells:=array(select jsonb_array_elements_text(v_s->'cells')::int);
  while not (v_s->>'over')::boolean and not (v_s->>'won')::boolean and (v_s->>'fallAt')::int<=p_t loop
    v_due:=(v_s->>'fallAt')::int; a:=v_s->'active';
    if public.minigame_block_fits(v_cells,v_shapes->(a->>'type')::int->(a->>'rot')::int,(a->>'x')::int,(a->>'y')::int+1) then
      v_s:=jsonb_set(jsonb_set(jsonb_set(v_s,'{active,y}',to_jsonb((a->>'y')::int+1)),'{fallAt}',to_jsonb(v_due+case when public.minigame_block_fits(v_cells,v_shapes->(a->>'type')::int->(a->>'rot')::int,(a->>'x')::int,(a->>'y')::int+2)
        then public.minigame_block_interval(v_due,(v_s->>'difficulty')::int) else (public.minigame_block_rules()->>'LOCK_MS')::int end)),'{t}',to_jsonb(v_due));
    else
      v_s:=public.minigame_block_lock(jsonb_set(v_s,'{t}',to_jsonb(v_due)));
      v_cells:=array(select jsonb_array_elements_text(v_s->'cells')::int);
    end if;
  end loop;
  if not (v_s->>'over')::boolean and not (v_s->>'won')::boolean then v_s:=jsonb_set(v_s,'{t}',to_jsonb(p_t)); end if;
  return v_s;
end;
$fn$;

-- one input: gravity first, then the action; null for an illegal input
create function public.minigame_block_step(p_s jsonb, p_t int, p_code int)
returns jsonb language plpgsql stable set search_path = '' as $fn$
declare
  v_rules jsonb:=public.minigame_block_rules(); v_shapes jsonb:=v_rules->'SHAPES'; v_s jsonb;
  v_cells int[]; a jsonb; v_type int; v_rot int; v_x int; v_y int; v_to int; v_kicks jsonb; k jsonb; v_dx int; v_dy int; v_f int;
begin
  if p_t is null or p_code is null or p_code<0 or p_code>5 or p_t<(p_s->>'t')::int then return null; end if;
  if (p_s->>'over')::boolean or (p_s->>'won')::boolean then return p_s; end if;
  v_s:=public.minigame_block_advance(p_s,p_t);
  if (v_s->>'over')::boolean or (v_s->>'won')::boolean then return v_s; end if;
  v_cells:=array(select jsonb_array_elements_text(v_s->'cells')::int); a:=v_s->'active';
  v_type:=(a->>'type')::int; v_rot:=(a->>'rot')::int; v_x:=(a->>'x')::int; v_y:=(a->>'y')::int;
  if p_code<=1 then
    v_dx:=case when p_code=0 then -1 else 1 end;
    if public.minigame_block_fits(v_cells,v_shapes->v_type->v_rot,v_x+v_dx,v_y) then return public.minigame_block_wait(jsonb_set(v_s,'{active,x}',to_jsonb(v_x+v_dx)),p_t); end if;
    return v_s;
  elsif p_code<=3 then
    if v_type=1 then return v_s; end if;
    v_to:=(v_rot+case when p_code=2 then 1 else 3 end) % 4;
    v_kicks:=(case when v_type=0 then v_rules->'KICKS_I' else v_rules->'KICKS_JLSTZ' end)->(v_rot::text||v_to::text);
    for k in select value from jsonb_array_elements(v_kicks) loop
      v_dx:=(k->>0)::int; v_dy:=(k->>1)::int;
      if public.minigame_block_fits(v_cells,v_shapes->v_type->v_to,v_x+v_dx,v_y-v_dy) then
        return public.minigame_block_wait(jsonb_set(v_s,'{active}',jsonb_build_object('type',v_type,'rot',v_to,'x',v_x+v_dx,'y',v_y-v_dy)),p_t);
      end if;
    end loop;
    return v_s;
  elsif p_code=4 then
    if public.minigame_block_fits(v_cells,v_shapes->v_type->v_rot,v_x,v_y+1) then
      return public.minigame_block_wait(jsonb_set(jsonb_set(v_s,'{active,y}',to_jsonb(v_y+1)),'{score}',to_jsonb((v_s->>'score')::int+1)),p_t);
    end if;
    return v_s;
  end if;
  v_f:=v_y;
  while public.minigame_block_fits(v_cells,v_shapes->v_type->v_rot,v_x,v_f+1) loop v_f:=v_f+1; end loop;
  v_s:=jsonb_set(jsonb_set(jsonb_set(v_s,'{active,y}',to_jsonb(v_f)),'{score}',to_jsonb((v_s->>'score')::int+2*(v_f-v_y))),'{t}',to_jsonb(p_t));
  return public.minigame_block_lock(v_s);
end;
$fn$;

-- plays a timed input log up to p_end_ms; {ok, score, lines, level, pieces, over, won, cells}
create function public.minigame_block_replay(p_layout jsonb, p_difficulty int, p_log jsonb, p_end_ms int)
returns jsonb language plpgsql stable set search_path = '' as $fn$
declare
  v_queue jsonb:=p_layout->'queue'; v_s jsonb; v_e jsonb; v_n jsonb; v_first int;
begin
  v_first:=(v_queue->>0)::int;
  v_s:=jsonb_build_object('difficulty',p_difficulty,'queue',v_queue,'cells',to_jsonb(array_fill(0,array[200])),
    'active',jsonb_build_object('type',v_first,'rot',0,'x',3,'y',-1),'idx',0,'score',0,'lines',0,'level',p_difficulty,
    'pieces',0,'over',false,'won',false,'t',0,'fallAt',public.minigame_block_interval(0,p_difficulty));
  if p_end_ms is null or jsonb_typeof(p_log) is distinct from 'array' then return jsonb_build_object('ok',false); end if;
  if jsonb_array_length(p_log)>6000 then return jsonb_build_object('ok',false); end if;
  for v_e in select value from jsonb_array_elements(p_log) loop
    if jsonb_typeof(v_e) is distinct from 'array' then return jsonb_build_object('ok',false); end if;
    if jsonb_array_length(v_e)<>2 or jsonb_typeof(v_e->0) is distinct from 'number' or jsonb_typeof(v_e->1) is distinct from 'number' then return jsonb_build_object('ok',false); end if;
    if (v_e->>0)::numeric<>floor((v_e->>0)::numeric) or (v_e->>1)::numeric<>floor((v_e->>1)::numeric) or (v_e->>0)::numeric>p_end_ms or (v_e->>0)::numeric<0 then return jsonb_build_object('ok',false); end if;
    v_n:=public.minigame_block_step(v_s,(v_e->>0)::int,(v_e->>1)::int);
    if v_n is null then return jsonb_build_object('ok',false); end if;
    v_s:=v_n;
  end loop;
  v_s:=public.minigame_block_advance(v_s,p_end_ms);
  return jsonb_build_object('ok',true,'score',v_s->'score','lines',v_s->'lines','level',v_s->'level','pieces',v_s->'pieces',
    'over',v_s->'over','won',(v_s->>'won')::boolean and not (v_s->>'over')::boolean,'cells',v_s->'cells');
end;
$fn$;

drop function if exists public.minigame_block_drop(uuid,integer,integer,integer);

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
    v_layout:=jsonb_build_object('width',10,'height',20,'speciesId',mod(v_seed,1025)+1,'queue',public.minigame_block_queue());
    v_progress:=jsonb_build_object('score',0,'lines',0,'pieces',0,'doneAt',null);
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

-- rounds opened under the old place-a-piece rules cannot be read as the new game: close them
select public.minigame_settle(id,'expired') from public.minigame_rounds where game='block-lab' and status='open';

revoke execute on function public.minigame_block_rules(),public.minigame_block_queue(),public.minigame_block_fits(int[],jsonb,int,int),
  public.minigame_block_interval(int,int),public.minigame_block_wait(jsonb,int),public.minigame_block_lock(jsonb),public.minigame_block_advance(jsonb,int),
  public.minigame_block_step(jsonb,int,int),public.minigame_block_replay(jsonb,int,jsonb,int),
  public.minigame_view(public.minigame_rounds),public.minigame_settle(uuid,text),public.minigame_finish(uuid,jsonb),
  public.minigame_start(text,uuid,smallint) from public,anon,authenticated;
grant execute on function public.minigame_finish(uuid,jsonb),public.minigame_start(text,uuid,smallint) to authenticated;
