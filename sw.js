/* 뚝딱로그 service worker: opens offline after the first visit, and adds the isolation headers
   GitHub Pages cannot send (so in-browser speech recognition can use every core). */
const CACHE = 'ttk-core-mw8ws6iy', RUNTIME = 'ttk-rt-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png', './sfx/beep.mp3', './sfx/boing_r.mp3', './sfx/bubble_r.mp3', './sfx/clap.mp3', './sfx/correct.mp3', './sfx/ding_r.mp3', './sfx/dingdong.mp3', './sfx/drumroll.mp3', './sfx/dudungtak.mp3', './sfx/heartbeat.mp3', './sfx/kaching.mp3', './sfx/laugh.mp3', './sfx/pop_r.mp3', './sfx/scratch.mp3', './sfx/shutter_r.mp3', './sfx/sparkle_r.mp3', './sfx/whoosh_r.mp3', './sfx/wrong.mp3'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil((async () => {
  // only this app's own older copies. The speech and translation models (~370MB) live in 'transformers-cache':
  // deleting every other cache here made the phone download them again after every update
  for (const k of await caches.keys()) if (k.startsWith('ttk-core-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
function isolate(res) {
  if (!res || res.status === 0 || res.type === 'opaque') return res;
  const h = new Headers(res.headers);
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  h.set('Cross-Origin-Embedder-Policy', 'require-corp');
  h.set('Cross-Origin-Resource-Policy', 'cross-origin');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      // newest version when online, the saved copy when offline
      e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); } return isolate(r); })
        .catch(() => caches.match('./index.html').then(isolate)));
    } else e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)).then(isolate));
    return;
  }
  if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)$/.test(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r;
    }));
  }
});
