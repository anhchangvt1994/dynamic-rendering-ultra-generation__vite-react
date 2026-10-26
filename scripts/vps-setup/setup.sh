#!/usr/bin/env bash
# NOTE - One-shot VPS setup: nginx (HTTP/2 + HTTP/3/QUIC) as a reverse proxy or
# static file server, Let's Encrypt SSL, firewall, SSH hardening, fail2ban,
# kernel hardening and automatic security updates. Uses the existing repository
# to install Node.js + yarn + pm2 and run the project as a systemd service.
# Supports Ubuntu / Debian and the RHEL family (Rocky, Alma, CentOS Stream,
# RHEL, Fedora). Safe to re-run: every file it writes is regenerated.
#
#   On the VPS:          sudo bash setup.sh --domain example.com --email you@example.com
#   From your machine:   bash setup.sh --host root@<VPS_IP> --domain example.com
#                        (macOS, Linux, Windows Git Bash / WSL: uploads itself and runs there)
#   Existing remote app: bash setup.sh --host root@<VPS_IP> --domain example.com --app-dir /srv/app
#   Without flags:       asks for each value, with a hint
#
# Run "bash setup.sh --help" for every option.
set -Eeuo pipefail

LOG_FILE=/var/log/vps-setup.log
MARKER='# Managed by vps-setup (scripts/vps-setup/setup.sh) - re-running it overwrites this file'
ACME_ROOT=/var/www/letsencrypt

DOMAIN=''
EMAIL=''
WWW=0
ROUTES=()
SPA=0
SSH_PORT=''
SSH_KEY=''
NEW_USER=''
ORIGINAL_SSH_PORTS=''
SSH_CONNECTION=${VPS_SETUP_SSH_CONNECTION:-${SSH_CONNECTION:-}}
SSL_MODE=letsencrypt # letsencrypt | staging | self-signed
SKIP_DNS_CHECK=0
HSTS_PRELOAD=0
RATE=30
BURST=100
MAX_BODY=10m
PROXY_TIMEOUT=120s
SKIP_UPGRADE=0
INTERACTIVE=0
DRY_RUN=0

APP_SOURCE='' # existing repository on the VPS (resolved below)
APP_DIR=''    # defaults to the repository containing this script
SKIP_APP=0
APP_USER=deploy
APP_SERVICE=vps-app

REMOTE_HOST=''
REMOTE_PORT=''
REMOTE_KEY=''
FORWARD_ARGS=()

WARNINGS=()

# Placeholder hint per value flag: shown in --help and in every error about it
hint() {
  case $1 in
    --host) echo 'root@203.0.113.10' ;;
    --host-port) echo '22' ;;
    --identity) echo '~/.ssh/id_ed25519' ;;
    --domain) echo 'anhchangvt1994.com' ;;
    --email) echo 'you@anhchangvt1994.com' ;;
    --route) echo '/=8080 | /api=http://127.0.0.1:3000 | /static=/var/www/static' ;;
    --ssh-port) echo '2222' ;;
    --ssh-key) echo '~/.ssh/id_ed25519.pub | "ssh-ed25519 AAAAC3Nz... you@laptop"' ;;
    --user) echo 'deploy' ;;
    --app-dir) echo '/srv/anhchangvt1994.com' ;;
    --app-user) echo 'deploy' ;;
    --rate) echo '30' ;;
    --burst) echo '100' ;;
    --max-body) echo '10m | 512k | 1g' ;;
    --proxy-timeout) echo '120s | 5m' ;;
  esac
}
eg() { echo "e.g. $1 $(hint "$1")"; } # "e.g. --domain anhchangvt1994.com"

usage() {
  cat <<EOF
Usage:
  On the VPS (as root)     sudo bash setup.sh --domain <DOMAIN> [options]
  From your machine        bash setup.sh --host <USER@VPS_IP> --domain <DOMAIN> [options]
  Guided (asks for values) sudo bash setup.sh

Example:
  bash setup.sh --host root@203.0.113.10 --domain anhchangvt1994.com \\
    --email you@anhchangvt1994.com --www --route /=8080

Remote (from macOS / Linux / Windows Git Bash or WSL; the VPS itself must be Linux)
  --host <USER@VPS_IP>       SSH into the VPS, upload this script and run it there
                               $(eg --host)
  --host-port <PORT>         SSH port of the VPS today (default 22)
                               $(eg --host-port)
  --identity <PRIVATE_KEY>   Private key for that SSH login
                               $(eg --identity)
                             Your public key (<PRIVATE_KEY>.pub, else ~/.ssh/id_*.pub) is sent as
                             --ssh-key unless you pass one, so key-only login keeps working

Site
  --domain <DOMAIN>          Domain to serve (required, asked if missing)
                               $(eg --domain)
  --email <EMAIL>            Let's Encrypt account email: expiry notices (recommended)
                               $(eg --email)
  --www                      Also cover www.<DOMAIN>, redirected to <DOMAIN>
  --route <PATH>=<TARGET>    What a URL path serves. Repeatable. Default: /=http://127.0.0.1:8080
                             <TARGET> = <PORT> | <HOST>:<PORT> | http(s)://<HOST>:<PORT>[/<URI>]  reverse proxy
                             <TARGET> = /<ABSOLUTE_DIR>                                           static files
                               $(eg --route)
  --spa                      Static routes fall back to index.html (React / Vue single page app)

SSL
  --staging                  Let's Encrypt staging CA (testing, browsers will warn)
  --self-signed              Self-signed cert, no Let's Encrypt (local / lab testing)
  --skip-dns-check           Do not check the domain points here (e.g. behind the Cloudflare proxy)
  --hsts-preload             HSTS includeSubDomains + preload (only if EVERY subdomain is HTTPS)

App (install Node.js, build and run the existing project behind nginx)
                             Defaults to the repository containing this setup.sh on the VPS.
                             No git clone, fetch, pull or checkout is performed.
  --app-dir <DIR>            Existing project directory on the VPS (needed with --host)
                               $(eg --app-dir)
  --skip-app                 Only configure web infrastructure and security
  --app-user <NAME>          Linux user that owns and runs the app, no sudo (default deploy)
                               $(eg --app-user)
                             Installs Node.js 22 + yarn + pm2, runs yarn build and
                             yarn start:redis-api:pm2:worker under vps-app.service

SSH / users
  --ssh-port <PORT>          Add an SSH port; keep existing ports for safe reconnection
                               $(eg --ssh-port)
  --ssh-key <PUBKEY|FILE>    Public key to authorize (for --user, else the sudo user, else root)
                               $(eg --ssh-key)
  --user <NAME>              Create a sudo user (gets root's / the sudo user's keys if no --ssh-key)
                               $(eg --user)

Tuning
  --rate <N>                 Requests per second per IP (default 30)
                               $(eg --rate)
  --burst <N>                Burst above the rate before 429 (default 100)
                               $(eg --burst)
  --max-body <SIZE>          Max request body (default 10m)
                               $(eg --max-body)
  --proxy-timeout <TIME>     Upstream read/send timeout (default 120s)
                               $(eg --proxy-timeout)
  --no-upgrade               Skip the full system package upgrade
  --dry-run                  Validate inputs and print route configuration locally; change nothing
  -h, --help                 Show this help
EOF
}

log() { printf '\n\033[1;34m==>\033[0m \033[1m%s\033[0m\n' "$*"; }
ok() { printf '    \033[32m✓\033[0m %s\n' "$*"; }
warn() {
  printf '    \033[33m!\033[0m %s\n' "$*" >&2
  WARNINGS+=("$*")
}
die() {
  printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2
  exit 1
}
trap 'die "Failed at line $LINENO: $BASH_COMMAND (full log: $LOG_FILE)"' ERR

has() { command -v "$1" >/dev/null 2>&1; }
shq() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; } # POSIX shell quoting
# NOTE - No "grep -q" after a pipe: with pipefail an early exit can SIGPIPE the writer
unit_exists() { systemctl list-unit-files --no-legend "$1" 2>/dev/null | grep "^$1" >/dev/null; }
selinux_on() { has getenforce && [[ $(getenforce) != Disabled ]]; }

# ---------------------------------------------------------------------------
# Arguments
# ---------------------------------------------------------------------------

