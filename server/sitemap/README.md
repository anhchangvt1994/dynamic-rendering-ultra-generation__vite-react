# Sinh sitemap bằng `start:sgen`

Chạy từ root repo, sau khi cài dependency và website đã truy cập được:

```bash
yarn start:sgen --host https://anhchangvt1994.com
```

`--host` là origin thật của website cần crawl, gồm scheme và hostname/port;
không phải IP SSH, thư mục source hay đường dẫn con. Nếu bỏ qua, lấy `HOST`
trong cấu hình môi trường server (`server/.env`, sau đó `.env.production`).
CLI ghi đè cấu hình trong file env. Dùng hostname cuối cùng sau redirect, ví dụ
`https://www.example.com` nếu website chuyển hướng sang `www`.
Không cần chạy thêm HTTP server nếu website đó đã chạy ở nơi khác.
`start:sgen` là crawler, không tự khởi động website.

## Chạy trên máy local hoặc cùng VPS với web server

Khi domain public chưa truy cập được từ máy chạy crawler, có thể crawl trực tiếp
ứng dụng local nhưng giữ domain public trong XML:

```bash
yarn start:sgen \
  --host https://anhchangvt1994.com \
  --crawl-origin http://localhost:8080
```

- `--host` / `HOST`: origin public ghi trong sitemap.
- `--crawl-origin` / `SITEMAP_CRAWL_ORIGIN`: origin thực sự dùng để mở trang.
  Nếu không cấu hình thì dùng cùng giá trị với `HOST`.
- Link tương đối và absolute link thuộc một trong hai origin được ánh xạ về
  URL public, dedupe rồi crawl qua origin nội bộ. Link ngoài cả hai origin bị bỏ.

Để lệnh ngắn `yarn start:sgen` dùng web server local trên máy này, đặt trong
`server/.env` của máy chạy crawler:

```dotenv
SITEMAP_CRAWL_ORIGIN=http://localhost:8080
```

`HOST` vẫn lấy từ `server/.env.production`. Cấu hình trong `.env.production`
nếu có sẽ ghi đè `.env`; cờ CLI ghi đè cả hai. Khi đổi web server/cổng phải đổi
`SITEMAP_CRAWL_ORIGIN`; muốn crawl thẳng domain thì xóa giá trị này hoặc truyền
`--crawl-origin https://anhchangvt1994.com`.

Lần kiểm tra trực tiếp máy macOS này, ngày 2026-10-28: domain public phân giải
thành `217.217.255.86`, TCP 80/443 đều trả `ECONNREFUSED`; ứng dụng thật ở
`http://localhost:8080` trả HTTP 200. Lệnh không có crawl-origin báo
`CouldntConnect` và giữ sitemap cũ. Lượt crawl localhost hoàn tất 702 URL trong
300,817 giây, gồm homepage, blogs và 700 URL pokemon; đây là dữ liệu ứng dụng
thật tại thời điểm đo, khác với fixture 25 URL trong VPS lab.

Lượt kiểm chứng cuối với đúng `yarn start:sgen` sau cấu hình crawl-origin đã
xuất bản **1.022 URL duy nhất**, gồm homepage, `/blogs` và 1.020 trang pokemon,
trong **391,717 giây**; peak RSS riêng Node khoảng 105 MiB. Cả 4 file XML được
parse hợp lệ và endpoint index/cả 3 sitemap con trên `localhost:8080` đều trả
HTTP 200 với đúng nội dung file. Tất cả `<loc>` dùng domain public, không dùng
localhost. Log và báo cáo của máy này nằm ở `.vps-lab/sitemap-local-after.log`
và `.vps-lab/sitemap-local-verified.json`. Không suy ra domain public đã nhận
kết nối chỉ từ việc các endpoint localhost hoạt động.

CLI in tiến độ mỗi 5 giây: số đã crawl/lưu/phát hiện, thời gian và URL đang xử lý.
XML được xuất bản vào vị trí chính thức **khi toàn bộ lượt crawl hoàn tất**;
trong lúc chạy, file cũ vẫn tồn tại và dữ liệu mới nằm trong staging. Chỉ coi
lượt chạy thành công khi có `[SITEMAP RESULT]` và exit code 0. Với hàng trăm URL,
việc file chính chưa đổi trong vài phút là bình thường.

