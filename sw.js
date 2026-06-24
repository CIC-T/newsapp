const CACHE_NAME = 'newsapp-v1';
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 安装：缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    })
  );
});

// 后台同步：定时检查新闻
self.addEventListener('sync', event => {
  if (event.tag === 'news-check') {
    event.waitUntil(checkForNewNews());
  }
});

// 推送通知点击
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});

async function checkForNewNews() {
  // 从localStorage读取领域（SW内不能直接访问DOM，需要用IndexedDB或Cache存储）
  // 简化处理：使用一个固定的领域缓存
  const domainCache = await caches.open('domain-cache');
  const cachedDomains = await domainCache.match('domains');
  let domains = ['科技'];
  if (cachedDomains) {
    domains = await cachedDomains.json();
  }

  const query = domains.join(' OR ');
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://news.google.com/rss/search?q=' + query + '&hl=zh-CN&gl=CN&ceid=CN:zh-Hans')}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.status === 'ok' && data.items && data.items.length > 0) {
      const latestTitle = data.items[0].title;
      self.registration.showNotification('📰 新闻速读', {
        body: `最新消息：${latestTitle}`,
        icon: '/icon-192.png'
      });
    }
  } catch (error) {
    console.log('新闻检查失败', error);
  }
}

// 定期触发后台同步
self.addEventListener('periodicsync', event => {
  if (event.tag === 'news-check') {
    event.waitUntil(checkForNewNews());
  }
});
