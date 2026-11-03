# Field Notes: managing the blog

Articles live in the Supabase table `public.articles` and are edited in
Supabase Studio. Design: `docs/superpowers/specs/2026-11-03-field-notes-blog-design.md`.

## Open Studio

| Where | How |
|---|---|
| Local (`yarn dev` with `ENABLE_SUPABASE=true`) | <http://127.0.0.1:54323/project/default/editor>, table **articles** |
| VPS | Studio listens on the server's loopback only (it has no login). From your machine: `ssh -L 54323:127.0.0.1:54323 <user>@<vps>`, then open the same link as above |

On the VPS, Studio is part of `infra/supabase/docker-compose.yml`
(`yarn start` brings it up); the port is `SUPABASE_STUDIO_PORT` (default 54323).

## Write an article

Table Editor → `articles` → **Insert row**:

| column | what to put |
|---|---|
| `slug` | the address, `/blogs/<slug>`: lower case, digits, single dashes (`pikachu-mouse-dien`). Never change it once published |
| `title` | the headline |
| `excerpt` | one or two sentences: the card text and the search-engine description |
| `body` | Markdown (below) |
| `cover_url` | `https://…` or `/images/…`; a 16:9 picture works best. Empty is fine |
| `cover_alt` | what the picture shows (read aloud, and the caption) |
| `cover_color` | `#rrggbb`, shown while the cover loads and as the card's tint |
| `tags` | text array, `{Hướng dẫn}`; the first one is the main tag |
| `status` | `draft` (hidden) or `published` |

Leave `id`, `author_*`, `like_count`, `read_minutes`, `created_at`, `updated_at` alone: the
database fills them. `published_at` is set when the status becomes `published`;
set it yourself to a future date to schedule the article.

An article shows on the site only when `status = 'published'` **and**
`published_at` is in the past. Drafts never reach the API.

### Markdown

`## Heading` and `### Heading` (the title is the page's `h1`), paragraphs,
`**bold**`, `*italic*`, `` `code` ``, fenced code, `[text](url)`, `- ` and
`1. ` lists, `> quote` (shown as a sticky note), `![alt](url)` alone on a line,
`---`. Links: `https://`, `mailto:` or `/path` only; images: `https://` or
`/path`. Raw HTML is shown as text. Anything else is plain text.

## Delay

The site keeps what it read and refreshes it in the background (`renewTime`
60 s of the apiProxy, stale-while-revalidate). The first reload after 60 s
still shows the old text and starts the refresh; the next reload shows the
change. Measured: edit at 0 s, reloads at 70 s (old) and 105 s (new).

## Member articles and likes: the path is open

In the database (migration `20261108000000_articles.sql`, tests in
`supabase/tests/database/articles.test.sql`), not yet in the app:

- `articles.author_id` / `author_name`: an article written by a signed-in member. The
  article page already shows "Bởi <name>" when it is set.
- Policies: a member may insert their own article as `draft` or `pending`, edit or
  delete it while it is not published, and read it. Only Studio (you) sets
  `published` or `rejected`. The write **grants** are commented in the migration
  until the editor exists.
- `article_likes` and `article_like(p_article, p_on)`: one like per member, published
  articles only, never on one's own article. `articles.like_count` follows.
- Gifts based on likes (tiers, a claim function paying the bag): not built; the
  design is in the spec. A claim must re-check the live count, as the site reads
  `like_count` with a delay.

Not built: the editor, the like button, the gift tiers and claim.
