# Field Notes blog on Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Strapi blog with a Supabase-backed "Field Notes" blog (`/blogs`, `/blogs/:slug`, search), read through the apiProxy, edited in Supabase Studio, with the schema path open for member-written articles and likes.

**Architecture:** One `articles` table (+ `article_likes`) behind RLS; the browser reads PostgREST only through `ProxyAPI` (`/api?requestInfo=`) so the server cache and the API store (SSR/ISR snapshot) keep working. Pages are rebuilt from scratch; a small safe Markdown parser (pure `.mjs`, node-tested) feeds a React renderer. Strapi code, env and token are deleted.

**Tech Stack:** Supabase (Postgres 17, PostgREST, pgTAP via `yarn db:test`), React + Vite + styled-components + RTK Query, `ProxyAPI` helper, node:test, puppeteer QA scripts in `.superpowers/qa/`.

**Spec:** `docs/superpowers/specs/2026-11-03-field-notes-blog-design.md`

## Global Constraints

- Answer/UI copy in Vietnamese; sentence case; every state names what happened and offers one way forward (`BattleMessage`).
- Reads go through `ProxyAPI.init({ targetBaseUrl: <SUPABASE_CLIENT_URL>/rest/v1 })` with `expiredTime: 'infinite'`, `renewTime: 60000`, `enableStore: true` (spec "Reading through the apiProxy"). Never `supabase-js` for reads.
- No raw HTML, no `dangerouslySetInnerHTML` for article or search text. Links allow only `http:`, `https:`, `mailto:` and `/…` (not `//`); images only `http(s)` or `/…`.
- Layout: fits 320 px, no horizontal overflow, no CLS from skeleton to page (measured), `prefers-reduced-motion` respected (no rotation/rolling), visible `:focus-visible`, AA contrast, touch targets ≥ 44 px.
- Cover: `aspect-ratio` 16/9 (card), 21/9 detail (4/3 under 680 px); `cover_color` background while loading; opacity fade only; no blur logic.
- Breakpoints: 1 column ≤ 679 px, 2 ≥ 680 px, 3 ≥ 1100 px.
- Migrations: `supabase/migrations/20261108000000_articles.sql`; explicit `grant`s only (see `20261031000001_explicit_grants.sql`), no grant of insert/update/delete on `articles` to API roles in this phase.
- Never commit `server/dist/*`, never push. Commit messages end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- Local Supabase runs on the Colima profile `supabase`; check `colima list` and **ask the user before starting it**. Do not use `curl` (hook blocks it): use node `fetch` or puppeteer.

## Review Focus

1. A draft, `pending`, `rejected` or future-dated article must never reach an anonymous API read (Task 1 pgTAP).
2. A member liking their own article, liking twice, liking a draft, or liking while signed out: refused, counter unchanged (Task 1).
3. Markdown containing `<script>`, `javascript:` links, `data:` images, unclosed `**`, an empty body: rendered as plain text / nothing, never crashes (Task 3).
4. A slug or search term carrying PostgREST syntax (`a&select=*`, `x*,y`, `%`, `(`, `)`): escaped in the path, never changes the query; a term empty after cleaning makes no request (Task 3).
5. An article with no cover, no tags, a 120-character title, or one 4000-px-wide code line: no overflow at 320 px and no layout jump (Task 8, fixture-driven).

---

### Task 1: Database — articles, likes, RLS, seed, pgTAP

**Files:**
- Create: `supabase/migrations/20261108000000_articles.sql`
- Create: `supabase/tests/database/articles.test.sql`

**Interfaces:**
- Produces (columns the frontend reads): `articles(slug, title, excerpt, body, cover_url, cover_alt, cover_color, tags, status, published_at, updated_at, author_id, author_name, like_count, read_minutes)`.
- Produces RPC `public.article_like(p_article uuid, p_on boolean) returns int` (the new `like_count`; raises `not_signed_in`, `article_not_found`, `own_article`).

