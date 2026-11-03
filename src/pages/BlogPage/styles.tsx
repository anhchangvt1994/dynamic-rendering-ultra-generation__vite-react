import styled from 'styled-components'

/**
 * Field Notes: a naturalist's desk. Graph paper under the notes, the newest
 * page of the notebook on top (spiral rings, torn cover), the rest taped to
 * the desk as specimens. Every block has a fixed height for its lines, so the
 * skeleton (same classes, same rules) never moves when the data arrives.
 */
export const BlogStyle = styled.div`
  --ink: #172d45;
  --paper: #fffdf7;
  --berry: #e8587d;
  --muted: #4f6176;
  min-height: 100%;
  padding: 24px 16px 120px;
  color: var(--ink);
  background:
    linear-gradient(rgba(23, 45, 69, 0.06) 1px, transparent 1px) 0 0 / 24px
      24px,
    linear-gradient(90deg, rgba(23, 45, 69, 0.06) 1px, transparent 1px) 0 0 /
      24px 24px,
    #eef3f8;

  > * {
    max-width: 1100px;
    margin-inline: auto;
  }
  a {
    color: inherit;
    text-decoration: none;
  }

  /* ── the heading: the title, a marker line drawn under it, a ball on the desk ── */
  .blog-hero {
    position: relative;
    display: grid;
    gap: 6px;
    padding: 4px 0;
  }
  .hero-title {
    position: relative;
    width: fit-content;
    max-width: 100%;
    height: 1.5em;
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(26px, 8vw, 52px);
    font-weight: 400;
    /* room for the marks above and the dots below Vietnamese letters */
    line-height: 1.5;
    white-space: nowrap;
  }
  .hero-title > span:first-child {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hero-title::after {
    content: '';
    position: absolute;
    z-index: -1;
    right: -6px;
    bottom: 0.22em;
    left: -6px;
    height: 0.3em;
    border-radius: 3px;
    background: rgba(255, 203, 5, 0.85);
    transform-origin: 0 50%;
    rotate: -0.8deg;
  }
  .hero-count {
    height: 24px;
    margin: 0;
    font-size: 15px;
    line-height: 24px;
    color: var(--muted);
  }
  .hero-ball {
    position: absolute;
    top: -14px;
    right: -26px;
    width: 120px;
    height: 120px;
    opacity: 0.1;
    rotate: -18deg;
    pointer-events: none;
  }
  @media (min-width: 900px) {
    .hero-ball {
      top: -40px;
      right: 20px;
      width: 190px;
      height: 190px;
    }
  }

  /* ── tags: one row of stamps, sideways when it does not fit; a fade says there is more ── */
  .blog-tags {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    height: 60px;
    padding: 8px 4px 8px;
    margin-top: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
    mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent);
  }
  @media (min-width: 900px) {
    .blog-tags {
      mask-image: none;
    }
  }
  .blog-tags::-webkit-scrollbar {
    display: none;
  }
  .blog-tags button {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 8px 0 16px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: var(--paper);
    color: var(--ink);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 2px 2px 0 var(--ink);
    transition:
      transform 120ms ease-out,
      box-shadow 120ms ease-out;
  }
  .blog-tags button:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--ink);
  }
  .blog-tags button:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  .blog-tags button .n {
    display: grid;
    place-items: center;
    min-width: 26px;
    height: 26px;
    padding: 0 6px;
    border-radius: 999px;
    background: rgba(23, 45, 69, 0.1);
    font-size: 12px;
    line-height: 1;
  }
  .blog-tags button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
    box-shadow: none;
    transform: translate(2px, 2px);
  }
  .blog-tags button[aria-pressed='true'] .n {
    background: #ffcb05;
    color: var(--ink);
  }

  /* ── a cover: its colour first, the picture fades in over it ── */
  .cover {
    position: relative;
    display: block;
    overflow: hidden;
    background-color: var(--cover, #e3e9f0);
  }
  .cover img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0;
    transition:
      opacity 260ms ease-out,
      transform 500ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  a:hover .cover img,
  a:focus-visible .cover img {
    transform: scale(1.05);
  }
  .cover[data-state='loaded'] img {
    opacity: 1;
  }

  /* ── a rubber stamp ── */
  .stamp {
    display: inline-block;
    padding: 3px 10px;
    border: 2px solid var(--ink-stamp, var(--ink));
    border-radius: 4px;
    background: rgba(255, 253, 247, 0.92);
    color: var(--ink-stamp, var(--ink));
    font-family: var(--font-display);
    font-size: 11px;
    white-space: nowrap;
    line-height: 1.3;
    outline: 1px solid var(--ink-stamp, var(--ink));
    outline-offset: 2px;
    rotate: -4deg;
  }

  /* ── the notebook: the newest page ── */
  .blog-notebook {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    margin-top: 22px;
    border: 3px solid var(--ink);
    border-radius: 6px 20px 20px 6px;
    background: var(--paper);
    box-shadow: 6px 6px 0 var(--ink);
    transition: translate 160ms ease-out;
  }
  a.blog-notebook:hover,
  a.blog-notebook:focus-visible {
    translate: 0 -3px;
  }
  .nb-binding {
    position: absolute;
    z-index: 2;
    top: -9px;
    right: 24px;
    left: 24px;
    height: 16px;
    background: radial-gradient(circle at 50% 50%, var(--ink) 5px, transparent 6px)
      0 0 / 28px 16px repeat-x;
    pointer-events: none;
  }
  .nb-cover {
    aspect-ratio: 16 / 10;
    clip-path: polygon(
      0 0,
      100% 0,
      100% 93%,
      95% 97%,
      90% 93%,
      84% 98%,
      78% 94%,
      71% 97%,
      64% 92%,
      57% 97%,
      49% 94%,
      41% 98%,
      34% 93%,
      27% 97%,
      19% 94%,
      12% 98%,
      6% 94%,
      0 97%
    );
  }
  .nb-page {
    position: relative;
    display: block;
    padding: 14px 18px 22px 46px;
    background: repeating-linear-gradient(
      transparent 0 27px,
      rgba(38, 102, 177, 0.16) 27px 28px
    );
  }
  .nb-page::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 32px;
    width: 2px;
    background: rgba(217, 65, 54, 0.45);
  }
  .nb-page {
    display: flex;
  }
  .nb-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
  }
  .nb-foot {
    display: grid;
    gap: 10px;
    width: 100%;
    margin-top: auto;
  }
  .nb-kicker {
    display: flex;
    align-items: center;
    gap: 14px;
    height: 30px;
  }
  .nb-new {
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-weight: 700;
    color: var(--muted);
  }
  .nb-title {
    --n: 3;
    width: 100%;
    height: calc(1.25em * var(--n));
    margin: 0;
    overflow: hidden;
    font-family: var(--font-display);
    font-size: 19px;
    font-weight: 400;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--n);
  }
  .nb-excerpt {
    width: 100%;
    height: 72px;
    margin: 0;
    overflow: hidden;
    font-size: 15px;
    line-height: 24px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }
  .nb-meta,
  .card-meta {
    display: flex;
    align-items: center;
    gap: 6px 14px;
    height: 24px;
    margin: 0;
    overflow: hidden;
    font-size: 13px;
    line-height: 24px;
    color: var(--muted);
    white-space: nowrap;
  }
  .nb-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 44px;
    padding: 0 22px;
    border-radius: 999px;
    background: var(--berry);
    color: #fff;
    font-weight: 800;
    box-shadow: 0 3px 0 #a52a4b;
    transition:
      translate 140ms ease-out,
      box-shadow 140ms ease-out;
  }
  .nb-cta::after {
    content: '';
    width: 8px;
    height: 8px;
    border: solid currentColor;
    border-width: 2.5px 2.5px 0 0;
    rotate: 45deg;
    transition: translate 160ms ease-out;
  }
  a.blog-notebook:hover .nb-cta::after,
  a.blog-notebook:focus-visible .nb-cta::after {
    translate: 4px 0;
  }
  a.blog-notebook:active .nb-cta {
    translate: 0 3px;
    box-shadow: none;
  }
  /* the badge: the ring of words turns, the number in the middle stays */
  .nb-badge {
    position: absolute;
    z-index: 3;
    top: -30px;
    right: -12px;
    width: 92px;
    height: 92px;
    rotate: 10deg;
    filter: drop-shadow(2px 3px 0 rgba(23, 45, 69, 0.35));
    pointer-events: none;
  }
  .nb-badge .ring {
    transform-origin: 50px 50px;
  }
  .no-tag {
    position: absolute;
    z-index: 1;
    bottom: 8px;
    left: 8px;
    padding: 2px 9px;
    border-radius: 4px;
    background: var(--ink);
    color: var(--paper);
    font-family: var(--font-display);
    font-size: 12px;
    line-height: 1.6;
  }
  @media (min-width: 900px) {
    .blog-notebook {
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    }
    .nb-binding {
      top: 24px;
      right: auto;
      bottom: 24px;
      left: -9px;
      width: 16px;
      height: auto;
      background: radial-gradient(
          circle at 50% 50%,
          var(--ink) 5px,
          transparent 6px
        )
        0 0 / 16px 28px repeat-y;
    }
    .nb-cover {
      aspect-ratio: 4 / 3;
      clip-path: polygon(
        0 0,
        93% 0,
        97% 6%,
        93% 12%,
        98% 19%,
        94% 26%,
        97% 34%,
        92% 42%,
        97% 50%,
        94% 58%,
        98% 66%,
        93% 74%,
        97% 82%,
        94% 90%,
        97% 100%,
        0 100%
      );
    }
    .nb-page {
      padding: 26px 26px 26px 50px;
    }
    .nb-title {
      --n: 3;
      font-size: 28px;
    }
    .nb-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .nb-cta {
      width: auto;
    }
    .nb-badge {
      top: -34px;
      right: -20px;
      width: 112px;
      height: 112px;
    }
    .nb-excerpt {
      height: 96px;
      font-size: 16px;
      line-height: 24px;
      -webkit-line-clamp: 4;
    }
  }

  /* ── the specimens ── */
  .blog-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 30px 24px;
    margin-top: 34px;
    padding: 0;
    list-style: none;
  }
  @media (min-width: 680px) {
    .blog-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .blog-grid > li:nth-child(even) {
      margin-top: 16px;
    }
  }
  @media (min-width: 1100px) {
    .blog-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .blog-grid > li:nth-child(even) {
      margin-top: 0;
    }
    .blog-grid > li:nth-child(3n + 2) {
      margin-top: 18px;
    }
  }
  .blog-card {
    position: relative;
    display: grid;
    gap: 8px;
    height: 100%;
    padding: 10px 10px 14px;
    border: 2px solid var(--ink);
    border-radius: 4px;
    background: var(--paper);
    box-shadow: 4px 4px 0 rgba(23, 45, 69, 0.22);
    transition:
      rotate 200ms ease-out,
      translate 200ms ease-out;
  }
  @media (prefers-reduced-motion: no-preference) and (forced-colors: none) {
    .blog-card {
      rotate: var(--tilt, 0deg);
    }
  }
  .blog-card:hover,
  .blog-card:focus-visible {
    rotate: 0deg;
    translate: 0 -4px;
  }
  .tape {
    position: absolute;
    z-index: 2;
    top: -11px;
    left: 50%;
    width: 76px;
    height: 20px;
    background: rgba(255, 218, 85, 0.8);
    transform: translateX(-50%) rotate(-3deg);
    transition: transform 220ms ease-out;
  }
  .blog-card:hover .tape,
  .blog-card:focus-visible .tape {
    transform: translateX(-50%) rotate(-9deg) translateY(-3px);
  }
  .blog-card:hover,
  .blog-card:focus-visible {
    box-shadow: 6px 8px 0 rgba(23, 45, 69, 0.28);
  }
  .card-cover {
    aspect-ratio: 16 / 9;
    border-radius: 2px;
  }
  .stamp.on-card {
    position: absolute;
    top: 24px;
    right: 22px;
    rotate: 6deg;
  }
  .card-meta .go {
    display: grid;
    flex: none;
    place-items: center;
    width: 24px;
    height: 24px;
    margin-left: auto;
    border: 2px solid var(--ink);
    border-radius: 50%;
    color: var(--ink);
    transition:
      background 140ms ease-out,
      color 140ms ease-out,
      translate 160ms ease-out;
  }
  .card-meta .go::before {
    content: '';
    width: 6px;
    height: 6px;
    margin-left: -2px;
    border: solid currentColor;
    border-width: 2px 2px 0 0;
    rotate: 45deg;
  }
  .blog-card:hover .go,
  .blog-card:focus-visible .go {
    translate: 3px 0;
    background: var(--berry);
    border-color: var(--berry);
    color: #fff;
  }
  .card-title {
    height: 2.6em;
    margin: 4px 0 0;
    overflow: hidden;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .card-excerpt {
    height: 3em;
    margin: 0;
    overflow: hidden;
    font-size: 14px;
    line-height: 1.5;
    color: #34465a;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  /* ── the one orchestrated moment: the marker is drawn, the cards are pinned
        one after another, the badge is stamped on. Nothing moves otherwise. ── */
  @media (prefers-reduced-motion: no-preference) {
    .hero-title::after {
      animation: blog-marker 520ms 120ms cubic-bezier(0.3, 0.7, 0.2, 1) backwards;
    }
    .blog-notebook {
      animation: blog-pin 520ms 80ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
    }
    .blog-grid > li {
      animation: blog-pin 480ms calc(220ms + var(--i, 0) * 90ms)
        cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
    }
    .nb-badge {
      animation: blog-stamp 420ms 520ms cubic-bezier(0.3, 1.4, 0.4, 1) backwards;
    }
    .nb-badge .ring {
      animation: blog-spin 28s linear infinite;
    }
    .cover img {
      transition: opacity 260ms ease-out;
    }
    a:hover .cover img,
    a:focus-visible .cover img {
      transform: none;
    }
  }
  @keyframes blog-marker {
    from {
      transform: scaleX(0);
    }
  }
  @keyframes blog-pin {
    from {
      opacity: 0;
      translate: 0 -16px;
      scale: 1.03;
    }
  }
  @keyframes blog-stamp {
    from {
      opacity: 0;
      scale: 2.2;
      rotate: -40deg;
    }
  }
  @keyframes blog-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── no note with that tag ── */
  .blog-empty {
    display: grid;
    justify-items: center;
    gap: 14px;
    margin-top: 40px;
    font-weight: 700;
  }
  .blog-empty button {
    height: 44px;
    padding: 0 22px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: var(--paper);
    color: var(--ink);
    font-weight: 800;
    box-shadow: 2px 2px 0 var(--ink);
  }

  a:focus-visible,
  button:focus-visible {
    outline: 3px solid var(--berry);
    outline-offset: 3px;
  }
  @media (forced-colors: active) {
    .cover {
      forced-color-adjust: none;
    }
  }
`
