<!-- ![top-banner](/READMORE/images/top-banner.jpg) -->

## First and foremost

Hey guys, what awesome thing brought you here? … Whatever it is, I think your day has started to get better. Before exploring further, let’s identify some important things together.

1. Are you looking for an optimal solution for light-house score ?
2. Have you tried many ways to optimize but still not satisfactory ?

OR you just enjoy adventure and discovery. You want to try a solution that can help improve your website's Lighthouse for the Search Engine, without needing to use Server Side Rendering.

IF so, I think this project can help you. All you need to do is know how to use VueJS / ReactJS (I bet it’s much easier to use than NuxtJS and NextJS) and done, leave the rest to the system.

Specifically, the system will transform your client side rendering project so that it can be SEO without you having to do anything. In addition, the system will help you optimize all light-house scores to the highest possible level, and you don’t have to do anything either. You haven’t been pressured to optimize the light-house score yet, have you? apply quickly, still in time

NOTE
- You can read detail about advanced structure of Vite + React + TS project in this [repository](https://github.com/anhchangvt1994/vite-project--template-react-ts).
- You can read detail about router, suspense and some common utilities in this [repository](https://github.com/anhchangvt1994/vite-project--template-react-ts__react-router).

## Table of contents

1. [Install](#install)
2. [How it works ?](#how-it-works)

3. Configuration
  - [Config redirect](/READMORE/redirect-config.md)
  - [Config server](/READMORE/server-config.md)
  - [Server environment variables](/READMORE/server-enviroment-variables.md)

4. Utilities
  - [Meta SEO tags](/READMORE/meta-seo-tags.md)
  - [Link SEO tags](/READMORE/link-seo-tags.md)
  - [`seo-tag` attribute](/READMORE/seo-tag-attribute.md)
  - [BotInfo variable](/READMORE/botinfo-variable.md)
  - [DeviceInfo variable](/READMORE/deviceinfo-variable.md)
  - [LocaleInfo variable](/READMORE/localeinfo-variable.md)
  - [Remote crawler](/READMORE/remote-crawler.md)
  - [Proxy API](/READMORE/proxy-api.md)

5. [Deployment guide](/READMORE/deployment.md)

6. [The interesting stories](/READMORE/the-interesting-stories.md)
  <!-- - [The `Rendering` world](#the-rendering-world)
  - [`Dynamic Rendering`! Where have you been all this time ?](#dynamic-rendering-where-have-you-been) -->
  <!-- - [`Dynamic Rendering` and `Cloaking` (hero and his little brother, same but difference)](#dynamic-rendering-cloaking) -->
  <!-- - [PageSpeed has Lighthouse and Lighthouse has ... Lighthouse](#pagespeed-and-lighthouse) -->

<h2 id="install">Install</h2>

##### Expect Node 18.18.x or higher

If use npm

```bash
npm install
```

If use yarn 1.x

```bash
yarn
```

If use Bun

```bash
bun install
```

<h2 id="how-it-works">How it works ?</h2>

This project works based on the `Dynamic-Rendering` technique.

So, what is `Dynamic-Rendering` ?

`Dynamic-Rendering (DR)` is a rendering technique, it helps the `Client-side Rendering (CSR)` website can be pre-rendered in the server, after that the full of content can be available to send to the Search Engine. Right! That means the server will send the different content to the user (the normal browser) and the Search Engine.

![Dynamic Rendering Workflow](/READMORE/images/dynamic-rendering-workflow.jpg 'Dynamic Rendering Workflow')
