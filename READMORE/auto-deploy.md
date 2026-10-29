# Tự build và cập nhật PM2 sau git pull

PM2 chạy JavaScript trong `server/dist`, không tự biên dịch TypeScript hay
build Vite khi source đổi. Watcher cũ chỉ theo dõi output đã biên dịch.

Repo sử dụng Husky `post-merge` và `post-rewrite` (rebase) để gọi pipeline:

1. Kiểm tra đúng PM2 daemon/user và process `puppeteer-ssr` của checkout hiện tại.
2. Khóa deployment để hai lần pull không chạy build chồng nhau.
3. Sao lưu dependency hiện tại rồi cài khi `package.json`/lockfile thay đổi.
4. Chạy `yarn build` và `yarn server-build` vào thư mục staging riêng.
5. Khi cả hai build thành công, đưa output vào `dist` và `server/dist`, giữ cache
   runtime, và giữ bản client trước trong `server/resources` như quy trình build cũ.
6. Xóa cache HTML cần tái tạo, rồi reload đúng các PM2 id của repo này;
   kiểm tra PID mới ở trạng thái online ổn định trước khi xác nhận.
7. Ghi revision deploy thành công vào `.cache/auto-deploy/state.json`.

Build lỗi sẽ không đưa output staging vào sử dụng và không reload PM2; dependency
đã cập nhật sẽ được khôi phục. Nếu reload lỗi, pipeline khôi phục output và
dependency trước, rồi thử reload lại. Nếu phục hồi cũng lỗi,
log chỉ rõ thư mục backup được giữ lại để xử lý.
Kiểm tra online phát hiện lỗi khởi động/crash sớm; không thay thế kiểm tra
HTTP hoặc giám sát sức khỏe ứng dụng sau deployment.
Máy cần đủ dung lượng trống cho bản build staging và bản sao `node_modules`
khi dependency thay đổi. Pipeline từ chối cài qua thư mục `node_modules` là
symlink để tránh sửa dependency bên ngoài checkout mà không thể khôi phục.

## Thiết lập một lần trên máy chạy PM2

Chạy bằng **đúng user đã khởi động PM2**, trong repo đang phục vụ website:

```sh
yarn install --production=false
yarn deploy:status
yarn deploy # build/reload revision hiện tại lần đầu
```

`prepare` sẵn có cài Husky và đặt `core.hooksPath=.husky/_`. Nếu `HUSKY=0`
đang được cấu hình, hãy bỏ thiết lập đó trước khi cài hooks. Nếu dùng `PM2_HOME`
riêng, phải dùng cùng giá trị khi chạy Git và PM2.

Nếu launcher cũ đang chạy lâu dài bằng systemd/terminal, khởi động lại launcher
đó một lần sau khi cập nhật phiên bản này. Watcher compiled cũ được thay bằng
pipeline deployment; launcher mới chỉ theo dõi source trong development.

Sau lần thiết lập này, chỉ cần:

```sh
git pull
# hoặc git pull --rebase
```

Hook chạy sau khi Git cập nhật thành công. Merge conflict chưa giải quyết sẽ
không deploy. Máy development không có process PM2 phù hợp sẽ tự bỏ qua.
Process đang được chủ động stop, process chạy source `.ts`, hoặc process từ
repo khác sẽ không bị khởi động lại.

Pipeline từ hook từ chối source tracked có chỉnh sửa local chưa commit để tránh
deploy lẫn code ngoài revision vừa pull. File cấu hình local vốn được Git ignore
vẫn được giữ nguyên. Nếu cần deploy thủ công hoặc retry sau lỗi:

```sh
yarn deploy
```

`yarn server:build` và `yarn server-build` đều được hỗ trợ. Không cần chạy build
hay `pm2 restart puppeteer-ssr` riêng sau một lần pull deploy thành công.

## Kiểm tra và tạm dừng

```sh
yarn deploy:status
git config app.autoDeploy false  # tạm ngừng tự deploy cho checkout này
git config app.autoDeploy true   # bật lại
```

`upToDate: true` nghĩa là revision hiện tại đã được pipeline deploy thành công.
`postMergeHook: false` nghĩa là cần cài lại Husky. `processes: []` nghĩa là không
tìm thấy app compiled thuộc repo này trong PM2 daemon của user hiện tại.

Git đã merge xong trước khi chạy hook; lỗi build không hoàn tác commit vừa pull.
Hãy đọc thông báo `FAILED`, sửa lỗi rồi chạy `yarn deploy`. Hai deployment đồng
thời sẽ đợi nhau; nếu HEAD đổi giữa lúc build, output đang build sẽ bị bỏ đi và
hook tiếp theo sẽ build revision mới. Nên để lần pull/deploy hiện tại hoàn tất
trước khi chạy lần tiếp theo.

Kiểm thử pipeline (Git repo và process PM2 tạm, không dùng daemon thật của user):

```sh
node --test scripts/deploy/auto-deploy.test.mjs
node scripts/deploy/check-auto-deploy-pm2.mjs
```
