const CACHE_PREFIX = 'sanger-viewer'
const CACHE_NAME = `${CACHE_PREFIX}-v31-private-offline`

function scopedUrl(path) {
  return new URL(path, self.registration.scope).toString()
}

const PRECACHE_URLS = [
  scopedUrl('./'),
  scopedUrl('manifest.webmanifest'),
  scopedUrl('sample.ab1'),
  scopedUrl('icon.svg'),
]

async function putInCache(request, response) {
  if (!response || response.status >= 400) return
  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response)
}

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME)
  const sameOriginUrls = urls
    .map((url) => {
      try {
        return new URL(url, self.registration.scope)
      } catch {
        return null
      }
    })
    .filter((url) => url && url.origin === self.location.origin)
    .map((url) => url.toString())

  await Promise.allSettled(sameOriginUrls.map((url) => cache.add(url)))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SV_WARM_CACHE' || !Array.isArray(event.data.urls)) return
  event.waitUntil(cacheUrls(event.data.urls))
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          void putInCache(request, response.clone())
          return response
        })
        .catch(async () => {
          return (await caches.match(request)) ?? caches.match(scopedUrl('./'))
        })
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        void putInCache(request, response.clone())
        return response
      })
      .catch(async () => {
        return (await caches.match(request)) ?? Response.error()
      })
  )
})