- [ ] **Step 1: Write the failing pgTAP test** `articles.test.sql` (style of `kitchen.test.sql`: `begin; select plan(N);` users inserted into `auth.users`, `set local role`/`request.jwt.claim.sub` to act as anon / a member). Assertions: (a) as `anon`, `select slug` returns only the published, past-dated seed slugs; a draft, a `pending`, a `rejected` and a `published_at = now() + 1 day` row inserted as postgres are invisible; (b) anon `insert`/`update`/`delete` on `articles` fail with permission denied; (c) slug check rejects `Bad Slug` and `a--b`; `cover_color` check rejects `red`; (d) `read_minutes` is 1 for a 10-word body and 2 for a 201-word body; (e) member policies (inside the test, `grant insert, update, delete on public.articles to authenticated`, rolled back with the transaction): insert with `author_id = auth.uid()` and `status 'pending'` ok; with another `author_id` fails; with `status 'published'` fails; own non-published row updatable, own published row not; another member's row not; `author_name` is filled from `profiles.display_name`; (f) likes: `article_like(published, true)` → `like_count` 1; again → still 1; `p_on false` → 0; on the member's own article → raises `own_article`; on a draft → `article_not_found`; with no JWT → `not_signed_in`; `article_likes` is not writable directly by `authenticated` (permission denied) and a member sees only their own like rows.
- [ ] **Step 2: Run** `yarn db:test` → FAIL (relation `public.articles` does not exist).
- [ ] **Step 3: Write the migration** with the columns of the spec's Data table (+ `author_id`, `author_name`, `like_count`, generated `read_minutes int = greatest(1, ceil(words / 200.0))` — if Postgres rejects it as non-immutable, fill it from the same `before insert or update` trigger). Checks: slug `^[a-z0-9]+(-[a-z0-9]+)*$`, `cover_color ~ '^#[0-9a-fA-F]{6}$'` default `'#ffb3c9'`, title not blank, status in `draft|pending|published|rejected`. Triggers: `updated_at`; `published_at = now()` when status becomes `published` and it is null; `author_name` from `profiles` when `author_id` is not null. RLS + policies: public `select` (`anon, authenticated`) `status = 'published' and published_at <= now()`; `select` own rows (`author_id = auth.uid()`); `insert` own with `status in ('draft','pending')`; `update`/`delete` own while `status <> 'published'` (with check keeps `author_id` and forbids `published`). `grant select on public.articles to anon, authenticated` only; the `grant insert, update, delete … to authenticated` line is present but commented, with a note "until the editor UI ships". `article_likes(article_id fk on delete cascade, user_id fk auth.users on delete cascade, created_at, pk(article_id, user_id))`, RLS select own, `grant select … to authenticated`, no write grants. `article_like` is `security definer`, `set search_path = ''`, `revoke … from public`, `grant execute … to authenticated`; a trigger on `article_likes` keeps `articles.like_count`. Seed 6 published articles (Vietnamese, 250–500 words each, covers `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/<id>.png`), with `published_at` on 6 different past days: `pikachu-mouse-dien` (Pikachu, #25, tags `Phân tích`), `eevee-tien-hoa` (#133, `Phân tích`), `mewtwo-bi-an-phong-thi-nghiem` (#150, `Câu chuyện`), `huong-dan-nuoi-pokemon-moi` (#1, `Hướng dẫn`), `bep-pokemon-nau-gi-truoc` (#143, `Hướng dẫn`, `Bếp`), `hanh-trinh-bat-pokemon-dau-tien` (#4, `Câu chuyện`). Bodies use the Markdown subset of Task 3 (at least one list, quote, `###`, bold and a link per two articles).
- [ ] **Step 4: Run** `yarn db:test` → PASS (all files, kitchen/quiz tests still pass).
- [ ] **Step 5: Commit** `feat(blog): articles, likes and RLS on Supabase`.

### Task 2: Supabase Studio (local + VPS) and the owner's guide

