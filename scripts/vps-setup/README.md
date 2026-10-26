# VPS setup: chạy ở đâu, thay đổi gì và khôi phục SSH

Script cấu hình nginx/HTTPS và chạy app từ repo đã có trên VPS. Nó không clone,
pull hay upload source. **Nếu SSH đang timeout, vào console/VNC của nhà cung cấp
và xử lý phần khôi phục bên dưới trước; đừng chạy lại toàn bộ setup để thử sửa.**

## 1. Nếu hiện không SSH vào được

`Connection ... closed` sau khi chạy một lệnh từ xa chỉ bình thường **khi bạn
vẫn đăng nhập lại được**. Timeout ở lần kết nối tiếp theo là sự cố cần kiểm tra.

| Thông báo / triệu chứng | Kiểm tra trước |
| --- | --- |
| `connect to host ... port ...: Connection timed out` | IP/port, cloud firewall, firewall VPS, fail2ban, định tuyến |
| `Connection refused` | SSH có lắng nghe đúng IP/port không; firewall có trả reject không |
| `Permission denied (publickey,password)` | User, key, chính sách xác thực; đây không phải timeout TCP |
| Hiện `Connection established`, rồi treo khi nhận SSH banner | SSH service, tải máy, giới hạn kết nối và log; không kết luận chỉ từ chữ timeout |
| Setup báo xong, phiên `--host` đóng, SSH lại được | Phiên chạy lệnh tạm đã kết thúc bình thường |

Từ **máy cá nhân**, thử đúng IP và port đang dùng trước khi setup:

```bash
ssh -vv -o ConnectTimeout=10 -p 22 root@IP_VPS_THAT
```

Thay `22`, user và `IP_VPS_THAT` cho đúng. IP `203.0.113.10` trong các ví dụ là
IP minh họa, không phải VPS của bạn. Domain web có proxy Cloudflare thường không
chuyển SSH; dùng IP VPS trực tiếp. Kiểm tra trạng thái máy và inbound TCP của port
SSH trong bảng điều khiển nhà cung cấp trước.

### Lấy thông tin từ console/VNC

Các lệnh dưới đây chạy bằng **root trong console/VNC**, không phụ thuộc SSH.
Chúng đọc trạng thái, không reset firewall:

```bash
cat /etc/os-release
tail -n 100 /var/log/vps-setup.log
ss -ltnp
sshd -t
sshd -T | grep -E '^(port|listenaddress|permitrootlogin|passwordauthentication) '
systemctl --no-pager status ssh.service sshd.service ssh.socket sshd.socket
journalctl -u ssh -u sshd -u ssh.socket --no-pager -n 80
fail2ban-client status
fail2ban-client status nginx-probe
fail2ban-client status nginx-limit-req
fail2ban-client status sshd
ip -br address
ip route
free -h
df -h
sysctl net.ipv4.conf.all.rp_filter net.ipv4.conf.default.rp_filter
```

Nếu máy thiếu RAM/tải cao hoặc app làm máy treo, xem thêm
`journalctl -k --no-pager -n 80` để tìm OOM; không quy mọi timeout cho firewall.
Một số unit không tồn tại tùy distro; ví dụ Debian/Ubuntu thường dùng `ssh`,
RHEL thường dùng `sshd`. `ss -ltnp` cho biết **port thực sự đang lắng nghe**;
`sshd -T` chỉ cho biết cấu hình, có thể khác khi dùng `ssh.socket`.

Nếu dùng UFW, xem `ufw status verbose`. Nếu dùng firewalld, xem
`firewall-cmd --get-active-zones` và `firewall-cmd --list-all-zones`.
`nft list ruleset` giúp kiểm tra thêm rule của fail2ban hoặc hệ thống.
Khi gửi log để chẩn đoán, che password/token nếu có trong output.

### A. IP máy bạn bị fail2ban chặn

Bản setup cũ dùng action **allports** cho hai jail nginx. Chỉ cần website ban IP
thì SSH từ cùng IP cũng có thể bị chặn, dù SSH password/key hoàn toàn đúng.
Whitelist IP quản trị không giải quyết được mọi trường hợp: IP có thể đổi, hoặc
`sudo` đã bỏ biến `SSH_CONNECTION` khi chạy setup.

Nếu trạng thái jail cho thấy IP máy bạn bị ban, gỡ đúng IP từ console:

