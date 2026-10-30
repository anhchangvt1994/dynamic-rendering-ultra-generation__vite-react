# VPS application load lab

Kiểm thử cấu hình RAM nhỏ, tải đồng thời app + Redis + ISR + sitemap và lỗi
Lightpanda phát hiện khi đo: [MINIMUM.md](./MINIMUM.md).

## Phân tích và thay đổi ngày 2026-10-27

Nguồn yêu cầu: [bài phân tích VPS](https://chatgpt.com/share/6adf8ae6-3fec-83ec-9536-e445d01b1abf).
Log trong bài cho thấy hai `web-scraping` process dùng tổng khoảng 5,19 GiB RSS,
CPU pressure avg10 12,04%, nhưng memory pressure tại thời điểm lấy mẫu bằng 0.
Đó là bằng chứng cần kiểm soát worker/render và đo tải; chưa đủ để kết luận mạng
hoặc RAM đang nghẽn liên tục. Test DNS dùng `api.example.com` và test fq chỉ truyền
khoảng 15 KiB/60 giây không chứng minh tốc độ của API thật hay cải thiện throughput.

Code cũ nhân hai PM2 instances × hai HTTP workers × nhiều render workers được
khởi tạo sẵn. Pool còn được tạo lại khi nhàn, trong khi request API và rendering
phải cạnh tranh tài nguyên. Bản sửa tính ngân sách CPU/RAM chung, giới hạn pool,
chia permit giữa HTTP workers, và áp dụng cho cả ISR/SSR. Cache nóng được giới hạn
theo byte/TTL; upstream fetch dùng pool kết nối có giới hạn và hủy thật khi timeout.
Yarn workspace cũng được sửa để cài frozen lockfile bằng symlink thay vì copy cây
dependency của các workspace.

## Phép đo thực tế

- CentOS Stream 10, Node 22.13.0, Linux aarch64 trong Docker VM có khoảng 6 GiB RAM.
- VPS lab giới hạn **2 CPU, 4 GiB RAM, không có swap**, egress 50 Mbit/s + 30 ms.
- `lightpanda+redis+pm2` chạy đúng `start:redis-api:pm2:worker`, Lightpanda 1.0.2,
  Valkey 8.1.10; 50 VUs trong 30 giây, seed 12345, burst 20 URL chưa cache.
- Cùng image `vps-lab/centos-app:bench-ready`, ID
  `sha256:d5dfde46f6dab7782eafddcd1bb9095f473113e8834e4fcbab891647549d0d40`.
  Dependency được cài từ lockfile hiện tại trước cả hai lượt; source baseline là
  Git `97a10e0`, source sau là working tree. TCP profile giữ `baseline` ở mọi lượt.
- Disk limit 75G không được overlayfs áp dụng (filesystem thực khoảng 98G).

| Chỉ số trong phase load | Baseline | Giới hạn 1 render | Cân bằng 2 render |
| --- | ---: | ---: | ---: |
| RAM ẩn danh đỉnh (MiB) | 3380 | 637 | 746 |
| Node threads đỉnh | 175 | 73 | 79 |
| CPU dùng trung bình (core) | 2.00 | 0.36 | 0.49 |
| CPU PSI avg10 trung bình (%) | 76.11 | 1.39 | 3.68 |
| Cached bot req/s | 83.7 | 505.1 | 500.0 |
| Cached bot p95 (ms) | 271.9 | 46.1 | 46.8 |
| API req/s | 60.5 | 392.0 | 387.5 |
| API p95 (ms) | 331.6 | 47.4 | 48.0 |
| HTML UA mobile p95 (ms) | 407.0 | 47.1 | 48.0 |
| HTML UA desktop p95 (ms) | 465.4 | 46.4 | 48.5 |
| Hoàn tất burst 20/20 trang mới (s) | 5.809 | 20.605 | 11.388 |
| OOM kills | 0 | 0 | 0 |

Ngân sách tối đa mặc định là 1 render trên 1 CPU, 2 render trên 2–3 CPU và tối đa
4 render từ 4 CPU khi RAM cho phép. `CRAWL_CONCURRENCY` vẫn ghi đè trần này.
Trên máy 4 CPU với 2 PM2 instances, mỗi instance được tối đa 2 render slot.

Render gate tự giảm còn 1 slot mỗi instance nếu CPU PSI `avg10 >= 20%` hoặc
`avg60 >= 25%`, hoặc RAM khả dụng thấp hơn hai lần ngưỡng dự trữ. Gate chỉ phục
hồi về trần sau ít nhất 30 giây CPU PSI thấp (`avg10 <= 10%`, `avg60 <= 15%`) và
RAM khả dụng đạt ít nhất ba lần ngưỡng dự trữ. PSI được lấy mẫu tối đa mỗi giây;
slot đang chạy được hoàn tất, chỉ việc nhận render mới bị hãm. Nếu kernel không
cung cấp PSI thì giới hạn RAM hiện có vẫn hoạt động, còn giới hạn CPU giữ nguyên
trần đã tính.

Lượt lab bổ sung ngày 2026-10-30 chạy 90 giây ở 4 CPU/4 GiB, 20 request/giây:
1.800/1.800 request đúng, không rơi request; cache/API/HTML p95 lần lượt
15/20/10 ms, URL mới p95 1.224 ms; sitemap ghi đủ 65 URL trong 11,7 giây.
Working set đỉnh 1.406 MiB, CPU trung bình 0,341 core trong phase tải, không OOM
hoặc PM2 restart. Không có log chuyển mức render trong lượt này. Đây là một lượt
ngắn trên CentOS Docker lab, không phải soak hay phép đo production Ubuntu.

Đánh đổi là render nhiều URL mới chậm hơn baseline để giữ request tương tác nhanh.
Trong 150 lượt gọi URL mới ở phase load, baseline có 17 HTTP 200/133 HTTP 503;
bản cân bằng có 9 HTTP 200/141 HTTP 503. Các 503 dùng `Retry-After`; không gọi chúng
là request thành công chỉ vì có HTTP response. Riêng cached bot/API/HTML của bản
cân bằng đều 100% HTTP 200 trong lượt đo. Không suy ra tăng năng lực render thô từ
việc req/s cache/API tăng.

Đây là một lượt baseline và hai cấu hình thử, chưa phải phân tích thống kê hay đo
trên VPS Ubuntu 8 GiB thật. Latency đo đến khi nhận hết body, không phải TTFB.
UA mobile/desktop chỉ đo đường HTTP, không mô phỏng CPU điện thoại hay LCP/INP.
`freshRendered` là kiểm tra sau load; GET kiểm tra có thể tự kích hoạt render,
nên không dùng trường đó làm số render hoàn thành chính xác trong 30 giây.

Raw reports tại workspace (không commit file tải động/log riêng):

- `.vps-lab/report-1793071074217.json`: baseline.
- `.vps-lab/report-1793076259472.json`: 1 render.
- `.vps-lab/report-1793076599553.json`: 2 render, cấu hình được chọn.
- `.vps-lab/pm2-migration.json`: PM2 thật cập nhật 2 → 1 instances, đổi env/heap,
  HTTP tiếp tục trả 200. Việc giảm số PM2 process độc lập với ngân sách render.
- `.vps-lab/default-smoke.json`: bản cuối khởi động không override concurrency,
  trả HTTP 200 và tính đúng 1 PM2 process / 1 HTTP worker / 2 render trên 2 CPU/4 GiB.
- `.vps-lab/diagnostics-lab.txt`: script chẩn đoán chỉ đọc đã chạy trong container.
- `.vps-lab/minimum-vps/adaptive-4cpu-20261030/4cpu-4096m/report.json`:
  lượt xác nhận adaptive concurrency 4 CPU/4 GiB ngày 2026-10-30.

## Chạy lại

Đứng tại root repo. Build dependency/app image hiện tại:

```bash
docker build -f scripts/vps-lab/Dockerfile -t vps-lab/centos-app:latest .
```

Hai lượt cùng image; lần đầu chọn source từ Git, lần sau dùng working tree:

```bash
VPS_SOURCE_REF=97a10e0 VPS_SKIP_BUILD=1 VPS_MEMORY=4g VPS_CPUS=2 \
  LOAD_VUS=50 LOAD_SECONDS=30 node scripts/vps-lab/run.mjs lightpanda+redis+pm2
VPS_SKIP_BUILD=1 VPS_MEMORY=4g VPS_CPUS=2 \
  LOAD_VUS=50 LOAD_SECONDS=30 node scripts/vps-lab/run.mjs lightpanda+redis+pm2
```

`VPS_IMAGE` chọn image có sẵn khác; đặt cùng giá trị ở cả hai lượt. Image phải có
dependencies khớp lockfile. `CRAWL_CONCURRENCY=1` hoặc `2` thử ngân sách khác;
`LOAD_SEED` chọn seed. `TCP_PROFILE=ram` thử TCP riêng, không đổi cùng lúc với
resource budget nếu muốn phân biệt tác động. Source server/config luôn được đồng
bộ ngay cả khi `VPS_SKIP_BUILD=1`; không benchmark nhầm source cũ trong image.

Lab ghi JSON kể cả scenario thất bại và trả exit code khác 0. Container `vps-centos`
được reset giữa các scenario; chạy lại sẽ thay container cùng tên. Khi hoàn tất:

```bash
docker rm -f vps-centos
```

## Kiểm tra chức năng

```bash
bash scripts/vps-setup/test.sh
node --test scripts/vps-setup/network-profile.test.mjs scripts/vps-lab/runtime.test.mjs
CHROME_EXECUTABLE='/path/to/chrome' node --test scripts/vps-lab/browser-cleanup.test.mjs
```

HTTP fixture cần mở socket localhost. Browser test dùng Chrome headless với profile
tạm; kiểm tra hủy cả render đang chạy lẫn render bị treo khi khởi tạo Page, và xác
nhận target đóng trước khi trả permit. Trên macOS, test mặc định tìm Chrome ở đường
dẫn ứng dụng chuẩn; trên Linux đặt `CHROME_EXECUTABLE`.

Đã xác nhận 38/38 Node tests, kiểm tra CLI setup và build Sucrase thành công.
`yarn install --frozen-lockfile --ignore-scripts` cũng đã chạy thành công trên máy
phát triển và Linux lab; lifecycle startup/preflight/PM2 được kiểm tra riêng như
trên. Các cảnh báo peer dependency của bộ lint cũ vẫn tồn tại.

Hướng dẫn triển khai app và chẩn đoán tại VPS:
[README setup](../vps-setup/README.md#cân-bằng-tải-giữa-httpapi-và-render).

## Tối ưu regex HTML

Baseline: `77d781d`, trước thay đổi regex. Đo cục bộ trên Apple M4, macOS arm64,
Node 22.23.4; 5 lượt warmup, 21 mẫu mỗi phiên bản, chạy xen kẽ trước/sau.
Đây là thời gian xử lý HTML trong cùng process, không phải latency website hay
phép đo VPS giới hạn 2 CPU/4 GiB ở phần trên.

Median toàn luồng ISR `script/style → shallow → minify → deep`, đơn vị ms:

| HTML đầu vào | Trước | Sau | Thử đưa minify về cuối |
| --- | ---: | ---: | ---: |
| 500 card, khoảng 106 KiB | 7.930 | 2.305 | 2.331 |
| 500 link, khoảng 122 KiB | 83.918 | 3.091 | 3.072 |
| 1000 video/audio, khoảng 143 KiB | 117.806 | 2.427 | 2.437 |
| HTML lab đã sạch, khoảng 85 KiB | 2.139 | 2.362 | 2.437 |

HTML đã sạch không tăng tốc: việc đọc thuộc tính theo dấu nháy và bảo vệ raw text
thêm khoảng 0,22 ms trong mẫu này. Trường hợp nhiều link/media được lợi lớn nhất
từ việc giới hạn lookahead trong opening tag và bỏ lặp chồng nhau. Mẫu form
51.507 byte có 100 thuộc tính nhưng thiếu tag đóng khiến baseline vượt timeout
1 giây; bản sửa hoàn tất khoảng 2,5 ms. Đây là một ca cụ thể, không phải chứng minh
mọi HTML lỗi đều có thời gian xử lý tuyến tính.

Thứ tự minify trước deep được giữ nguyên: đưa minify về cuối không cho lợi ích
tốc độ ổn định trong các mẫu trên. Thay đổi thứ tự cần thiết nằm trước đó:
script/style/shallow được gộp một lượt khi cùng bật, và icon được nhận diện trước
khi bỏ class. Chế độ low vẫn chạy riêng, không còn là bước bắt buộc trước shallow.

Các wrapper div được thay bằng ranh giới khoảng trắng; không chèn khoảng trắng
giữa các span inline. Loại `<i/>`/`<i></i>` rỗng (kể cả chỉ có class) trước minify:
`<div>thomas</div><div><i/></div><div>edition</div>` cho đúng `thomas edition`,
một dấu cách. Test so sánh chuỗi đầu ra nguyên bản, không tự gộp khoảng trắng.
Các thuộc tính chỉ được xóa trong opening tag, giữ nguyên
giá trị thuộc tính khác, JSON-LD, comment và ví dụ pre/code. Comment marker thông
thường không chặn xử lý anchor bên ngoài. Khi một anchor/button bao quanh code
hoặc raw markup được bảo vệ, giữ nguyên cặp tag đó để tránh sửa nội dung ví dụ.
Input là void element, không được ghép với tag đóng của anchor/button phía sau.

Đầu ra trước/sau có thể khác kích thước: bản cũ có thể xóa nhầm link hợp lệ,
giữ icon/media không cần thiết và dính chữ. Test kiểm tra các nội dung cần giữ/xóa,
không dùng việc giảm byte làm bằng chứng HTML còn đúng.

Chạy lại với các fixture tổng hợp có sẵn:

```bash
node --test scripts/vps-lab/html-optimization.test.mjs
HTML_BASELINE_REF=77d781d node scripts/vps-lab/bench-html-optimization.mjs compare
```

Thêm đường dẫn file HTML sau `compare` để đo dữ liệu thực tế; `HTML_BENCH_CARDS`
đổi số phần tử tổng hợp, mặc định 500. Kết quả đầy đủ nằm tại
`.vps-lab/html-optimization/compare.json`; các log/test đầu vào động không commit.
Lượt đo tại workspace còn dùng
`.vps-lab/tmp/pre/pre-shallow-1792856504848.html` làm mẫu HTML lab đã sạch.

Đã kiểm tra `yarn build`, cập nhật ba file JavaScript tương ứng trong server/dist,
và chạy 60/60 Node tests, gồm 21 test tập trung vào tối ưu HTML.

So sánh thư viện/cấu hình minify, dung lượng Brotli và độ đúng của HTML:
[báo cáo minifier](./MINIFIERS.md).

## Sitemap generator

Luồng `yarn start:sgen`, nguyên nhân chỉ xuất một file, cấu hình CPU/RAM,
test hồi quy và benchmark trước/sau có tại [server/sitemap/README.md](../../server/sitemap/README.md).
Script đo riêng: `scripts/vps-lab/bench-sitemap.mjs`.
