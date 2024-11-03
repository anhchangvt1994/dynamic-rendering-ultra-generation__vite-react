![top-banner](/src/assets/static/images/readme/top-banner.jpg)

## First and foremost

Hey guys, what awesome thing brought you here? … Whatever it is, I think your day has started to get better. Before exploring further, let’s identify some important things together.

1. Are you looking for an optimal solution for light-house score ?
2. Have you tried many ways to optimize but still not satisfactory ?

OR you just enjoy adventure and discovery. You want to try a solution that can help improve your website's SEO and user experience, without needing to use Server Side Rendering.

IF so, I think this project can help you. All you need to do is know how to use VueJS / ReactJS (I bet it’s much easier to use than NuxtJS and NextJS) and done, leave the rest to the system.

Specifically, the system will transform your client side rendering project so that it can be SEO without you having to do anything. In addition, the system will help you optimize all light-house scores to the highest possible level, and you don’t have to do anything either. You haven’t been pressured to optimize the light-house score yet, have you? apply quickly, still in time

NOTE
- You can read detail about advanced structure of Vite + VueJS + TS project in this [repository](https://github.com/anhchangvt1994/vite-project--template-vue-ts).
- You can read detail about router, suspense and some common utilities in this [repository](https://github.com/anhchangvt1994/vite-project--template-vue-ts__vue-router).

## Table of contents

1. [Install](#install)
2. [Try for fun](#try-for-fun)
3. [How it works ?](/READMORE/how-it-works.md)
4. Configuration
  - [Config redirect](/READMORE/redirect-config.md)
  - [Config server](/READMORE/server-config.md)
  - [Server environment variables](/READMORE/server-enviroment-variables.md)
5. Utilities
  - [Meta SEO tags](/READMORE/meta-seo-tags.md)
  - [Link SEO tags](/READMORE/link-seo-tags.md)
  - [`seo-tag` attribute](/READMORE/seo-tag-attribute.md)
  - [BotInfo variable](/READMORE/botinfo-variable.md)
  - [DeviceInfo variable](/READMORE/deviceinfo-variable.md)
  - [LocaleInfo variable](/READMORE/localeinfo-variable.md)
  - [Remote crawler](/READMORE/remote-crawler.md)
  - [Proxy API](/READMORE/proxy-api.md)

6. [Deployment guide](/READMORE/deployment.md)
7. [Q&A](/READMORE/Q&A.md)

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

<h2 id="try-for-fun">Try for fun</h2>

Hey guys, have you completed the installation step? I hope everything works well and smoothly, if you have any issues, don’t hesitate to create a github issue or contact me directly via these socials: [facebook](https://www.facebook.com/truong.nguyen.3382), [linkedin](https://www.linkedin.com/in/truong-nguyen-8780a523a). I will try my best to support you as much as possible.

If you have finished the installation step, let’s start the fun. Follow these steps and enjoy.

1. Run build
```bash
npm run build
```

2. Run preview
```bash
npm run preview
```

3. Open localhost:\<port\>

![step 03](/src/assets/static/images/readme/step_03.jpg)

What do you see after completing this step? Nothing, right. There is nothing but a layout rendered by Vue / React, and obviously it cannot be SEO.

That’s right, what you see is exactly what the system has sent to the user, and I emphasize here is “user”. And the first value that we can see is that, the system has taken advantage of the efficiency of CSR (client side rendering) to help optimize the server, minimize the server’s computational cost for most requests from users.

And, right now, the next step will show you the magic and also the biggest value that this project brings. Let’s explore.

4. Open browser devtools > select tab **Network Condition** > uncheck **Use browser default** option > select **Google Bot** and refresh the tab.

![step 04](/src/assets/static/images/readme/step_04.jpg)

What do you see now? Just text and text, right? There is no style at all, how ugly and miserable. Exactly, that is the content that a Search Engine will like and very like, Bot will not need style, no need for flashy, attractive. Bot needs clarity, purity, and optimization as much as possible to be able to read and collect information in the best way, and when Bot likes it, you should prepare to be famous on the ranking.

But wait, you still haven’t checked the light-house score yet. Right now, open the incognito browser (slowly, don’t make it a habit like that … I like that). Open incognito and go back to localhost:\<port\> where the project is running, this will help ensure that the lighthouse testing process will minimize the impact of the chrome-extensions that you installed before, helping the light-house system to give the most accurate results possible. Let’s check it out.

5. Open **incognito browser** > Open localhost:\<port\> > Open browser devtool > select lighthouse tab > start light-house checking.

![step 05](/src/assets/static/images/readme/step_05.jpg)

How did you score? both mobile and desktop. Enough to impress you, right? I’m sure Search Engine will be very impressed too.

But wait, the content of this page is too little, it’s not enough to say anything, except that it can make a web page using CSR with SEO possible. So let’s test it on a web page with more content and running in real time. Here I will choose Tiki. Let’s do it.

6. Adding some special testing queryString and enter
`?urlTesting=https://tiki.vn`

7. Open lighthouse and test it again

![step 07](/src/assets/static/images/readme/step_07.jpg)

Surprised, aren’t you !? Now you can confidently apply for the position of Optimize LightHouse score of the company (if there is such a position … haha), but anyway, you have just met a real and important need of a web user, congratulations.
