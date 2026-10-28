# So sánh minifier HTML — 2026-10-28

## Kết luận cho ứng dụng hiện tại

`@minify-html/node` 0.16.4 với `{}` đang là lựa chọn nhanh nhất trong các engine
đã đo. `{}` đã tắt minify JS/CSS; không có mức `fast` khác được chứng minh giúp
nhanh hơn đáng kể trên các mẫu này. Bản 0.18.1 không cho lợi ích tốc độ HTML-only
trong lượt đo; output hash của hai phiên bản giống nhau trên cả bốn fixture.

Giữ native cho ISR đã gỡ wrapper div và style. Với HTML nguyên bản còn CSS,
chất lượng khoảng trắng cần cân nhắc: native có thể làm dính chữ khi CSS chuyển
div thành inline. Cấu hình conservative của HTML Minifier Next, SWC, Terser và
htmlnano đều qua ca này; đổi lại tốn thêm CPU. Đây là kết quả trên bộ ca cụ thể,
không phải chứng nhận đúng cho mọi HTML/CSS.

Không thay dependency hoặc cấu hình minifier production trong lượt khảo sát này.
Các engine khác chỉ được cài trong `.vps-lab/minify-compare`.

## Phương pháp và kết quả

- Apple M4, macOS arm64, Node 22.23.4; không phải benchmark VPS 2 CPU/4 GiB.
- 16 profile, 4 fixture; 5 warmup + 31 mẫu/profile/fixture, đảo thứ tự chạy xen kẽ.
- Ba fixture tổng hợp và một HTML thực từ lab. Các mẫu `cards`, `media` và file
  thực qua shallow optimize trước khi đo để giống vị trí minify trong ISR.
  `raw_js_css` giữ JS/CSS để quan sát tình huống SSR/raw HTML.
- Thời gian tính cả tạo Buffer khi cần, minify, đổi kết quả thành string và await
  adapter. Không tính module startup, Brotli, browser rendering, network hay TTFB.
- Kích thước Brotli dùng Node zlib, quality 9. Không dùng HTML thô nhỏ hơn làm
  bằng chứng tải mạng nhanh hơn.

Median trên HTML thực sau shallow, **87.707 byte**:

| Profile | Version | Minify (ms) | HTML (byte) | Brotli 9 (byte) | Qua các ca chất lượng |
| --- | --- | ---: | ---: | ---: | ---: |
| Wrapper hiện tại, native `{}` | 0.16.4 | 0.8703 | 79986 | 6229 | 6/7 |
| Native mới nhất, `{}` | 0.18.1 | 0.9321 | 79986 | 6229 | 6/7 |
| Native hiện tại, `minify_css:true` | 0.16.4 | 1.5582 | 76974 | 6479 | 6/7 |
| HTML Minifier Next, conservative + bỏ quote khi hợp lệ | 9.1.0 | 1.5098 | 82010 | 6072 | 7/7 |
| SWC, conservative + bỏ quote khi hợp lệ | 1.16.20 | 1.7743 | 81984 | 6054 | 7/7 |
| Terser, conservative + bỏ quote khi hợp lệ | 7.2.0 | 2.6865 | 82011 | 6073 | 7/7 |
| htmlnano, HTML-only + bỏ quote khi hợp lệ | 3.6.1 | 3.3848 | 81998 | 6068 | 7/7 |

`conservative` trong bảng là cấu hình tường minh tại
[minifier-candidates.mjs](./minifier-candidates.mjs), không phải một preset chung
giữa các thư viện. Các engine ngoài profile CSS/JS tường minh đều tắt CSS/JS/JSON/SVG
minification khi có các tùy chọn đó. SWC dùng API document cho HTML đầy đủ, fragment
cho phép kiểm tra đoạn HTML. Cả hai biến thể giữ/bỏ quote đều đã đo và kiểm tra.

Những điểm đáng chú ý:

- Bật CSS minification trên mẫu thực tốn thêm khoảng 79% CPU, HTML thô nhỏ hơn
  khoảng 3 KB nhưng Brotli lại lớn hơn 250 byte. Trên fixture card tổng hợp, CSS
  minification giúp Brotli nhỏ hơn; kết quả phụ thuộc dữ liệu.
- Giữ closing tags không làm nhanh hơn đáng kể. Gọi native trực tiếp/tái sử dụng
  Buffer chỉ chênh khoảng 1% trong mẫu thực; không có cơ sở đổi pipeline vì lợi ích này.
- HTML đầu vào chưa minify có Brotli 9 là **6222 byte**, gần như native sau minify
  (**6229 byte**). Không suy ra lợi ích network chỉ từ việc giảm HTML 87 KB → 80 KB.
  Bỏ minify cũng sẽ bỏ bước gộp khoảng trắng mà ứng dụng đang cần.
