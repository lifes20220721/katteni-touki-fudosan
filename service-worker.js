const CACHE='souzoku-support-v0.2.2-1';
const FILES=['./','./index.html','./styles.css?v=0.2.2','./src/app.js?v=0.2.2','./src/model.js','./src/rules.js','./src/documents.js?v=0.2.2','./src/jurisdiction.js','./data/jurisdictions.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
// Do not force reload a page that may hold unsaved personal information.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('souzoku-support-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;const allowed=FILES.some(p=>new URL(p,self.registration.scope).href===url.href);if(!allowed)return;event.respondWith(caches.match(event.request).then(response=>response||fetch(event.request)));});
