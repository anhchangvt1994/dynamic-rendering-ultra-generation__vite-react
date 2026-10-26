#!/usr/bin/env bash
# Local, non-destructive regression checks. No root, network or VPS required.
set -euo pipefail
cd "$(dirname "$0")"
bash -n setup.sh
output=$(bash setup.sh --dry-run --domain ANHCHANGVT1994.COM \
  --route /=8080 --route /api=http://127.0.0.1:3000/ \
  --route /assets=/var/www/assets)
for expected in 'Domain: anhchangvt1994.com' 'server 127.0.0.1:8080' \
  'location /api/' 'alias /var/www/assets/'; do
  [[ $output == *"$expected"* ]] || { echo "Missing: $expected"; exit 1; }
done
bash setup.sh --dry-run --host root@203.0.113.10 --domain example.com --spa \
  --route /=/var/www/site >/dev/null
reject() {
  if bash setup.sh --dry-run --domain example.com "$@" >/dev/null 2>&1; then
    echo "Unexpectedly accepted: $*"; exit 1
  fi
}
reject --route /=65536
reject --route /=0
reject --route /=http://127.0.0.1:99999
reject --route /=8080 --route /=3000
reject --route '/api;return=8080'
reject --domain 'example.com;bad'
reject --route
bash setup.sh --help >/dev/null
echo 'PASS: syntax, help, preview, route rendering and invalid inputs'
