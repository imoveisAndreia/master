/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * GESTÃO MASTER - Service Worker v1.0
 * Administração Imobiliária
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Data: 11/01/2026
 * Suporte: Android WebAPK, iOS PWA, Desktop
 * Cache: Inteligente (Network-first + Cache-first)
 * Offline: Totalmente funcional
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const CACHE_NAME = 'gestao-master-v1-2026';
const CACHE_VERSION = 'v1.0';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🏢 GESTÃO MASTER Service Worker v1.0 INICIADO');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ============================================
// RECURSOS PARA CACHE OFFLINE
// ============================================
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    // Bibliotecas essenciais
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/@phosphor-icons/web'
];

console.log(`📦 Total de recursos a cachear: ${urlsToCache.length}`);

// ============================================
// EVENTO: INSTALL
// ============================================
self.addEventListener('install', (event) => {
    console.log('⚙️  SW: FASE INSTALL iniciada');

    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 SW: Cacheando recursos...');

                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url)
                            .then(() => {
                                console.log(`  ✓ ${url}`);
                            })
                            .catch(err => {
                                console.warn(`  ⚠️  Falha: ${url}`, err.message);
                            });
                    })
                );
            })
            .then(() => {
                console.log('✅ SW: Instalação COMPLETA!');
            })
            .catch(err => {
                console.error('❌ SW: ERRO na instalação:', err);
            })
    );
});

// ============================================
// EVENTO: ACTIVATE
// ============================================
self.addEventListener('activate', (event) => {
    console.log('⚡ SW: FASE ACTIVATE iniciada');

    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log(`🗑️  SW: Removendo cache antigo: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            self.clients.claim()
        ])
        .then(() => {
            console.log('✅ SW: ATIVADO e controlando todas as páginas!');
        })
    );
});

// ============================================
// EVENTO: FETCH
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Apenas GET
    if (request.method !== 'GET') {
        return;
    }

    // Ignorar Chrome Extensions
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // ============================================
    // ESTRATÉGIA 1: NAVEGAÇÃO (HTML)
    // Network-first
    // ============================================
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    console.log('📦 SW: OFFLINE - Servindo do cache');
                    return caches.match(request)
                        .then((cached) => {
                            if (cached) {
                                return cached;
                            }
                            return caches.match('./index.html')
                                .then(index => index || caches.match('./'));
                        });
                })
        );
        return;
    }

    // ============================================
    // ESTRATÉGIA 2: RECURSOS ESTÁTICOS
    // Cache-first
    // ============================================
    event.respondWith(
        caches.match(request)
            .then((cached) => {
                if (cached) {
                    return cached;
                }

                return fetch(request)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        // Não cachear APIs de Firebase Auth
                        if (url.hostname.includes('identitytoolkit') || 
                            url.hostname.includes('securetoken') ||
                            url.hostname.includes('googleapis.com')) {
                            return response;
                        }

                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });

                        return response;
                    })
                    .catch((err) => {
                        console.warn(`❌ SW: Erro ao buscar: ${url.pathname}`);

                        if (request.destination === 'document') {
                            return caches.match('./index.html');
                        }

                        return new Response('Offline - Recurso não disponível', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain; charset=UTF-8'
                            })
                        });
                    });
            })
    );
});

// ============================================
// EVENTO: MESSAGE
// ============================================
self.addEventListener('message', (event) => {
    console.log('💬 SW: Mensagem recebida:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('⏭️  SW: Comando SKIP_WAITING executado');
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_URLS') {
        console.log('📥 SW: Cacheando URLs adicionais...');
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.addAll(event.data.urls)
                    .then(() => console.log('✅ SW: URLs adicionais cacheadas!'))
                    .catch(err => console.error('❌ SW: Erro ao cachear:', err));
            })
        );
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('🗑️  SW: Limpando cache...');
        event.waitUntil(
            caches.delete(CACHE_NAME)
                .then(() => {
                    console.log('✅ SW: Cache limpo!');
                    return caches.open(CACHE_NAME);
                })
        );
    }
});

// ============================================
// LOG FINAL
// ============================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ GESTÃO MASTER SW v1.0 PRONTO!');
console.log('📦 Cache:', CACHE_NAME);
console.log('📝 Recursos:', urlsToCache.length);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
