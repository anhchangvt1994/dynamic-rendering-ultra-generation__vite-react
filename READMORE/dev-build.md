# Development qua LAN và build nhanh

Node phải đáp ứng yêu cầu hiện tại của Vite: `^20.19.0 || >=22.12.0`.

## Chạy development

Sau khi cập nhật script/config, dừng phiên `yarn dev` cũ bằng Ctrl+C rồi chạy:

```sh
yarn dev
```

Mở URL `Network` được in trong terminal, ví dụ
`http://192.168.10.154:5173/pokemon/pikachu`. Khi IP mạng thay đổi, dùng IP mới
trong terminal. Để chọn cổng khác:

```sh
yarn dev --port 5174
# hoặc DEV_PORT=5174 yarn dev
```

Vite phục vụ web/HMR trên mọi địa chỉ IPv4, cache dependency tách theo cổng để
các phiên dev không ghi đè nhau. Backend API chỉ lắng nghe
`127.0.0.1` ở cổng trống được chọn tự động, không cần mở trực tiếp cổng backend
trên thiết bị khác. `DEV_API_PORT` có thể chỉ định cổng API nếu cần. Cổng web
đang bận sẽ báo lỗi rõ ràng thay vì âm thầm đổi URL.

Script đợi API sẵn sàng rồi mới công bố URL web; Ctrl+C đóng cả Vite lẫn API.
`/api` luôn được proxy tới API bất kể header `Accept`. Source, stylesheet,
public assets và HMR do Vite phục vụ; metadata/cookie cho trang vẫn đi qua
backend. Địa chỉ HMR được suy ra từ URL truy cập, không cố định `localhost`.

HTTP qua IP LAN thường dùng gzip thay vì Brotli. Cache API đọc đúng file
`*-gzip.gz` và HTML luôn giải mã cache Brotli trước khi nén response, tránh
chờ 7 giây rồi nhận body rỗng khi truy cập hoặc reload qua LAN.

## Build

```sh
yarn build
```

TypeScript kiểm tra source, bỏ qua output đã biên dịch trong `server/dist` và
các thư mục staging/cache. TypeScript và ESLint vẫn phải thành công trước bước bundle. Hai bước này chạy
song song và dùng cache incremental/content tại:

- `node_modules/.cache/build-tsconfig.tsbuildinfo`
- `node_modules/.cache/build-eslint`

Xóa riêng hai cache này nếu cần đo cold build; không cần xóa `node_modules`.
Vite dùng esbuild để minify, loại console chỉ ở production và bỏ bước tính
gzip size trong log. Chunk tải theo route vẫn được giữ. Trong phép đo trên máy
development này, JavaScript tăng khoảng 1% kích thước gốc và 3% khi gzip.

Một lần đo cùng source, output staging riêng:

| Pipeline | Tổng thời gian | Bundle bên trong Vite |
| --- | ---: | ---: |
| Trước tối ưu | 10,31 giây | 2,12 giây |
| Sau tối ưu, cache trống | 6,40 giây | 1,29 giây |
| Sau tối ưu, cache đã có | 3,39 giây | 1,13 giây |

Kết quả phụ thuộc CPU, I/O và những file vừa sửa; lần build sau khi sửa nhiều
file có thể cần kiểm tra lại nhiều hơn. Auto deploy sử dụng cùng pipeline và
vẫn giữ staging/rollback khi có lỗi.

Kiểm thử tập trung:

```sh
node --test config/scripts/build.test.mjs config/scripts/dev-lan.test.mjs
node --test scripts/vps-lab/cache-storage.test.mjs
```
