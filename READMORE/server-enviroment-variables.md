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