parse_args() {
  need() { [[ -n ${2:-} && ${2:0:2} != -- ]] || die "$1 needs a value, $(eg "$1")"; }
  while (($#)); do
    case $1 in
      --domain) need "$@"; DOMAIN=$2; shift ;;
      --email) need "$@"; EMAIL=$2; shift ;;
      --www) WWW=1 ;;
      --route) need "$@"; ROUTES+=("$2"); shift ;;
      --spa) SPA=1 ;;
      --staging) SSL_MODE=staging ;;
      --self-signed) SSL_MODE=self-signed ;;
      --skip-dns-check) SKIP_DNS_CHECK=1 ;;
      --hsts-preload) HSTS_PRELOAD=1 ;;
      --ssh-port) need "$@"; SSH_PORT=$2; shift ;;
      --ssh-key) need "$@"; SSH_KEY=$2; shift ;;
      --user) need "$@"; NEW_USER=$2; shift ;;
      --app-dir) need "$@"; APP_DIR=$2; shift ;;
      --skip-app) SKIP_APP=1 ;;
      --app-user) need "$@"; APP_USER=$2; shift ;;
      --rate) need "$@"; RATE=$2; shift ;;
      --burst) need "$@"; BURST=$2; shift ;;
      --max-body) need "$@"; MAX_BODY=$2; shift ;;
      --proxy-timeout) need "$@"; PROXY_TIMEOUT=$2; shift ;;
      --no-upgrade) SKIP_UPGRADE=1 ;;
      --dry-run) DRY_RUN=1 ;;
      -h | --help) usage; exit 0 ;;
      *) die "Unknown option: $1 (bash setup.sh --help lists them)" ;;
    esac
    shift
  done
}

# NOTE - Runs on the local machine too (macOS ships bash 3.2): keep this part,
# detect_platform and run_remote free of bash 4 syntax
split_args() { # Pull the remote-only flags out, the rest is forwarded to the VPS
  while (($#)); do
    case $1 in
      --host | --host-port | --identity)
        [[ -n ${2:-} && ${2:0:2} != -- ]] || die "$1 needs a value, $(eg "$1")"
        case $1 in
          --host) REMOTE_HOST=$2 ;;
          --host-port) REMOTE_PORT=$2 ;;
          --identity) REMOTE_KEY=$2 ;;
        esac
        shift
        ;;
      *) FORWARD_ARGS+=("$1") ;;
    esac
    shift
  done
}

detect_platform() {
  case $(uname -s) in
    Linux)
      PLATFORM=linux
      # NOTE - Not "grep ... && PLATFORM=wsl": a non-match would fail the case
      # and abort under set -e
      if grep -qi microsoft /proc/version 2>/dev/null; then PLATFORM=wsl; fi
      ;;
    Darwin) PLATFORM=macos ;;
    MINGW* | MSYS* | CYGWIN*) PLATFORM=windows ;;
    *) PLATFORM=$(uname -s) ;;
  esac
}