```bash
CLIENT_IP='IP_PUBLIC_CUA_MAY_BAN'
fail2ban-client set nginx-probe unbanip "$CLIENT_IP"
fail2ban-client set nginx-limit-req unbanip "$CLIENT_IP"
fail2ban-client set sshd unbanip "$CLIENT_IP"
```

Đây là IP public máy bạn kết nối **từ đó**, không phải IP VPS. Nếu jail không tồn
tại, bỏ qua jail đó. Gỡ ban chỉ xử lý hiện tại; cần cập nhật cấu hình jail để
không lặp lại. Bản script mới giới hạn jail web ở TCP 80/443 và UDP 443; jail SSH
chỉ xử lý các port SSH. Không dùng `nft flush ruleset`, `iptables -F` hoặc reset
firewall để gỡ một IP.

### B. Firewall không cho phép đúng port SSH

Lấy port từ `ss -ltnp` và IP máy bạn trước. Chỉ chạy nhánh đúng với firewall đang
active; không bật thêm một firewall khác.

**UFW đang active:** thêm rule cho riêng IP quản trị:

```bash
CLIENT_IP='IP_PUBLIC_CUA_MAY_BAN'
SSH_PORT=22  # thay bằng port thực tế
ufw insert 1 allow from "$CLIENT_IP" to any port "$SSH_PORT" proto tcp
ufw status numbered
```

**Firewalld đang active:** xem cả zone gắn với interface và zone gắn với source
IP. Bản cũ chỉ thêm rule vào default zone rồi reload; rule SSH runtime ở zone
khác có thể bị mất. Chọn đúng zone chứa kết nối của bạn:

```bash
firewall-cmd --get-active-zones
SSH_ZONE='TEN_ZONE_THUC_TE'
SSH_PORT=22  # thay bằng port thực tế
firewall-cmd --zone="$SSH_ZONE" --add-port="$SSH_PORT/tcp"
firewall-cmd --permanent --zone="$SSH_ZONE" --add-port="$SSH_PORT/tcp"
```

Không cần `--reload`: lệnh đầu áp dụng ngay, lệnh sau lưu qua reboot. Đồng thời
mở TCP port tương ứng trong cloud firewall/security group, giới hạn nguồn vào
IP quản trị nếu có thể. Rule trong VPS không sửa được firewall của nhà cung cấp.

### C. Định tuyến bất đối xứng và `rp_filter`

Bản cũ ép `net.ipv4.conf.all.rp_filter=1` và `default.rp_filter=1`. Strict mode
có thể làm rơi gói hợp lệ trên VPS nhiều NIC, VPN hoặc tuyến về khác tuyến vào.
Kiểm tra `ip route get IP_PUBLIC_CUA_MAY_BAN` cùng cấu hình mạng của nhà cung cấp.
Đây là một khả năng, không phải nguyên nhân đã xác nhận chỉ từ việc timeout.

**Nếu xác nhận mạng cần loose reverse-path filtering**, có thể áp dụng từ console:

```bash
sysctl -w net.ipv4.conf.all.rp_filter=2 net.ipv4.conf.default.rp_filter=2
```

Thử SSH lại ngay. Nếu thay đổi này giải quyết đúng sự cố, quản trị viên cần lưu
hai giá trị trên trong một file sysctl local, ví dụ
`/etc/sysctl.d/99-zz-vps-routing.conf`, và kiểm tra các file sysctl khác không ghi
đè chúng. Không đổi giá trị trên mọi VPS một cách máy móc.

Bản script mới giữ chính sách `rp_filter` hiện tại và bỏ hai thiết lập cũ khỏi
file nó tạo. **Chạy lại script không tự hoàn tác giá trị strict đang nằm trong
kernel**; vì vậy trường hợp VPS cũ vẫn phải được xử lý qua console.

### D. Không có SSH listener / cấu hình SSH lỗi

Đọc kết quả `sshd -t` và journal trước khi sửa. Khôi phục IP/port đã dùng trước
đó. Khi cấu hình hợp lệ, khởi động unit phù hợp bằng `systemctl start ssh`
(Debian/Ubuntu) hoặc `systemctl start sshd` (RHEL).

Nếu dùng socket activation, xem `systemctl cat ssh.socket` và listener thực tế;
chỉnh `Port` trong `sshd_config` không bảo đảm socket dùng port đó. Khôi phục
socket theo cấu hình distro/nhà cung cấp. Không tự chuyển sang root/password
login để xử lý timeout: thay đổi xác thực không sửa được việc TCP bị chặn.