## Tối ưu tốc độ: HTTP song song và browser fallback

Mặc định `--mode auto`: homepage, trang danh mục (path có tối đa một segment)
và seed URL khai báo trực tiếp dùng browser để lấy link sau hydration/API.
Trang chi tiết được đọc qua HTTP với UA Googlebot và `service: sitemap-crawler`,
tận dụng HTML ISR của server. Parser HTML5 `parse5` 7.3.0 xử lý entity, base href,
raw text, template và noscript. Nếu response còn script có thể chạy, event handler,
iframe/object hoặc meta refresh, crawler chuyển sang browser. Request lỗi mạng,
429/5xx đi qua retry; không tạo thêm browser request để đè lên server đang lỗi.

```bash
yarn start:sgen --concurrency 4 --render-concurrency 2
# Đối chiếu toàn bộ theo DOM/browser như luồng trước:
yarn start:sgen --mode render
```

`--concurrency` là số URL có thể xử lý đồng thời. Browser có pool và giới hạn
`--render-concurrency` riêng; HTTP chờ ISR không chiếm thêm browser page.
VPS 2 CPU/4 GiB mặc định **4 HTTP tasks, tối đa 2 browser render**; máy lớn mặc
định tối đa 8 HTTP tasks, còn browser vẫn mặc định 2. Cả hai bị chặn theo CPU/RAM;
1 GiB RAM tự giảm còn một. Server ISR vẫn giữ ngân sách render hiện có: tăng số
HTTP tasks không vượt qua giới hạn render của server.

Khi cache ISR chưa có, server vẫn phải render HTML, nên tốc độ bị giới hạn bởi
ngân sách ISR/API. Cache nóng mới đi thẳng qua HTTP nhanh. `auto` đọc view dành
cho bot ở trang chi tiết; dùng `--mode render` khi cần đối chiếu toàn bộ với view
JavaScript của người dùng, hoặc `--ready-selector` để yêu cầu browser cho mọi trang.
Không suy ra mọi website sẽ có cùng mức tăng tốc hay mọi timer JS đều đã kết thúc.

Mặc định crawler đọc sitemap đang có làm seed và **fetch lại** từng URL để kiểm
tra status/robots. Điều này giữ các URL đã phát hiện ở lượt infinite-scroll trước,
nhưng vẫn loại trang 404 hoặc noindex. Muốn bắt đầu chỉ từ link hiện tại:

```bash
yarn start:sgen --reuse-existing false
# Hoặc dùng một sitemap cũ khi thử output riêng:
yarn start:sgen --output-dir /tmp/sitemap-preview --seed-sitemap server/sitemap/sitemap.xml
```

Code tự tạo thư mục cha và file XML hợp lệ khi seed index hoặc sitemap con bị
thiếu; không cần tạo bằng tay trước khi chạy. File đã có nội dung được giữ nguyên.
Ví dụ index cũ trỏ tới `pokemon-sitemap.xml` đã bị xóa: crawler tự tạo lại file,
tiếp tục crawl và writer ghi danh sách URL thật khi hoàn tất. Writer cũng tự tạo
toàn bộ đường dẫn output và thư mục `sitemaps` nếu chưa có. Việc đọc dùng cùng
file descriptor cho stat/read để không lỗi ENOENT khi file bị thay thế giữa hai
bước. Các lỗi quyền ghi/đĩa vẫn được báo để tránh công bố kết quả thiếu dữ liệu.

Các index reference chỉ được đọc từ tên file sitemap hợp lệ trong thư mục nguồn;
không tải index bên ngoài, không chấp nhận traversal. URL được dedupe lại trước
khi crawl. HTTP response có giới hạn byte và timeout, hủy cả stream khi quá hạn;
redirect được xác thực origin và giữ nguyên slash của đường dẫn transport.

Đã sửa thêm ở server: profile network-idle của ISR dùng `domcontentloaded` cho
navigation rồi một bộ đợi network-idle, tránh đợi `networkidle2` thêm lần nữa.
Bộ theo dõi request, kiểm tra title và chờ React vẫn được giữ. CSR cache Brotli
cũng được decode đúng trước khi trả identity/gzip, tránh nội dung nhị phân hoặc
`gzip(Brotli(HTML))`. Hai sửa đổi server cần **build/restart web server** để mọi
process đang chạy nạp code mới; CLI sitemap tự nạp TypeScript ở mỗi lần chạy.