- Next/SWC cho Brotli nhỏ hơn native khoảng 2,5–2,8% trong mẫu thực, nhưng xử lý
  chậm hơn. Minify chỉ là một phần của thời gian tạo trang; chưa đo lại latency/RAM
  toàn ứng dụng hoặc tải website trên VPS trong khảo sát này.
- ISR/SSR lưu kết quả sau minify vào cache. Cần đánh giá tác động trong luồng cache
  hiện có, tránh suy ra tăng tốc request cache hit từ số đo minifier riêng.

## Chất lượng và độ tương thích

So sánh DOM/text bằng Chrome headless, chặn request mạng, với 5 HTML fixture và
2 ca kiểm tra đầu ra/pipeline:

1. Khoảng trắng giữa text/inline element; các mảnh `inter` + `national`.
2. Nội dung pre/code/textarea và JSON-LD chứa HTML, khoảng trắng có ý nghĩa.
3. URL/entity, title/alt có dấu `>`, input values/boolean attributes, SVG viewBox/path.
4. Khoảng trắng giữa div được CSS đặt `display:inline`.
5. Script riêng biệt và inline event handler vẫn chạy đúng.
6. Ví dụ `thomas` + wrapper icon rỗng + `edition` có đúng một space bên trong.
7. Deep optimizer sau minify vẫn tạo đúng link text `/details` từ “Click here”.

Ca 4, đầu vào:

```html
<style>.inline > div { display:inline; }</style>
<div class="inline"><div>thomas</div> <div>edition</div></div>
```

Chrome hiển thị `thomas edition` trước minify. Native 0.16.4/0.18.1 và Terser
không bật conservative hiển thị `thomasedition` sau minify. Đây là giới hạn của
việc tối ưu khoảng trắng theo loại tag khi CSS thay đổi cách hiển thị.
ISR hiện gỡ div/style trước minify; SSR/raw HTML còn CSS cần chú ý trường hợp này.

SWC/Next/Terser conservative/htmlnano qua 7/7 ca đã chọn. Các thuộc tính không có
dấu nháy cũng qua kiểm tra deep optimizer hiện tại; không cần ép giữ quote chỉ vì
nghi ngờ bước deep không đọc được chúng.

Next 9.1.0 là ESM-only, yêu cầu Node >=22.13. SWC có API sync/async và trả object
`{code,...}`; Next/Terser/htmlnano trả kết quả async. Các engine này cần adapter,
không thay trực tiếp import vào wrapper Buffer → Buffer hiện tại. Options object
trong benchmark được tái sử dụng, gồm Next để tận dụng memoization cấu hình.

## Tài liệu gốc

- [minify-html](https://github.com/wilsonzlin/minify-html): Rust/native bindings,
  cấu hình và các giả định whitespace.
- [Changelog 0.18.1](https://github.com/wilsonzlin/minify-html/blob/v0.18.1/CHANGELOG.md):
  thay backend JS sang Oxc từ 0.17; không đồng nghĩa HTML-only sẽ nhanh hơn.
- [minify-html-onepass](https://github.com/wilsonzlin/minify-html/tree/master/minify-html-onepass):
  tác giả tối ưu thêm tốc độ/allocations, nhưng API khác và parser chặt hơn.
  Tài liệu liệt kê Rust/Python, không có binding Node chính thức. Chưa benchmark
  biến thể này trong ứng dụng; không coi là phương án thay npm trực tiếp.
- [HTML Minifier Next](https://github.com/j9t/html-minifier-next).
- [SWC](https://github.com/swc-project/swc), package `@swc/html`.
- [HTML Minifier Terser](https://github.com/terser/html-minifier-terser).
- [htmlnano](https://github.com/maltsev/htmlnano).

## Chạy lại

Yêu cầu dependencies dự án đã cài và Node >=22.13 cho Next. Cài engine lab riêng:

```bash
npm install --prefix .vps-lab/minify-compare --ignore-scripts --no-audit --no-fund --no-package-lock \
  @minify-html/node@0.18.1 @swc/html@1.16.20 html-minifier-terser@7.2.0 \
  htmlnano@3.6.1 html-minifier-next@9.1.0
node scripts/vps-lab/bench-minifiers.mjs
node scripts/vps-lab/check-minifiers.mjs
```

Thêm đường dẫn HTML sau lệnh benchmark để đo file thực. Lượt đo này dùng
`.vps-lab/tmp/pre/pre-shallow-1792856504848.html`. `MINIFIER_SAMPLES` đổi số mẫu.
Đặt `CHROME_EXECUTABLE` khi Chrome không nằm ở đường dẫn macOS mặc định.

Raw reports: `.vps-lab/minifier-results/benchmark.json` (timings, hash, options)
và `quality.json` (từng ca pass/fail và chênh lệch). Quality script hoàn tất việc
so sánh dù có engine không đạt một số ca; phải đọc từng kết quả, không coi exit 0
là toàn bộ engine đều đúng.
