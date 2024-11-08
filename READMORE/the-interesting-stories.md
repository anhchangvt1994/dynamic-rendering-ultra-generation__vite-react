<h2 id="the-interesting-stories">The interesting stories</h2>

<h3 id="the-rendering-world">The `Rendering` world</h3>

The Web-Frontend has so many growth in a long-long time. At the current, we have so many ways to make a website can be easier for rendering. Some popular solutions such as `Client-side Rendering (CSR)`, `Server-side Rendering (SSR)`, `Static-site Generation (SSG)`, `Incremental Static Regeneration (ISR)`. And beside the popular solutions, the `Dynamic Rendering (DR)` is also a excellent solution that we can use.

So, What is `Client-side Rendering` ?

The `Client-side Rendering (CSR)` is a rendering technique that make whole of website can be rendering at the client-side (popular is at the browser). Right, that means the `CSR` website is not good for SEO.

What is `Server-side Rendering` ?

The `Server-side Rendering (SSR)` is a rendering technique, it helps the website can be rendered a half OR full the HTML content in the server-side per request. Beside `SSR`, we also have
- `Static-site Generation (SSG)`: The build-tool will generate multiple static-html files base on each pathname. After that, when the client make a request to server, server just find and get the static html content base on pathname and respond it to client.
- `Incremental Static Regeneration (ISR)`: After the Server-side rendering process is finish, the result will be cached and respond to client.
- `Pre-rendering`: The `ISR` process started before requested.

What is `Dynamic Rendering` ? I already modified about its meaning at the above content, you can read it by clicking in [here](#how-it-works).

See some workflows at below to get more detail.

![Client-side Rendering Workflow](/READMORE/images/client-side-rendering-workflow.jpg 'Client-side Rendering Workflow')
![Server-side Rendering Workflow](/READMORE/images/server-side-rendering-workflow.jpg 'Server-side Rendering Workflow')
![Static-site Generation Workflow](/READMORE/images/static-site-generation-workflow.jpg 'Static-site Generation Workflow')
![Incremental Static Regeneration Workflow](/READMORE/images/incremental-static-regeneration-workflow.jpg 'Incremental Static Regeneration Workflow')
![Pre-rendering Workflow](/READMORE/images/pre-rendering-workflow.jpg 'Pre-rendering Workflow')

<h3 id="dynamic-rendering-where-have-you-been">`Dynamic Rendering`! Where have you been all this time ?</h3>

As you can see in the above rendering workflows, the `Dynamic Rendering` workflow is complexer than other.

![Dynamic Rendering Workflow](/READMORE/images/dynamic-rendering-workflow.jpg 'Dynamic Rendering Workflow')

IF you search the `Dynamic Rendering` in Google, you will see this.

![Dynamic Rendering as a workaround](/READMORE/images/dynamic-rendering-as-a-workaround.jpg 'Dynamic Rendering as a workaround')

Read More

- [Dynamic rendering as a workaround](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)
- [Google: No SEO Benefit For Either Dynamic Rendering Or Server Side Rendering](https://www.seroundtable.com/google-seo-dynamic-rendering-or-server-side-rendering-33947.html)
- [Case studies ? Dynamic Rendering versus Server Side Rendering](https://www.reddit.com/r/TechSEO/comments/wq57sv/case_studies_dynamic_rendering_versus_server_side/)

Right, at the current time, Google doesn't recommend using `Dynamic Rendering`. But not at all. Why ? We can explain it clearly in here, and if this project can resolve those problems, hmmm ... why not try it on ?

The problems :

- Hard to implement.
- Hard to maintain and scale-up.
- Hard to synchronize content.
- Need more server's resource (RAM, CPU, SSD).
- Is it Cloaking ?

**Hard to implement**

In `DR`, we nearly have all of popular rendering techniques list at above. `CSR, SSR, ISR`. So we need more code and condition to make it can run and so much code and condition to make it run well. And I mean it just business code to make `DR` run. Exclude the server-side requirement that need to run well the `DR` system.

**Hard to maintain and scale-up**

Do you know NextJS and NuxtJS ? yes, they're meta framework used to make a website can be SEO, base on ReactJS and VueJS. Anh they have a very large developer community, This means that if we use Next/Nuxt, we can be assured that we will have support in addressing any issues from a large community, and if the problem is significant, there are already experts handling it in newer updates.

So, How about this project ? Right, this project just used by only me, at the current. And I can not do a large analyst, to ensure that the project will have no problem about `maintain and scale-up`, I just research and make this project better and better, day by day. IF you trust in me, OR easily you just enjoy adventure and discovery. Are you a fan of free-style coding ? Try it on, I ensure that you don't worry about that you can't understand why some JS libs doesn't work like simple it should work.

**Hard to synchronize content**

Oops! I ... I can not resolve all of this problem, sorry.

But, will `ISR` really do that better? Because it also needs caching and there are some components that still need to be rendered on the client side. Why I say `ISR` instead of `SSR`, cause we can not do SEO better that just use only `SSR`.

**Need more server's resource (RAM, CPU, SSD)**

Right, The `Dynamic Rendering` need more server's resource, cause it uses crawler to render the website, but it was the past. At the current, `puppeteer` library provides a shell headless version (a lightweight and performance version) - you can read more in [here](https://developer.chrome.com/blog/chrome-headless-shell)

**Is it Cloaking ?**

`Cloaking` OR `SEO Cloaking` is a black hat technique that aims to show search engines what they want to see while actual users see something else.

That's right, it is a black hat SEO technique, and it works similarly to how dynamic rendering operates. So, is dynamic rendering the same as cloaking?

That depends on human factors. Let's take a look at the key factors that help differentiate between `Cloaking` and `Dynamic Rendering`, as provided by Google.

>Cloaking is used to change rankings.

After figuring out if it’s a user or a bot, Cloaking uses tricky methods to change search rankings on search engines. Some of these methods include:

Doorway abuse, Expired domain abuse, Hacked content, Hidden text and link abuse, Keyword stuffing, Link spam, Machine-generated traffic, ... you can find more information here: https://developers.google.com/search/docs/essentials/spam-policies

Cloaking takes advantage of knowing who the user or bot is to show different content in a dishonest way. Simply put, Cloaking gives bots fake information with many attractive offers, services, and keywords, making the bot think the website has a wide variety of services and topics. When a user needs something, the bot suggests that website first. But when the user clicks on it, the content might not match what they expected and could be completely different from what they were looking for. This is a serious violation and should not happen on trusted search engines.

>Dynamic Rendering is used to improve how well websites can be indexed.

After identifying if it’s a user or a bot, Dynamic Rendering sends the right website content to them. Specifically, Dynamic Rendering will:

Provide users with the exact content they need, improving their experience while using the site.
Send optimized content to bots, making it easier for them to see and scan the content to index the website as quickly as possible (for websites that use full client-side rendering).

See two detail workflows at below to get more detail.

![Dynamic Rendering Workflow Detail](/READMORE/images/dynamic-rendering-detail.jpg 'Dynamic Rendering Workflow Detail')
![SEO Cloaking Workflow Detail](/READMORE/images/seo-cloaking-detail.jpg 'SEO Cloaking Workflow Detail')
