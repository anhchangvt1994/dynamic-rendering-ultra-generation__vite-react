// Synthetic SPA served through the actual application's CSR/ISR/API pipeline.
// Container-only fixture; never invoke this against a production checkout.
require('sucrase/register')
const fs = require('fs'),
  path = require('path')
const { encodeRequestInfo } = require('../../server/src/api/utils/StringHelper')
if (!fs.existsSync('/.dockerenv'))
  throw Error('Fixture installation requires the isolated Docker lab')
const upstream = process.env.MIN_LAB_UPSTREAM || 'http://vps-min-client:8889'
const requestInfo = (id) =>
  '/api?requestInfo=' +
  encodeRequestInfo({
    baseUrl: upstream,
    endpoint: '/data/' + id,
    cacheKey: 'min-lab-' + id,
    storeKey: 'min-lab',
    expiredTime: 'infinite',
    renewTime: 'infinite',
    relativeCacheKey: [],
    enableStore: false,
    storeInDevice: 'desktop',
  })
const apiPaths = Array.from({ length: 16 }, (_, i) => requestInfo(i))
const js = `(async()=>{
const m=location.pathname.match(/\\/(?:detail|fresh)\\/(\\d+)/);const id=m?Number(m[1]):0;
const info=${JSON.stringify(Array.from({ length: 1024 }, (_, i) => requestInfo(i)))};
const response=await fetch(info[id%info.length]);if(!response.ok)throw Error('API '+response.status);
const data=await response.json();
document.title='Item '+id;document.querySelector('#root').innerHTML='<h1 data-ready="'+id+'">Item '+id+'</h1>';
const count=location.pathname==='/'?1024:2;
for(let i=0;i<count;i++){const a=document.createElement('a');a.href='/detail/'+(location.pathname==='/'?i%64:(id+i+1)%64);a.textContent='Item '+i;document.querySelector('#root').append(a)}
for(let i=0;i<100;i++){const p=document.createElement('p');p.textContent=data.payload.slice(i*400,(i+1)*400);document.querySelector('#root').append(p)}
window.fixtureReady=true;
})().catch(e=>{document.title='API error';document.querySelector('#root').textContent=e.message;window.fixtureFailed=true})`
fs.mkdirSync('dist', { recursive: true })
fs.writeFileSync('dist/minimum-app.js', js)
fs.writeFileSync(
  'dist/index.html',
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title></title><meta name="robots" content="index,follow"></head><body><main id="root">Loading</main><script src="/minimum-app.js"></script></body></html>'
)
fs.writeFileSync(
  'scripts/vps-lab/minimum-api-paths.json',
  JSON.stringify(apiPaths)
)
console.log(
  JSON.stringify({
    fixturePages: 65,
    apiPayloadBytes: 65536,
    apiPaths: apiPaths.length,
    jsBytes: Buffer.byteLength(js),
  })
)
