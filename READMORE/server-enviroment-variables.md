[< Back](../README.md)

## Server environment variable

> <br />You can and should setup these variables in .\<environment\> files such as
> - `server/.env` - For all environments
> - `server/.env.staging` - For only staging environment
> - `server/.env.uat` - For only uat environments
> - `server/.env.production` - For only production environments
> <br />

**Most used**

- **CRAWLER** `(default: empty)`
The remote crawler url, if this value non-empty, it will be used to replace the `ServerConfig.crawler` value.
- **CRAWLER_SECRET_KEY** `(default: empty)`
The way to protect the remote crawler. Just setup a secret key for the client project (project use remote crawler) and the same for the remote crawler project.
- **IS_REMOTE_CRAWLER** `(default: false)`
If `true` this project will be a remote crawler project.

**Commonly used**

- **NOT_FOUND_PAGE_ID** `( default: "404-page" )`
Normally, CRS + SPA websites will always return a status code of 200, even for the 404 page. To help the system identify a 404 page, you need to place an ID in the 404 page. The system will scan the content of the website and determine if it is a 404 page or not. By default, the system will use the ID "404-page" to identify it.

**Browser engine**

- **BROWSER_ENGINE** `( default: "chromium" )`
The headless browser used to render pages for ISR / SSR / sitemap: `chromium` or `lightpanda`. [Lightpanda](https://github.com/lightpanda-io/browser) has no rendering engine, so it uses far less RAM and CPU than chromium (good for small VPS). The `start*` scripts install it automatically (into `server/resources/lightpanda`, see "Preflight" below), or run `npm run install:lightpanda`. Lighthouse always uses chromium, launched only when needed. Compare both engines on your server with `node scripts/compare-browser-engines.mjs`.
- **LIGHTPANDA_PATH** `( default: "server/resources/lightpanda/lightpanda" )`
Path of the lightpanda binary.
- **LIGHTPANDA_PORT** `( default: 9222 )`
First port tried for the lightpanda CDP server (only listens on 127.0.0.1).
- **LIGHTPANDA_MAX_CONNECTIONS** `( default: 32 )`
Maximum simultaneous CDP connections of lightpanda.
- **LIGHTPANDA_FALLBACK_TO_CHROMIUM** `( default: false )`
If `true`, a page that lightpanda fails to render (no result or status >= 500) is rendered again with chromium. Chromium is launched only on the first fallback.

**Crawl queue (ISR)**

- **CRAWL_PROFILE** `( default: "fast" when BROWSER_ENGINE=lightpanda, otherwise "default" )`
`default`: the original throttle made for chromium (`ServerConfig.crawl.limit` crawls, 2 render workers, a start delay of `speed / 20` per queued crawl and fixed waits after the page loaded). `fast`: up to `CRAWL_CONCURRENCY` renders at the same time (from new requests and from the waiting list together, one render worker each), no start delay, the waiting list is drained every 500ms, a page is done when no request has been pending for 500ms (max 15s), and a new crawl only starts while enough memory is available.
- **CRAWL_CONCURRENCY** `( default: CPUs x 3, between 2 and 12 )`
Maximum renders at the same time in the `fast` profile. CPUs are read from the cgroup quota in a container.
- **CRAWL_MIN_FREE_MEMORY_MB** `( default: 400 )`
`fast` profile: a new crawl waits in the queue while the available memory (cgroup limit in a container, MemAvailable on a VPS) is lower than this. One crawl can always run.

**Preflight of the start scripts**

`npm run start`, `start:worker`, `start:pm2`, `start:pm2:worker`, `start:redis-api` and `start:redis-api:pm2:worker` check the runtime before starting the server (`config/utils/Preflight.mjs`):
- `BROWSER_ENGINE=lightpanda`: installs / upgrades lightpanda if it is missing or not the pinned version. When the system glibc is too old for lightpanda (CentOS / RHEL / Rocky 7 and 9), a pinned glibc runtime is downloaded next to it and lightpanda runs through it (the system glibc is not touched).
- `BROWSER_ENGINE=chromium` (default) or `LIGHTPANDA_FALLBACK_TO_CHROMIUM=true` on linux: installs the shared libraries chromium needs (`nss`, `nspr`, `mesa-libgbm`, ...) when they are missing (`dnf` / `yum` / `apt-get`).
- `start:redis-api*` (or `REDIS=true`): checks `REDIS_HOST:REDIS_PORT` (with `REDIS_PASSWORD`). If it is a local host and redis is not running, installs it with the system package manager (`dnf` / `yum` + EPEL / `apt-get` / `apk` / `brew`; `valkey` on RHEL / CentOS Stream 10, which no longer ships redis) and starts it (systemd / brew service for the default port without password, otherwise `redis-server --daemonize`). Root or `sudo` is needed to install. A remote redis is only checked.

> uWebSockets.js (used by every `start*` script) needs glibc >= 2.38: use CentOS Stream 10 / RHEL 10 / Rocky 10 / Ubuntu 24.04 or newer.

**Less used**
- **USE_CHROME_AWS_LAMBDA** `( default: false )`
Sometime the cloud / server you use to deploy this project will limit the sizes installed. In that case you can use the `USE_CHROME_AWS_LAMBDA=true` to install the importance of the SEO and optimization abilities in this project.

> Please define `USE_CHROME_AWS_LAMBDA` by using setting environment available in cloud / server or use the `export` syntax to set global. Do not set it in `.env`

- **PUPPETEER_SKIP_DOWNLOAD** `( default: false )`
IF you use the `USE_CHROME_AWS_LAMBDA=true` you need to skip system to download the default. So in this case you need to set `PUPPETEER_SKIP_DOWNLOAD=true`.

> Please define `PUPPETEER_SKIP_DOWNLOAD` by using setting environment available in cloud / server or use the `export` syntax to set global. Do not set it in `.env`

- **PUPPETEER_CACHE_DIR** `( default: 'node_modules/.puppeteer-cache' )`
IF the `PUPPETEER_SKIP_DOWNLOAD=true` as default. The system will install the chromium into the directory that defined by using `PUPPETEER_CACHE_DIR` before.

> Please define `PUPPETEER_CACHE_DIR` by using setting environment available in cloud / server or use the `export` syntax to set global. Do not set it in `.env`
