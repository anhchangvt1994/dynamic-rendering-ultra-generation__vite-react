# vps-setup

Một file bash duy nhất: chạy xong là có VPS hoàn chỉnh — nginx (HTTP/2 + HTTP/3),
SSL Let's Encrypt, domain, firewall, fail2ban, hardening SSH/kernel, tự cập nhật
bảo mật, và (tuỳ chọn) build + chạy luôn app Node phía sau nginx.

Tự nhận môi trường: Ubuntu / Debian, Rocky / Alma / CentOS Stream / RHEL / Fedora
ở phía VPS; macOS / Linux / Windows (Git Bash hoặc WSL) ở phía máy bạn. Chạy lại
nhiều lần được — mọi file nó ghi đều được tạo lại an toàn.

## Chạy 1 lệnh (từ máy của bạn)

Điều kiện: VPS Linux dùng systemd, quyền root/sudo, domain thuộc quyền quản lý
của bạn. Trỏ DNS A về IPv4 VPS; chỉ tạo AAAA nếu IPv6 của VPS hoạt động.
Script không mua domain hay tự sửa DNS tại nhà cung cấp. Ubuntu 24.04 LTS là
lựa chọn khuyến nghị; package nginx HTTP/3 phải có sẵn cho phiên bản OS đó.

Xem trước trên máy hiện tại, không kết nối SSH hay thay đổi hệ thống:

```bash
bash scripts/vps-setup/setup.sh --dry-run \
  --host root@203.0.113.10 \
  --domain anhchangvt1994.com \
  --route /=/var/www/anhchangvt1994.com --spa \
  --route /api=http://127.0.0.1:3000/
```

Thay IP ví dụ bằng IP VPS thật. Với route thư mục, upload bản build (có
`index.html`) tới **thư mục trên VPS** trước khi chạy. Với reverse proxy,
ứng dụng phải chạy tại upstream đã chọn; script không tự tạo ứng dụng nếu
không có `--app`.

```bash
bash scripts/vps-setup/setup.sh \
  --host root@203.0.113.10 \
  --domain anhchangvt1994.com \
  --email you@anhchangvt1994.com \
  --www \
  --route /=8080 \
  --app https://github.com/anhchangvt1994/<repo>.git
```

Script tự upload chính nó qua SSH rồi chạy trên VPS (1 lần nhập mật khẩu SSH).
Public key của bạn được gửi kèm để bật đăng nhập bằng key.

Không truyền flag nào thì nó hỏi từng giá trị, có gợi ý placeholder:

```bash
bash scripts/vps-setup/setup.sh
```

Trên chính VPS:

```bash
sudo bash setup.sh --domain anhchangvt1994.com --email you@anhchangvt1994.com --route /=8080
```

## Các flag chính

| Flag | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| `--domain` | Domain phục vụ (bắt buộc) | `anhchangvt1994.com` |
| `--email` | Email Let's Encrypt (nhận cảnh báo hết hạn) | `you@anhchangvt1994.com` |
| `--www` | Phục vụ thêm `www.` và redirect về domain chính | |
| `--route <PATH>=<TARGET>` | URL path ánh xạ tới đâu, lặp lại được | `/=8080`, `/api=http://127.0.0.1:3000`, `/static=/var/www/static` |
| `--spa` | Route tĩnh fallback về `index.html` (React/Vue) | |
| `--app <URL\|DIR>` | Clone/build/chạy app Node sau nginx | git URL hoặc `/srv/app` |
| `--app-dir` | Thư mục clone (mặc định `/srv/<domain>`) | `/srv/anhchangvt1994.com` |
| `--app-branch` | Branch/tag deploy | `main` |
| `--app-user` | User chạy app, không sudo (mặc định `deploy`) | `deploy` |
| `--ssh-port` | Thêm port SSH, giữ các port cũ để tránh mất kết nối | `2222` |
| `--ssh-key` | Public key được phép đăng nhập | `~/.ssh/id_ed25519.pub` |
| `--user` | Tạo user sudo mới | `deploy` |
| `--staging` / `--self-signed` | Let's Encrypt staging / cert tự ký (test) | |
| `--skip-dns-check` | Bỏ kiểm tra DNS (vd. sau Cloudflare proxy) | |
| `--rate` / `--burst` | Giới hạn request/IP (mặc định 30/s, burst 100) | |
| `--max-body` / `--proxy-timeout` | Giới hạn body / timeout upstream | `10m`, `120s` |
| `--no-upgrade` | Bỏ `apt upgrade` / `dnf upgrade` toàn hệ thống | |
| `--dry-run` | Kiểm tra tham số và in upstream/location, không sửa máy | |