run_remote() {
  has ssh || die "ssh is not installed (Windows: run this from Git Bash or WSL)"
  [[ $REMOTE_HOST =~ ^([a-zA-Z0-9_][a-zA-Z0-9_.-]*@)?[a-zA-Z0-9][a-zA-Z0-9.:-]*$ ]] || die "Invalid --host, $(eg --host)"
  [[ -z $REMOTE_PORT ]] || { [[ $REMOTE_PORT =~ ^[0-9]{1,5}$ ]] && ((10#$REMOTE_PORT > 0 && 10#$REMOTE_PORT < 65536)); } || die "Invalid --host-port (1-65535)"
  local self=${BASH_SOURCE[0]} opts=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
  [[ -f $self ]] || die "Run the script from a file (bash setup.sh ...), not from a pipe"
  [[ -n $REMOTE_PORT ]] && opts+=(-p "$REMOTE_PORT")
  [[ -n $REMOTE_KEY ]] && opts+=(-i "$REMOTE_KEY")

  # NOTE - --ssh-key may name a local file: send the key itself. Without one,
  # send the local public key so hardening can not lock this machine out
  local args=() a key='' i=0 n=${#FORWARD_ARGS[@]}
  while ((i < n)); do
    a=${FORWARD_ARGS[i]}
    if [[ $a == --ssh-key ]] && ((i + 1 < n)); then
      key=${FORWARD_ARGS[i + 1]}
      [[ -f $key ]] && key=$(grep -m1 -E '^(ssh-|ecdsa-|sk-)' "$key" || true)
      [[ -n $key ]] || die "--ssh-key file has no public key"
      args+=(--ssh-key "$key")
      i=$((i + 2))
      continue
    fi
    args+=("$a")
    i=$((i + 1))
  done
  if [[ -z $key ]]; then
    for a in ${REMOTE_KEY:+"$REMOTE_KEY.pub"} ~/.ssh/id_ed25519.pub ~/.ssh/id_ecdsa.pub ~/.ssh/id_rsa.pub; do
      [[ -f $a ]] || continue
      key=$(grep -m1 -E '^(ssh-|ecdsa-|sk-)' "$a" || true)
      [[ -n $key ]] && { args+=(--ssh-key "$key"); ok "Authorizing your public key $a on the VPS"; break; }
    done
    [[ -n $key ]] || warn "No local public key found (~/.ssh/id_*.pub): SSH password login stays on"
  fi

  local cmd='' payload
  for a in ${args[@]+"${args[@]}"}; do cmd+=" $(shq "$a")"; done
  # NOTE - Script and run in ONE ssh session: one password prompt, and a TTY for
  # the questions and sudo. base64 survives any login shell
  payload=$(base64 <"$self" | tr -d '\n')
  log "Running setup.sh on $REMOTE_HOST ($PLATFORM -> VPS over SSH)"
  local rc=0
  ssh -t "${opts[@]}" "$REMOTE_HOST" "umask 077
    tmp=\$(mktemp /tmp/vps-setup.XXXXXXXXXX) || exit 1
    trap 'rm -f \"\$tmp\"' EXIT HUP INT TERM
    echo $payload | base64 -d > \"\$tmp\" || exit 1
    if [ \"\$(id -u)\" = 0 ]; then bash \"\$tmp\"$cmd; else sudo env VPS_SETUP_SSH_CONNECTION=\"\$SSH_CONNECTION\" bash \"\$tmp\"$cmd; fi" || rc=$?
  exit $rc
}

ask() { # <var> <question> <hint> [default]
  local answer=''
  read -r -p "    $2 ($3)${4:+ [$4]}: " answer || true
  printf -v "$1" '%s' "${answer:-${4:-}}"
}

prompt_missing() {
  [[ -z $DOMAIN && -t 0 ]] || return 0
  INTERACTIVE=1
  local answer target
  log "Interactive setup (Enter keeps the [default], flags skip these questions: --help)"
  while [[ -z $DOMAIN ]]; do ask DOMAIN 'Domain' 'e.g. anhchangvt1994.com'; done
  [[ -n $EMAIL ]] || ask EMAIL "Let's Encrypt email" "e.g. you@$DOMAIN, Enter to skip"
  if ! ((${#ROUTES[@]})); then
    ask target 'What does / serve' "app port e.g. 8080 / http://127.0.0.1:3000, or a folder e.g. /var/www/$DOMAIN" 8080
    ROUTES=("/=$target")
    if [[ $target == /* ]] && ! ((SPA)); then
      ask answer 'Single page app, unknown paths serve index.html?' 'y/N' n
      [[ $answer == [yY]* ]] && SPA=1
    fi
  fi
  if ! ((WWW)); then
    ask answer "Also serve www.$DOMAIN (redirects to $DOMAIN)?" 'y/N' n
    [[ $answer == [yY]* ]] && WWW=1
  fi
  return 0
}

resolve_app_directory() {
  if ((SKIP_APP)); then
    [[ -z $APP_DIR ]] || die "--skip-app cannot be combined with --app-dir"
    return 0
  fi
  # In remote mode only this script is uploaded, not the local repository.
  # The remote run needs an explicit directory that already exists on the VPS.
  if [[ -z $APP_DIR && -z $REMOTE_HOST ]]; then
    local script_dir candidate
    script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
    candidate=$(cd "$script_dir/../.." && pwd -P)
    if [[ -f $candidate/package.json && -f $candidate/server/server-build.js && -d $candidate/config/scripts ]]; then
      APP_DIR=$candidate
    fi
  fi
  [[ -n $APP_DIR ]] || die "Cannot locate the existing VPS repository. Run scripts/vps-setup/setup.sh inside it, pass --app-dir /srv/app with --host, or use --skip-app"
  APP_SOURCE=$APP_DIR
}

confirm_plan() {
  ((INTERACTIVE)) || return 0
  local i answer
  log "Plan"
  echo "    https://$DOMAIN$( ((WWW)) && echo " (+ www.$DOMAIN)")  SSL: $SSL_MODE  email: ${EMAIL:-none}"
  for i in "${!R_PATH[@]}"; do
    echo "    ${R_PATH[i]} -> ${R_SCHEME[i]}${R_TARGET[i]}${R_URI[i]}"
  done
  [[ -z $APP_SOURCE ]] || echo "    app: $APP_SOURCE -> $APP_DIR (user $APP_USER, service $APP_SERVICE)"
  ask answer 'Continue?' 'Y/n' y
  [[ $answer == [yY]* ]] || die "Cancelled"
}

# Parsed routes, one index per route
R_PATH=()
R_KIND=()   # proxy | dir
R_TARGET=() # proxy: host:port, dir: absolute directory
R_SCHEME=() # proxy: http:// or https://
R_URI=()    # proxy: optional uri appended to proxy_pass

validate_args() {
  DOMAIN=$(printf '%s' "$DOMAIN" | tr '[:upper:]' '[:lower:]')
  DOMAIN=${DOMAIN#http://}
  DOMAIN=${DOMAIN#https://}
  DOMAIN=${DOMAIN%%/*}
  [[ -n $DOMAIN ]] || die "--domain is required, $(eg --domain) (or run without flags in a terminal to be asked)"
  [[ $DOMAIN =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$ ]] ||
    die "Invalid domain: $DOMAIN, $(eg --domain)"
  [[ -z $EMAIL || $EMAIL =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] ||
    die "Invalid email: $EMAIL, $(eg --email)"
  [[ -z $SSH_PORT ]] || { [[ $SSH_PORT =~ ^[0-9]+$ ]] && ((SSH_PORT > 0 && SSH_PORT < 65536)); } ||
    die "Invalid --ssh-port: $SSH_PORT (1-65535), $(eg --ssh-port)"
  [[ -z $NEW_USER || $NEW_USER =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || die "Invalid --user: $NEW_USER (lowercase, digits, _ -), $(eg --user)"
  if [[ -n $APP_SOURCE ]]; then
    [[ $APP_USER != root ]] || die "--app-user can not be root, $(eg --app-user)"
    [[ $APP_USER =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || die "Invalid --app-user: $APP_USER (lowercase, digits, _ -), $(eg --app-user)"
    [[ $APP_DIR =~ ^/[A-Za-z0-9._/-]+$ ]] || die "Invalid --app-dir: $APP_DIR (absolute, no spaces), $(eg --app-dir)"
    APP_DIR=${APP_DIR%/}
    APP_SOURCE=$APP_DIR
  fi
  [[ $RATE =~ ^[1-9][0-9]*$ ]] || die "Invalid --rate: $RATE, $(eg --rate)"
  [[ $BURST =~ ^[0-9]+$ ]] || die "Invalid --burst: $BURST, $(eg --burst)"
  [[ $MAX_BODY =~ ^[0-9]+[kKmMgG]?$ ]] || die "Invalid --max-body: $MAX_BODY, $(eg --max-body)"
  [[ $PROXY_TIMEOUT =~ ^[0-9]+[smh]?$ ]] || die "Invalid --proxy-timeout: $PROXY_TIMEOUT, $(eg --proxy-timeout)"

  ((${#ROUTES[@]})) || ROUTES=('/=http://127.0.0.1:8080')
  local route path target
  for route in "${ROUTES[@]}"; do
    [[ $route == *=* ]] || die "Invalid --route $route (expected <PATH>=<TARGET>), $(eg --route)"
    path=${route%%=*}
    target=${route#*=}
    [[ $path =~ ^/[A-Za-z0-9._~/-]*$ ]] || die "Invalid route path: $path, $(eg --route)"
    [[ $path == / ]] || path=${path%/}
    [[ " ${R_PATH[*]-} " != *" $path "* ]] || die "Duplicate route path: $path"
    [[ $target =~ ^[0-9]+$ ]] && target="127.0.0.1:$target"

    R_PATH+=("$path")
    if [[ $target == /* ]]; then
      [[ $target =~ ^/[A-Za-z0-9._/-]*[A-Za-z0-9._-]/?$ ]] || die "Invalid route directory: $target (absolute, no spaces), e.g. /var/www/$DOMAIN"
      R_KIND+=(dir)
      R_TARGET+=("${target%/}")
      R_SCHEME+=('')
      R_URI+=('')
    elif [[ $target =~ ^(https?://)?([A-Za-z0-9.-]+|\[[0-9a-fA-F:]+\]):([0-9]{1,5})(/[A-Za-z0-9._~/-]*)?$ ]]; then
      ((10#${BASH_REMATCH[3]} > 0 && 10#${BASH_REMATCH[3]} < 65536)) || die "Invalid upstream port: $target (1-65535)"
      R_KIND+=(proxy)
      R_SCHEME+=("${BASH_REMATCH[1]:-http://}")
      R_TARGET+=("${BASH_REMATCH[2]}:${BASH_REMATCH[3]}")
      R_URI+=("${BASH_REMATCH[4]}")
    else
      die "Invalid route target: $target, $(eg --route)"
    fi
  done
}

# ---------------------------------------------------------------------------
# OS and packages
# ---------------------------------------------------------------------------

detect_os() {
  [[ -r /etc/os-release ]] || die "Cannot read /etc/os-release"
  # shellcheck disable=SC1091
  . /etc/os-release
  OS_ID=$ID
  OS_MAJOR=${VERSION_ID%%.*}
  case "$ID" in
    ubuntu | debian) FAMILY=debian; OS_CODENAME=${VERSION_CODENAME:-} ;;
    fedora) FAMILY=rhel ;;
    *)
      if [[ " ${ID_LIKE:-} " =~ \ (rhel|centos|fedora)\  ]]; then
        FAMILY=rhel
      else
        die "Unsupported OS: ${PRETTY_NAME:-$ID} (supported: Ubuntu, Debian, Rocky, Alma, CentOS Stream, RHEL, Fedora)"
      fi
      ;;
  esac
  HAS_IPV6=0
  [[ -s /proc/net/if_inet6 ]] && HAS_IPV6=1
  ok "${PRETTY_NAME:-$ID} ($FAMILY family), IPv6: $([[ $HAS_IPV6 == 1 ]] && echo yes || echo no)"
}

apt_get() {
  DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get -y -q \
    -o DPkg::Lock::Timeout=600 \
    -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold "$@"
}

pkg_install() {
  if [[ $FAMILY == debian ]]; then apt_get install "$@"; else dnf -y -q install "$@"; fi
}

install_base() {
  log "Updating the system and installing base packages"
  if [[ $FAMILY == debian ]]; then
    apt_get update
    ((SKIP_UPGRADE)) || apt_get upgrade
    pkg_install ca-certificates curl gnupg openssl dnsutils ufw fail2ban python3-systemd \
      certbot unattended-upgrades
  else
    if [[ $OS_ID != fedora ]] && ! rpm -q epel-release >/dev/null 2>&1; then
      dnf -y -q install epel-release ||
        dnf -y -q install "https://dl.fedoraproject.org/pub/epel/epel-release-latest-${OS_MAJOR}.noarch.rpm"
    fi
    ((SKIP_UPGRADE)) || dnf -y -q upgrade
    pkg_install ca-certificates curl openssl bind-utils firewalld fail2ban policycoreutils-python-utils
    pkg_install fail2ban-systemd >/dev/null 2>&1 || true
    pkg_install certbot || warn "certbot is not packaged here, installing it with pip"
    pkg_install dnf-automatic || pkg_install dnf5-plugin-automatic || warn "No dnf-automatic package found"
  fi
  if ! has certbot; then
    python3 -m venv /opt/certbot
    /opt/certbot/bin/pip install -q --upgrade pip certbot
    ln -sf /opt/certbot/bin/certbot /usr/local/bin/certbot
  fi
  ok "Base packages installed"
}

# ---------------------------------------------------------------------------
# Users and SSH keys
# ---------------------------------------------------------------------------

home_of() { getent passwd "$1" | cut -d: -f6; }

has_usable_key() {
  local home
  home=$(home_of "$1") || return 1
  [[ -n $home ]] && grep -qE '^(ssh-|ecdsa-|sk-)' "$home/.ssh/authorized_keys" 2>/dev/null
}

add_key() { # <user> <public key line>
  local user=$1 key=$2 home group
  home=$(home_of "$user")
  group=$(id -gn "$user")
  install -d -m 700 -o "$user" -g "$group" "$home/.ssh"
  touch "$home/.ssh/authorized_keys"
  grep -qxF "$key" "$home/.ssh/authorized_keys" || echo "$key" >>"$home/.ssh/authorized_keys"
  chown "$user:$group" "$home/.ssh/authorized_keys"
  chmod 600 "$home/.ssh/authorized_keys"
  ! selinux_on || restorecon -R "$home/.ssh"
}

setup_users() {
  local login_user=${SUDO_USER:-root} key='' key_owner
  [[ $login_user != root ]] && id "$login_user" >/dev/null 2>&1 || login_user=root

  if [[ -n $SSH_KEY ]]; then
    [[ -f $SSH_KEY ]] && key=$(grep -m1 -E '^(ssh-|ecdsa-|sk-)' "$SSH_KEY" || true) || key=$SSH_KEY
    [[ $key =~ ^(ssh-(ed25519|rsa)|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com)\ [A-Za-z0-9+/=]+(\ .*)?$ ]] ||
      die "--ssh-key is not a valid public key (or a file containing one), $(eg --ssh-key)"
  fi

  if [[ -n $NEW_USER ]]; then
    log "Creating sudo user $NEW_USER"
    id "$NEW_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$NEW_USER"
    usermod -aG "$([[ $FAMILY == debian ]] && echo sudo || echo wheel)" "$NEW_USER"
    # NOTE - Key-only login means the user has no password, so sudo can not ask for one
    echo "$NEW_USER ALL=(ALL) NOPASSWD:ALL" >"/etc/sudoers.d/90-$NEW_USER"
    chmod 440 "/etc/sudoers.d/90-$NEW_USER"
    visudo -cqf "/etc/sudoers.d/90-$NEW_USER" || { rm -f "/etc/sudoers.d/90-$NEW_USER"; die "Invalid sudoers file"; }
    if [[ -z $key ]]; then
      local src
      for src in "$login_user" root; do
        if has_usable_key "$src"; then
          while IFS= read -r line; do add_key "$NEW_USER" "$line"; done \
            < <(grep -E '^(ssh-|ecdsa-|sk-)' "$(home_of "$src")/.ssh/authorized_keys")
          ok "Copied the SSH keys of $src to $NEW_USER"
          break
        fi
      done
    fi
    ok "User $NEW_USER ready (sudo without password)"
  fi

  if [[ -n $key ]]; then
    key_owner=${NEW_USER:-$login_user}
    add_key "$key_owner" "$key"
    ok "SSH key authorized for $key_owner"
  fi
}

# ---------------------------------------------------------------------------
# nginx
# ---------------------------------------------------------------------------

install_nginx() {
  log "Installing nginx from nginx.org (mainline, built with HTTP/3)"
  if [[ $FAMILY == debian ]]; then
    [[ -n $OS_CODENAME ]] || die "Unknown $OS_ID codename"
    curl -fsSI "https://nginx.org/packages/mainline/$OS_ID/dists/$OS_CODENAME/Release" >/dev/null ||
      die "nginx.org has no packages for $OS_ID $OS_CODENAME yet"
    curl -fsSL https://nginx.org/keys/nginx_signing.key |
      gpg --dearmor --yes -o /usr/share/keyrings/nginx-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] https://nginx.org/packages/mainline/$OS_ID $OS_CODENAME nginx" \
      >/etc/apt/sources.list.d/nginx.list
    printf 'Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n' \
      >/etc/apt/preferences.d/99nginx
    # NOTE - The distro nginx splits into nginx-common/-core and conflicts with the nginx.org one
    if dpkg -s nginx-common >/dev/null 2>&1; then
      apt_get remove nginx nginx-common nginx-core nginx-full nginx-light 2>/dev/null || true
    fi
    apt_get update
    pkg_install nginx
  else
    if [[ $OS_ID != fedora ]]; then
      local arch
      arch=$(uname -m)
      curl -fsSI "https://nginx.org/packages/mainline/centos/$OS_MAJOR/$arch/repodata/repomd.xml" >/dev/null ||
        die "nginx.org has no packages for EL$OS_MAJOR $arch yet"
      cat >/etc/yum.repos.d/nginx.repo <<EOF
[nginx-mainline]
name=nginx mainline repo
baseurl=https://nginx.org/packages/mainline/centos/$OS_MAJOR/\$basearch/
gpgcheck=1
enabled=1
gpgkey=https://nginx.org/keys/nginx_signing.key
module_hotfixes=true
EOF
    fi
    pkg_install nginx
  fi
  nginx -V 2>&1 | grep -- '--with-http_v3_module' >/dev/null ||
    die "The installed nginx was built without HTTP/3 (nginx -V has no --with-http_v3_module)"
  id nginx >/dev/null 2>&1 || die "nginx user missing"
  ok "$(nginx -v 2>&1 | sed 's/.*: //') with HTTP/3"
}

backup_once() { # Keep the original of a file we take over
  [[ -f $1 ]] && ! grep -qF "$MARKER" "$1" && cp -a "$1" "$1.orig-$(date +%Y%m%d%H%M%S)"
  return 0
}

listen() { # <port spec> -> IPv4 + IPv6 listen lines
  echo "    listen $1;"
  ((HAS_IPV6)) && echo "    listen [::]:$1;"
  return 0
}

write_nginx_base() {
  log "Writing the nginx base configuration"
  mkdir -p /etc/nginx/conf.d /etc/nginx/snippets /etc/nginx/ssl/default "$ACME_ROOT"
  backup_once /etc/nginx/nginx.conf
  rm -f /etc/nginx/conf.d/default.conf

  cat >/etc/nginx/nginx.conf <<EOF
$MARKER
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log warn;

events {
    worker_connections 8192;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" "\$http_user_agent" '
                    '\$server_protocol \$request_time';
    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    server_tokens off;
    types_hash_max_size 2048;
    server_names_hash_bucket_size 128;

    # Slow / oversized request protection
    keepalive_timeout 30s;
    keepalive_requests 1000;
    client_header_timeout 15s;
    client_body_timeout 15s;
    send_timeout 30s;
    reset_timedout_connection on;
    client_body_buffer_size 16k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;
    client_max_body_size $MAX_BODY;

    # Per-IP rate and connection limits (applied in each site)
    limit_req_zone \$binary_remote_addr zone=req_per_ip:20m rate=${RATE}r/s;
    limit_conn_zone \$binary_remote_addr zone=conn_per_ip:20m;
    limit_req_status 429;
    limit_conn_status 429;

    # TLS (Mozilla "intermediate": TLS 1.2 + 1.3, forward secrecy only)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:20m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript
               application/json application/xml application/rss+xml application/atom+xml
               application/manifest+json application/wasm image/svg+xml font/ttf font/otf;

    # WebSocket upgrade, keeps upstream keepalive for normal requests
    map \$http_upgrade \$connection_upgrade {
        default upgrade;
        ''      '';
    }

    # Browser cache for static routes: long for assets, revalidate HTML
    map \$sent_http_content_type \$static_expires {
        default             off;
        ~^text/html         epoch;
        ~^text/css          30d;
        ~javascript         30d;
        ~^image/            30d;
        ~^font/             30d;
        ~^application/font  30d;
        ~^application/wasm  30d;
        ~^(audio|video)/    30d;
    }

    include /etc/nginx/conf.d/*.conf;
}
EOF

  cat >/etc/nginx/snippets/security-headers.conf <<'EOF'
# Managed by vps-setup (scripts/vps-setup/setup.sh) - re-running it overwrites this file
# NOTE - nginx drops these if a location has its own add_header: include this file there too
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header X-Permitted-Cross-Domain-Policies "none" always;
# Tells browsers that HTTP/3 is available on 443
add_header Alt-Svc 'h3=":443"; ma=86400' always;
# Tighten for your app, then uncomment (test with Report-Only first):
# add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" always;
EOF

  cat >/etc/nginx/snippets/proxy.conf <<EOF
$MARKER
proxy_http_version 1.1;
proxy_set_header Host \$host;
proxy_set_header X-Real-IP \$remote_addr;
# NOTE - nginx is the edge: overwrite (not append) so clients can not spoof their IP
proxy_set_header X-Forwarded-For \$remote_addr;
proxy_set_header X-Forwarded-Proto \$scheme;
proxy_set_header X-Forwarded-Host \$host;
proxy_set_header Upgrade \$http_upgrade;
proxy_set_header Connection \$connection_upgrade;
proxy_connect_timeout 5s;
proxy_send_timeout $PROXY_TIMEOUT;
proxy_read_timeout $PROXY_TIMEOUT;
proxy_buffer_size 32k;
proxy_buffers 16 32k;
proxy_busy_buffers_size 64k;
# One value per header: the ones set by nginx win over the app's
proxy_hide_header X-Powered-By;
proxy_hide_header Alt-Svc;
proxy_hide_header Strict-Transport-Security;
proxy_hide_header X-Content-Type-Options;
proxy_hide_header X-Frame-Options;
proxy_hide_header Referrer-Policy;
proxy_hide_header Permissions-Policy;
proxy_hide_header Cross-Origin-Opener-Policy;
EOF

  cat >/etc/nginx/snippets/block-exploits.conf <<'EOF'
# Managed by vps-setup (scripts/vps-setup/setup.sh) - re-running it overwrites this file
# Scanner probes: logged to probe.log, which fail2ban (nginx-probe jail) bans on
location ~ /\.(?!well-known/) {
    access_log /var/log/nginx/probe.log main;
    return 404;
}
location ~* \.(?:php[0-9]?|phtml|aspx?|jsp|cgi|pl|sql|bak|old|orig|swp|ini|env|log|sh)$ {
    access_log /var/log/nginx/probe.log main;
    return 404;
}
location ~* ^/(?:wp-admin|wp-login|wp-content|wp-includes|xmlrpc|phpmyadmin|pma|myadmin|cgi-bin|vendor/phpunit|actuator|boaform|HNAP1)(?:/|$) {
    access_log /var/log/nginx/probe.log main;
    return 404;
}
EOF

  # NOTE - Requests for unknown hosts / the bare IP are dropped. The cert is a
  # placeholder: TLS handshakes are rejected before it is ever sent.
  if [[ ! -s /etc/nginx/ssl/default/cert.pem ]]; then
    openssl req -x509 -nodes -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -days 3650 \
      -subj '/CN=invalid' -keyout /etc/nginx/ssl/default/key.pem -out /etc/nginx/ssl/default/cert.pem 2>/dev/null
    chmod 600 /etc/nginx/ssl/default/key.pem
  fi
  {
    echo "$MARKER"
    echo '# Catch-all for unknown hosts and direct IP access'
    echo 'server {'
    listen '80 default_server'
    listen '443 ssl default_server'
    # NOTE - reuseport may appear only once per address:port, so it lives here
    # and every site uses a plain "listen 443 quic"
    listen '443 quic reuseport default_server'
    echo '    http2 on;'
    echo '    http3 on;'
    echo '    server_name _;'
    echo '    ssl_reject_handshake on;'
    echo '    ssl_certificate /etc/nginx/ssl/default/cert.pem;'
    echo '    ssl_certificate_key /etc/nginx/ssl/default/key.pem;'
    echo '    access_log off;'
    echo '    return 444;'
    echo '}'
  } >/etc/nginx/conf.d/00-default.conf

  touch /var/log/nginx/probe.log
  if selinux_on; then
    setsebool -P httpd_can_network_connect 1
    restorecon -R /etc/nginx /var/www /var/log/nginx 2>/dev/null || true
  fi
  systemctl enable nginx >/dev/null 2>&1
  nginx -t -q
  systemctl restart nginx
  ok "nginx.conf, snippets and the catch-all server written"
}

prepare_routes() {
  local i dir
  for i in "${!R_PATH[@]}"; do
    [[ ${R_KIND[i]} == dir ]] || continue
    dir=${R_TARGET[i]}
    if [[ ! -d $dir ]]; then
      mkdir -p "$dir"
      cat >"$dir/index.html" <<EOF
<!doctype html><html lang="en"><head><meta charset="utf-8"><title>$DOMAIN</title></head>
<body><h1>$DOMAIN is ready</h1><p>Put your site in $dir</p></body></html>
EOF
      ok "Created $dir with a placeholder index.html"
    fi
    if selinux_on; then
      semanage fcontext -a -t httpd_sys_content_t "$dir(/.*)?" 2>/dev/null ||
        semanage fcontext -m -t httpd_sys_content_t "$dir(/.*)?"
      restorecon -R "$dir"
    fi
    runuser -u nginx -- test -r "$dir" -a -x "$dir" ||
      warn "nginx can not read $dir (check the permissions of every parent directory, e.g. chmod o+x /home/<user>)"
  done
}

slug() { echo "${DOMAIN//[^a-z0-9]/_}"; }

render_upstreams() {
  local i
  for i in "${!R_PATH[@]}"; do
    [[ ${R_KIND[i]} == proxy ]] || continue
    cat <<EOF
upstream up_$(slug)_$i {
    server ${R_TARGET[i]} max_fails=3 fail_timeout=10s;
    keepalive 32;
}

EOF
  done
}

render_locations() {
  local i loc
  for i in "${!R_PATH[@]}"; do
    loc=${R_PATH[i]}
    [[ $loc == / ]] || loc="$loc/"
    echo
    echo "    location $loc {"
    if [[ ${R_KIND[i]} == proxy ]]; then
      echo "        proxy_pass ${R_SCHEME[i]}up_$(slug)_$i${R_URI[i]};"
      echo '        include /etc/nginx/snippets/proxy.conf;'
      [[ ${R_SCHEME[i]} == https:// ]] && echo '        proxy_ssl_server_name on;'
    else
      if [[ $loc == / ]]; then
        echo "        root ${R_TARGET[i]};"
      else
        echo "        alias ${R_TARGET[i]}/;"
      fi
      echo '        index index.html;'
      echo '        expires $static_expires;'
      if ((SPA)); then
        echo "        try_files \$uri \$uri/ ${loc}index.html;"
      else
        echo '        try_files $uri $uri/ =404;'
      fi
    fi
    echo '    }'
  done
}

write_site_conf() { # <with tls: 0|1>
  local tls=$1 names=$DOMAIN hsts='max-age=63072000'
  ((WWW)) && names="$DOMAIN www.$DOMAIN"
  ((HSTS_PRELOAD)) && hsts='max-age=63072000; includeSubDomains; preload'
  {
    echo "$MARKER"
    echo "# Site: $DOMAIN"
    echo
    ((tls)) && render_upstreams
    echo 'server {'
    listen 80
    echo "    server_name $names;"
    echo
    echo '    location ^~ /.well-known/acme-challenge/ {'
    echo "        root $ACME_ROOT;"
    echo '        default_type text/plain;'
    echo '    }'
    echo '    location / {'
    echo "        return 301 https://\$host\$request_uri;"
    echo '    }'
    echo '}'
    ((tls)) || return 0

    if ((WWW)); then
      echo
      echo 'server {'
      listen '443 ssl'
      listen '443 quic'
      echo '    http2 on;'
      echo '    http3 on;'
      echo "    server_name www.$DOMAIN;"
      echo "    ssl_certificate $CERT_FILE;"
      echo "    ssl_certificate_key $KEY_FILE;"
      echo "    add_header Strict-Transport-Security \"$hsts\" always;"
      echo "    add_header Alt-Svc 'h3=\":443\"; ma=86400' always;"
      echo "    return 301 https://$DOMAIN\$request_uri;"
      echo '}'
    fi

    echo
    echo 'server {'
    listen '443 ssl'
    listen '443 quic'
    echo '    http2 on;'
    echo '    http3 on;'
    echo "    server_name $DOMAIN;"
    echo
    echo "    ssl_certificate $CERT_FILE;"
    echo "    ssl_certificate_key $KEY_FILE;"
    echo
    echo "    add_header Strict-Transport-Security \"$hsts\" always;"
    echo '    include /etc/nginx/snippets/security-headers.conf;'
    echo
    echo "    limit_req zone=req_per_ip burst=$BURST nodelay;"
    echo '    limit_conn conn_per_ip 100;'
    echo '    if ($request_method !~ ^(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$) {'
    echo '        return 405;'
    echo '    }'
    echo
    echo '    include /etc/nginx/snippets/block-exploits.conf;'
    render_locations
    echo '}'
  } >"/etc/nginx/conf.d/$DOMAIN.conf"
}

reload_nginx() {
  nginx -t -q || die "nginx config test failed, see: nginx -t"
  systemctl reload nginx
}

# ---------------------------------------------------------------------------
# DNS, firewall, SSL
# ---------------------------------------------------------------------------

public_ip() { # <4|6>
  curl -fsS"$1" --max-time 8 "https://api$([[ $1 == 6 ]] && echo 6).ipify.org" 2>/dev/null ||
    curl -fsS"$1" --max-time 8 https://ifconfig.me 2>/dev/null || true
}

lookup() { # <A|AAAA> <name>
  { dig +short +time=3 +tries=2 "$1" "$2" @1.1.1.1 || dig +short "$1" "$2"; } 2>/dev/null |
    grep -E '^([0-9.]+|[0-9a-fA-F]*:[0-9a-fA-F:.]*)$' || true
}

check_dns() {
  [[ $SSL_MODE == self-signed ]] && return 0
  log "Checking DNS"
  if ((SKIP_DNS_CHECK)); then
    warn "DNS check skipped"
    return 0
  fi
  local ip4 ip6 name a aaaa
  ip4=$(public_ip 4)
  ip6=$(public_ip 6)
  local names=("$DOMAIN")
  ((WWW)) && names+=("www.$DOMAIN")
  for name in "${names[@]}"; do
    a=$(lookup A "$name")
    aaaa=$(lookup AAAA "$name")
    [[ -n $a || -n $aaaa ]] ||
      die "$name has no A record. Create: A $name -> ${ip4:-<this server IP>} then re-run"
    if [[ -n $a ]] && ! grep -qxF "$ip4" <<<"$a"; then
      die "$name points to $(echo $a) but this server is ${ip4:-unknown}. Fix the A record (behind Cloudflare proxy? use --skip-dns-check)"
    fi
    if [[ -n $aaaa ]] && { [[ -z $ip6 ]] || ! grep -qixF "$ip6" <<<"$aaaa"; }; then
      die "$name has AAAA $(echo $aaaa) that is not this server (${ip6:-no public IPv6}). Let's Encrypt prefers IPv6: remove or fix the AAAA record"
    fi
    ok "$name -> $(echo $a $aaaa)"
  done
}

current_ssh_ports() {
  mkdir -p /run/sshd
  local ports
  ports=$(sshd -T 2>/dev/null | awk '$1 == "port" { print $2 }' | sort -u)
  echo "${ports:-22}"
}

safe_ssh_ports() {
  # sshd -T can differ from ssh.socket's live port. Include the connected port
  # and the snapshot taken before package upgrades / configuration changes.
  {
    printf '%s\n' $ORIGINAL_SSH_PORTS
    current_ssh_ports
    [[ -z $SSH_CONNECTION ]] || printf '%s\n' "${SSH_CONNECTION##* }"
    [[ -z $SSH_PORT ]] || printf '%s\n' "$SSH_PORT"
  } | awk '/^[0-9]+$/ && $1 > 0 && $1 < 65536' | sort -nu
}

firewall_open_web() {
  log "Opening HTTP / HTTPS / HTTP3 (UDP 443) in the firewall"
  local p
  if [[ $FAMILY == debian ]]; then
    ufw allow 80/tcp >/dev/null
    ufw allow 443/tcp >/dev/null
    ufw allow 443/udp >/dev/null
    for p in $(safe_ssh_ports); do ufw insert 1 allow "$p/tcp" >/dev/null; done
  else
    systemctl enable --now firewalld >/dev/null 2>&1
    firewall-cmd -q --permanent --add-service=http --add-service=https --add-port=443/udp
    for p in $(safe_ssh_ports); do firewall-cmd -q --permanent --add-port="$p/tcp"; done
    firewall-cmd -q --reload
  fi
  ok "80/tcp, 443/tcp, 443/udp open"
}

issue_cert() {
  log "SSL certificate ($SSL_MODE)"
  if [[ $SSL_MODE == self-signed ]]; then
    CERT_FILE=/etc/nginx/ssl/$DOMAIN/fullchain.pem
    KEY_FILE=/etc/nginx/ssl/$DOMAIN/privkey.pem
    mkdir -p "/etc/nginx/ssl/$DOMAIN"
    local san="DNS:$DOMAIN"
    ((WWW)) && san+=",DNS:www.$DOMAIN"
    openssl req -x509 -nodes -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -days 825 \
      -subj "/CN=$DOMAIN" -addext "subjectAltName=$san" \
      -keyout "$KEY_FILE" -out "$CERT_FILE" 2>/dev/null
    chmod 600 "$KEY_FILE"
    ok "Self-signed certificate for $san"
    return 0
  fi

  CERT_FILE=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
  KEY_FILE=/etc/letsencrypt/live/$DOMAIN/privkey.pem
  # NOTE - Serve the ACME challenge over plain HTTP first (no cert yet to reference)
  write_site_conf 0
  reload_nginx

  local args=(certonly --webroot -w "$ACME_ROOT" --cert-name "$DOMAIN" -d "$DOMAIN"
    --non-interactive --agree-tos --key-type ecdsa --keep-until-expiring --expand)
  ((WWW)) && args+=(-d "www.$DOMAIN")
  if [[ -n $EMAIL ]]; then
    args+=(--email "$EMAIL" --no-eff-email)
  else
    args+=(--register-unsafely-without-email)
  fi
  if [[ $SSL_MODE == staging ]]; then
    args+=(--staging)
  elif [[ -s $CERT_FILE ]] && openssl x509 -in "$CERT_FILE" -noout -issuer | grep -i staging >/dev/null; then
    args+=(--force-renewal)
  fi
  certbot "${args[@]}"

  mkdir -p /etc/letsencrypt/renewal-hooks/deploy
  printf '#!/bin/sh\nsystemctl reload nginx\n' >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
  chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

  local timer
  for timer in certbot.timer certbot-renew.timer snap.certbot.renew.timer; do
    if unit_exists "$timer"; then
      systemctl enable --now "$timer" >/dev/null 2>&1
      break
    fi
    timer=''
  done
  if [[ -z $timer ]]; then
    cat >/etc/systemd/system/vps-certbot-renew.service <<'EOF'
[Unit]
Description=Renew Let's Encrypt certificates

[Service]
Type=oneshot
ExecStart=/usr/bin/env certbot renew --quiet
EOF
    cat >/etc/systemd/system/vps-certbot-renew.timer <<'EOF'
[Unit]
Description=Renew Let's Encrypt certificates twice a day

[Timer]
OnCalendar=*-*-* 03,15:00:00
RandomizedDelaySec=1h
Persistent=true

[Install]
WantedBy=timers.target
EOF
    systemctl daemon-reload
    systemctl enable --now vps-certbot-renew.timer >/dev/null 2>&1
    timer=vps-certbot-renew.timer
  fi
  ok "Certificate at /etc/letsencrypt/live/$DOMAIN, auto renewal: $timer"
}

configure_site() {
  log "Writing the site config /etc/nginx/conf.d/$DOMAIN.conf"
  write_site_conf 1
  reload_nginx
  local i
  for i in "${!R_PATH[@]}"; do
    ok "${R_PATH[i]} -> ${R_SCHEME[i]}${R_TARGET[i]}${R_URI[i]}"
  done
}

# ---------------------------------------------------------------------------
# Hardening
# ---------------------------------------------------------------------------

setup_fail2ban() {
  log "Configuring fail2ban"
  local port client_ip=''
  port=$(safe_ssh_ports | paste -sd, -)
  [[ -z $SSH_CONNECTION ]] || client_ip=${SSH_CONNECTION%% *}
  [[ $client_ip =~ ^[0-9a-fA-F:.]+$ ]] || client_ip=''
  cat >/etc/fail2ban/filter.d/nginx-probe.conf <<'EOF'
# Managed by vps-setup (scripts/vps-setup/setup.sh) - re-running it overwrites this file
# Every line of probe.log is a request to a blocked path (see snippets/block-exploits.conf)
[Definition]
failregex = ^<HOST> -
ignoreregex =
EOF
  # NOTE - "zz-" so it loads after the distro defaults in jail.d and wins
  cat >/etc/fail2ban/jail.d/zz-vps.conf <<EOF
$MARKER
[DEFAULT]
bantime = 1h
bantime.increment = true
bantime.maxtime = 4w
findtime = 10m
maxretry = 5
ignoreip = 127.0.0.1/8 ::1${client_ip:+ $client_ip}

[sshd]
enabled = true
port = $port
backend = systemd
mode = aggressive

# Bans on all ports and protocols, so HTTP/3 (UDP 443) is covered too
[nginx-limit-req]
enabled = true
logpath = /var/log/nginx/error.log
banaction = %(banaction_allports)s
findtime = 1m
maxretry = 20

[nginx-probe]
enabled = true
filter = nginx-probe
logpath = /var/log/nginx/probe.log
banaction = %(banaction_allports)s
findtime = 1h
maxretry = 3
bantime = 1d
EOF
  systemctl enable fail2ban >/dev/null 2>&1
  systemctl restart fail2ban
  local i
  for i in {1..15}; do
    fail2ban-client ping >/dev/null 2>&1 && break
    sleep 1
  done
  fail2ban-client ping >/dev/null 2>&1 || die "fail2ban did not start: journalctl -u fail2ban"
  if [[ -n $client_ip ]]; then
    local jail
    for jail in sshd nginx-probe nginx-limit-req; do
      fail2ban-client set "$jail" unbanip "$client_ip" >/dev/null || true
    done
  fi
  ok "Jails: $(fail2ban-client status | sed -n 's/.*Jail list:\s*//p')"
}

setup_sysctl() {
  log "Kernel network hardening"
  local file=/etc/sysctl.d/90-vps-hardening.conf
  cat >$file <<EOF
$MARKER
# Spoofing / redirects / source routing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
# SYN flood
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_rfc1337 = 1
net.ipv4.tcp_max_syn_backlog = 8192
net.core.somaxconn = 4096
# Kernel info leaks
kernel.kptr_restrict = 2
kernel.dmesg_restrict = 1
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
# QUIC (HTTP/3) needs larger UDP buffers
net.core.rmem_max = 7500000
net.core.wmem_max = 7500000
EOF
  if modprobe tcp_bbr 2>/dev/null && grep -qw bbr /proc/sys/net/ipv4/tcp_available_congestion_control; then
    echo tcp_bbr >/etc/modules-load.d/bbr.conf
    printf '# Faster TCP on lossy / long links\nnet.core.default_qdisc = fq\nnet.ipv4.tcp_congestion_control = bbr\n' >>$file
  fi
  sysctl -e -q -p $file >/dev/null 2>&1 || warn "Some sysctl keys could not be applied (container / restricted kernel)"
  ok "$file applied"
}

setup_auto_updates() {
  log "Automatic security updates"
  if [[ $FAMILY == debian ]]; then
    cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
    # NOTE - Lists append across files: also take nginx.org updates
    printf 'Unattended-Upgrade::Origins-Pattern {\n  "origin=nginx";\n};\n' \
      >/etc/apt/apt.conf.d/52unattended-upgrades-nginx
    ok "unattended-upgrades: security + nginx.org, daily"
  else
    local conf=/etc/dnf/automatic.conf timer
    if [[ -d /etc/dnf/dnf5-plugins ]] || has dnf5; then
      mkdir -p /etc/dnf/dnf5-plugins
      conf=/etc/dnf/dnf5-plugins/automatic.conf
      printf '[commands]\nupgrade_type = security\napply_updates = yes\n' >$conf
    elif [[ -f /etc/dnf/automatic.conf ]]; then
      conf=/etc/dnf/automatic.conf
      sed -i -E 's/^\s*upgrade_type\s*=.*/upgrade_type = security/; s/^\s*apply_updates\s*=.*/apply_updates = yes/' $conf
    fi
    for timer in dnf-automatic.timer dnf5-automatic.timer; do
      if unit_exists "$timer"; then
        systemctl enable --now "$timer" >/dev/null 2>&1
        ok "$timer: security updates applied daily ($conf)"
        return 0
      fi
    done
    warn "No dnf-automatic timer found, security updates are not automatic"
  fi
}

restart_ssh() {
  if systemctl is-active -q ssh.socket 2>/dev/null; then
    systemctl daemon-reload && systemctl restart ssh.socket && systemctl restart ssh.service
  else
    systemctl restart ssh 2>/dev/null || systemctl restart sshd
  fi
}

harden_ssh() {
  log "Hardening SSH"
  local conf=/etc/ssh/sshd_config.d/00-vps-hardening.conf backup ports p
  ports=$(safe_ssh_ports)
  backup=$(mktemp -d)
  cp -a /etc/ssh/sshd_config "$backup/sshd_config"
  [[ ! -f $conf ]] || cp -a "$conf" "$backup/hardening.conf"

  mkdir -p /etc/ssh/sshd_config.d /run/sshd
  # NOTE - sshd keeps the FIRST value it reads, so the drop-ins must be included
  # at the top and ours is named "00-" to beat e.g. 50-cloud-init.conf
  grep -qE '^\s*Include\s+/etc/ssh/sshd_config\.d/\*\.conf' /etc/ssh/sshd_config ||
    sed -i '1i Include /etc/ssh/sshd_config.d/*.conf' /etc/ssh/sshd_config
  {
    echo "$MARKER"
    for p in $ports; do echo "Port $p"; done
    # An authorized_keys file does not prove the administrator has its private
    # key. Keep the system's root/password authentication policy unchanged.
    if [[ -f $backup/hardening.conf ]]; then
      awk 'tolower($1) ~ /^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication)$/ { print }' "$backup/hardening.conf"
    fi
    cat <<'EOF'
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 6
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding local
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
  } >$conf

  if [[ -n $SSH_PORT ]] && selinux_on; then
    semanage port -a -t ssh_port_t -p tcp "$SSH_PORT" 2>/dev/null ||
      semanage port -m -t ssh_port_t -p tcp "$SSH_PORT"
  fi

  if ! sshd -t; then
    cp -a "$backup/sshd_config" /etc/ssh/sshd_config
    if [[ -f $backup/hardening.conf ]]; then cp -a "$backup/hardening.conf" "$conf"; else rm -f "$conf"; fi
    rm -rf "$backup"
    die "sshd rejected the hardened config; the previous configuration was restored"
  fi
  # NOTE - Ubuntu 22.10+ starts sshd from ssh.socket, the port lives in the socket
  if ! restart_ssh; then
    cp -a "$backup/sshd_config" /etc/ssh/sshd_config
    if [[ -f $backup/hardening.conf ]]; then cp -a "$backup/hardening.conf" "$conf"; else rm -f "$conf"; fi
    restart_ssh || warn "SSH recovery failed: use the provider console to inspect the SSH service"
    rm -rf "$backup"
    die "SSH restart failed; the previous configuration was restored"
  fi

  rm -rf "$backup"
  ok "System root/password login policy preserved; SSH ports: $(echo $ports)"
}

firewall_lockdown() {
  log "Firewall: deny everything else"
  local p
  if [[ $FAMILY == debian ]]; then
    ufw default deny incoming >/dev/null
    ufw default allow outgoing >/dev/null
    for p in $(safe_ssh_ports); do ufw insert 1 allow "$p/tcp" >/dev/null; done
    ufw --force enable >/dev/null
    ok "ufw active: $(ufw status | awk 'NR > 4 && !/\(v6\)/ { print $1 }' | paste -sd' ' -)"
  else
    for p in $(safe_ssh_ports); do firewall-cmd -q --permanent --add-port="$p/tcp"; done
    # Rocky / Alma expose the Cockpit admin panel (9090) by default
    firewall-cmd -q --permanent --remove-service=cockpit 2>/dev/null || true
    firewall-cmd -q --reload
    ok "firewalld: $(firewall-cmd --list-services) $(firewall-cmd --list-ports)"
  fi
}

# ---------------------------------------------------------------------------
# App deployment from the existing repository
# ---------------------------------------------------------------------------

node_major() { node -v 2>/dev/null | sed -n 's/^v\([0-9]\{1,\}\).*/\1/p'; }

install_node() {
  if has node && node -e 'const [m,n]=process.versions.node.split(".").map(Number); process.exit((m===20 && n>=19)||(m===22 && n>=12)||m>22 ? 0 : 1)' 2>/dev/null; then
    ok "Node $(node -v) already installed"
  else
    log "Installing Node.js 22 (NodeSource)"
    local setup=/tmp/nodesource_setup.sh url=https://deb.nodesource.com/setup_22.x
    [[ $FAMILY == debian ]] || url=https://rpm.nodesource.com/setup_22.x
    curl -fsSL "$url" -o "$setup" || return 1
    bash "$setup" >/dev/null 2>&1 || bash "$setup" || return 1
    rm -f "$setup"
    if [[ $FAMILY == debian ]]; then apt_get install nodejs; else pkg_install nodejs; fi
  fi
  has node || return 1
  has yarn || npm i -g yarn@1.22.22 >/dev/null 2>&1 || true
  has pm2 || npm i -g pm2 >/dev/null 2>&1 || true
  ok "Node $(node -v), npm $(npm -v), yarn $(yarn -v 2>/dev/null), pm2 $(pm2 -v 2>/dev/null | tail -1)"
  has yarn && has pm2
} # install_node

install_app_packages() {
  log "Installing app build dependencies"
  if [[ $FAMILY == debian ]]; then
    apt_get install git build-essential python3 >/dev/null || return 1
    # NOTE - Chromium / lightpanda runtime libraries: names differ per release,
    # so this is best effort (BROWSER_ENGINE=lightpanda needs none of them)
    apt_get install libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libgbm1 libgtk-3-0 libasound2 libxcomposite1 libxdamage1 libxrandr2 >/dev/null 2>&1 ||
      warn "Some browser libraries were not available, install them by hand if the crawl needs Chromium"
  else
    pkg_install git gcc-c++ make python3 >/dev/null || return 1
    pkg_install nss atk at-spi2-atk cups-libs libdrm mesa-libgbm gtk3 alsa-lib >/dev/null 2>&1 ||
      warn "Some browser libraries were not available, install them by hand if the crawl needs Chromium"
  fi
  ok "git, compiler toolchain and browser libraries ready"
} # install_app_packages

create_app_user() {
  if id "$APP_USER" >/dev/null 2>&1; then
    ok "App user $APP_USER already exists"
  else
    useradd --create-home --shell /bin/bash "$APP_USER" || return 1
    ok "Created app user $APP_USER (no sudo)"
  fi
  if id -nG "$APP_USER" 2>/dev/null | grep -qwE 'sudo|wheel'; then
    warn "$APP_USER can sudo: use a separate --app-user for the app process"
  fi
  local mem
  mem=$(awk '/MemTotal/ { print int($2 / 1024 / 1024) }' /proc/meminfo 2>/dev/null)
  mem=${mem:-0}
  ((mem >= 4)) || warn "Only ${mem}GB RAM: this project wants 4GB+ (or add swap / zram)"
  return 0
} # create_app_user

prepare_existing_app() {
  if [[ ! -f $APP_DIR/package.json || ! -f $APP_DIR/server/server-build.js || ! -d $APP_DIR/config/scripts ]]; then
    warn "No project found at $APP_DIR: clone/copy the repository first, then run its setup.sh"
    return 1
  fi
  chown -R "$APP_USER":"$(id -gn "$APP_USER")" "$APP_DIR" || return 1
  if ! runuser -u "$APP_USER" -- test -r "$APP_DIR/package.json"; then
    warn "$APP_USER cannot access $APP_DIR. Place the repository under /srv or /var/www instead of a private home such as /root"
    return 1
  fi
  ok "Using the existing repository at $APP_DIR (source is not updated)"
} # prepare_existing_app

build_app() {
  log "Installing packages and building the app (a few minutes)"
  local group
  group=$(id -gn "$APP_USER")
  # NOTE - --production=false: the build needs the devDependencies (vite, tsc)
  runuser -u "$APP_USER" -- bash -lc \
    "cd $(shq "$APP_DIR") && yarn install --production=false --non-interactive" || return 1
  runuser -u "$APP_USER" -- bash -lc \
    "cd $(shq "$APP_DIR") && yarn build && yarn server-build" || return 1
  chown -R "$APP_USER":"$group" "$APP_DIR" || return 1
  ok "App built"
} # build_app

write_app_service() {
  local npm_bin
  npm_bin=$(command -v npm)
  cat >/etc/systemd/system/$APP_SERVICE.service <<EOF
$MARKER
[Unit]
Description=$DOMAIN app (dynamic rendering / SEO)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$(id -gn "$APP_USER")
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=$npm_bin run start:redis-api:pm2:worker
Restart=always
RestartSec=5
# NOTE - pm2 forks its own workers, keep them in the unit's cgroup
KillMode=mixed
TimeoutStopSec=25

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload || return 1
  systemctl enable "$APP_SERVICE" >/dev/null 2>&1 || return 1
  systemctl restart "$APP_SERVICE" || return 1
  ok "$APP_SERVICE enabled (user $APP_USER, $APP_DIR)"
} # write_app_service

wait_app() {
  local i code='' last=''
  for i in {1..60}; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:8080/ || true)
    # NOTE - 2xx/3xx: the first request can also be a 503 maintenance page while
    # the cache warms, so that is not a failure by itself
    [[ $code =~ ^[23] ]] && { ok "App answers on http://127.0.0.1:8080 (HTTP $code)"; return 0; }
    last=$code
    sleep 3
  done
  warn "The app is not answering on 127.0.0.1:8080 (last: ${last:-no connection}). Check: journalctl -u $APP_SERVICE -n 50"
  warn "The first start builds and installs the browser: give it another minute, then: systemctl status $APP_SERVICE"
  return 1
} # wait_app

setup_app() {
  install_node || return 1
  install_app_packages || return 1
  create_app_user || return 1
  prepare_existing_app || return 1
  build_app || return 1
  # Install privileged OS dependencies before the service runs without sudo.
  # Browser binaries live inside APP_DIR; return ownership to the app user.
  (cd "$APP_DIR" && node --input-type=module -e \
    'import preflight from "./config/utils/Preflight.mjs"; await preflight({redis: true})') || return 1
  chown -R "$APP_USER":"$(id -gn "$APP_USER")" "$APP_DIR" || return 1
  write_app_service || return 1
  wait_app
} # setup_app

# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

verify() {
  log "Verifying"
  local insecure=() res i url code
  [[ $SSL_MODE == letsencrypt ]] || insecure=(-k)
  res=$(curl -s "${insecure[@]}" -o /dev/null -w '%{http_code} HTTP/%{http_version}' \
    --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" || true)
  if [[ $res =~ ^[23][0-9][0-9][[:space:]] ]]; then
    ok "https://$DOMAIN/ (local) -> $res"
  else
    warn "HTTPS did not return a successful response: $res (check routes and upstream app)"
  fi
  curl -sI "${insecure[@]}" --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" | grep -i '^alt-svc: h3' >/dev/null &&
    ok "Alt-Svc advertises HTTP/3"
  if ss -Hulnp 'sport = :443' 2>/dev/null | grep nginx >/dev/null; then
    ok "nginx listens on UDP 443 (QUIC)"
  else
    warn "nginx is not listening on UDP 443"
  fi
  if curl --version | grep -w HTTP3 >/dev/null; then
    res=$(curl -s "${insecure[@]}" --http3-only -o /dev/null -w '%{http_code} HTTP/%{http_version}' \
      --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" || true)
    if [[ $res =~ ^[23][0-9][0-9][[:space:]]HTTP/3 ]]; then
      ok "HTTP/3 request -> $res"
    else
      warn "HTTP/3 request failed: $res"
    fi
  else
    warn "curl has no HTTP/3 support: QUIC listener checked, end-to-end HTTP/3 still needs an external check"
  fi

  for i in "${!R_PATH[@]}"; do
    [[ ${R_KIND[i]} == proxy ]] || continue
    url="${R_SCHEME[i]}${R_TARGET[i]}/"
    code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 5 "$url" || true)
    [[ $code == 000 ]] &&
      warn "Nothing answers at $url yet (route ${R_PATH[i]}): start your app, nginx returns 502 until then"
  done
  if [[ -n $APP_SOURCE ]]; then
    if systemctl is-active -q "$APP_SERVICE"; then
      ok "$APP_SERVICE is active"
    else
      warn "$APP_SERVICE is not active: journalctl -u $APP_SERVICE -n 50"
    fi
  fi
  [[ -f /var/run/reboot-required ]] && warn "The upgrade needs a reboot: sudo reboot"
  return 0
}

summary() {
  local ssh_port=${SSH_PORT:-$(current_ssh_ports | head -1)} ssh_host='<VPS_IP>'
  [[ -z $SSH_CONNECTION ]] || ssh_host=$(echo "$SSH_CONNECTION" | awk '{print $3}')
  printf '\n\033[1;32m✔ Done.\033[0m  https://%s\n\n' "$DOMAIN"
  echo "  Site config     /etc/nginx/conf.d/$DOMAIN.conf"
  echo "  Edit headers    /etc/nginx/snippets/security-headers.conf (CSP is there, commented)"
  echo "  Logs            /var/log/nginx/{access,error,probe}.log, setup log $LOG_FILE"
  echo "  Banned IPs      sudo fail2ban-client status nginx-probe | sshd | nginx-limit-req"
  if [[ -n $APP_SOURCE ]]; then
    echo "  App             $APP_DIR (user $APP_USER), systemd unit $APP_SERVICE"
    echo "  App logs        journalctl -u $APP_SERVICE -f   |   pm2: sudo -u $APP_USER pm2 ls"
    echo "  Rebuild         sudo -u $APP_USER bash -lc 'cd $APP_DIR && yarn install --production=false && yarn build && yarn server-build' && sudo systemctl restart $APP_SERVICE"
  fi
  echo "  HTTP/3 check    https://http3check.net/?host=$DOMAIN"
  echo "  TLS grade       https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
  echo
  echo "  Cloud firewall (AWS SG, GCP, Oracle, ...): allow TCP 80, TCP 443, UDP 443, TCP $ssh_port"
  if [[ -n $SSH_PORT ]]; then
    printf '\n\033[1;33m  SSH port %s requested; existing ports are retained. KEEP THIS SESSION OPEN and test:\033[0m\n' "$SSH_PORT"
    echo "    ssh -p $SSH_PORT ${NEW_USER:-${SUDO_USER:-root}}@$ssh_host"
    echo "    Use the VPS IP, including when the site is behind Cloudflare. Close old ports only after testing."
  fi
  if ((${#WARNINGS[@]})); then
    printf '\n\033[1;33m  Warnings:\033[0m\n'
    printf '   - %s\n' "${WARNINGS[@]}"
  fi
  echo
}

main() {
  split_args "$@"
  parse_args ${FORWARD_ARGS[@]+"${FORWARD_ARGS[@]}"}
  detect_platform
  if ((DRY_RUN)); then
    if [[ -z $REMOTE_HOST || -n $APP_DIR ]] || ((SKIP_APP)); then
      resolve_app_directory
    fi
    validate_args
    log "Preview only: no SSH connection, package installation or system changes"
    echo "    Client platform: $PLATFORM; target: ${REMOTE_HOST:-this machine}"
    echo "    Domain: $DOMAIN; SSL: $SSL_MODE; www: $WWW"
    if ((SKIP_APP)); then echo '    App: skipped'; else echo "    App directory: ${APP_DIR:-<existing directory on VPS: pass --app-dir>}"; fi
    echo "    Required inbound: TCP 80/443, UDP 443, SSH ${SSH_PORT:-${REMOTE_PORT:-22}}"
    render_upstreams
    render_locations
    return 0
  fi
  [[ -z $REMOTE_HOST ]] || run_remote
  case $PLATFORM in
    linux) ;;
    macos | windows | wsl)
      die "This is $PLATFORM, not the VPS. Run it from here against the VPS: bash $0 --host root@<VPS_IP> ${*:---domain <your-domain.com>}" ;;
    *) die "Unsupported platform: $PLATFORM (the VPS must run Linux)" ;;
  esac
  [[ $EUID -eq 0 ]] || die "Run as root: sudo bash $0 $*"
  [[ -d /run/systemd/system ]] || die "systemd is not running here (a container?): this script needs a real VPS / VM"
  prompt_missing
  resolve_app_directory
  validate_args
  confirm_plan
  # NOTE - Re-running without --ssh-port keeps the port moved by a previous run
  [[ -n $SSH_PORT ]] || SSH_PORT=$(awk '$1 == "Port" { print $2; exit }' /etc/ssh/sshd_config.d/00-vps-hardening.conf 2>/dev/null || true)
  touch "$LOG_FILE" && chmod 600 "$LOG_FILE"
  exec > >(tee -a "$LOG_FILE") 2>&1
  echo "===== vps-setup $(date -Is) $*"

  log "Detecting the OS"
  detect_os
  ORIGINAL_SSH_PORTS=$(current_ssh_ports)
  install_base
  setup_users
  install_nginx
  write_nginx_base
  prepare_routes
  check_dns
  firewall_open_web
  issue_cert
  configure_site
  # NOTE - Subshell: an app failure must not stop the security steps below
  if [[ -n $APP_SOURCE ]]; then
    log "Deploying the app"
    (set -Eeuo pipefail; setup_app) ||
      warn "App deployment failed (the server, nginx and SSL are already set up): fix the error above and re-run"
  fi
  setup_fail2ban
  setup_sysctl
  setup_auto_updates
  # NOTE - Last: everything above can fail without touching remote access
  harden_ssh
  firewall_lockdown
  verify
  summary
}

main "$@"