Sau mỗi bước khôi phục, giữ console mở và thử **một phiên SSH mới từ máy cá nhân**.
Chỉ đóng console khi phiên mới hoạt động. Repo trên máy cá nhân đã sửa không có
nghĩa cấu hình đang chạy trên VPS cũng đã được sửa.

## 2. Cách chạy trực tiếp trên VPS — phù hợp khi repo đã clone

Điều kiện: VPS Linux có systemd, quyền root/sudo; repo và env đã có trên VPS.
Đặt repo ở nơi user chạy app (`deploy` mặc định) truy cập được, như `/srv/app`;
repo dưới `/root` thường không phù hợp. Trỏ DNS A về IPv4 VPS; chỉ tạo AAAA nếu
IPv6 đúng. `--www` cần cả DNS cho `www`. Let's Encrypt cần HTTP port 80 thông suốt.

SSH vào VPS trước, rồi đứng ở thư mục repo. Xem trước:

```bash
cd /srv/anhchangvt1994.com
bash scripts/vps-setup/setup.sh --dry-run \
  --domain anhchangvt1994.com --www --route /=8080
```

Chạy thật từ phiên SSH hiện có:

```bash
sudo env VPS_SETUP_SSH_CONNECTION="${SSH_CONNECTION:-}" \
  bash scripts/vps-setup/setup.sh \
  --domain anhchangvt1994.com \
  --email EMAIL_THAT_CUA_BAN \
  --www \
  --route /=8080
```

Nếu đã đăng nhập bằng root, có thể dùng `env ... bash ...` thay `sudo env ...`.
Việc truyền `VPS_SETUP_SSH_CONNECTION` giữ IP quản trị/port phiên hiện tại qua
sudo. Chạy qua console thì biến này có thể rỗng; script vẫn đọc các listener
SSH thực tế. Không điền IP/port giả vào biến này.

Ở cách này **không dùng `--host` và không cần `--app`**. Script nhận repo theo vị
trí của chính file `scripts/vps-setup/setup.sh`, kể cả khi thư mục làm việc khác.
Nó cài Node/Yarn/PM2, dependency, chuẩn bị Redis/browser, build và tạo
`vps-app.service` để chạy app. `--skip-app` bỏ toàn bộ phần app.

## 3. Cách chạy từ máy cá nhân qua `--host`

Dùng cách này khi bạn muốn điều khiển VPS từ macOS/Linux/Windows Git Bash/WSL.
Máy cá nhân có file script; **source app đã có sẵn trên VPS**:

```bash
bash scripts/vps-setup/setup.sh \
  --host root@IP_VPS_THAT \
  --host-port 22 \
  --domain anhchangvt1994.com \
  --email EMAIL_THAT_CUA_BAN \
  --www \
  --route /=8080 \
  --app-dir /srv/anhchangvt1994.com
```

- `--host`: nơi SSH tới, dùng IP VPS thật và tài khoản đang đăng nhập được.
- `--host-port`: port SSH **đang dùng**, không phải yêu cầu đổi port.
- `--app-dir`: đường dẫn repo **trên VPS**, không phải đường dẫn máy cá nhân.
- Chỉ file setup.sh được upload tạm; source app không được đồng bộ. Cập nhật repo
  trên VPS trước nếu muốn nó dùng code mới, kể cả các sửa lỗi Sucrase/PM2.
- Có thể thêm `--identity ~/.ssh/id_ed25519`. Public key tương ứng được thêm nếu có;
  script không vì thấy key mà tự tắt đăng nhập mật khẩu.
- Phiên chạy lệnh từ xa đóng sau khi xong. Mở terminal thứ hai và SSH lại bằng
  IP/port cũ để xác minh. Timeout ở lần mới không phải hành vi bình thường.

Không dùng `--host` trỏ về chính VPS khi bạn đã đang ở trong VPS; nó tạo thêm
một phiên SSH lồng nhau không cần thiết. `--dry-run` chỉ xem kế hoạch, không kết
nối tới VPS và không xác minh firewall, DNS hay khả năng SSH thực tế.

## 4. Bản hiện tại thay đổi bảo mật như thế nào

