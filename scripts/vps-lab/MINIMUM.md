# Kiểm thử cấu hình nhỏ cho app, Redis, ISR và sitemap

Phép đo ngày 2026-10-28 chạy trong Docker CentOS Stream 10/aarch64, Node
22.13.0, PM2 7.1.1 và Lightpanda 1.0.2. CPU/RAM được giới hạn bằng cgroup v2,
không có swap. Chạy đúng `start:redis-api:pm2:worker`, gồm cả preflight,
Sucrase, PM2 daemon, launcher, HTTP workers và browser; không chỉ đo riêng
process sitemap. Docker không thay thế phép đo trên VPS thật.

## Lỗi phát hiện khi đo

App và sitemap từng ghi chung `wsEndpoint.lightpanda.txt`. Sitemap khởi động
browser trên cổng 9223, ghi đè địa chỉ browser của app ở cổng 9222. Khi sitemap
kết thúc và tắt browser riêng, worker của app tiếp tục kết nối 9223 và trả 503.
Log xác nhận `ECONNREFUSED 127.0.0.1:9223`; đây không phải bằng chứng thiếu RAM.

Địa chỉ Lightpanda hiện được lưu theo PID tiến trình chủ. Worker threads cùng
tiến trình vẫn dùng chung địa chỉ, còn sitemap và từng PM2 instance được tách
riêng. Test hồi quy xác nhận các PID khác nhau không dùng chung file. Các lượt
`qualification`, `diagnostic90` trước bản sửa không được dùng để chốt RAM.

## Tải và điều kiện đạt

- 20 request/giây, tối đa 20 request HTTP đồng thời. Đây là mức tải thử mặc
  định khi chưa có số liệu traffic thực tế.
- 40% bot/cache, 37,5% API, 20% HTML người dùng và 2,5% URL bot chưa cache
  (một URL mới mỗi hai giây). HTML người dùng chỉ đo trả trang, không đo
  trình duyệt chạy React, LCP hay INP.
- SPA tổng hợp có 65 URL sitemap, JavaScript khoảng 201 KiB, mỗi trang render
  100 đoạn văn/khoảng 40 KiB. API trả payload 64 KiB khó nén, trễ 80 ms.
  Upstream và client chạy ngoài cgroup của app; không gọi website bên ngoài.
- Warmup 8 trang và 16 API trước tải. Sitemap đầu tiên vẫn phải tạo phần lớn
  trang chưa cache; lượt kéo dài chạy lại sitemap mỗi phút, không chồng job.
- Kiểm tra body của HTML/API, đúng item ID, đủ 100 đoạn văn; không chỉ đếm
  HTTP 200. Đọc XML bằng parser và so sánh đúng tập 65 URL, không trùng/mất URL.
- Cache/API/HTML người dùng: đúng nội dung ít nhất 99,9%, p95 ≤500 ms. Trang
  mới: đúng ít nhất 99%, p95 ≤10 giây; retry 503 dùng chung deadline 15 giây,
  tính cả thời gian chờ. Báo riêng HTTP status ở lần gọi đầu tiên.
- Không OOM, không PM2 restart, không bỏ request do client đầy. CPU trung bình
  trong thời gian phát tải ≤80% số core. RAM còn dự phòng ít nhất
  `max(256 MiB, 25% giới hạn)` tính theo working set đỉnh toàn lượt.

Latency đo đến khi đọc hết body qua mạng bridge Docker, không áp dụng giới
hạn băng thông/RTT Internet. Không so trực tiếp các số ms này với lab cũ có
50 Mbit/s +30 ms. CPU là thời gian CPU của toàn cgroup chia thời gian phát tải;
không dùng thời gian chờ xả hết request để làm CPU trung bình thấp đi.

Sampler đọc mỗi 500 ms: `memory.current`, `inactive_file`, anon/shmem, CPU,
OOM và RSS theo nhóm process. Working set = current − inactive_file; tổng RSS
các process có thể đếm lặp trang dùng chung. Đây không phải giới hạn cứng của
bộ nhớ JS. Lượt kéo dài dùng Docker `--init`, không đếm zombie là browser sống.
Xu hướng RAM dùng percentile 20 theo từng phút ở nửa sau lượt đo, không suy
ra không có memory leak chỉ từ một lượt ngắn.

## Kết quả sàng lọc sau sửa endpoint

Mỗi mức chạy 90 giây, cùng 1 CPU. Các lượt này còn dùng header service nội bộ
cho bot; lượt kéo dài kiểm tra lại bằng Googlebot UA không có header đó, dùng
đúng nhánh chờ phản hồi công khai. Không gộp hai lượt như cùng một phép đo.

