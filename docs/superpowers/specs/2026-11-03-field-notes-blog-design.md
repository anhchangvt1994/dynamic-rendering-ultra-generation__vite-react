# Field Notes blog on Supabase (`/blogs`, `/blogs/:slug`)

Replaces the Strapi blog (list, detail, search, blurhash, skeletons) with
articles kept in Supabase and edited in Supabase Studio. Strapi is gone for
good: no migration of old articles, the new blog starts with seed articles.

## Decisions (agreed with the owner)

- Direction **A, "Sổ tay thực địa"**: the blog is a naturalist's desk.
- Strapi removed completely (client code, env, `server.config.ts` token).
- Every request goes through the **apiProxy** (`ProxyAPI` → `/api?requestInfo=`)
  to keep its cache and the API store (SSR/ISR snapshot).
- Articles are managed in Supabase Studio; the owner gets its link.

## Data

`supabase/migrations/20261108000000_articles.sql`

| column | type | note |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `slug` | text unique | `^[a-z0-9]+(-[a-z0-9]+)*$` (check) |
| `title` | text | not empty |
| `excerpt` | text | card text and meta description |
| `body` | text | Markdown (subset below) |
| `cover_url` | text null | https URL or `/images/...` path |
| `cover_alt` | text | default '' |
| `cover_color` | text | `#rrggbb`, the cover's colour while the image loads and the card's tint |
| `tags` | text[] | stamp on the card; first tag is the main one |
| `status` | text | `draft` \| `pending` \| `published` \| `rejected` (check; Studio uses draft/published, `pending`/`rejected` are for member articles) |
| `author_id` | uuid null | `references auth.users on delete set null`; null = written in Studio (the editorial desk) |
| `like_count` | int | default 0, kept by trigger on `article_likes` |
| `published_at` | timestamptz null | set when published |
| `updated_at` | timestamptz | trigger |

- RLS on; policy `select` for `anon, authenticated`:
  `status = 'published' and published_at <= now()`. Explicit `grant select`
  only (see `20261031000001_explicit_grants.sql`); no insert/update/delete for
  anyone from the API. Studio writes as `postgres`.
- Seed: 6 Vietnamese articles about Pokémon (covers: official artwork URLs).
- pgTAP `supabase/tests/database/articles.test.sql`: a member can not insert
  for another `author_id`, can not publish, can not edit a published article;
  likes: one per member, own article refused, draft refused, counter follows
  insert/delete; a draft and a future
  article are invisible to anon and authenticated; a published one is
  visible; anon can not insert/update/delete; the slug check rejects
  `Bad Slug`.
- No Supabase Storage (it is off locally and absent on the VPS): a cover is
  a URL.

## Open path: member articles and likes (schema now, UI later)

Built now (migration, RLS, pgTAP), no UI yet:

- `articles.author_id`: a signed-in member's article carries their id. The
  detail page shows "Bởi <display_name>" when set (from `profiles`).
- Member writing, later: an `authenticated` user may `insert` only
  `author_id = auth.uid()` with `status in ('draft','pending')`, `update`/`delete`
  only their own while not `published` (policies written and tested now, the
  `grant insert, update, delete` stays commented in the migration until the
  editor UI ships). A moderator (Studio) sets `published` / `rejected`.
  Authors read their own drafts through a second `select` policy.
- `article_likes (article_id, user_id, created_at, pk(article_id, user_id))`:
  `authenticated` may insert/delete their own row only. RPC
  `article_like(p_article uuid, p_on boolean)` toggles it. Rules: only a
  published article, **the author's own like and a like on one's own article
  never count** (the row is refused), one like per member and article.
  `like_count` is a trigger-kept counter, so the list needs no join.
- Gifts, later (the contract, not built): tiers on `like_count`
  (`article_reward_tiers(min_likes, item, qty)`), claimed once per article and
  tier by the author through an RPC that puts the items in the bag the quiz
  and the kitchen already use (`article_reward_claims(article_id, tier_id,
  claimed_at, pk(article_id, tier_id))`). Reading `like_count` through the
  apiProxy lags by `renewTime`, so a claim re-checks the live count in SQL.

Not built in this phase: the editor, the like button, the gift tiers, the claim
RPC. The list and detail already read `like_count` and `author_id` columns so
adding them needs no change of the read path.

## Managing articles (Studio)

- **Local** (`yarn dev` with `ENABLE_SUPABASE=true`): turn `[studio]` on in
  `supabase/config.toml`. Table Editor:
  `http://127.0.0.1:54323/project/default/editor` (table `articles`).
- **VPS**: the self-hosted stack has no Studio. Add `meta`
  (postgres-meta) and `studio` to `infra/supabase/docker-compose.yml`, bound
  to `127.0.0.1:54323` only (Studio has no login of its own, so it is never
  public). Open it through an SSH tunnel:
  `ssh -L 54323:127.0.0.1:54323 <user>@<vps>` then the same URL as above.
  A public sub-domain behind nginx basic auth is possible later, not now.
  The VPS part is written but can not be run from the dev machine: the owner
  checks it on the server.
- `docs/blog.md`: how to write an article (columns, Markdown subset, cover,
  publishing = `status` + `published_at`), the links, the tunnel command.