### Benchmark tối ưu lần hai

Cùng VPS lab CentOS/Node22.13/Lightpanda1.0.2, 2 CPU/4 GiB/no swap, fixture25URL,
3 lượt mỗi bộ, kiểm tra tập URL chính xác và parse XML. So với bản browser-only
sau lần sửa sitemap đầu tiên (snapshot `.vps-lab/sitemap-speed-before`):

| Phép đo, median 3 lượt | Browser-only | Hybrid auto |
| --- | ---: | ---: |
| 25 URL tĩnh | 6,601 s | 0,824 s |
| 25 URL, homepage chờ API800ms | 6,459 s | 1,630 s |
| CPU bộ tĩnh (CPU-s) | 2,294 | 0,717 |
| RAM ẩn danh đỉnh bộ tĩnh, toàn cgroup | 94 MiB | 103 MiB |
| RAM ẩn danh đỉnh bộ API trễ, toàn cgroup | 96 MiB | 104 MiB |
| URL và XML hợp lệ | 25/25 | 25/25 |
| OOM kills | 0 | 0 |

Đổi lại khoảng 9–10 MiB RAM ở fixture này để parse HTML và có thêm HTTP tasks.
Bộ tĩnh nhanh khoảng 8 lần, bộ API trễ khoảng 4 lần. Fixture này đo HTTP/static
và browser fallback, không giả lập chi phí tạo cache ISR lạnh của toàn ứng dụng.

Bộ đợi ISR riêng được chạy bằng Lightpanda trong cùng VPS lab: API trễ150ms,
`networkIdleMs=500` đúng mặc định; 3 cặp xen kẽ trước/sau. Median **1.136ms →
692ms**, vẫn xác nhận link xuất hiện sau API. Đây là thời gian hàm đợi với fixture,
không phải TTFB toàn ứng dụng hay tốc độ API upstream.

Ứng dụng thật trên máy này, cùng cấu hình 8 HTTP/2 render:

- Lượt có cache lạnh và phát hiện thêm URL: 1.162 URL trong84,209s, gồm đủ1.022
  URL trước đó; phần lớn thời gian còn lại chờ ISR server render trang chưa có cache.
- Lượt cache nóng ổn định: **1.322 URL trong9,427s**, 1.320 HTTP-only và2 browser,
  peak HTTP7, peak browser2, peak RSS riêng Node155MiB, không retry.
- Tập cũ1.022 URL được giữ và kiểm tra lại; bổ sung300 URL. Cả4 XML hợp lệ và
  được web server localhost phục vụ HTTP200. Dữ liệu trang thật thay đổi theo
  batch infinite-scroll; không dùng hai số lượng URL khác nhau làm benchmark
  so sánh tuyệt đối. Lượt browser-only1.022URL trước đó mất391,717s.

Báo cáo tại `.vps-lab/sitemap-speed-vps-reports/`, `.vps-lab/isr-wait-vps-default.log`,
`.vps-lab/sitemap-fast-hot.log` và `.vps-lab/sitemap-speed-live-verified.json`.

## Nguyên nhân bản cũ chỉ sinh một file

- `waitForNetworkIdle()` chạy trước `goto()`, nên đợi trên `about:blank`;
  HTML được lấy ngay sau `DOMContentLoaded`, trước khi API/React tạo link.
- Regex chỉ nhận href bắt đầu bằng `/` hoặc chuỗi `HOST`, bỏ qua `./detail`,
  `../page`, các URL tương đối khác và không giải mã entity HTML đúng cách.
- Ghi XML bằng worker không được `await`, trong khi CLI gọi `process.exit()`;
  tác vụ ghi cuối có thể chưa xong. Mỗi URL còn đọc/ghi lại toàn bộ XML.
- Chỉ `/blogs` và `/pokemon` được tách nhóm; các route khác dồn vào file chính.
  File chính trộn URL trang và URL sitemap trong `<urlset>`, thay vì sitemap index.
- UA Googlebot có thể đi qua ISR và nhận HTML/503 khác với trang CSR người dùng.

Test hồi quy đã tái hiện trường hợp API sinh link muộn: bản cũ chỉ lấy homepage
và xuất đúng một file, dù fixture có 25 URL.