`--help` liệt kê đầy đủ kèm placeholder.

## Script làm gì

1. **OS**: nhận diện Ubuntu/Debian hay họ RHEL, cài package nền.
2. **nginx**: bản mainline từ nginx.org (có `--with-http_v3_module`), cấu hình
   HTTP/2 + HTTP/3 (QUIC), gzip, cache static, rate limit, chặn path scanner.
3. **SSL**: Let's Encrypt qua webroot, tự gia hạn bằng timer + reload nginx.
4. **Định tuyến**: mỗi `--route` thành proxy upstream (keepalive, WebSocket) hoặc
   phục vụ thư mục tĩnh; host lạ / truy cập IP trực tiếp bị drop (`444`).
5. **Bảo mật**: ufw/firewalld chỉ mở 80/tcp, 443/tcp, 443/udp + port SSH;
   fail2ban (sshd, rate-limit, scanner probe); sysctl chống spoof/SYN flood;
   giữ chính sách đăng nhập root/password của hệ thống, thêm public key nếu có;
   cập nhật bảo mật tự động. Không tự chuyển sang key-only chỉ vì tìm thấy key.
   Nếu file managed cũ đã cấu hình key-only/tắt root thì giữ nguyên các giá trị
   đó khi chạy lại; khôi phục VPS bị khóa theo mục bên dưới trước.
   IP của phiên SSH chạy setup được thêm vào `ignoreip` của fail2ban để tránh
   tự ban khi cấu hình/test. Rà soát mục này nếu IP quản trị thay đổi.
6. **App** (nếu `--app`): Node 22 + yarn + pm2, clone/build, systemd unit
   `vps-app.service`, chờ app trả 200 trên `127.0.0.1:8080`.

## App (tuỳ chọn)

- Repo private: thêm deploy key cho `--app-user` trên GitHub (hoặc copy source
  lên VPS rồi truyền đường dẫn tuyệt đối vào `--app`).
- Mặc định chạy `yarn build` → `yarn server-build`, chuẩn bị Redis/browser
  bằng quyền root, rồi chạy `yarn start:redis-api:pm2:worker` dưới systemd.
- App chạy bằng user không có sudo; file thuộc user đó.
- Kiểm tra: `systemctl status vps-app`, `journalctl -u vps-app -f`,
  `sudo -u deploy pm2 ls`.
- Cập nhật code về sau:

  ```bash
  sudo -u deploy bash -lc 'cd /srv/anhchangvt1994.com && git pull && \
    yarn install --production=false && yarn build && yarn server-build'
  sudo systemctl restart vps-app
  ```

## Sau khi chạy

- Mở `https://anhchangvt1994.com`.
- Kiểm tra HTTP/3: <https://http3check.net/?host=anhchangvt1994.com>.
- Kiểm tra TLS: <https://www.ssllabs.com/ssltest/analyze.html?d=anhchangvt1994.com>.
- Cloud firewall (AWS/GCP/Oracle/...): mở TCP 80, TCP 443, UDP 443 và port SSH.
- **Nếu có `--ssh-port`**: giữ session cũ, mở terminal mới test
  `ssh -p 2222 deploy@<VPS_IP>` trước khi đóng session cũ. Port cũ vẫn được
  giữ trong sshd và firewall; chỉ đóng thủ công sau khi đã thử đăng nhập mới.
  SSH dùng IP VPS trực tiếp; domain có proxy Cloudflare thường không chuyển SSH.

## Chạy Yarn và Redis worker trên VPS

Để setup chuẩn bị cả Node, compiler, thư viện browser, Redis và app, truyền
`--app /duong/dan/project` (hoặc URL repo). Không có `--app` thì setup chỉ
cài hạ tầng web/bảo mật.

Trong thư mục gốc project, sau khi cập nhật code:

```bash
yarn
yarn build
yarn start:redis-api:pm2:worker
```

Chạy bằng cùng user sở hữu project/PM2. Nếu đã dùng `vps-app.service`, cập nhật
và restart service theo hướng dẫn bên trên thay vì khởi chạy thêm một app trùng port.
Node cần 20.19+, 22.12+ hoặc bản mới hơn tương thích Vite; setup sẽ nâng bản
cũ lên Node 22. File `.yarnrc` pin Yarn Classic 1.22.22 và cài cả devDependencies
khi `NODE_ENV=production`, vì quy trình hiện tại build server khi start. Sucrase,
cross-env, chokidar được khai báo trực tiếp cho server. Không cần cài Sucrase global.
Worker TypeScript chạy qua Node với `--require sucrase/register`; CLI `sucrase`
chỉ dùng để biên dịch.