## Reading through the apiProxy

`src/app/apis/blog.ts` (rewritten, RTK Query like `pokemon.ts`):

```
const proxyApi = ProxyAPI.init({ targetBaseUrl: `${SUPABASE_CLIENT_URL}/rest/v1` })
```

- `apikey: <publishable key>` header through `prepareHeaders` (the proxy
  forwards the client's headers; the key is public).
- List: `/articles?select=slug,title,excerpt,cover_url,cover_alt,cover_color,tags,published_at,read_minutes&order=published_at.desc`
  (no `body`). Detail: `/articles?slug=eq.<slug>&select=*&limit=1`.
  Search: `/articles?title=ilike.*<term>*&select=slug,title,excerpt,cover_url,cover_color&limit=8`
  (term escaped: `*`, `,`, `(`, `)` removed).
- Cache: `expiredTime: 'infinite'`, `renewTime: 60_000` (stale-while-revalidate:
  a change in Studio shows within about a minute), `enableStore: true` so the
  ISR snapshot carries the data (`getAPIStore`) and the first paint has it.
- Reading time: a generated column `read_minutes` (`ceil(words / 200)`) so the
  list does not need `body`.
- `env/env.api.mjs`: Strapi's base URL, paths, reducer path and endpoint names
  removed; new path builders for list / detail / search.
- Supabase off (`ENABLE_SUPABASE` false): the pages show a BattleMessage
  ("Bài viết chưa bật"), no request.

## Removed

`app/apis/blog.ts` (old), `components/common/BlogCard`,
`components/common/RelatedBlogsSheet`, `BlogPage/styles`, `BlogDetailPage/*`,
blog branches of the search bar and `Layout.tsx` skeletons, the Strapi entry
(and its Bearer token) in `server/src/server.config.ts`, the Strapi keys in
`config/types/ImportMeta.d.ts`, `ImageHelper` blurhash use for blogs
(the shared `Image` component stays for Pokémon). `server.config.ts` keeps the
`/blogs` ISR loader names.

## Pages

### `/blogs` — "the desk"

- Header: a small stamped title "Sổ tay thực địa", the count of notes.
- Newest article: a large notebook page (cover cut with torn edge, title in
  the display font, excerpt, reading time, date); on a phone it is a full-width
  card.
- Others: specimen cards (cover with washi tape, a rubber-stamped tag, title,
  two-line excerpt), slightly rotated by a fixed per-slug angle (±1.5°), in a
  staggered grid (1 column ≤ 679px, 2 ≥ 680px, 3 ≥ 1100px). Rotation off under
  `prefers-reduced-motion` and in forced-colors.
- Tag filter: stamps row (all + tags that exist), client-side, one row that
  scrolls sideways on a phone; filter is in the query string (`?tag=`).
- Empty and error: BattleMessage with retry.
- Skeleton: blocks the size of the loaded cards (same grid), no text.

### `/blogs/:slug` — "the page"

- Cover full-bleed, the title laid over its bottom on a paper strip; tag stamp,
  date, reading time.
- Body: Markdown subset rendered by our own small renderer (below), a drop cap
  on the first paragraph, `blockquote` as a sticky note in the margin (inline on
  a phone), images with a caption (the alt), code blocks.
- Reading progress: a Poké Ball rolling down the right edge (hidden under
  900px: a thin top bar instead); under reduced motion it does not roll, it
  only fills.
- End: "Đọc tiếp" with the two next articles (by `published_at`).
- SEO: `setSeoTag` with title, excerpt, cover; JSON-LD `Article`; 404 →
  BattleMessage "Bài viết này đã bỏ chạy!" with robots `noindex`.
- Skeleton: cover block + title bars + paragraph bars at the real heights.

### Images

The cover has its `cover_color` background and a fixed `aspect-ratio: 16/9`
(card) / `21/9` (detail, 4/3 on a phone): nothing jumps. Loaded with
`loading="lazy"` (the first card: `fetchpriority="high"`), faded in with
opacity only (no blur logic).

## Markdown subset (`src/pages/BlogPage/markdown.ts`)

Parsed to a React tree, never `dangerouslySetInnerHTML`, no raw HTML:
headings `##`/`###`, paragraphs, `**bold**`, `*italic*`, `` `code` ``, fenced
code, links (`http(s):`, `/`, `mailto:` only), unordered/ordered lists,
`>` quotes, `![alt](url)` (http(s) or `/` only), `---`. Anything else is plain
text. Unit-tested (`markdown.test.mjs`), including `<script>`, `javascript:`
links.

## Quality bar (QC)

- 320–1440 px: no horizontal overflow; no CLS from the skeleton to the page
  (script like `kitchen-layout.mjs`); keyboard focus visible; reduced motion
  respected; contrast AA.
- Drafts never appear in the list, the detail or the search.
- Studio edit appears after `renewTime`.
- Search bar returns Supabase results through `/api`.
- `yarn db:test`, markdown tests, `tsc` clean for the touched files.
- Never commit `server/dist/*`, never push.

## Out of scope

Comments, an editor UI, a like button, gift tiers and claims (their schema path is open above), Storage, migrating the Strapi
articles, public Studio.