| RAM | Working set đỉnh | Cache/API p95 | Trang mới đúng | Trang mới p95 | Sitemap | Đạt |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| 768 MiB | 727 MiB | 52/46 ms | 41/45 | 15 giây | lỗi 503 | Không |
| 1 GiB | 704 MiB | 10/12 ms | 45/45 | 1,312 giây | 65 URL, 55,335 giây | Có |
| 1,5 GiB | 796 MiB | 19/24 ms | 45/45 | 1,613 giây | 65 URL, 57,735 giây | Có |

Không OOM hoặc PM2 restart ở cả ba lượt. 768 MiB thiếu dự phòng RAM và không
hoàn thành sitemap/trang mới theo tiêu chí. RAM nhiều hơn không mặc nhiên cho
latency thấp hơn: heap tự đổi theo RAM và mỗi mức mới có một lượt sàng lọc.

Raw reports: `.vps-lab/minimum-vps/fixed-screen/`, image cố định
`sha256:7247aa524489607a1dfe23da6ade707b97ee1ed60f87e76f327615fb36e18467`.
Các lượt kéo dài dùng Dockerfile.minimum trên image đó, SHA
`sha256:6c19c5d2c2c1fcc511b7a26d411f3f2633b2b0484941858ef79f54ccea8ff74a`,
và được lưu riêng trong `.vps-lab/minimum-vps/public-soak/`.

## Lượt kéo dài với bot công khai

1 GiB chạy 600 giây: working set đỉnh 784 MiB, vượt trần 768 MiB theo tiêu chí
dự phòng. Bộ phát tải còn bỏ 103/12.000 lượt; không gọi đây là lượt đạt dù các
request đã gửi đều đúng nội dung. Trước lượt 1,5 GiB, client ngoài cgroup app
được tăng từ 0,5 CPU/256 MiB lên 1 CPU/512 MiB. Vì vậy không quy toàn bộ thay
đổi latency/drop giữa hai lượt cho việc tăng RAM app. Kết quả thiếu dự phòng
RAM ở 1 GiB độc lập với vấn đề bộ phát tải.

**1 CPU / 1,5 GiB là cấu hình thấp nhất đã vượt qua lượt 600 giây trong các mức
đã thử**, không phải giới hạn tối thiểu cho mọi website:

- 12.000/12.000 request đúng nội dung, không bỏ request; 300/300 trang mới
  HTTP 200 ngay lần đầu, không cần retry 503.
- Cache/API/HTML người dùng p95: 7/9/10 ms; trang mới p95 1.110 ms.
- Working set đỉnh 795 MiB, anon/shmem đỉnh 759 MiB; CPU trung bình trong
  thời gian phát tải 0,158 core. Không OOM, không PM2 restart.
- 11 lượt sitemap trong toàn lượt kiểm thử: đều đúng 65 URL. Lượt đầu
  54,294 giây; các lượt có cache khoảng 0,826–1,884 giây. Một lượt được bắt
  đầu sát mốc kết thúc phát tải và hoàn tất trong phần kiểm tra sau tải.
- Nửa sau lượt đo: browser RSS percentile 20 giữ khoảng 30 MiB, Node RSS
  slope −0,1 MiB/phút. Redis tăng từ khoảng 29 lên 46 MiB RSS khi cache đầy
  dần; cuối lượt dùng 48,73/96 MiB. Working set slope +4,7 MiB/phút trong cửa
  sổ này, không phải bằng chứng RAM đã đạt trạng thái ổn định dài hạn.

Report: `.vps-lab/minimum-vps/public-1536-soak/1cpu-1536m/report.json`.
85/85 kiểm thử chức năng, TypeScript và build Sucrase đều đã qua sau sửa endpoint.

Cấu hình tương ứng trong `server/.env.production` (thay HOST theo môi trường):

```dotenv
BROWSER_ENGINE=lightpanda
APP_INSTANCES=1
REQUEST_WORKERS=1
CRAWL_CONCURRENCY=1
REDIS_MAX_MEMORY=96mb
SITEMAP_CONCURRENCY=1
SITEMAP_RENDER_CONCURRENCY=1
SITEMAP_MAX_RESPONSE_MB=2
```

Một render của app và một browser lane sitemap có thể chạy cùng lúc. Khởi
động launcher với `NODE_OPTIONS=--max-old-space-size=256`; heap app/workers
vẫn do ngân sách RAM tính riêng. Giới hạn response sitemap 2 MiB là một phần
cấu hình đã đo; trang lớn hơn cần tăng và kiểm thử lại.

