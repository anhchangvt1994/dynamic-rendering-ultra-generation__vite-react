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
reject --app https://github.com/example/repo.git
reject --app-dir https://github.com/example/repo.git
reject --app-dir /srv/app --skip-app
output=$(bash setup.sh --dry-run --domain example.com)
[[ $output == *"App directory: $(cd ../.. && pwd)"* ]] || { echo 'Repository was not detected from setup.sh'; exit 1; }
setup_path="$(pwd)/setup.sh"
output=$(cd /tmp && bash "$setup_path" --dry-run --domain example.com)
[[ $output == *"App directory: $(cd ../.. && pwd)"* ]] || { echo 'Repository detection depends on the working directory'; exit 1; }
output=$(bash setup.sh --dry-run --domain example.com --app-dir /srv/existing-app)
[[ $output == *'App directory: /srv/existing-app'* ]] || { echo 'Existing app directory override was ignored'; exit 1; }
output=$(bash setup.sh --dry-run --domain example.com --skip-app)
[[ $output == *'App: skipped'* ]] || { echo 'Infrastructure-only mode was ignored'; exit 1; }
output=$(bash setup.sh --dry-run --domain example.com --host root@203.0.113.10)
[[ $output != *"App directory: $(cd ../.. && pwd)"* ]] || { echo 'Local repo path was forwarded as a remote repo'; exit 1; }
output=$(bash setup.sh --dry-run --domain example.com --host root@203.0.113.10 --app-dir /srv/existing-app)
[[ $output == *'App directory: /srv/existing-app'* ]] || { echo 'Remote existing repo override was ignored'; exit 1; }
bash setup.sh --help >/dev/null
echo 'PASS: syntax, help, preview, route rendering and invalid inputs'
node --test regression.test.mjs
