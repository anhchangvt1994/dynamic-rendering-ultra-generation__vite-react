#!/usr/bin/env bash
# Read-only CPU/RAM/queue diagnostics; optional timing of a real public API.
set -uo pipefail

usage() {
  echo 'Usage: bash scripts/vps-setup/diagnose.sh [https://REAL_PUBLIC_API/path] [iterations:1-10]'
  echo 'Run on the Linux VPS. No packages or system settings are changed.'
}
if [[ ${1:-} == --help || ${1:-} == -h ]]; then usage; exit 0; fi
[[ $(uname -s) == Linux ]] || { echo 'Run this diagnostic on the Linux VPS.' >&2; exit 2; }
api_url=${1:-}
iterations=${2:-3}
[[ $iterations =~ ^([1-9]|10)$ ]] || { usage >&2; exit 2; }
if [[ -n $api_url ]]; then
  node -e '
    try {
      const u = new URL(process.argv[1]);
      if (u.protocol !== "https:" || u.username || u.password || /(^|\.)example\.(com|org|net)$/.test(u.hostname)) process.exit(2);
    } catch { process.exit(2); }
  ' "$api_url" || { echo 'Provide a real HTTPS API URL without embedded credentials; example.com is a placeholder.' >&2; exit 2; }
fi

printf '\nCPU / MEMORY\n'
nproc
free -h
vmstat 1 5
for resource in cpu memory io; do
  printf '\nPSI %s\n' "$resource"
  cat "/proc/pressure/$resource" 2>/dev/null || true
done
printf '\nPROCESS RSS KiB / THREADS (no arguments or environment)\n'
ps -eo pid,comm,pcpu,rss,nlwp --sort=-rss | head -n 16
printf '\nTCP / ACTUAL QDISC\n'
sysctl net.ipv4.tcp_congestion_control net.core.default_qdisc net.ipv4.tcp_rmem net.ipv4.tcp_wmem 2>/dev/null || true
interface=$(ip -4 route show default | awk '/default/ { for (i=1; i<=NF; i++) if ($i == "dev") { print $(i+1); exit } }')
if [[ -n $interface ]]; then
  tc -s qdisc show dev "$interface"
  echo 'default_qdisc applies to newly created queues; inspect the interface output above for the active queue.'
fi
printf '\nAPP RESOURCE POLICY\n'
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
(cd "$repo" && node -r sucrase/register -e '
  const { getResourceBudget } = require("./server/src/utils/ResourceBudget.ts");
  const { PROCESS_ENV } = require("./server/src/utils/InitEnv.ts");
  console.log(JSON.stringify(getResourceBudget(PROCESS_ENV), null, 2));
') || true

if [[ -n $api_url ]]; then
  printf '\nfamily,attempt,dns_s,tcp_s,tls_s,ttfb_s,total_s,http,curl_exit\n'
  for family in 4 6; do
    for ((attempt=1; attempt<=iterations; attempt++)); do
      timing=$(curl "-$family" -sS -o /dev/null --connect-timeout 3 --max-time 15 \
        -w '%{time_namelookup},%{time_connect},%{time_appconnect},%{time_starttransfer},%{time_total},%{http_code}' \
        "$api_url")
      status=$?
      printf '%s,%s,%s,%s\n' "$family" "$attempt" "$timing" "$status"
    done
  done
fi