| Thành phần | Hành vi |
| --- | --- |
| SSH mặc định | Không sửa `sshd_config`, không reload/restart SSH; cấu hình cũ vẫn giữ nguyên |
| `--ssh-port` | Chỉ khi yêu cầu rõ: thêm port cho ssh/sshd service, giữ port cũ, kiểm tra cấu hình rồi reload; từ chối socket activation để tránh đoán sai listener |
| Firewall đang active | Nhận diện UFW/firewalld thực tế, thêm rule web và giữ các port SSH; không thay default policy, không xóa rule, không reload firewalld |
| Firewalld nhiều zone | Thêm allowance ở các active zone và default zone, cả runtime lẫn permanent |
| Không có UFW/firewalld active | Không tự cài/bật firewall khác; cảnh báo để quản trị viên quản lý cloud firewall hoặc bộ rule hiện có |
| Fail2ban | Jail SSH giới hạn port SSH; jail web chỉ TCP 80/443 và UDP 443. IP phiên quản trị được ignore nếu xác định được |
| `rp_filter` | Giữ giá trị hiện tại; không ép strict mode |
| Nâng cấp OS | Full upgrade mặc định tắt; `--upgrade` mới bật. Cài package cần thiết vẫn có thể chạy script của distro và thay đổi service |
| Cập nhật định kỳ | Vẫn cấu hình unattended-upgrades/dnf-automatic cho cập nhật bảo mật; các lần cập nhật sau có thể tác động service |

**Script không bảo đảm VPS chỉ mở bốn port.** Các rule/service đã có được giữ
lại. Nếu chưa có firewall active, cần cấu hình cloud firewall hoặc thiết kế
firewall VPS qua console trước khi public app. Không public Redis 6379 hoặc
port backend 8080 nếu chỉ nginx cần truy cập chúng.

Các sửa đổi không tự gỡ mọi ban cũ, khôi phục rule runtime đã mất, hay hoàn tác
cấu hình SSH cũ. Khôi phục máy đã bị khóa theo mục 1 trước. Script không có cơ chế
tự rollback toàn bộ mạng khi client không kết nối lại được; vì vậy cần giữ
console và tự kiểm tra từ ngoài VPS. `✔ Done` chỉ là script chạy xong, không
chứng minh SSH từ Internet hoạt động.

## 5. App, Yarn và vận hành sau setup

Repo hiện có sẽ được chuyển ownership cho `--app-user` (mặc định `deploy`).
Script chạy `yarn install --production=false`, `yarn build`, `yarn server-build`,
chuẩn bị Redis/browser bằng root, rồi chạy `start:redis-api:pm2:worker` qua
systemd bằng user app. Redis remote phải có cấu hình/credential hợp lệ; script
chỉ tự cài Redis local.

```bash
systemctl status vps-app
journalctl -u vps-app -n 80 --no-pager
sudo -u deploy pm2 ls
```

Sau khi tự cập nhật source trên VPS:

```bash
sudo -u deploy bash -lc 'cd /srv/anhchangvt1994.com && yarn && yarn build && yarn server-build'
sudo systemctl restart vps-app
```

Nếu tự chạy app thủ công, dùng cùng user sở hữu repo/PM2 và dừng service đang
chạy trước để tránh app trùng port. Khi đó dùng `yarn`, `yarn build`, rồi
`yarn start:redis-api:pm2:worker`.

Yarn Classic được pin trong `.yarnrc`, cài cả build dependencies khi
`NODE_ENV=production`; không cần Sucrase global. Node cần tương thích Vite
(20.19+ trong nhánh 20, 22.12+ trong nhánh 22); setup cài Node 22 khi bản hiện tại
không phù hợp. Kiểm tra log nếu app chưa sẵn sàng: setup có thể hoàn tất phần
web/bảo mật và báo warning dù bước app thất bại.

### TCP và RAM

Setup đặt trần TCP autotuning theo RAM: `RAM / 128`, tối thiểu 4 MiB và tối đa
32 MiB cho mỗi socket. Ví dụ VPS 2 GiB có trần 16 MiB. Đây là trần tăng trưởng
khi kết nối cần buffer, không phải lượng RAM được cấp phát sẵn cho mọi kết nối.
BBR/FQ chỉ bật nếu kernel hỗ trợ.
Profile này có thể giúp luồng truyền lớn qua đường truyền có độ trễ cao; nó không
làm CPU-bound rendering hay API vốn chậm tự nhanh lên. Nginx/app cache, CDN,
database, CPU và số worker thường quyết định độ phản hồi nhiều hơn.

