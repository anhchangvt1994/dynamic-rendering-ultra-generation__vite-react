-- The Field Notes blog (docs/superpowers/specs/2026-11-03-field-notes-blog-design.md):
-- articles written in Supabase Studio, read by everyone once published.
-- Tables are not exposed by default (api.auto_expose_new_tables = false), so
-- the GRANTs below are the only way in. Studio writes as postgres.
--
-- The path for member-written articles and likes is open here (policies,
-- like table, like RPC) but no editor or like button exists yet.

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(btrim(title)) > 0),
  excerpt text not null default '',
  -- Markdown, the subset of src/pages/BlogPage/markdown.mjs
  body text not null default '',
  cover_url text,
  cover_alt text not null default '',
  -- the cover's colour while the image loads, and the card's tint
  cover_color text not null default '#ffb3c9' check (cover_color ~ '^#[0-9a-fA-F]{6}$'),
  -- the first tag is the main one
  tags text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'published', 'rejected')),
  -- null: written in Studio (the editorial desk)
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  author_name text,
  like_count int not null default 0 check (like_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  read_minutes int not null default 1
);

create index articles_published_idx on public.articles (published_at desc)
  where status = 'published';
create index articles_author_idx on public.articles (author_id);

-- what the database owns on every write: the publication date, the author's
-- public name, the reading time (200 words a minute) and updated_at
create function public.articles_prepare()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.author_id is null then
    new.author_name := null;
  else
    select p.display_name into new.author_name
    from public.profiles p where p.id = new.author_id;
  end if;
  new.read_minutes := greatest(1, ceil(
    cardinality(regexp_split_to_array(btrim(new.body), '\s+')) / 200.0
  )::int);
  -- a like is not an edit
  if tg_op = 'INSERT'
    or (to_jsonb(new) - 'like_count' - 'updated_at')
       is distinct from (to_jsonb(old) - 'like_count' - 'updated_at') then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

revoke execute on function public.articles_prepare() from public, anon, authenticated;

create trigger articles_prepare
  before insert or update on public.articles
  for each row execute function public.articles_prepare();

alter table public.articles enable row level security;

create policy "articles: read published" on public.articles
  for select to anon, authenticated
  using (status = 'published' and published_at <= now());

-- member articles (path open): an author reads their own, whatever the status
create policy "articles: read own" on public.articles
  for select to authenticated
  using (author_id = (select auth.uid()));

create policy "articles: insert own" on public.articles
  for insert to authenticated
  with check (author_id = (select auth.uid()) and status in ('draft', 'pending'));

create policy "articles: update own" on public.articles
  for update to authenticated
  using (author_id = (select auth.uid()) and status <> 'published')
  with check (author_id = (select auth.uid()) and status in ('draft', 'pending'));

create policy "articles: delete own" on public.articles
  for delete to authenticated
  using (author_id = (select auth.uid()) and status <> 'published');

grant select on public.articles to anon, authenticated;

-- NOTE - Until the editor UI ships, nobody writes through the API. Turn this
-- on with it (articles.test.sql grants the same lines inside its transaction):
-- grant insert (slug, title, excerpt, body, cover_url, cover_alt, cover_color, tags, status, author_id),
--       update (slug, title, excerpt, body, cover_url, cover_alt, cover_color, tags, status),
--       delete
--   on public.articles to authenticated;

-- likes --------------------------------------------------------------------