Lab gọi trực tiếp `node config/scripts/start:redis-api:pm2:worker.mjs`, entrypoint
của script Yarn. CLI Yarn, RAM hệ điều hành VPS, Nginx và dịch vụ ngoài container
không nằm trong con số cgroup này. Với máy VPS thực tế, chọn mức 2 GiB là đề xuất
chừa thêm RAM cho các phần đó; chưa có phép đo trên VPS thật để cam kết cùng SLA.

## Chạy lại

Đứng tại root repo. Image nền phải được build từ source/dependencies hiện tại:

```bash
docker build -f scripts/vps-lab/Dockerfile -t vps-lab/centos-app:latest .
docker build -f scripts/vps-lab/Dockerfile.minimum -t vps-lab/minimum:current .
docker network create vps-min-lab
docker run -d --init --name vps-min-client --network vps-min-lab \
  --cpus 1 --memory 512m --memory-swap 512m node:22-alpine sleep infinity
docker cp scripts/vps-lab/minimum-client.mjs vps-min-client:/minimum-client.mjs
docker exec -d vps-min-client node /minimum-client.mjs '{"mode":"upstream"}'

MIN_RUN_LABEL=screen MIN_SECONDS=90 \
  node scripts/vps-lab/minimum-vps.mjs
```

Nếu network/client đã tồn tại thì bỏ bước tạo tương ứng. Client đang chạy phải
dùng đúng script hiện tại. Driver thay/xóa container `vps-min-candidate` giữa
các profile. Chỉ chạy song song khi dùng tên container riêng qua
`MIN_CANDIDATE=vps-min-candidate-<suffix>`; tránh trùng tên. Fixture chỉ ghi trong image lab,
không chạy `minimum-fixture.cjs` vào checkout production.

Chạy lượt kéo dài cho cấu hình đã đạt:

```bash
MIN_RUN_LABEL=soak MIN_SECONDS=600 \
  MIN_PROFILES='[{"ram":1536,"cpu":1}]' \
  node scripts/vps-lab/minimum-vps.mjs
```

`MIN_RPS`, `MIN_VUS`, `MIN_IMAGE` đổi tải/image. Report, samples, XML và log PM2
nằm trong `.vps-lab/minimum-vps/<label>/`. Report mới lưu cả immutable image SHA.
Redis được giới hạn `min(128, floor(RAM MiB/16))mb` trong mỗi lượt; giới hạn
heap launcher là 128 MiB đến 1 GiB, 256 MiB ở mức cao hơn. Heap app/render vẫn
do `ResourceBudget` tính, không coi `NODE_OPTIONS` là trần RAM cả hệ thống.

Kiểm tra tắt app, xóa cache rồi khởi động lại, chạy sitemap trước mọi request
warmup/tải:

```bash
MIN_RUN_LABEL=cold-restart MIN_COLD_RESTART=1 MIN_SECONDS=30 \
  MIN_PROFILES='[{"ram":1024,"cpu":1}]' \
  node scripts/vps-lab/minimum-vps.mjs
```

Driver tạo cache và sitemap thật trước, dừng toàn bộ process trong container
lab, rồi xóa `/tmp/pages`, `/tmp/views`, `/tmp/data`, `/tmp/store`. Các thư mục
API có thể không có file khi dùng Redis; driver ghi sentinel có tên rõ ràng
trước khi xóa để xác nhận thao tác xóa cả bốn đường dẫn. Report phân biệt số
file thật và sentinel. XML sitemap được giữ lại để kiểm tra seed cũ vẫn được
recrawl khi HTML đã mất.

Sau khi khởi động lại, chỉ kiểm tra TCP port (không GET HTTP làm ấm cache),
xác nhận cả bốn thư mục có 0 file và Redis có 0 key rồi chạy sitemap ngay.
Redis lab tắt persistence nên cũng mất cache khi toàn bộ process dừng. Không
suy ra xóa file trên VPS sẽ tự xóa dữ liệu trong một Redis vẫn đang chạy.
Sau lượt sitemap lạnh mới phát tải 30 giây và kiểm tra nội dung/XML.

Lượt đã chạy tại `.vps-lab/minimum-vps/cold-restart/1cpu-1536m/report.json`
xác nhận 130 file page/4 file view và 193 Redis key trước reset. Trước gen sau
restart: cả bốn thư mục 0 file, Redis 0 key. Sitemap recrawl 65 seed đã biết,
visited/saved đúng 65 URL trong **45,397 giây**, XML hợp lệ/không trùng/mất URL.
Working set đỉnh 680 MiB, không OOM hoặc PM2 restart; 600/600 request sau đó
HTTP 200 ngay lần đầu. Đây là cold cache ứng dụng, không xóa OS page cache;
30 giây phát tải sau sitemap là lượt riêng với bài qualification 600 giây.

Sau khi đo xong có thể dọn riêng client lab:

```bash
docker rm -f vps-min-client
```