**Files:**
- Modify: `supabase/config.toml` (`[studio] enabled = true`, update the NOTE above `[realtime]`)
- Modify: `infra/supabase/docker-compose.yml` (services `meta`, `studio`), `infra/supabase/README.md`
- Create: `docs/blog.md`

**Interfaces:**
- Produces: link `http://127.0.0.1:54323/project/default/editor` (local); VPS: Studio on `127.0.0.1:${SUPABASE_STUDIO_PORT:-54323}` only.

- [ ] **Step 1: Local:** set `[studio] enabled = true`; after the user approves starting the stack, `yarn dev` (ENABLE_SUPABASE=true) and open the editor URL with puppeteer (no `curl`): the `articles` table lists the 6 seed rows. Record the image tags the CLI pulled for studio and postgres-meta: `docker ps --format '{{.Image}}' | grep -E 'studio|postgres-meta'`.
- [ ] **Step 2: VPS compose:** add `meta` (postgres-meta, `PG_META_PORT=8080`, `PG_META_DB_HOST=db`, `PG_META_DB_PASSWORD=${POSTGRES_PASSWORD}`, no published port) and `studio` (`STUDIO_PG_META_URL=http://meta:8080`, `POSTGRES_PASSWORD`, `SUPABASE_URL`/keys as the minimum Supabase's own self-hosting compose gives Studio, `ports: 127.0.0.1:${SUPABASE_STUDIO_PORT:-54323}:3000`, `depends_on` db healthy) pinned to the tags from Step 1. Studio must never be published beyond loopback (it has no login). Validate with `docker compose -f infra/supabase/docker-compose.yml config` (syntax only); say in the final report that the VPS run is unverified.
- [ ] **Step 3: `docs/blog.md`:** columns table, how to write/publish (`status = 'published'`, `published_at` auto, future date = scheduled), the Markdown subset, cover rules (https URL or `/images/..`, `cover_color`), tags, the links (local URL; VPS: `ssh -L 54323:127.0.0.1:54323 <user>@<vps>` then the same URL), the 60 s cache delay, and a "Member articles and likes: path open" section (what exists in the schema, what is not built).
- [ ] **Step 4: Commit** `feat(blog): Supabase Studio for managing articles`.

### Task 3: Pure pieces — paths, headers, Markdown, text helpers

**Files:**
- Create: `src/app/apis/blogPaths.mjs`, `src/app/apis/blogPaths.test.mjs`
- Create: `src/pages/BlogPage/markdown.mjs`, `src/pages/BlogPage/markdown.test.mjs`
- Create: `src/pages/BlogPage/text.mjs`, `src/pages/BlogPage/text.test.mjs`

**Interfaces (Produces):**
- `blogPaths.mjs`: `LIST_COLUMNS` string; `articleListPath(): string` = `/articles?select=<LIST_COLUMNS>&order=published_at.desc`; `articlePath(slug: string): string` = `/articles?slug=eq.<encodeURIComponent(slug)>&select=*&limit=1`; `cleanTerm(term: string): string` (removes `* , ( ) % & # " ' \ ` and control characters, collapses spaces, trims, max 60 chars); `articleSearchPath(term: string): string | ''` (`''` when `cleanTerm` is empty; else `/articles?title=ilike.*<encodeURIComponent(clean)>*&select=slug,title,excerpt,cover_url,cover_color&order=published_at.desc&limit=8`); `restHeaders(key: string): Record<string,string>` (`apikey` always; `Authorization: Bearer <key>` only when the key has two dots, i.e. a JWT).
- `markdown.mjs`: `parseMarkdown(src: string): Block[]`, `safeUrl(url: string, kind: 'link' | 'image'): string | null`, `plainText(blocks: Block[], max?: number): string`. `Block` = `{type:'h2'|'h3'|'p'|'quote', inline: Inline[]} | {type:'ul'|'ol', items: Inline[][]} | {type:'code', lang: string, text: string} | {type:'img', alt: string, src: string} | {type:'hr'}`; `Inline` = `{t:'text', v} | {t:'b'|'i', c: Inline[]} | {t:'code', v} | {t:'a', href, c: Inline[]}`.
- `text.mjs`: `splitHit(text: string, term: string): {text: string, hit: boolean}[]` (case-insensitive, accent-sensitive, never HTML), `hashAngle(slug: string): number` (stable, in `[-1.5, 1.5]` degrees, 1 decimal), `formatDate(iso: string): string` (`vi-VN`, "3 tháng 11, 2026" style, `''` for invalid), `readLabel(min: number): string` (`"3 phút đọc"`).

- [ ] **Step 1: Write failing tests.** `blogPaths.test.mjs`: `articlePath('a&select=*')` contains `a%26select%3D*`, has exactly one `select=`; `articleSearchPath('x*,y')` → term `x y` in the path; `articleSearchPath(' ()*, ')` is `''`; `articleSearchPath('Pikachu')` contains `ilike.*Pikachu*`; `restHeaders('sb_publishable_x')` has no `Authorization`; `restHeaders('a.b.c')` has `Authorization: 'Bearer a.b.c'`. `markdown.test.mjs`: `<script>alert(1)</script>` stays text in a `p`; `[x](javascript:alert(1))` yields `text` (not `a`); `![x](data:image/png;base64,AA)` yields no `img`; `[x](//evil.com)` not a link; `[x](/blogs/a)` and `https://…` are links; `**bold *nested* x**` nests; unclosed `**a` stays literal; fenced code keeps `<` verbatim as text; `1.` and `-` lists; `> quote`; `---`; `''` → `[]`; a 5000-char single line does not throw. `text.test.mjs`: `splitHit('Pikachu mạnh','chu')` → 3 parts, one `hit`; `splitHit('a<b>','<')` returns the raw `<` in text; `hashAngle` equal for equal slugs and within range; `formatDate('nope') === ''`.
- [ ] **Step 2: Run** `node --test src/app/apis/blogPaths.test.mjs src/pages/BlogPage/markdown.test.mjs src/pages/BlogPage/text.test.mjs` → FAIL (modules missing).
- [ ] **Step 3: Implement** the three modules per the Interfaces. `parseMarkdown`: a line-based block pass, then an inline pass with a small tokenizer (code → link/image → bold → italic); no regex that can backtrack catastrophically on the 5000-char case.
- [ ] **Step 4: Run** the same command → PASS.
- [ ] **Step 5: Commit** `feat(blog): safe markdown, paths and text helpers`.

### Task 4: API layer through the apiProxy, Strapi env removed

**Files:**
- Modify (rewrite): `src/app/apis/blog.ts`
- Modify: `src/app/store/index.ts` (reducer path literal), `env/env.api.mjs`, `config/types/ImportMeta.d.ts`, `src/utils/ApiHelper.ts`
- Modify: `server/src/server.config.ts` (delete the `api.list` Strapi entry and its Bearer token; keep `api: { list: {} }`)

**Interfaces:**
- Consumes: `blogPaths.mjs` (Task 3), `ProxyAPI`, `getApiProxyUrl`, `getAPIStore`.
- Produces: `BLOG_ENABLED: boolean` (`import.meta.env.SUPABASE_CLIENT_ENABLED === true`); `useGetArticlesQuery(): { data?: Article[] | {…}[] … }`, `useGetArticleQuery(slug: string)`, `useSearchArticlesQuery(term: string, { skip })`, and `articleStoreKey` helpers `listStoreKey = articleListPath()`, `detailStoreKey(slug) = articlePath(slug)` for `getAPIStore(...)`. Reducer path `'blogApi'`; endpoint names `getArticles`, `getArticle`, `searchArticles`. `type Article` (all columns of Task 1) and `type ArticleCard` (list columns) exported from `blog.ts`.

- [ ] **Step 1: Write the failing check:** `.superpowers/qa/blog-api.mjs` (puppeteer, dev server 5190, stack up): open `/robots.txt`, then in the page `import('/src/app/apis/blog.ts')` is not callable outside React, so instead open `/blogs` and record requests; assert at least one request to `/api?requestInfo=` whose decoded target ends with the `articleListPath()` string and that it answers 200 with the 6 seed slugs. Run it now → FAIL (old page calls Strapi).
- [ ] **Step 2: Implement** `blog.ts`: when `BLOG_ENABLED`, `ProxyAPI.init({ targetBaseUrl: \`${SUPABASE_CLIENT_URL (trailing slash stripped)}/rest/v1\` })`; `baseQuery: fetchBaseQuery({ baseUrl: getApiProxyUrl(), prepareHeaders: (h) => { Object.entries(restHeaders(key)).forEach(([k, v]) => h.set(k, v)); return h } })`; each `query` returns `proxyApi.get(path, { expiredTime: 'infinite', renewTime: 60000, cacheKey: path, enableStore: true })`; search uses `expiredTime: 'infinite'`, `renewTime: 60000`, `enableStore: false`; callers pass RTK `skip` when `articleSearchPath(term)` is `''`. When not enabled, hooks are called with `skip: true` by the pages (export `BLOG_ENABLED` for them). `keepUnusedDataFor: 300` on detail.
- [ ] **Step 3: Remove Strapi:** delete `base_strapi_url`, the three blog/search paths, `reducer_path.strapi` and the three blog endpoint names from `env/env.api.mjs`; delete the matching keys (`API_BASE_STRAPI_URL`, `API_PATH_GET_POKEMON_BLOGS`, `API_PATH_GET_POKEMON_BLOG_DETAIL_FUNCTION`, `API_PATH_SEARCH_ARTICLES_BY_TITLE_FUNCTION`, `API_REDUCER_PATH_STRAPI`, `API_ENDPOINT_GET_POKEMON_BLOGS`, `…_BLOG_DETAIL`, `…_SEARCH_ARTICLES_BY_TITLE`) from `ImportMeta.d.ts`; delete `getBlogDetailPath`/`getSearchArticlesByTitlePath` from `ApiHelper.ts`; replace `blogApi.reducerPath` use in the store (it stays a normal reducer). Regenerate the git-ignored `config/env/env.json`/`.env` by restarting `yarn dev`. Run `grep -rniE "strapi|anhchangvt1994|blurhash" src env config server/src --include=* -l` excluding `dist/` and `node_modules` → only `Image` (Pokémon) blurhash use may remain.
- [ ] **Step 4: Verify:** temporarily call `useGetArticlesQuery()` from the existing `BlogPage` if needed to fire the request, run `blog-api.mjs` → exit 0 (Task 5 rewrites the page). Run `npx tsc --noEmit -p . | grep -iE "apis/blog|store/index|ApiHelper|server.config"` → no output.
- [ ] **Step 5: Commit** `feat(blog): read articles through the apiProxy, drop Strapi config`.

### Task 5: `/blogs` — the desk (page, skeleton)

**Files:**
- Rewrite: `src/pages/BlogPage/index.tsx`, `src/pages/BlogPage/styles.tsx`
- Create: `src/pages/BlogPage/Notebook.tsx` (the newest article's page), `src/pages/BlogPage/Specimen.tsx` (a card), `src/pages/BlogPage/Stamp.tsx` (tag stamp)
- Create: `src/components/PageSkeleton/BlogSkeleton.tsx`; Modify: `src/components/PageSkeleton/index.tsx` (`case import.meta.env.ROUTER_BLOGS_ID: return <BlogSkeleton />`)
- Delete: `src/components/common/BlogCard/` (3 files)

**Interfaces:**
- Consumes: `useGetArticlesQuery`, `BLOG_ENABLED`, `listStoreKey`, `getAPIStore`, `ArticleCard` (Task 4); `hashAngle`, `formatDate`, `readLabel` (Task 3); `BattleMessage`; `setSeoTag`.
- Produces: classes the layout script measures: `.blog-hero`, `.blog-tags`, `.blog-notebook`, `.blog-grid`, `.blog-card`. Query string `?tag=<tag>` filters client-side.

- [ ] **Step 1: Write the failing layout script** `.superpowers/qa/blog-layout.tsx` + `blog-layout.mjs`, copied from `kitchen-layout.*` and pointed at `/blogs` with selectors `.blog-hero, .blog-tags, .blog-notebook, .blog-grid` (skeleton vs loaded: same `y`/`height` within 1 px, skeleton has no text, no overflow, no page errors) at widths 320/375/600/768/1100/1440. Run it → FAIL (selectors missing).
- [ ] **Step 2: Implement the page.** Data: `data = getAPIStore(listStoreKey)` as the initial value like the old page; states: `RenderingInfo.loader || (isFetching && !data)` → `BlogSkeleton`; `!BLOG_ENABLED` → BattleMessage "Bài viết chưa bật" (`action` → home); error/non-array → BattleMessage "Máy chủ bài viết đã gục ngã!" with retry; empty → "Chưa có bài viết nào." SEO: `setSeoTag` title "Sổ tay thực địa | Pokédex", `robots: 'index, follow'`. Design (Direction A, from the spec): `.blog-hero` is a stamped title "Sổ tay thực địa" with the note count; `.blog-tags` is a one-row stamp strip (all + existing tags, `aria-pressed`, scrolls sideways under 680 px, writes `?tag=` with `replace`); `.blog-notebook` is the newest article as a large notebook page (torn-edge cover via `clip-path`, spiral-binding dots, display-font title, excerpt, reading time, date, "Đọc bài" link); `.blog-grid` holds the rest as specimen cards (washi-tape strip, rubber-stamp tag rotated, two-line excerpt via `line-clamp`, per-slug `hashAngle` rotation applied only inside `@media (prefers-reduced-motion: no-preference)` and `(forced-colors: none)`, straightened on hover/focus). Cards are one `<a>` each (whole card clickable, one focus stop); first card image `fetchpriority="high"`, others `loading="lazy"`; image box has `aspect-ratio` and `cover_color` background, `<img>` fades in on `onLoad` by opacity only. Use the Kitchen's tokens locally (`--ink:#172d45; --rose:#ffb3c9; --berry:#e8587d`, `var(--font-display)`). Filter with no match → inline line "Chưa có ghi chú nào với nhãn này" plus a "Xem tất cả" button.
- [ ] **Step 3: Implement `BlogSkeleton`** with the shared `bone` helpers from `./bone` (see `KitchenSkeleton.tsx`): blocks only, derived from the same geometry rules as the page (the page's wrapper styles are shared through exported styled blocks in `styles.tsx`, as `KitchenSkeleton` extends `KitchenStyle`); 1 notebook block + 5 card blocks.
- [ ] **Step 4: Run** `node .superpowers/qa/blog-layout.mjs` → exit 0 at all widths; screenshot 320/768/1440 and review against Direction A (designer critique pass: one memorable element — the notebook page — everything else quiet; fix what reads generic).
- [ ] **Step 5: Commit** `feat(blog): the Field Notes desk page with skeleton`.

### Task 6: `/blogs/:slug` — the page (detail, renderer, skeleton)

**Files:**
- Rewrite: `src/pages/BlogDetailPage/index.tsx`, `styles.tsx`; Delete: `utils.tsx`, `loading.tsx`
- Create: `src/pages/BlogDetailPage/Markdown.tsx` (renders `Block[]` to React), `ReadBall.tsx` (progress), `Related.tsx` ("Đọc tiếp")
- Create: `src/components/PageSkeleton/BlogDetailSkeleton.tsx`; Modify: `PageSkeleton/index.tsx` (`case import.meta.env.ROUTER_BLOG_DETAIL_ID`)

**Interfaces:**
- Consumes: `useGetArticleQuery(slug)`, `useGetArticlesQuery()` (for Related: the next two by `published_at`, no extra request), `detailStoreKey`, `parseMarkdown`, `plainText`, `safeUrl` (Task 3), `BattleMessage`, `useNavigateInfo`.
- Produces: `.blog-article`, `.blog-cover`, `.blog-body`, `.blog-related` (measured by the layout script).

- [ ] **Step 1: Extend the failing layout script** to `/blogs/pikachu-mouse-dien` (selectors `.blog-cover, .blog-title, .blog-body`; the body may differ in height, so compare only the `y` of `.blog-cover` and `.blog-title`). Add node test cases to `markdown.test.mjs` only if a renderer bug appears. Run → FAIL.
- [ ] **Step 2: Implement `Markdown.tsx`**: a pure function component mapping blocks to elements (`h2`, `h3`, `p`, `ul`/`ol`, `blockquote`, `pre><code`, `figure><img + figcaption`, `hr`, `a` with `rel="noopener noreferrer"` and `target="_blank"` for external only). No `dangerouslySetInnerHTML`.
- [ ] **Step 3: Implement the page:** back button (existing behaviour: `navigate(-1)` or the blogs path), cover full-bleed with the title laid on a paper strip over its bottom edge, tag stamp, date, `readLabel`, "Bởi <author_name>" only when `author_name` is set; body in a readable measure (≤ 68ch), drop cap on the first paragraph of the body (CSS `::first-letter`, only when that block is a `p`), `blockquote` as a sticky note floated into the margin ≥ 1100 px and inline below; code blocks scroll horizontally inside themselves; images with caption from `alt`. `ReadBall`: ≥ 900 px a Poké Ball on the right edge whose vertical position and rotation follow the scroll of the `BodyStyle` scroller (find it with `closest('[data-scroller]')` or the same ref `Layout` uses; add the attribute in `Layout.tsx` if missing); < 900 px a 3 px top bar; under `prefers-reduced-motion` the ball does not rotate and the position change is not animated (`aria-hidden`). `Related`: two cards, same markup as `Specimen` (import it). SEO: `setSeoTag` (title, description = `excerpt`, `og:image` = absolute `cover_url`, `og:type: 'article'`, `robots: 'index, follow'`) and a JSON-LD `Article` script (headline, image, datePublished, dateModified, author name or "Pokédex Field Notes"); not found → BattleMessage "Bài viết này đã bỏ chạy!" with `robots: 'noindex'`. Error/disabled/loading states as Task 5.
- [ ] **Step 4: Implement `BlogDetailSkeleton`** (cover block at the real aspect-ratio, title bars, 8 paragraph bars, no text).
- [ ] **Step 5: Run** `node .superpowers/qa/blog-layout.mjs` → exit 0; screenshot 320/768/1440 for review; scroll the page and check `ReadBall` reaches the bottom at 100 % at 1440 px and the bar at 320 px.
- [ ] **Step 6: Commit** `feat(blog): the article page with reading ball and skeleton`.

### Task 7: Search bar, Pokémon page and old components removed

**Files:**
- Modify: `src/components/common/SearchBlogBar/index.tsx`, `components/SearchResults/index.tsx`, `components/SearchResults/loading.tsx` (keep; it is the search list skeleton), delete `components/SearchResults/utils.ts` if unused
- Modify: `src/pages/PokemonPage/index.tsx` (remove the `RelatedBlogsSheet` import and the portal at ~line 420), `src/Layout.tsx` (remove blog `loading` branches, `BlogCardLoading`/`BlogDetailLoading`/`BlogPageStyled` imports and `<div id="related-blogs-sheet" />`)
- Delete: `src/components/common/RelatedBlogsSheet/` (all)

**Interfaces:**
- Consumes: `useSearchArticlesQuery(term, { skip })`, `splitHit`, `getBlogDetailPath` from `ROUTER_BLOG_DETAIL_GET_PATH_FUNCTION`.

- [ ] **Step 1: Write the failing browser check** `.superpowers/qa/blog-search.mjs`: open `/blogs`, open the search bar, type `Pikachu`, wait 700 ms, assert one result linking `/blogs/pikachu-mouse-dien` and that the request went to `/api?requestInfo=`; type `<img src=x onerror=window.__x=1>` and assert `window.__x` is undefined and the markup is shown as text; type `()*,` and assert no `/api` request was made. Run → FAIL.
- [ ] **Step 2: Implement:** results use `{slug,title,excerpt,cover_url,cover_color}`; highlight with `splitHit` into `<mark>` children (no HTML string); thumbnail is a plain `<img loading="lazy">` on `cover_color` (no `Image`/blurhash); `useSearchArticlesQuery(keyword, { skip: !keyword || !BLOG_ENABLED })`; `data` is the array PostgREST returns (not `data.data`).
- [ ] **Step 3: Remove** `RelatedBlogsSheet` and its use in `PokemonPage` and `Layout.tsx`; the Pokémon page keeps working without it.
- [ ] **Step 4: Run** `blog-search.mjs` → exit 0; `npx tsc --noEmit -p . | grep -iE "Blog|Layout|PokemonPage|SearchBlogBar"` → no output; open `/pokemon/pikachu` and `/` and assert no page errors.
- [ ] **Step 5: Commit** `feat(blog): search on Supabase, remove the old blog components`.

### Task 8: QC — fixtures, edge layouts, full pass, docs

**Files:**
- Create: `.superpowers/qa/blog-edge.mjs`, `.superpowers/qa/blog-e2e.mjs`
- Modify: `docs/blog.md` (final), `README.md` only if it mentions Strapi

- [ ] **Step 1: `blog-edge.mjs`** (puppeteer request interception: answer `/api?requestInfo=` list and detail with fixtures, plain JSON): an article with no cover, no tags, a 120-character title, an empty `body`, and a body with a 4000-character code line and a 100-character unbroken word; at 320/375/768/1440 assert `documentElement.scrollWidth <= innerWidth`, no page errors, title and excerpt visible, card heights consistent per row.
- [ ] **Step 2: `blog-e2e.mjs`** (against the real local API): list shows the 6 seed articles, newest first; the tag filter narrows and `?tag=` survives reload; clicking a card opens its detail with `<title>` = article title; a bad slug shows "Bài viết này đã bỏ chạy!" and `robots` noindex; a draft inserted with `docker exec … psql` (or the Studio) is absent from list, detail and search, then removed; reduced-motion emulation (`page.emulateMediaFeatures`) → computed `transform` of `.blog-card` is `none`; keyboard: Tab reaches each card once, focus ring visible.
- [ ] **Step 3: Run everything:** `yarn db:test`; `node --test` on the three Task 3 test files and the existing `src/pages/**/*.test.mjs`; `blog-layout.mjs`, `blog-search.mjs`, `blog-edge.mjs`, `blog-e2e.mjs`; `kitchen-layout.mjs` (regression); `npx tsc --noEmit -p . | grep -iE "blog|Layout|SearchBlogBar|PokemonPage|store"`; `yarn lint` on touched files. All pass; report any failure verbatim.
- [ ] **Step 4: Cache check:** edit a seed title in Studio/psql, reload within 60 s (old title may show) and after 60 s plus one more reload (new title shows); note the observed delay in `docs/blog.md`.
- [ ] **Step 5: Final docs + commit** `test(blog): QA scripts and owner guide`. Confirm `git status` shows no staged `server/dist/*`.
- [ ] **Step 6: Report to the user:** the Studio link(s), what is verified, what is not (VPS Studio), and the open path (member articles, likes, gifts) with what is and is not built.
