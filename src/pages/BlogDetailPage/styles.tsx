import { BlogStyle } from 'pages/BlogPage/styles'

/**
 * /blogs/:slug: one page of the notebook. The cover runs edge to edge, the
 * title sits on a paper strip over its bottom edge. The rules of the desk
 * (cover, stamp, specimen) come from BlogStyle.
 */
export const BlogDetailStyle = styled(BlogStyle)`
  padding-top: 0;

  > * {
    max-width: none;
  }
  /* ── the rail: back and the reading trail, pinned above the page ── */
  .read-rail {
    position: sticky;
    z-index: 6;
    top: 0;
    margin: 0 -16px;
    padding: 0 16px;
    border-bottom: 2px solid var(--ink);
    background: rgba(255, 253, 247, 0.94);
    backdrop-filter: blur(6px);
  }
  .read-inner {
    display: flex;
    align-items: center;
    gap: 18px;
    max-width: 1180px;
    height: 60px;
    margin-inline: auto;
  }
  .rail-back {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px 0 12px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 2px 2px 0 var(--ink);
    transition:
      translate 120ms ease-out,
      box-shadow 120ms ease-out;
  }
  .rail-back:hover {
    translate: -1px -1px;
    box-shadow: 3px 3px 0 var(--ink);
  }
  .rail-back:active {
    translate: 2px 2px;
    box-shadow: none;
  }
  .rail-back .chev {
    width: 8px;
    height: 8px;
    margin-left: 3px;
    border: solid var(--ink);
    border-width: 0 2.5px 2.5px 0;
    rotate: 135deg;
  }
  /* the trail: a dashed path, inked where the ball has been, a flag at its end */
  .read-trail {
    position: relative;
    flex: 1;
    height: 28px;
    margin-inline: 14px 16px;
  }
  .read-trail::before,
  .trail-fill {
    content: '';
    position: absolute;
    top: 50%;
    right: 0;
    left: 0;
    height: 0;
    border-top: 3px dashed rgba(23, 45, 69, 0.3);
    translate: 0 -50%;
  }
  .trail-fill {
    right: auto;
    width: calc(var(--p, 0) * 100%);
    border-top: 4px solid var(--berry);
    border-radius: 2px;
  }
  .read-ball {
    position: absolute;
    top: 0;
    left: calc(var(--p, 0) * 100%);
    width: 28px;
    height: 28px;
    margin-left: -14px;
    rotate: var(--r, 0deg);
  }
  .trail-flag {
    position: absolute;
    top: 3px;
    right: -16px;
    width: 14px;
    height: 22px;
    border-left: 3px solid var(--ink);
  }
  .trail-flag::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 12px;
    height: 10px;
    background: var(--berry);
    clip-path: polygon(0 0, 100% 50%, 0 100%);
  }
  @media (prefers-reduced-motion: reduce) {
    .read-ball {
      rotate: 0deg;
    }
  }
  .blog-article {
    max-width: 1180px;
    margin-inline: auto;
  }
  @media (min-width: 1100px) {
    /* the sheet: a column for the contents, the text beside it */
    .blog-article {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      column-gap: 48px;
    }
    .blog-article > .blog-cover,
    .blog-article > .blog-head {
      grid-column: 1 / -1;
    }
    .blog-article > script {
      display: none;
    }
  }
  .blog-cover {
    position: relative;
    aspect-ratio: 4 / 3;
    margin-inline: -16px;
    border-bottom: 3px solid var(--ink);
  }
  .blog-cover.cover img {
    object-fit: contain;
  }
  @media (min-width: 700px) {
    .blog-cover {
      aspect-ratio: 21 / 9;
      margin: 24px 0 0;
      border: 3px solid var(--ink);
      border-radius: 6px;
    }
    .blog-head {
      width: min(100%, 920px);
      margin-inline: 24px;
    }
  }
  .blog-head {
    position: relative;
    z-index: 2;
    display: grid;
    gap: 10px;
    margin: -44px 0 0;
    padding: 16px 16px 18px;
    border: 3px solid var(--ink);
    border-radius: 6px;
    background: var(--paper);
    box-shadow: 5px 5px 0 var(--ink);
  }
  .blog-tagrow {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 28px;
  }
  .blog-no {
    padding: 2px 9px;
    border-radius: 4px;
    background: var(--ink);
    color: var(--paper);
    font-family: var(--font-display);
    font-size: 12px;
    line-height: 1.6;
  }
  .blog-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(22px, 6vw, 42px);
    font-weight: 400;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .blog-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    margin: 0;
    font-size: 14px;
    line-height: 24px;
    color: var(--muted);
  }

  /* ── the body: a readable measure ── */
  .blog-body {
    max-width: 68ch;
    margin: 32px auto 0;
    font-size: 17px;
    line-height: 1.75;
    overflow-wrap: anywhere;
  }
  .blog-body > :first-child {
    margin-top: 0;
  }
  .blog-body p,
  .blog-body ul,
  .blog-body ol {
    margin: 0 0 1.1em;
  }
  .blog-body > p:first-child::first-letter {
    float: left;
    margin: 0.06em 0.12em 0 0;
    font-family: var(--font-display);
    font-size: 3.6em;
    line-height: 0.85;
    color: var(--berry);
  }
  .blog-body h2,
  .blog-body h3 {
    scroll-margin-top: 84px; /* clears the sticky reading rail */
    margin: 1.6em 0 0.5em;
    font-family: var(--font-display);
    font-weight: 400;
    line-height: 1.4;
  }
  .blog-body h2 {
    font-size: 24px;
  }
  .blog-body h3 {
    font-size: 19px;
  }
  .blog-body ul,
  .blog-body ol {
    padding-left: 1.4em;
  }
  .blog-body ul {
    list-style: none;
  }
  .blog-body ul > li {
    position: relative;
  }
  .blog-body ul > li::before {
    content: '';
    position: absolute;
    top: 0.72em;
    left: -1.1em;
    width: 8px;
    height: 8px;
    border: 2px solid var(--ink);
    border-radius: 50%;
    background: linear-gradient(var(--berry) 50%, #fff 50%);
  }
  .blog-body ol {
    list-style: decimal;
  }
  .blog-body ol > li::marker {
    color: var(--berry);
    font-weight: 800;
  }
  .blog-body li + li {
    margin-top: 0.3em;
  }
  .blog-body a {
    color: #2a4d8f;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .blog-body code {
    padding: 1px 6px;
    border-radius: 4px;
    background: rgba(23, 45, 69, 0.09);
    font-size: 0.9em;
  }
  .blog-body pre {
    margin: 0 0 1.2em;
    padding: 14px 16px;
    overflow-x: auto;
    border: 2px solid var(--ink);
    border-radius: 6px;
    background: #fff;
    line-height: 1.5;
  }
  .blog-body pre code {
    padding: 0;
    background: none;
    font-size: 14px;
  }
  .blog-body figure {
    margin: 1.4em 0;
  }
  .blog-body figure img {
    display: block;
    width: 100%;
    height: auto;
    border: 2px solid var(--ink);
    border-radius: 6px;
    background: var(--paper);
  }
  .blog-body figcaption {
    margin-top: 6px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--muted);
  }
  .blog-body hr {
    margin: 2em 0;
    border: 0;
    border-top: 2px dashed rgba(23, 45, 69, 0.35);
  }
  /* a quote is a sticky note */
  .blog-body blockquote {
    margin: 1.4em 0;
    padding: 14px 18px;
    background: #fff0a6;
    box-shadow: 3px 4px 0 rgba(23, 45, 69, 0.25);
    rotate: -0.8deg;
  }
  .blog-body blockquote p {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
  }
  @media (min-width: 1100px) {
    .blog-body {
      max-width: 700px;
      margin: 40px 0 0;
    }
  }

  /* ── the contents, beside the text on a wide screen ── */
  .blog-aside {
    display: none;
  }
  @media (min-width: 1100px) {
    .blog-aside {
      display: block;
      margin-top: 40px;
    }
  }
  .blog-outline {
    position: sticky;
    top: 24px;
    padding: 14px 0 14px 16px;
    border-left: 2px dashed rgba(23, 45, 69, 0.35);
  }
  .blog-outline p {
    margin: 0 0 6px;
    font-size: 13px;
    font-weight: 800;
    color: var(--muted);
  }
  .blog-outline ol {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .blog-outline button {
    position: relative;
    width: 100%;
    min-height: 40px;
    padding: 6px 10px;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.35;
    text-align: left;
    cursor: pointer;
    transition:
      background 140ms ease-out,
      color 140ms ease-out;
  }
  .blog-outline button:hover {
    background: rgba(23, 45, 69, 0.07);
    color: var(--ink);
  }
  .blog-outline button[aria-current='true'] {
    background: rgba(255, 203, 5, 0.35);
    color: var(--ink);
  }
  .blog-outline button[aria-current='true']::before {
    content: '';
    position: absolute;
    top: 8px;
    bottom: 8px;
    left: -19px;
    width: 4px;
    border-radius: 2px;
    background: var(--berry);
  }

  /* ── the end of the page ── */
  .blog-end {
    display: grid;
    gap: 14px;
    margin-top: 48px;
    padding: 18px;
    border: 2px dashed rgba(23, 45, 69, 0.4);
    border-radius: 8px;
    background: rgba(255, 253, 247, 0.7);
  }
  .blog-end p {
    margin: 0;
    font-weight: 700;
    line-height: 1.5;
  }
  .blog-end div {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .blog-copy,
  .blog-all {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 22px;
    border-radius: 999px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
    transition:
      translate 120ms ease-out,
      box-shadow 120ms ease-out,
      background 160ms ease-out;
  }
  .blog-copy {
    border: 0;
    background: var(--berry);
    color: #fff;
    box-shadow: 0 3px 0 #a52a4b;
  }
  .blog-copy[data-state='done'] {
    background: #2f7a4f;
    box-shadow: 0 3px 0 #1f5636;
  }
  .blog-copy[data-state='failed'] {
    background: #b8372e;
    box-shadow: 0 3px 0 #7d241d;
  }
  .blog-all {
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    box-shadow: 2px 2px 0 var(--ink);
  }
  .blog-copy:active,
  .blog-all:active {
    translate: 0 3px;
    box-shadow: none;
  }

  /* ── Đọc tiếp ── */
  .blog-related {
    max-width: 1100px;
    margin: 56px auto 0;
  }
  .blog-related h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 400;
    line-height: 1.5;
  }
  .blog-related .blog-grid {
    margin-top: 22px;
  }
`
