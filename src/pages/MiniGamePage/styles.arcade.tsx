import { css } from 'styled-components'

// Boards of Tile Safari, Block Lab, Silhouette Atelier and Lucky Spin. The sheet is portaled to <body>, so these live in SheetStyle.
export const arcadeCss = css`
  .tile-safari { display:grid; gap:10px; }
  .tile-safari-bar { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:15px; }
  .tile-safari-bar b { color:#ffe477; font-size:20px; }
  .tile-safari-tools { display:flex; gap:6px; }
  .tile-safari-tools button { min-height:40px; padding:0 12px; border:1px solid #95e7ff; border-radius:12px; color:#fff; font:inherit; font-size:13px; font-weight:700; background:#1b3a5c; }
  .tile-safari-tools button:disabled { opacity:.4; }
  .tile-safari-tools button:focus-visible { outline:3px solid #ffe477; outline-offset:2px; }
  .tile-safari-stuck { margin:0; padding:8px 12px; border-radius:10px; color:#3b1d00; font-weight:800; text-align:center; background:#ffd86b; }
  .tile-safari-board { position:relative; display:grid; gap:3px; width:100%; max-width:430px; margin:0 auto; padding:8px; border:1px solid #84fff0aa; border-radius:18px; background:radial-gradient(ellipse at top,#17465f,#07182b 72%); box-shadow:0 0 28px #46ffe455,inset 0 0 24px #5cebd322; }
  .tile-safari-board button { aspect-ratio:1; min-width:0; padding:2px; border:1px solid #95e7ff; border-radius:8px; background:linear-gradient(145deg,#2a6188,#10243d); box-shadow:0 2px 0 #071327; transition:transform .16s,box-shadow .16s,opacity .2s; }
  .tile-safari-board button[data-gone] { visibility:hidden; }
  .tile-safari-board button:enabled { cursor:pointer; }
  .tile-safari-board button:enabled:hover { transform:translateY(-2px); box-shadow:0 4px 0 #071327,0 0 12px #74fff0aa; }
  .tile-safari-board button:focus-visible { outline:3px solid #ffe477; outline-offset:2px; }
  .tile-safari-board button[aria-pressed='true'] { z-index:2; border-color:#fff08a; background:linear-gradient(145deg,#9a8626,#4a3f12); transform:translateY(-4px) scale(1.08); box-shadow:0 0 0 2px #fff08a,0 0 22px #ffe477,0 8px 14px #0008; animation:tile-lift .9s ease-in-out infinite alternate; }
  .tile-safari-board button[aria-pressed='true']::before { content:''; position:absolute; inset:-5px; border-radius:12px; background:conic-gradient(from 0deg,#ffe477,#7dffea,#ff9be0,#ffe477); -webkit-mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0); mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0); padding:3px; animation:tile-spin 1.2s linear infinite; pointer-events:none; }
  .tile-safari-board button[aria-pressed='true'] img { animation:tile-wiggle .9s ease-in-out infinite alternate; filter:drop-shadow(0 0 6px #fff7); }
  .tile-safari-board button[data-echo], .tile-safari-board button[data-hint] { position:relative; }
  .tile-safari-board button[data-echo] { border-color:#7dffea; }
  .tile-safari-board button[data-echo]::after, .tile-safari-board button[data-hint]::after { content:''; position:absolute; inset:-2px; border-radius:9px; pointer-events:none; will-change:opacity; opacity:.25; animation:tile-glow .9s ease-in-out infinite alternate; }
  .tile-safari-board button[data-echo]::after { box-shadow:0 0 0 2px #7dffea99,0 0 14px #7dffea; }
  .tile-safari-board button[data-hint]::after { box-shadow:0 0 0 3px #7dffb4,0 0 18px #7dffb4; animation-duration:.7s; }
  .tile-safari-board button[data-wrong] { animation:tile-wrong .32s; }
  .tile-safari-board button[data-pop] { z-index:3; background:transparent; border-color:transparent; box-shadow:none; pointer-events:none; }
  .tile-safari-board button[data-pop] img { animation:tile-vanish .62s cubic-bezier(.3,0,.2,1) forwards; }
  .tile-safari-board img { display:block; width:100%; height:100%; object-fit:contain; pointer-events:none; }
  .tile-fx { position:absolute; inset:0; pointer-events:none; }
  .tile-fx i { position:absolute; inset:-4px; border-radius:50%; border:3px solid #fff7b0; animation:tile-ring .6s ease-out forwards; }
  .tile-fx b { position:absolute; left:50%; top:50%; width:7px; height:7px; margin:-3.5px; border-radius:2px; background:hsl(var(--h) 100% 68%); box-shadow:0 0 8px hsl(var(--h) 100% 68%); animation:tile-shard .65s cubic-bezier(.1,.7,.3,1) forwards; }
  .tile-safari-line { position:absolute; inset:8px; width:calc(100% - 16px); height:calc(100% - 16px); overflow:visible; pointer-events:none; z-index:4; }
  .tile-safari-line .beam, .tile-safari-line .beam-glow { fill:none; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:1; stroke-dashoffset:1; animation:tile-beam .3s ease-out forwards, tile-beam-out .3s .42s ease-in forwards; }
  .tile-safari-line .beam { stroke:url(#tile-beam); stroke-width:9; }
  .tile-safari-line .beam-glow { stroke:#fff8; stroke-width:26; filter:blur(7px); }
  .tile-safari-line .beam-orb { fill:#fff; filter:drop-shadow(0 0 8px #ffe477) drop-shadow(0 0 16px #7dffea); animation:tile-beam-out .3s .42s ease-in forwards; }
  .tile-combo { position:absolute; z-index:5; transform:translate(-50%,-50%); padding:4px 12px; border-radius:999px; color:#3b1d00; font-weight:900; font-size:18px; white-space:nowrap; background:linear-gradient(90deg,#ffe477,#ff9be0); box-shadow:0 0 22px #ffe477; pointer-events:none; animation:tile-combo 1.1s cubic-bezier(.2,1.4,.4,1) forwards; }
  @keyframes tile-lift { to { transform:translateY(-6px) scale(1.1); } }
  @keyframes tile-spin { to { transform:rotate(360deg); } }
  @keyframes tile-wiggle { from { transform:rotate(-4deg) scale(1.02); } to { transform:rotate(4deg) scale(1.1); } }
  @keyframes tile-glow { to { opacity:1; } }
  @keyframes tile-wrong { 25% { transform:translateX(-4px); } 75% { transform:translateX(4px); } }
  @keyframes tile-beam { to { stroke-dashoffset:0; } }
  @keyframes tile-beam-out { to { opacity:0; } }
  @keyframes tile-vanish { 0% { transform:scale(1.1) rotate(0); } 35% { transform:scale(1.45) rotate(-8deg); } 100% { transform:scale(0) rotate(40deg); opacity:0; } }
  @keyframes tile-ring { from { transform:scale(.3); opacity:1; } to { transform:scale(2.4); opacity:0; } }
  @keyframes tile-shard { from { transform:rotate(var(--a)) translateX(0) scale(1); opacity:1; } to { transform:rotate(var(--a)) translateX(var(--r)) scale(0); opacity:0; } }
  @keyframes tile-combo { 0% { transform:translate(-50%,-30%) scale(.2); opacity:0; } 25% { transform:translate(-50%,-80%) scale(1.15); opacity:1; } 100% { transform:translate(-50%,-220%) scale(1); opacity:0; } }
.mg-body:has(.block-lab) .mg-sub { display:none; }
  .block-lab { display:grid; justify-items:center; gap:clamp(6px,1.2dvh,10px); width:min(100%,460px); margin-inline:auto; padding:8px clamp(8px,3vw,14px); color:#eafaff; border:1px solid #6ce9ff55; border-radius:18px; background:linear-gradient(160deg,#102b46,#10172b 55%,#171b35); user-select:none; -webkit-user-select:none; touch-action:manipulation; }
  .block-lab-score { display:flex; align-items:center; gap:14px; width:100%; min-height:34px; }
  .block-lab-score img { width:34px; height:34px; object-fit:contain; margin-right:auto; }
  .block-lab-score div { display:grid; line-height:1.1; text-align:right; }
  .block-lab-score small, .block-lab-next small { color:#a7c5d8; font-size:10px; }
  .block-lab-score b { color:#ffb84a; font-size:18px; font-variant-numeric:tabular-nums; }
  .block-lab-score b span { color:#a7c5d8; font-size:11px; }
  .block-lab-playfield { display:flex; align-items:flex-start; justify-content:center; gap:clamp(8px,3vw,18px); width:100%; min-height:0; }
  .block-lab-field { position:relative; flex:none; width:min(62vw,calc((100dvh - 350px) / 2),250px); aspect-ratio:1/2; border:1px solid #6ce9ff; border-radius:8px; background:repeating-linear-gradient(0deg,#ffffff0b 0 1px,transparent 1px 5%),repeating-linear-gradient(90deg,#ffffff0b 0 1px,transparent 1px 10%),#0b1525; }
  .block-lab-grid { position:absolute; inset:0; display:grid; grid-template-columns:repeat(10,1fr); grid-template-rows:repeat(20,1fr); }
  .block-lab-grid i { margin:1px; border-radius:3px; }
  .block-lab-grid i[data-t] { background:var(--mon) center/78% no-repeat,linear-gradient(150deg,color-mix(in srgb,var(--c) 70%,#fff),var(--c) 60%,color-mix(in srgb,var(--c) 55%,#000)); box-shadow:inset 0 0 0 1px #fff6; }
  .block-lab-grid i[data-live] { box-shadow:inset 0 0 0 1px #fff, 0 0 0 1px var(--c); }
  .block-lab-grid i[data-ghost] { background:transparent; outline:1px dashed color-mix(in srgb,var(--c) 85%,#fff); outline-offset:-1px; }
  .block-lab-layer { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
  .block-lab-fx { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
  .block-lab-trail { position:absolute; background:linear-gradient(180deg,transparent,#aef4ff99 70%,#fff); transform-origin:50% 100%; animation:block-trail 380ms ease-out both; }
  .block-lab-sweep { position:absolute; left:0; width:100%; height:5%; background:linear-gradient(90deg,transparent,#fff,#ffe477,#fff,transparent); transform-origin:0 50%; will-change:transform,opacity; animation:block-sweep 520ms cubic-bezier(.2,.8,.2,1) both; }
  .block-lab-sweep[data-big] { background:linear-gradient(90deg,#ff5d5d,#ffd23f,#4ddc7c,#38d8ff,#b57bff,#ff5d5d); }
  .block-lab-call { position:absolute; left:50%; top:38%; translate:-50% -50%; font:900 clamp(22px,7vw,30px)/1 inherit; color:#fff; -webkit-text-stroke:2px #b84a00; paint-order:stroke fill; text-shadow:0 3px 0 #b84a00; white-space:nowrap; will-change:transform,opacity; animation:block-call 900ms cubic-bezier(.2,1.4,.4,1) both; }
  .block-lab-call[data-big] { color:#fff6b0; -webkit-text-stroke-color:#8a1f5a; text-shadow:0 3px 0 #8a1f5a; font-size:clamp(26px,9vw,38px); }
  .block-lab-over { position:absolute; inset:0; display:grid; place-content:center; gap:6px; padding:12px; text-align:center; border-radius:7px; background:#050b18d9; animation:block-over 320ms ease-out both; }
  .block-lab-over b { font-size:22px; color:#ffb84a; }
  .block-lab-field[data-end='won'] .block-lab-over b { color:#7dffea; }
  .block-lab-over span { font-size:13px; color:#cfe8f5; }
  .block-lab-side { display:grid; align-content:start; gap:10px; min-width:64px; }
  .block-lab-next { display:grid; gap:6px; }
  .block-lab-next > div { position:relative; width:64px; height:40px; }
  .block-lab-next i { position:absolute; width:15px; height:15px; border-radius:3px; background:linear-gradient(150deg,color-mix(in srgb,var(--c) 70%,#fff),var(--c)); box-shadow:inset 0 0 0 1px #fff6; }
  .block-lab-controls { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; width:100%; }
  .block-lab-controls button { min-width:0; min-height:46px; padding:0 6px; color:#eefaff; font:700 18px/1 inherit; border:1px solid #6ce9ff66; border-radius:10px; background:#17324b; touch-action:none; -webkit-tap-highlight-color:transparent; }
  .block-lab-controls button:last-child { color:#172033; border-color:#ffcb66; background:linear-gradient(180deg,#ffd27a,#ffb84a); }
  .block-lab-controls button:active:not(:disabled) { transform:translateY(2px) scale(.98); }
  .block-lab-controls button:disabled { opacity:.45; }
  .block-lab-controls button:focus-visible { outline:3px solid #ffe477; outline-offset:2px; }
  .block-lab [data-t='0'] { --c:#38d8ff; }
  .block-lab [data-t='1'] { --c:#ffd23f; }
  .block-lab [data-t='2'] { --c:#b57bff; }
  .block-lab [data-t='3'] { --c:#4ddc7c; }
  .block-lab [data-t='4'] { --c:#ff5d5d; }
  .block-lab [data-t='5'] { --c:#5b8cff; }
  .block-lab [data-t='6'] { --c:#ff9a3d; }
  @keyframes block-sweep { 0% { transform:scaleX(0); opacity:1; } 45% { transform:scaleX(1); opacity:1; } 100% { transform:scaleX(1) scaleY(.1); opacity:0; } }
  @keyframes block-trail { from { opacity:.9; transform:scaleY(1); } to { opacity:0; transform:scaleY(.2); } }
  @keyframes block-call { 0% { transform:scale(.2); opacity:0; } 25% { transform:scale(1.2); opacity:1; } 80% { opacity:1; } 100% { transform:translateY(-26px) scale(1); opacity:0; } }
  @keyframes block-over { from { opacity:0; } }
  @media (min-width:640px) { .block-lab-field { width:min(250px,calc((min(92dvh,860px) - 360px) / 2)); } }
  @media (max-height:520px) { .block-lab { gap:4px; padding-block:4px; } .block-lab-field { width:min(62vw,calc((100dvh - 260px) / 2),220px); } .block-lab-controls button { min-height:40px; } }

  .mg-body:has(.silhouette-jigsaw) .mg-sub { display:none; }
  .silhouette-jigsaw { --cols:var(--slide-cols,3); --rows:var(--slide-rows,3); --fw:max(150px,min(calc(100vw - 56px),calc((100dvh - 470px) * var(--cols) / var(--rows)),400px)); display:grid; justify-items:center; align-content:center; gap:8px; width:min(100%,520px); margin-inline:auto; color:#eafaff; }
  .jig-topline { display:flex; align-items:center; justify-content:space-between; gap:8px; width:var(--fw); min-width:240px; font-size:13px; }
  .jig-topline b { color:#ffe477; font-variant-numeric:tabular-nums; }
  .jig-preview { min-height:36px; padding:4px 10px; color:#dffaff; font:700 12px/1.2 inherit; border:1px solid #66dff977; border-radius:999px; background:#102b46; touch-action:none; user-select:none; }
  .jig-frame { position:relative; display:grid; grid-template-columns:repeat(var(--cols),1fr); grid-template-rows:repeat(var(--rows),1fr); gap:2px; width:var(--fw); aspect-ratio:calc(var(--cols) / var(--rows)); padding:3px; border:1px solid #6ce9ff66; border-radius:12px; background:#0a1a2e; box-shadow:inset 0 0 18px #000a,0 6px 22px #0006; }
  .jig-slot { position:relative; min-width:0; min-height:0; border:1px dashed #6ce9ff55; border-radius:6px; background:#0d2238; transition:background .15s,border-color .15s; }
  .jig-slot[data-over] { border-color:#ffe477; background:#2b3a52; box-shadow:0 0 0 2px #ffe47766; }
  .jig-piece { position:relative; display:block; width:100%; height:100%; padding:0; border:0; border-radius:6px; background:transparent; touch-action:none; cursor:grab; user-select:none; -webkit-user-select:none; }
  .jig-piece:focus-visible { outline:2px solid #ffe477; outline-offset:1px; }
  .jig-piece[data-drag] { opacity:.25; }
  .jig-art { position:absolute; inset:0; display:block; border-radius:6px; background-repeat:no-repeat; background-color:#dcecff; box-shadow:inset 0 0 0 1px #fff8,0 2px 5px #0006; transition:transform 220ms cubic-bezier(.3,1.5,.5,1); will-change:transform; pointer-events:none; }
  .jig-piece[data-where='tray'] { flex:none; width:clamp(40px,calc(var(--fw) / var(--cols) * .5),60px); aspect-ratio:1; height:auto; }
  .jig-piece[data-locked] { cursor:default; }
  .jig-piece[data-locked] .jig-art { box-shadow:inset 0 0 0 2px #72f0d0; }
  .jig-piece[data-snap] .jig-art { animation:jig-snap 650ms cubic-bezier(.2,.9,.3,1.3); }
  .jig-tray { display:flex; flex-wrap:wrap; justify-content:center; align-content:flex-start; gap:7px; width:min(100%,calc(var(--fw) + 60px)); min-height:calc(clamp(40px,calc(var(--fw) / var(--cols) * .5),60px) + 14px); padding:7px; border:1px dashed #6ce9ff44; border-radius:12px; background:#0a1a2e99; }
  .jig-tip { align-self:center; color:#7fa3b8; font-size:12px; }
  .jig-ghost { filter:drop-shadow(0 10px 12px #0009); }
  .jig-ghost .jig-art { transform-origin:center; scale:1.08; box-shadow:inset 0 0 0 2px #ffe477; transition:none; }
  .silhouette-jigsaw[data-solved] .jig-frame { gap:0; padding:0; border-color:#ffe477; box-shadow:0 0 0 2px #ffe47766,0 0 22px #ffe47788; overflow:hidden; }
  .silhouette-jigsaw[data-solved] .jig-slot { border:0; border-radius:0; }
  .silhouette-jigsaw[data-solved] .jig-art { border-radius:0; box-shadow:none; }
  .silhouette-jigsaw[data-solved] .jig-tray { display:none; }
  .jig-hint { position:absolute; inset:0; z-index:5; border-radius:11px; background-color:#071321ee; background-repeat:no-repeat; background-position:center; pointer-events:none; }
  .jig-solved { position:absolute; left:50%; top:50%; translate:-50% -50%; display:grid; justify-items:center; gap:2px; z-index:6; padding:6px 14px; border-radius:12px; background:#071321b8; text-align:center; white-space:nowrap; color:#fff; font-weight:900; text-shadow:0 2px 5px #031321; pointer-events:none; }
  .jig-solved b { color:#ffe477; font-size:clamp(20px,6vw,32px); }
  .jig-solved span { font-size:12px; }
  .jig-solved i { position:absolute; inset:0; pointer-events:none; }
  .jig-solved em { position:absolute; left:50%; top:50%; width:7px; height:7px; border-radius:50%; background:hsl(var(--p) 95% 65%); animation:jig-burst 650ms ease-out both; }
  .jig-help { margin:0; color:#a7c5d8; font-size:12px; text-align:center; }
  .jig-preload { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
  @keyframes jig-burst { from { transform:rotate(var(--p)) translateX(0) scale(.4); opacity:1; } to { transform:rotate(var(--p)) translateX(36px) scale(0); opacity:0; } }
  @keyframes jig-snap { 0% { transform:scale(1.18); filter:brightness(1.6); } 100% { transform:scale(1); filter:none; } }
  @media (max-height:640px) { .silhouette-jigsaw { gap:5px; } .jig-help { display:none; } .jig-tray { gap:5px; padding:5px; } }
  @media (prefers-reduced-motion:reduce) { .jig-art,.jig-piece[data-snap] .jig-art,.jig-solved em { animation:none !important; transition:none !important; } .jig-solved em { display:none; } }
  /* Vòng quay may mắn: 5 reels x 3 rows. Everything moves with transform/opacity only. */
  .sp { grid-template-columns:minmax(0,1fr); --cell:clamp(34px,min(11.4vw,8.6dvh),72px); --gap:5px; --step:calc(var(--cell) + var(--gap)); position:relative; isolation:isolate; display:grid; justify-items:center; gap:8px; width:100%; padding:12px 12px 14px; overflow:hidden; border:3px solid #ffd76a; border-radius:26px; color:#fff6d4; background:radial-gradient(120% 70% at 50% 0,#7a2f6e,#2b1650 55%,#120f33); box-shadow:0 0 0 3px #7b1f3d,0 14px 34px #0009,0 0 26px #ffc94755; }
  .sp-lights { position:absolute; inset:4px; z-index:-1; border-radius:21px; pointer-events:none; }
  .sp-lights::before, .sp-lights::after { content:''; position:absolute; inset:0; border:3px dotted #ffe58a; border-radius:inherit; animation:sp-blink 1.2s steps(1) infinite; }
  .sp-lights::after { inset:0; border-color:#ff7bb0; animation-delay:-.6s; }
  @keyframes sp-blink { 0%,100% { opacity:1; } 50% { opacity:.18; } }
  .sp-head { display:flex; align-items:center; gap:8px; width:100%; }
  .sp-head h3 { flex:1; margin:0; font-size:clamp(15px,4.6vw,19px); font-weight:900; letter-spacing:.02em; color:#fff2a0; text-shadow:0 0 14px #ffc83f,0 2px 0 #7b1f3d; }
  .sp-mark { color:#fff2a0; font-size:20px; text-shadow:0 0 14px #ffd444; animation:sp-twinkle 2.2s ease-in-out infinite; }
  @keyframes sp-twinkle { 50% { transform:scale(1.25) rotate(20deg); opacity:.7; } }
  .sp-pips { display:flex; gap:5px; }
  .sp-pips i { position:relative; width:18px; height:18px; border:2px solid #2a1130; border-radius:50%; background:linear-gradient(#ff4655 0 46%,#2a1130 46% 54%,#fff 54%); box-shadow:0 0 8px #ff465588; transition:transform .35s cubic-bezier(.3,1.5,.5,1),filter .35s; }
  .sp-pips i::after { content:''; position:absolute; left:50%; top:50%; width:6px; height:6px; margin:-3px; border:2px solid #2a1130; border-radius:50%; background:#fff; }
  .sp-pips i[data-used] { filter:grayscale(1) brightness(.55); transform:scale(.8); box-shadow:none; }
  .sp-cab { position:relative; display:flex; align-items:center; gap:6px; }
  .sp-win { position:relative; display:flex; gap:var(--gap); padding:8px; border:2px solid #ffdf86; border-radius:16px; background:linear-gradient(#0b0722,#1d1146); box-shadow:inset 0 0 22px #000b,inset 0 0 0 2px #7a2f6e,0 0 18px #ffcf5a44; }
  .sp-win::after { content:''; position:absolute; inset:2px; border-radius:14px; pointer-events:none; z-index:2; background:linear-gradient(170deg,#ffffff2e,transparent 32%); }
  .sp-reel { position:relative; width:var(--cell); height:calc(var(--cell)*3 + var(--gap)*2); overflow:hidden; border-radius:10px; background:linear-gradient(#150c33,#2a1658 50%,#150c33); }
  .sp-reel::after { content:''; position:absolute; inset:0; pointer-events:none; z-index:1; background:linear-gradient(#000b,transparent 24%,transparent 76%,#000b); }
  .sp-strip { display:flex; flex-direction:column; gap:var(--gap); will-change:transform; }
  .sp-strip[data-roll] { filter:blur(.7px) saturate(1.25); animation:sp-drop var(--ms) both; }
  @keyframes sp-drop {
    from { transform:translateY(calc(var(--n)*var(--step)*-1)); animation-timing-function:cubic-bezier(.45,.02,.25,1); }
    80% { transform:translateY(calc(var(--step)*-1 + 9px)); animation-timing-function:ease-out; }
    to { transform:translateY(calc(var(--step)*-1)); }
  }
  .sp-cell { position:relative; flex:none; display:grid; place-items:center; width:var(--cell); height:var(--cell); border-radius:10px; background:linear-gradient(150deg,#fff3d6,#e0c3ff 60%,#a77ad0); box-shadow:inset 0 0 8px #fff,0 2px 0 #0006; }
  .sp-cell img { width:88%; height:88%; object-fit:contain; filter:drop-shadow(0 3px 3px #37204377); pointer-events:none; }
  .sp-cell[data-win] { z-index:1; background:linear-gradient(150deg,#fffbe0,#ffe27a 60%,#ffb347); animation:sp-hit 760ms var(--d) cubic-bezier(.2,.9,.3,1.3) both; }
  .sp-cell[data-win]::after { content:''; position:absolute; inset:-3px; border:2px solid #fff6a8; border-radius:12px; opacity:0; animation:sp-ring 900ms var(--d) ease-out 3 both; }
  @keyframes sp-hit { 0% { transform:scale(1); } 35% { transform:scale(1.2) rotate(-4deg); } 65% { transform:scale(.96) rotate(2deg); } 100% { transform:scale(1.04); } }
  @keyframes sp-ring { 0% { opacity:.9; transform:scale(.9); } 100% { opacity:0; transform:scale(1.35); } }
  .sp-line { position:absolute; z-index:3; left:calc(8px + var(--from)*var(--step)); top:calc(8px + var(--row)*var(--step) + var(--cell)/2 - 3px); width:calc(var(--len)*var(--cell) + (var(--len) - 1)*var(--gap)); height:6px; border-radius:6px; pointer-events:none; background:linear-gradient(90deg,#fff6a8,#ff9bd0,#7dffea); box-shadow:0 0 12px #ffe27a; transform-origin:left; animation:sp-line 480ms 200ms cubic-bezier(.2,.9,.3,1) both; }
  @keyframes sp-line { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  .sp-burst { position:absolute; inset:0; z-index:4; pointer-events:none; }
  .sp-burst i { position:absolute; left:50%; top:50%; width:7px; height:7px; margin:-3px; border-radius:50%; background:#ffe27a; box-shadow:0 0 8px #ffd23f; animation:sp-spark 820ms 120ms cubic-bezier(.1,.8,.3,1) both; }
  .sp-burst i:nth-child(3n) { background:#ff8fc4; box-shadow:0 0 8px #ff5fa8; }
  .sp-burst i:nth-child(3n+1) { background:#7dffea; box-shadow:0 0 8px #3fe0c8; }
  @keyframes sp-spark { from { transform:rotate(var(--a)) translateX(0) scale(1); opacity:1; } to { transform:rotate(var(--a)) translateX(calc(var(--k)*min(34vw,150px))) scale(.2); opacity:0; } }
  .sp-banner { position:absolute; left:50%; top:50%; z-index:5; display:grid; justify-items:center; gap:3px; pointer-events:none; animation:sp-banner 1.5s both; }
  .sp-banner b { font-size:clamp(22px,7.4vw,34px); font-weight:900; color:#fff2a0; -webkit-text-stroke:1px #7b1f3d; text-shadow:0 0 16px #ffc83f,0 3px 0 #7b1f3d; white-space:nowrap; }
  .sp-banner span { padding:2px 10px; border-radius:99px; font-size:12px; font-weight:900; color:#3a1450; background:linear-gradient(90deg,#7dffea,#ffe27a); box-shadow:0 0 12px #7dffea88; }
  @keyframes sp-banner { 0% { transform:translate(-50%,-50%) scale(.4); opacity:0; } 14% { transform:translate(-50%,-50%) scale(1.15); opacity:1; } 24% { transform:translate(-50%,-50%) scale(1); } 80% { transform:translate(-50%,-50%) scale(1); opacity:1; } 100% { transform:translate(-50%,-80%) scale(1); opacity:0; } }
  .sp-hud { display:grid; grid-template-columns:1.5fr 1fr 1fr; gap:8px; align-items:center; width:100%; }
  .sp-combo { display:flex; gap:4px; }
  .sp-combo span { flex:1; padding:5px 0; border-radius:8px; text-align:center; font-size:12px; font-weight:900; color:#cbb8f4; background:#ffffff14; transition:background .3s,color .3s; }
  .sp-combo span[data-on] { color:#3a1450; background:linear-gradient(#fff6a8,#ffb347); }
  .sp-combo span[data-now] { animation:sp-pulse 700ms ease-in-out 3; }
  @keyframes sp-pulse { 50% { transform:scale(1.18); } }
  .sp-score, .sp-gift { display:grid; justify-items:center; line-height:1.05; }
  .sp-score small, .sp-gift small { font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:#cbb8f4; }
  .sp-score b, .sp-gift b { font-size:22px; font-weight:900; font-variant-numeric:tabular-nums; color:#fff2a0; text-shadow:0 0 12px #ffc83f88; }
  .sp-gift b { color:#ffb36b; }
  .sp-meter { position:relative; width:100%; height:8px; border-radius:8px; background:#ffffff1f; }
  .sp-meter i { display:block; width:100%; height:100%; border-radius:inherit; background:linear-gradient(90deg,#7dffea,#ffe27a,#ff7bb0); transform-origin:left; transform:scaleX(var(--p)); transition:transform .6s cubic-bezier(.2,.9,.3,1); }
  .sp-meter s { position:absolute; top:-3px; width:4px; height:14px; border-radius:2px; background:#ffffff55; transform:translateX(-50%); transition:background .3s,box-shadow .3s; }
  .sp-meter s[data-on] { background:#fff2a0; box-shadow:0 0 10px #ffe27a; }
  .sp-note { min-height:1.3em; margin:0; font-size:12.5px; text-align:center; color:#e6d7ff; }
  .sp-go { width:100%; }
  .sp-pay { width:100%; font-size:12px; color:#cbb8f4; }
  .sp-pay summary { cursor:pointer; text-align:center; }
  .sp-pay ul { display:flex; justify-content:center; gap:10px; margin:8px 0 4px; padding:0; list-style:none; }
  .sp-pay li { display:grid; justify-items:center; }
  .sp-pay li img { width:34px; height:34px; object-fit:contain; }
  .sp-pay li b { color:#fff2a0; }
  .sp-pay p { margin:4px 0 0; text-align:center; }
  @media (max-height:700px) { .sp { --cell:clamp(30px,min(11.4vw,5.4dvh),72px); gap:4px; padding:6px 10px 8px; } .sp-pay, .sp-head h3 { display:none; } .sp-head { justify-content:space-between; } .sp-head::after { content:''; } .sp-score b, .sp-gift b { font-size:18px; } .sp-note { font-size:12px; } }
  .sp[data-swept] { animation:sp-shake 520ms 200ms both; }
  @keyframes sp-shake { 20% { transform:translateX(-4px); } 40% { transform:translateX(4px); } 60% { transform:translateX(-2px); } 80% { transform:translateX(2px); } }
  @media (prefers-reduced-motion:reduce) { .sp *, .sp *::before, .sp *::after, .sp { animation:none !important; transition:none !important; } .sp-burst { display:none; } }
  @media (prefers-reduced-motion: reduce) { .tile-safari-board button, .tile-safari-board button img, .tile-safari-board button::before, .tile-safari-board button::after, .tile-fx *, .tile-safari-line * { transition:none; animation-duration:.01s !important; animation-iteration-count:1 !important; } .tile-safari-board button:enabled:hover { transform:none; } }
`