Lệnh start kiểm tra Redis/browser trước khi build và chạy PM2. Nếu tự chạy ngoài
setup, lần đầu có thể cần sudo để cài package hệ thống. Redis remote phải có sẵn
và cấu hình `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` đúng; script chỉ tự cài
Redis local. Chạy `yarn build` trước lần start đầu để tạo frontend `dist`.

## Khôi phục VPS đã mất SSH do bản setup cũ

Code mới trên máy local không tự sửa VPS đã bị khóa. Vào console/VNC/rescue của
nhà cung cấp (hoặc giữ phiên SSH cũ đang mở), kiểm tra:

```bash
sudo sshd -T | grep -E '^(port|permitrootlogin|passwordauthentication|kbdinteractiveauthentication) '
sudo ss -ltnp
sudo fail2ban-client status sshd
sudo ufw status numbered  # Ubuntu/Debian; RHEL dùng firewall-cmd --list-all
```

Sao lưu rồi sửa `/etc/ssh/sshd_config.d/00-vps-hardening.conf`: bỏ các dòng
`PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitRootLogin no`
hoặc `PermitRootLogin prohibit-password` do bản cũ thêm vào, khôi phục phương thức
đăng nhập bạn dùng trước đó. Nếu đăng nhập **root bằng mật khẩu** trước đây, cần
`PermitRootLogin yes` và `PasswordAuthentication yes` trong cấu hình có hiệu lực;
kiểm tra lại bằng `sshd -T` vì cloud-init cũng có thể đặt các giá trị này.
Giữ dòng `Port` tương ứng port muốn đăng nhập, mở port đó trong firewall VPS lẫn
firewall nhà cung cấp, và unban đúng IP máy bạn nếu cần:

```bash
sudo fail2ban-client set sshd unbanip <IP_MAY_BAN>
sudo sshd -t
```

Chỉ khi `sshd -t` thành công mới restart `ssh` (Ubuntu/Debian) hoặc `sshd` (RHEL).
Nếu `ssh.socket` đang active, cần `systemctl daemon-reload`, restart `ssh.socket`
và `ssh.service` nữa. Thử SSH từ terminal mới bằng IP VPS trước khi đóng console.
Sau đó chạy lại bản setup mới; nó sẽ giữ port hiện có và không tự tắt đăng nhập mật khẩu.

## Ghi chú

- Không có cấu hình nào bảo đảm chống hack tuyệt đối. Vẫn cần cập nhật app,
  bảo vệ secret, backup ngoài VPS và theo dõi log. Rate limit/fail2ban không
  thay thế dịch vụ chống DDoS tại nhà cung cấp.
- macOS/Windows là máy điều khiển qua SSH; không cài stack VPS trực tiếp trên
  các OS đó. Không dùng Docker để harden SSH/kernel/firewall của máy chủ.
- Dùng VPS mới hoặc snapshot trước: script quản lý cấu hình nginx toàn cục,
  SSH và firewall; không phải công cụ thêm site độc lập vào server đang có nhiều site.
- HTTP/3 cần UDP 443 thông suốt cả firewall VPS lẫn nhà cung cấp. Header
  `Alt-Svc` chưa chứng minh kết nối QUIC hoạt động; kiểm tra từ máy ngoài bằng
  `curl --http3-only -I https://anhchangvt1994.com` với bản curl hỗ trợ HTTP/3.
- `/api=http://127.0.0.1:3000` giữ prefix `/api/`; thêm dấu `/` sau port để
  bỏ prefix khi chuyển request tới upstream. `/assets=/var/www/assets` dùng
  nginx `alias`, tức `/assets/logo.png` đọc `/var/www/assets/logo.png`.
- Proxy không mặc định upload file HTML riêng lẻ: đặt file trong thư mục và
  dùng route thư mục. Route `/` đọc `index.html` nếu có.
- Kiểm tra local không thay đổi hệ thống: `bash scripts/vps-setup/test.sh`.

- Cần VPS Linux thật (systemd). Container không có systemd sẽ bị từ chối.
- Script chạy lại được; file gốc của nginx được backup `*.orig-<timestamp>`.
- Log: `/var/log/vps-setup.log`, nginx: `/var/log/nginx/{access,error,probe}.log`.
- CSP đang comment trong `/etc/nginx/snippets/security-headers.conf` — bật sau
  khi đã test với app của bạn.