create table public.article_likes (
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

alter table public.article_likes enable row level security;

create policy "article_likes: read own" on public.article_likes
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.article_likes to authenticated;

-- articles.like_count follows the rows, so the list needs no join
create function public.article_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set like_count = like_count + 1 where id = new.article_id;
  else
    update public.articles set like_count = greatest(like_count - 1, 0) where id = old.article_id;
  end if;
  return null;
end;
$$;

revoke execute on function public.article_likes_count() from public, anon, authenticated;

create trigger article_likes_count
  after insert or delete on public.article_likes
  for each row execute function public.article_likes_count();

-- like or unlike; returns the new count. A published article only, one like
-- per member, never on one's own article.
create function public.article_like(p_article uuid, p_on boolean)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_author uuid;
  v_found boolean;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  select true, a.author_id into v_found, v_author
  from public.articles a
  where a.id = p_article and a.status = 'published' and a.published_at <= now();
  if v_found is not true then
    raise exception 'article_not_found' using errcode = 'P0001';
  end if;
  if v_author = v_user then
    raise exception 'own_article' using errcode = 'P0001';
  end if;
  if p_on then
    insert into public.article_likes (article_id, user_id) values (p_article, v_user)
    on conflict do nothing;
  else
    delete from public.article_likes where article_id = p_article and user_id = v_user;
  end if;
  return (select a.like_count from public.articles a where a.id = p_article);
end;
$$;

revoke execute on function public.article_like(uuid, boolean) from public, anon;
grant execute on function public.article_like(uuid, boolean) to authenticated;

-- seed: six articles from the editorial desk -------------------------------

insert into public.articles
  (slug, title, excerpt, body, cover_url, cover_alt, cover_color, tags, status, published_at)
values
(
  'pikachu-mouse-dien',
  'Pikachu: vì sao chú chuột điện lại thành biểu tượng?',
  'Không phải Pokémon mạnh nhất, nhưng Pikachu là gương mặt của cả thế giới Pokémon. Thử tìm hiểu lý do.',
  $md$Pikachu (#25) không phải Pokémon mạnh nhất, cũng không hiếm nhất. Vậy mà nó đứng trên mọi tấm áp phích, mọi chiếc balo và cả một đoàn tàu bay.

## Một thiết kế biết nói

Hai má đỏ chứa điện, đôi tai nhọn đen ở chóp, cái đuôi hình tia chớp. Chỉ cần nhìn bóng đen, ai cũng đoán ra. Đó là dấu hiệu của một thiết kế tốt: **đơn giản đến mức vẽ được bằng ba nét**.

> Một Pokémon dễ vẽ là một Pokémon dễ nhớ.

## Bạn đồng hành, không phải công cụ

Trong anime, Pikachu của Ash từ chối vào Poké Ball. Nó đi bên cạnh, ngủ trên vai, giận dỗi rồi làm hòa. Khán giả không xem một con vật chiến đấu, họ xem một **người bạn**.

### Ba điều nên biết

- Pikachu tiến hóa thành Raichu bằng Đá Sấm.
- Hai má tích điện, khi sợ hãi nó có thể phóng ra rất mạnh.
- Có thể giữ Pikachu ở dạng gốc để học thêm chiêu mà Raichu không học được.

## Mạnh ở đâu?

Chỉ số của Pikachu khá khiêm tốn, nhưng tốc độ cao và hệ Điện đánh trúng nhiều đối thủ hệ Nước và Bay. Với người mới, nó là Pokémon đầu tiên cho cảm giác *mình thật sự đang chiến đấu*.

## Kết

Sức mạnh làm bạn nhớ một trận đấu. Nét mặt và tính cách mới làm bạn nhớ một Pokémon. Pikachu có đủ cả hai điều ấy, nên nó là biểu tượng.

Muốn biết nó thích ăn gì? Ghé [Bếp Pokémon](/che-bien) và thử nấu một món ngọt.$md$,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  'Pikachu đứng thẳng, hai má đỏ',
  '#ffe27a', array['Phân tích'], 'published', now() - interval '1 day'
),
(
  'eevee-tien-hoa',
  'Eevee và tám con đường tiến hóa',
  'Một Pokémon, tám hướng đi. Eevee cho thấy tiến hóa không chỉ là mạnh lên mà còn là chọn một cách sống.',
  $md$Eevee (#133) là Pokémon duy nhất mà người chơi phải **chọn** tiến hóa. Hầu hết các loài khác chỉ cần đợi đến cấp độ. Eevee thì hỏi bạn muốn nó trở thành ai.

## Thế hệ đầu: ba anh em nguyên tố

- **Vaporeon**: hệ Nước, dùng Đá Nước.
- **Jolteon**: hệ Điện, dùng Đá Sấm.
- **Flareon**: hệ Lửa, dùng Đá Lửa.

Ba cái tên này khiến cả một thế hệ người chơi tranh cãi: nên chọn nước, điện hay lửa?

## Về sau, thêm những cách khác

Eevee không còn chỉ cần đá. **Espeon** và **Umbreon** nhờ độ thân thiết, một con vào ban ngày, một con vào ban đêm. **Leafeon** và **Glaceon** nhờ ở gần những tảng đá đặc biệt. **Sylveon** nhờ độ thân thiết và một chiêu hệ Tiên.

> Tám lối đi, và mỗi lối đều dẫn tới một Pokémon có cá tính riêng.

### Cách chọn

1. Xem đội hình của bạn đang thiếu hệ nào.
2. Xem Pokémon đó hợp lối chơi chủ động hay phòng thủ.
3. Cuối cùng, chọn con bạn thấy đẹp nhất. Điều này không hề sai.

## Vì sao điều này hay?

Tiến hóa của Eevee biến một lựa chọn kỹ thuật thành một lựa chọn cảm xúc. Bạn không chỉ chọn chỉ số, bạn chọn **người bạn mà mình muốn đi cùng**.

Nếu muốn thử độ thân thiết trước, hãy nấu một món cho nó ở [Bếp Pokémon](/che-bien).$md$,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png',
  'Eevee ngồi, đuôi xù',
  '#e8c9a0', array['Phân tích'], 'published', now() - interval '3 days'
),
(
  'mewtwo-bi-an-phong-thi-nghiem',
  'Mewtwo và bí ẩn của phòng thí nghiệm',
  'Một Pokémon được tạo ra thay vì được sinh ra. Câu chuyện về Mewtwo là câu hỏi về việc ai có quyền tạo ra sự sống.',
  $md$Mewtwo (#150) mở đầu câu chuyện bằng một câu hỏi, không phải một trận đánh: *một sinh vật được tạo ra trong ống nghiệm có phải là một sinh vật thật?*

## Nguồn gốc

Mewtwo được tạo từ gen của Mew, Pokémon huyền thoại hiếm nhất, trong một phòng thí nghiệm bí mật. Các nhà khoa học muốn một Pokémon mạnh hơn mọi loài khác. Họ đã thành công. Điều họ không tính tới là **nó biết suy nghĩ**.

> Tôi là ai? Tôi từ đâu đến? Mục đích của tôi là gì?

Những câu hỏi ấy khiến Mewtwo khác hẳn một công cụ chiến đấu. Nó giận, nó cô đơn, và nó muốn tự đặt ra lý do để tồn tại.

## Sức mạnh

- Chỉ số tấn công đặc biệt thuộc nhóm cao nhất trò chơi.
- Hệ Siêu Linh, nhiều đối thủ không có cách đánh trả.
- Học được rất nhiều chiêu, nên đội nào cũng cần chuẩn bị riêng cho nó.

### Nhưng đó không phải điều đáng nhớ

Điều đáng nhớ là cuối bộ phim đầu tiên: Mewtwo chọn không hủy diệt, và xóa ký ức của mọi người để họ có thể tiếp tục sống. Một Pokémon mạnh nhất lại chọn **sự nhẹ nhàng**.

## Kết

Mewtwo cho thấy một Pokémon huyền thoại không cần phải là thần thánh. Nó có thể là một nhân vật buồn, trung thực và đáng thương, và đó là lý do ta vẫn nhắc đến nó sau nhiều năm.$md$,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png',
  'Mewtwo đứng, đuôi cuộn',
  '#cdb6ff', array['Câu chuyện'], 'published', now() - interval '6 days'
),
(
  'huong-dan-nuoi-pokemon-moi',
  'Hướng dẫn: nuôi người bạn Pokémon đầu tiên',
  'Bạn vừa nhận Pokémon đầu tiên? Đây là những điều nên làm trong tuần đầu để nó mạnh và gắn bó với bạn.',
  $md$Bạn vừa nhận Bulbasaur (#1), hoặc một Pokémon nào khác. Vui đấy, nhưng cũng hơi bối rối. Dưới đây là cách đi những bước đầu **mà không bị rối**.

## 1. Biết nó là hệ gì

Hệ quyết định gần như mọi thứ trong trận đấu. Bulbasaur thuộc hệ Cỏ và Độc: mạnh trước Nước và Đất, yếu trước Lửa và Bay. Hãy xem trang chi tiết của Pokémon trước khi vào trận.

## 2. Đừng bỏ qua độ thân thiết

Độ thân thiết làm Pokémon nghe lời hơn, tiến hóa theo nhiều cách và đôi khi tránh được đòn chí mạng. Có ba cách tăng nó:

- Đi cùng nó và thắng trận.
- Cho ăn món nó thích.
- Trò chuyện, vuốt ve, và thỉnh thoảng nghỉ ngơi.

### Mẹo nhỏ

> Pokémon được cho ăn món hợp khẩu vị sẽ gắn bó nhanh hơn việc chỉ luyện tập.

## 3. Mang theo một đội, không chỉ một con

Một Pokémon rất mạnh vẫn thua nếu gặp đúng hệ khắc nó. Hãy có ít nhất ba con khác hệ nhau.

## 4. Đi chậm lại

Không cần lên cấp thật nhanh. Hãy đi hết con đường, nói chuyện với mọi người, tìm đồ trên đất. Phần thưởng của việc đi chậm là những điều bạn sẽ không tìm thấy nếu cứ lao tới đích.

Chúc bạn bắt đầu tốt!$md$,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
  'Bulbasaur nhìn thẳng',
  '#b8e6b0', array['Hướng dẫn'], 'published', now() - interval '9 days'
),
(
  'bep-pokemon-nau-gi-truoc',
  'Bếp Pokémon: nên nấu món nào trước?',
  'Quả mọng, nước ngọt và bánh quy thành món ăn đầu tiên cho Pokémon. Gợi ý cho người mới vào bếp.',
  $md$Snorlax (#143) có thể ăn cả ngày. Bạn không cần nuôi nó mới biết một điều: **Pokémon rất mê ăn**. Bếp Pokémon là nơi bạn biến nguyên liệu trong túi thành món cho chúng.

## Bắt đầu với thực đơn

Vào [Bếp Pokémon](/che-bien), mở tab *Thực đơn*. Mỗi món ghi rõ công thức, thứ bạn còn thiếu và món đó cộng chỉ số gì. Nấu món nào đủ nguyên liệu trước, rồi thử món cần nhiều hơn.

### Chọn theo mục tiêu

- Muốn **Thân thiện**: ưu tiên món cộng Thân thiện, bấm "Sắp theo Thân thiện" để xếp lên đầu.
- Muốn đa dạng: nấu mỗi món một lần để xem hiệu quả.
- Dư nguyên liệu: nấu theo mẻ để đỡ bấm nhiều lần.

## Tự pha chế

Tab *Tự pha chế* cho bạn bỏ từ hai đến bốn nguyên liệu vào nồi. Nếu đúng công thức bí mật, món đó sẽ xuất hiện trong thực đơn. Nếu sai, nguyên liệu **không mất**.

> Thử sai là một phần của trò chơi, và bếp không phạt bạn vì điều đó.

## Mẹo

1. Nhìn vị của nguyên liệu: chua, ngọt, cay, chát, đắng.
2. Nồi "gần đúng" sẽ giữ lại những nguyên liệu đúng cho lần sau.
3. Đừng ép mình nấu hết, cứ nấu món mình thích.

Chúc bạn một bữa ngon!$md$,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png',
  'Snorlax ngồi ăn',
  '#9ed0e8', array['Hướng dẫn', 'Bếp'], 'published', now() - interval '12 days'
),
(
  'hanh-trinh-bat-pokemon-dau-tien',
  'Hành trình bắt Pokémon đầu tiên của tôi',
  'Một buổi chiều cỏ cao, ba lần ném hụt và một Charmander. Chuyện nhỏ về lần đầu tiên bắt được Pokémon.',
  $md$Tôi vẫn nhớ buổi chiều ấy. Cỏ cao đến đầu gối, trời hơi nắng, và tôi chỉ có năm quả Poké Ball.

## Gặp nó

Một con Charmander (#4) đang ngồi dưới gốc cây, đuôi lửa lắc nhẹ. Nó không chạy. Nó nhìn tôi như thể **đang đợi** điều gì đó.

> Ngọn lửa trên đuôi cho biết nó đang khỏe hay yếu.

## Ba lần hụt

Quả thứ nhất bay lệch. Quả thứ hai trúng, nhưng nó thoát ra, và tôi nghe tim mình đập mạnh. Quả thứ ba, tôi nín thở, ném chậm hơn.

- Quả bóng rung một lần.
- Hai lần.
- Ba lần.

Rồi im lặng. Tiếng *tách* nhỏ vang lên và mọi thứ dừng lại.

## Điều tôi học được

### Kiên nhẫn quan trọng hơn sức mạnh

Tôi từng nghĩ cần một đòn thật mạnh để làm Pokémon yếu đi. Hóa ra điều cần là **bình tĩnh** và chọn đúng lúc.

### Đừng ném hết bóng cùng một lúc

Tôi còn hai quả khi bắt được nó. Nếu hoảng loạn, tôi đã hết sạch.

## Về sau

Charmander ấy giờ đã tiến hóa. Nhưng mỗi lần nhìn nó, tôi vẫn thấy con vật nhỏ ngồi dưới gốc cây, đợi tôi nhiều hơn tôi tưởng.$md$,
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
  'Charmander với đuôi lửa',
  '#ffb590', array['Câu chuyện'], 'published', now() - interval '15 days'
);
