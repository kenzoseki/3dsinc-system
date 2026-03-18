const CACHE_VERSION = 'v1'
const CACHE_ESTATICO = `3dsinc-estatico-${CACHE_VERSION}`
const CACHE_API = `3dsinc-api-${CACHE_VERSION}`

const ASSETS_ESTATICOS = [
  '/',
  '/dashboard',
  '/offline',
]

// Instala o service worker e pré-carrega assets essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ESTATICO).then(cache => cache.addAll(ASSETS_ESTATICOS).catch(() => {}))
  )
  self.skipWaiting()
})

// Remove caches de versões antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(chaves =>
      Promise.all(
        chaves
          .filter(c => c !== CACHE_ESTATICO && c !== CACHE_API)
          .map(c => caches.delete(c))
      )
    )
  )
  self.clients.claim()
})

// Estratégia: network-first para API, cache-first para assets estáticos
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requisições não-GET e de outras origens
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API: network-first (sem cache de API — dados devem ser frescos)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ erro: 'Sem conexão com o servidor' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // Assets estáticos (_next/static): cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => cached ?? fetch(request).then(res => {
        const clone = res.clone()
        caches.open(CACHE_ESTATICO).then(cache => cache.put(request, clone))
        return res
      }))
    )
    return
  }

  // Páginas: network-first com fallback para offline
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then(cached => cached ?? caches.match('/offline'))
    )
  )
})
