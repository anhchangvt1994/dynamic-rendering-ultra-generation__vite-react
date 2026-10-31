#!/usr/bin/env bash
# NOTE - Accounts on the VPS (ENABLE_SUPABASE=true in server/.env.production),
# in one command, safe to re-run any time:
#
#   sudo bash scripts/vps-setup/supabase.sh [--email you@example.com]
#
# Each step is skipped when already done:
#   1. Docker + Compose v2 installed and running, the app user allowed to use them
#   2. HTTPS site of SUPABASE_PUBLIC_URL (nginx + Let's Encrypt, through
#      setup.sh --site-only) once its DNS A record points here
#   3. the site rebuilt with accounts, the app restarted: its yarn start runs
#      the stack (infra/supabase, see config/utils/Supabase.mjs)
#   4. a report of what only you can do: DNS records, reverse DNS (PTR)
#
# --docker-only: step 1 only (yarn dev / yarn start call it when Docker is missing)
set -Eeuo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
APP_SERVICE=vps-app
APP_USER=''
EMAIL=''
DOCKER_ONLY=0
ARGS=("$@")

log() { printf '\n\033[1;34m==>\033[0m \033[1m%s\033[0m\n' "$*"; }
ok() { printf '    \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '    \033[33m!\033[0m %s\n' "$*"; }
die() {
  printf '\n\033[1;31mError:\033[0m %s\n' "$*" >&2
  exit 1
}
has() { command -v "$1" >/dev/null 2>&1; }

while (($#)); do
  case $1 in
    --docker-only) DOCKER_ONLY=1 ;;
    --app-user) APP_USER=${2:?--app-user needs a value}; shift ;;
    --email) EMAIL=${2:?--email needs a value}; shift ;;
    -h | --help) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown option: $1 (--help lists them)" ;;
  esac
  shift
done

[[ $(uname -s) == Linux ]] || die "This runs on the VPS (Linux). On a Mac, yarn dev sets Docker up by itself"
[[ $EUID -eq 0 ]] || exec sudo bash "$0" ${ARGS[@]+"${ARGS[@]}"}

# the user running the app: the service's, else the owner of the project
if [[ -z $APP_USER ]]; then
  APP_USER=$(systemctl show -p User --value "$APP_SERVICE" 2>/dev/null || true)
  [[ -n $APP_USER ]] || APP_USER=$(stat -c %U "$APP_DIR")
fi
id "$APP_USER" >/dev/null 2>&1 || die "No such user: $APP_USER (--app-user)"
as_app() { runuser -u "$APP_USER" -- bash -lc "cd $(printf '%q' "$APP_DIR") && $*"; }

# a value of server/.env(.production), resolved as the app resolves it
env_value() {
  if has node; then
    (cd "$APP_DIR" && node --input-type=module -e \
      "import { loadEnv } from './config/utils/ServerEnv.mjs'; console.log(loadEnv('production')[process.argv[1]] ?? '')" "$1")
  else
    grep -hE "^$1=" "$APP_DIR/server/.env" "$APP_DIR/server/.env.production" 2>/dev/null |
      tail -1 | cut -d= -f2- | tr -d '"'
  fi
}

# ---------------------------------------------------------------------------
# 1. Docker
# ---------------------------------------------------------------------------

install_docker() {
  log "Docker"
  if has docker && docker compose version >/dev/null 2>&1; then
    ok "Docker $(docker --version | sed 's/Docker version //; s/,.*//') + Compose $(docker compose version --short)"
  elif has apt-get; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -q
    apt-get install -y -q docker.io docker-compose-v2 acl
    ok "Installed Docker + Compose (Ubuntu / Debian packages)"
  elif has dnf; then
    dnf install -y moby-engine docker-compose acl ||
      die "Install Docker + Compose v2 for this distribution (https://docs.docker.com/engine/install/), then re-run"
    ok "Installed Docker + Compose"
  else
    die "Unsupported distribution: install Docker + Compose v2, then re-run"
  fi

  systemctl enable --now docker >/dev/null 2>&1 || die "Docker does not start: journalctl -u docker -n 50"
  docker info >/dev/null 2>&1 || die "Docker does not answer: journalctl -u docker -n 50"
  ok "Docker is running"

  if [[ $APP_USER != root ]]; then
    if id -nG "$APP_USER" | tr ' ' '\n' | grep -qx docker; then
      ok "$APP_USER is in the docker group"
    else
      usermod -aG docker "$APP_USER"
      ok "Added $APP_USER to the docker group"
    fi
    # NOTE - Group membership applies to new logins only: the socket ACL lets
    # the running session use Docker now (reset when Docker restarts, by
    # then the group applies)
    has setfacl && setfacl -m "u:$APP_USER:rw" /var/run/docker.sock && ok "$APP_USER can use Docker now"
  fi
}

# ---------------------------------------------------------------------------
# 2. HTTPS site of the public URL
# ---------------------------------------------------------------------------

public_ip() {
  curl -4fsS --max-time 5 https://api.ipify.org 2>/dev/null ||
    ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p'
}

setup_site() {
  local url host ip records auth_port rest_port
  url=$(env_value SUPABASE_PUBLIC_URL)
  host=${url#https://}
  host=${host#http://}
  host=${host%%/*}
  [[ -n $host ]] || die "SUPABASE_PUBLIC_URL is missing in server/.env.production"
  auth_port=$(env_value SUPABASE_AUTH_PORT)
  rest_port=$(env_value SUPABASE_REST_PORT)
  log "HTTPS site https://$host"

  if [[ -f /etc/nginx/conf.d/$host.conf ]]; then
    ok "/etc/nginx/conf.d/$host.conf is in place"
    return 0
  fi
  ip=$(public_ip)
  records=$(getent ahostsv4 "$host" | awk '{print $1}' | sort -u | paste -sd ' ' -)
  if [[ -z $records ]]; then
    warn "$host has no DNS record yet. Create it at your DNS provider, then re-run this script:"
    warn "    A    $host    ->    ${ip:-<IP of this server>}"
    return 0
  fi
  if [[ -n $ip && " $records " != *" $ip "* ]]; then
    warn "$host points to $records but this server is $ip: fix the A record, then re-run"
    return 0
  fi
  bash "$APP_DIR/scripts/vps-setup/setup.sh" --site-only --domain "$host" \
    ${EMAIL:+--email "$EMAIL"} \
    --route "/auth/v1=http://127.0.0.1:${auth_port:-54331}/" \
    --route "/rest/v1=http://127.0.0.1:${rest_port:-54332}/"
}

# ---------------------------------------------------------------------------
# 3. Site with accounts, app restarted
# ---------------------------------------------------------------------------

restart_app() {
  log "Site with accounts"
  local auth_port
  auth_port=$(env_value SUPABASE_AUTH_PORT)
  if grep -qs 'dang-nhap' "$APP_DIR"/dist/*.js; then
    ok "The built site already has accounts"
  else
    log "Building the site with accounts (a few minutes)"
    as_app 'yarn install --production=false --non-interactive && yarn build && yarn server-build'
    ok "Built"
  fi

  if systemctl cat "$APP_SERVICE" >/dev/null 2>&1; then
    log "Restarting $APP_SERVICE (its start brings the accounts stack up; the first time downloads ~1 GB)"
    systemctl restart "$APP_SERVICE"
    local i
    for ((i = 0; i < 120; i++)); do
      curl -fsS --max-time 3 "http://127.0.0.1:${auth_port:-54331}/health" >/dev/null 2>&1 && break
      systemctl is-active -q "$APP_SERVICE" || break
      sleep 5
    done
    if curl -fsS --max-time 3 "http://127.0.0.1:${auth_port:-54331}/health" >/dev/null 2>&1; then
      ok "Accounts are running"
    else
      warn "Accounts did not come up: journalctl -u $APP_SERVICE -n 80"
      return 0
    fi
  else
    warn "No $APP_SERVICE service: start the app as $APP_USER with yarn start (it brings the accounts stack up)"
    return 0
  fi
}

# ---------------------------------------------------------------------------

main() {
  if ((DOCKER_ONLY)); then
    install_docker
    return 0
  fi

  [[ $(env_value ENABLE_SUPABASE) =~ ^(true|1|TRUE|True)$ ]] ||
    die "ENABLE_SUPABASE is not true: set ENABLE_SUPABASE=true in server/.env.production (deploy it), then re-run"

  install_docker
  setup_site
  restart_app

  log "What only you can do (DNS provider, VPS provider)"
  as_app 'yarn -s supabase:check' || true
  printf '\n\033[1;32m✔ Done.\033[0m Re-run this script after changing DNS: it checks again and finishes what is left.\n\n'
}

main