## Kết quả và cấu hình

Sau khi thành công, mặc định có:

```text
server/sitemap/sitemap.xml                  # sitemapindex
server/sitemap/sitemaps/pages-sitemap.xml   # homepage
server/sitemap/sitemaps/blog-sitemap.xml    # /blogs và các trang con
server/sitemap/sitemaps/pokemon-sitemap.xml # /pokemon và các trang con
server/sitemap/sitemaps/docs-sitemap.xml    # ví dụ nhóm /docs
```

Số file phụ thuộc nhóm đường dẫn thật sự tìm thấy, không phải mỗi URL một file.
Nhóm có nhiều URL tự chia `blog-sitemap-2.xml`, … khi chạm **50.000 URL hoặc
50 MiB** XML chưa nén. XML dùng UTF-8 và escape entity. Không lấy thời điểm crawl
làm `lastmod`, vì đó không phải thời điểm cập nhật nội dung.

Index trỏ đến URL public ở root, ví dụ
`https://example.com/sitemap.xml?file=blog-sitemap.xml`. Router sitemap hỗ trợ
query này và vẫn phục vụ `/sitemaps/blog-sitemap.xml` cho caller cũ. Việc đặt URL
public ở root cho phép sitemap mô tả cả website theo [quy tắc vị trí sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
Sau khi cập nhật code router cần build/restart ứng dụng server đang chạy.
`robots.txt`/Search Console tiếp tục dùng `https://example.com/sitemap.xml`.

```bash
yarn start:sgen \
  --host https://anhchangvt1994.com \
  --concurrency 2 \
  --max-pages 20000 \
  --timeout-ms 30000
```

| Flag | Biến môi trường | Mặc định |
| --- | --- | --- |
| `--host` | `HOST` | origin public từ cấu hình server |
| `--crawl-origin` | `SITEMAP_CRAWL_ORIGIN` | cùng `HOST` nếu không cấu hình |
| `--output-dir` | `SITEMAP_OUTPUT_DIR` | `server/sitemap` |
| `--concurrency` | `SITEMAP_CONCURRENCY` | HTTP tasks: 4 trên 2 CPU/4 GiB, bị chặn theo CPU/RAM |
| `--render-concurrency` | `SITEMAP_RENDER_CONCURRENCY` | tối đa 2 browser, bị chặn theo CPU/RAM |
| `--mode` | `SITEMAP_MODE` | `auto`; `render` dùng browser cho mọi URL |
| `--max-response-mb` | `SITEMAP_MAX_RESPONSE_MB` | 8 MiB/HTTP response |
| `--seed-sitemap` | `SITEMAP_SEED_SITEMAP` | sitemap.xml trong output-dir |
| `--reuse-existing` | `SITEMAP_REUSE_EXISTING` | `true`, kiểm tra lại URL cũ |
| `--max-pages` | `SITEMAP_MAX_PAGES` | 20.000 URL crawl duy nhất |
| `--timeout-ms` | `SITEMAP_TIMEOUT_MS` | 30.000 ms/trang |
| `--idle-ms` | `SITEMAP_IDLE_MS` | mạng rảnh 300 ms sau navigation |
| `--settle-ms` | `SITEMAP_SETTLE_MS` | đợi React thêm 100 ms |
| `--ready-selector` | `SITEMAP_READY_SELECTOR` | không dùng |
| `--retries` | `SITEMAP_RETRIES` | 1 lần cho lỗi mạng, 429, 5xx |
| `--browser-engine` | `SITEMAP_BROWSER_ENGINE` | `BROWSER_ENGINE`, hoặc `chromium` |
| `--browser-ws-endpoint` | `SITEMAP_BROWSER_WS_ENDPOINT` | không dùng |
| `--executable-path` | `SITEMAP_EXECUTABLE_PATH` | launcher hiện có; flag này dùng Chromium |
| `--seed-url` | — | bổ sung một URL đầu vào; lặp lại được |

Concurrency đọc giới hạn cgroup CPU/RAM trên VPS/container. Trên 2 CPU/4 GiB,
mặc định 4 HTTP tasks và 2 browser; trên 1 GiB RAM, hạ xuống 1. Override vẫn bị
chặn theo ngân sách RAM, tối đa 2×CPU/16 HTTP tasks và số CPU/8 browser.
Đây là giới hạn số tác vụ, không phải hạn mức bộ nhớ cứng cho
JavaScript của trang; giảm concurrency khi chạy chung với ứng dụng nặng.
Lightpanda dùng một kết nối CDP riêng cho mỗi luồng vì mỗi kết nối chỉ hỗ trợ
một target. Kết nối/page được tái sử dụng, không khởi tạo worker cho mỗi URL.

Crawler dùng UA trình duyệt để đọc DOM sau render, chặn ảnh/font/media/CSS,
cho phép JS và API. Chỉ nhận link HTTP(S) thuộc origin public hoặc crawl-origin đã cấu hình, bỏ fragment,
chuẩn hóa dấu `/` cuối như bản cũ, giữ query, chống vòng lặp và bỏ link asset.
Trang 404/4xx và `noindex` không được ghi; `nofollow` ngừng theo link từ trang đó.
Redirect được ghi theo URL cuối, không lặp URL đích.

Nếu website dùng timer dài hoặc thêm link sau khi mạng đã rảnh, tăng
`--settle-ms` hoặc dùng selector xác nhận dữ liệu đã tải, ví dụ:

```bash
yarn start:sgen --host https://example.com --ready-selector '.home-page a[href]'
```

Selector được áp dụng cho **mọi trang**; chọn selector phù hợp với toàn site.
Crawler không tự click nút, cuộn infinite scroll hay liệt kê dữ liệu ẩn trong API.
Nó chỉ phát hiện link trong DOM đã render và các `--seed-url` được cung cấp.
Trang/API pagination không có link phải cung cấp seed phù hợp. Sitemap có ít
URL chưa chứng minh crawl đầy đủ mọi dữ liệu trong database.

Khi vượt `--max-pages`, lỗi mạng/5xx còn lại sau retry, hoặc ghi file lỗi, CLI trả
exit code 1 và không xuất bản kết quả crawl dở. Giới hạn URL giúp chặn query vô
hạn; tăng giới hạn sau khi kiểm tra URL thay vì âm thầm cắt sitemap. Dùng staging,
buffer append và rename từng file hoàn chỉnh, xuất bản index cuối; lỗi publish
bắt được sẽ rollback. Đây không phải transaction toàn thư mục khi SIGKILL/mất
điện giữa lúc rename. SIGINT/SIGTERM được xử lý để đóng page/kết nối, bỏ staging
và giữ sitemap cũ. Lock trong output ngăn hai lượt sinh đồng thời; lock PID chết
được thu hồi ở lượt sau. Thư mục `.sgen-*` còn lại sau SIGKILL có thể xóa khi
không có job đang chạy. Có thể dùng `--output-dir /tmp/sitemap-preview` để xem
kết quả trước khi thay sitemap đang dùng.

## Test và benchmark VPS

```bash
node --test scripts/vps-lab/sitemap-core.test.mjs scripts/vps-lab/sitemap.test.mjs
```

Browser test cần Chrome. macOS dùng đường dẫn Chrome mặc định; hệ thống khác
đặt `CHROME_EXECUTABLE`. Test có HTTP fixture localhost, bao gồm link muộn,
relative/base href, query/XML, redirect, noindex, lỗi crawl và dừng SIGTERM.

Phép đo dùng container CentOS Stream 10, Node 22.13.0, Lightpanda 1.0.2,
**2 CPU / 4 GiB / không swap**, network Docker `none` (fixture localhost).
Mỗi bộ chạy 3 lượt tuần tự với dữ liệu cố định; thời gian từ lúc spawn entry
sitemap đến process thoát, gồm mở browser, crawl và ghi file. Không tính cài
dependency/build toàn ứng dụng, bootstrap bản sao source hoặc parse XML hậu kiểm.
RAM là peak toàn cgroup lấy mẫu 50 ms, gồm harness, Node và Lightpanda; không
đồng nhất với RSS riêng của Node. Không có ứng dụng HTTP/PM2 khác cạnh tranh tải.
Kết quả fixture không phải cam kết tốc độ mạng hoặc website production.

| Phép đo | Trước | Sau |
| --- | ---: | ---: |
| Crawl 25 URL tĩnh, median 3 lượt | 39,066 s | 5,761 s |
| CPU toàn cgroup, median, bộ tĩnh | 3,162 CPU-s | 1,049 CPU-s |
| RAM ẩn danh đỉnh toàn cgroup, bộ tĩnh | 175 MiB | 94 MiB |
| Tổng RAM cgroup đỉnh, gồm page cache, bộ tĩnh | 202 MiB | 117 MiB |
| URL bộ tĩnh | 25/25 | 25/25 |
| Số file XML bộ tĩnh, gồm file chính | 3 (file chính trộn URL) | 5 (index + 4 nhóm) |
| URL sau API trễ 800 ms, cả 3 lượt | 1/25 | 25/25 |
| File XML bộ API trễ | 1 | 5 |
| Ghi 10.000 URL, median 3 lượt | 12,918 s | 0,060 s |
| XML writer với query chứa `&` | lỗi parse XML | hợp lệ |
| OOM kills trong các lượt | 0 | 0 |

Bộ tĩnh chạy đủ cùng tập URL cho cả hai phiên bản: thời gian giảm khoảng
**6,8 lần**, RAM ẩn danh đỉnh giảm khoảng **46%**. Bộ API trễ bản mới mất median
6,627 s; bản cũ mất 1,108 s nhưng bỏ sót 24 URL nên không so tốc độ theo cách đó.
Bộ writer đo riêng hàm ghi trực tiếp cùng 10.000 URL, không qua crawl/worker;
bao gồm startup Node/Sucrase. Baseline XML không hợp lệ, vì vậy cần đọc cùng
chỉ số chất lượng thay vì xem thời gian đó là hai đầu ra tương đương.

Smoke test bổ sung **1 CPU/1 GiB, không swap**, một lượt: tự chọn concurrency 1,
crawl đủ 25/25 URL trong 11,185 s, 89 MiB RAM ẩn danh đỉnh, XML hợp lệ, 0 OOM.
Đây là kiểm tra cấu hình nhỏ, không phải benchmark 3 lượt của profile đó.

Image đã dùng: `sha256:d5dfde46f6dab7782eafddcd1bb9095f473113e8834e4fcbab891647549d0d40`.
Lần sửa đầu đã chạy 72/72 Node tests, `yarn build`, build Sucrase và kiểm tra router uWS thật
trên Linux cho URL query ở root, URL legacy và query traversal không hợp lệ.

Script tạo bản sao source/output/env riêng dưới `.vps-lab`, không ghi vào sitemap
hay env của ứng dụng. Phụ thuộc Python 3 để parse XML hậu kiểm. JSON và XML thô
được lưu tại `.vps-lab/sitemap-benchmark/`; so sánh đúng tập URL kỳ vọng, báo riêng
coverage và XML hợp lệ. Một baseline bỏ sót link không được coi là nhanh hơn.
Bộ writer dùng 10.000 URL có `&` trong query để phát hiện XML chưa escape.

Ví dụ chạy lại trong container riêng (không dùng container production):

```bash
docker run -d --name sitemap-vps --cpus 2 --memory 4g --memory-swap 4g \
  --network none vps-lab/centos-app:bench-ready sleep infinity
docker cp server/src sitemap-vps:/app/server/
docker cp server/sitemap sitemap-vps:/app/sitemap-after
docker cp scripts/vps-lab/bench-sitemap.mjs sitemap-vps:/app/scripts/vps-lab/
docker exec sitemap-vps node scripts/vps-lab/bench-sitemap.mjs after static 3 sitemap-after
docker exec sitemap-vps node scripts/vps-lab/bench-sitemap.mjs after delayed 3 sitemap-after
docker exec sitemap-vps node scripts/vps-lab/bench-sitemap.mjs after writer 3 sitemap-after
docker cp sitemap-vps:/app/.vps-lab/sitemap-benchmark .vps-lab/
```

Baseline là `server/sitemap` tại Git `9f67bf5df9bef1664700b342ab8422168a9abec9`.
Dùng `git archive` trích thư mục đó vào thư mục tạm, copy vào container thành
`/app/sitemap-baseline`, rồi đổi label `after` → `before` và source
`sitemap-after` → `sitemap-baseline` ở cùng ba lệnh đo. Image phải có dependency
và binary Lightpanda tương ứng. Quy tắc XML tham khảo [Sitemaps protocol](https://www.sitemaps.org/protocol.html).