Đo baseline và profile RAM bằng lab (cần Docker và image `vps-lab/centos-app`;
mỗi lượt ghi report JSON vào `.vps-lab/`). `VPS_SKIP_BUILD=1` dùng image lab có
sẵn; bỏ biến này để build lại image khi muốn đưa source app mới vào benchmark.

```bash
for profile in baseline ram; do
  TCP_PROFILE="$profile" VPS_SKIP_BUILD=1 VPS_MEMORY=2g \
    NET_RATE=50mbit NET_DELAY=30ms \
    BURST_PAGES=20 LOAD_VUS=50 LOAD_SECONDS=30 \
    node scripts/vps-lab/run.mjs lightpanda+redis
done
```

So sánh p50/p95, req/s, số trang render và RAM/CPU trong cùng scenario. Lặp lại
mỗi profile vài lần trước khi kết luận; một lần chạy ngắn dễ bị ảnh hưởng bởi
cache và tải nền. Lab chỉ mô phỏng mạng/VM, không thay thế phép đo từ người dùng
thật hoặc xác nhận tốc độ của nhà cung cấp VPS.

## 6. Các tùy chọn khác

| Flag | Ý nghĩa |
| --- | --- |
| `--app-dir /srv/app` | Repo đã có trên VPS; bắt buộc với `--host` nếu không `--skip-app` |
| `--skip-app` | Chỉ cài web/bảo mật; không cài/build/chạy app |
| `--app-user deploy` | User sở hữu repo và chạy app, không dùng root |
| `--route /=8080` | Proxy `/` tới `127.0.0.1:8080`; lặp flag cho nhiều route |
| `--route /api=http://127.0.0.1:3000/` | Proxy `/api/`, bỏ prefix; bỏ dấu `/` cuối target để giữ prefix |
| `--route /=/var/www/site --spa` | Phục vụ static SPA; thêm `--skip-app` nếu không cần app Node |
| `--ssh-key ...`, `--user ...` | Thêm public key / tạo sudo user; không thay chính sách password/root |
| `--ssh-port 2222` | Thêm listener cho service SSH thông thường; cloud firewall phải mở port đó trước |
| `--self-signed`, `--staging` | Chứng chỉ thử nghiệm; trình duyệt có thể cảnh báo |
| `--skip-dns-check` | Bỏ kiểm tra DNS trỏ trực tiếp, chẳng hạn dùng proxy Cloudflare |
| `--hsts-preload` | Chỉ dùng khi mọi subdomain đều hỗ trợ HTTPS |
| `--upgrade`, `--no-upgrade` | Bật / bỏ full OS upgrade; mặc định bỏ |
| `--dry-run`, `--help` | Xem cấu hình dự kiến / toàn bộ tùy chọn |

Script quản lý cấu hình nginx toàn cục; xem kỹ trước khi chạy trên máy đã có
nhiều website. HTTP/3 cần UDP 443 ở cả cloud firewall và VPS. Truy cập HTTP trực
tiếp bằng IP có thể nhận nginx 444 theo thiết kế; điều này không phải SSH timeout.
Log setup: `/var/log/vps-setup.log`; log nginx: `/var/log/nginx/{access,error,probe}.log`.

## 7. Kiểm tra và giới hạn xác minh

```bash
bash scripts/vps-setup/test.sh
```

Bộ kiểm tra local dùng filesystem tạm và mô phỏng lệnh quản trị hệ thống; kiểm
tra rule sinh ra, thứ tự/cách gọi firewall, port socket, giữ cấu hình SSH và
runtime app. Nó không chứng minh một VPS cụ thể còn kết nối được từ Internet.
Cần console/log của máy đó và một lần đăng nhập SSH mới để xác nhận.

Tham khảo hành vi nền tảng:
[firewalld runtime/permanent](https://firewalld.org/documentation/configuration/runtime-versus-permanent.html),
[firewall-cmd và zones](https://firewalld.org/documentation/man-pages/firewall-cmd),
[Linux rp_filter](https://kernel.org/doc/html/latest/networking/ip-sysctl.html),
[Fail2ban nftables multiport](https://github.com/fail2ban/fail2ban/blob/master/config/action.d/nftables.conf).
