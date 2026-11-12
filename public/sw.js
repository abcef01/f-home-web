/* Bunny's Home — Service Worker
 * ------------------------------------------------------------
 * 策略：
 *   · 页面导航：先走网络，失败回退到缓存的 index.html（断网也能打开）
 *   · 静态资源（js/css/图片/字体）：缓存优先，后台顺带更新
 *   · /api/*：完全不碰，永远走网络（聊天必须实时）
 */

const VERSION = 'bunny-v4';
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* 从系统分享面板发过来的图片：先存起来，再跳回聊天页 */
  const shareUrl = new URL(request.url);
  if (request.method === 'POST' && shareUrl.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        try {
          const form = await request.formData();
          const file = form.get('image');
          const cache = await caches.open('share-target');
          if (file && typeof file === 'object') {
            await cache.put('/__shared__/image', new Response(file, { headers: { 'Content-Type': file.type || 'image/jpeg' } }));
            await cache.put('/__shared__/name', new Response(file.name || 'shared.jpg'));
          }
        } catch (e) {
          /* 拿不到就算了，页面那边会提示 */
        }
        return Response.redirect('/#shared', 303);
      })()
    );
    return;
  }

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* 接口和跨域请求不缓存 */
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) return;

  /* 页面导航 */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  /* 静态资源 */
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* ============================================================
   后台通知：即使 App 没开着，也能收到「它说话了」
   ============================================================ */
self.addEventListener('push', (event) => {
  let payload = { title: 'Elliott', body: '给你留了一句话', url: '/#chat' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* 没有正文就用默认文案 */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Elliott', {
      body: payload.body || '给你留了一句话',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.icon || '/icons/icon-192.png',
      tag: payload.tag || 'bunny-message',
      renotify: true,
      data: { url: payload.url || '/#chat' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/#chat';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.indexOf(self.location.origin) === 0) {
          c.focus();
          if (c.navigate) c.navigate(self.location.origin + target);
          return;
        }
      }
      return self.clients.openWindow(self.location.origin + target);
    })
  );
});
