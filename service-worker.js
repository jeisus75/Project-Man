/**
 * Construction Site Dashboard
 * Service Worker - Handles offline caching and PWA functionality
 */

// Cache name - update version when making changes to the service worker
const CACHE_NAME = 'construction-site-dashboard-v1';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/css/styles.css',
    '/assets/js/config.js',
    '/assets/js/api.js',
    '/assets/js/storage.js',
    '/assets/js/ui.js',
    '/assets/js/map.js',
    '/assets/js/app.js',
    '/assets/img/icon-192.png',
    '/assets/img/icon-512.png',
    '/assets/img/telegram-qr.png',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/html5-qrcode'
];

// API endpoints to cache with network-first strategy
const API_ENDPOINTS = [
    /^https:\/\/script\.google\.com\/macros\/s\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing Service Worker...', event);
    
    // Skip waiting to activate the new service worker immediately
    self.skipWaiting();
    
    // Cache static assets
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((error) => {
                console.error('[Service Worker] Error caching static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating Service Worker...', event);
    
    // Claim clients to take control immediately
    event.waitUntil(self.clients.claim());
    
    // Clean up old caches
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Removing old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
    );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin) && 
        !API_ENDPOINTS.some(pattern => pattern.test(event.request.url))) {
        return;
    }
    
    // Handle API requests with network-first strategy
    if (API_ENDPOINTS.some(pattern => pattern.test(event.request.url))) {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }
    
    // Handle static assets with cache-first strategy
    event.respondWith(cacheFirstStrategy(event.request));
});

/**
 * Cache-first strategy
 * Try to get from cache first, then network
 * @param {Request} request - The request to handle
 * @returns {Promise<Response>} - The response
 */
async function cacheFirstStrategy(request) {
    try {
        // Try to get from cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If not in cache, get from network
        const networkResponse = await fetch(request);
        
        // Cache the response if it's valid
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[Service Worker] Error in cache-first strategy:', error);
        
        // If both cache and network fail, return a fallback
        return new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

/**
 * Network-first strategy
 * Try to get from network first, then cache
 * @param {Request} request - The request to handle
 * @returns {Promise<Response>} - The response
 */
async function networkFirstStrategy(request) {
    try {
        // Try to get from network
        const networkResponse = await fetch(request);
        
        // Cache the response if it's valid
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[Service Worker] Network request failed, getting from cache:', request.url);
        
        // If network fails, try to get from cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If both network and cache fail, return a fallback
        return new Response(JSON.stringify({ error: 'Network error', offline: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Background sync event - handle offline updates
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background Sync:', event.tag);
    
    if (event.tag === 'sync-updates') {
        event.waitUntil(syncPendingUpdates());
    }
});

/**
 * Sync pending updates
 * @returns {Promise<void>}
 */
async function syncPendingUpdates() {
    try {
        // Open IndexedDB
        const dbName = 'constructionSiteDashboard';
        const request = indexedDB.open(dbName, 1);
        
        request.onerror = (event) => {
            console.error('[Service Worker] Error opening IndexedDB:', event.target.error);
        };
        
        request.onsuccess = async (event) => {
            const db = event.target.result;
            
            try {
                // Get pending updates
                const pendingUpdates = await getPendingUpdates(db);
                
                if (pendingUpdates.length === 0) {
                    console.log('[Service Worker] No pending updates to sync');
                    return;
                }
                
                console.log(`[Service Worker] Syncing ${pendingUpdates.length} pending updates`);
                
                // Process each update
                for (const update of pendingUpdates) {
                    try {
                        await sendUpdate(update);
                        await removePendingUpdate(db, update.id);
                    } catch (error) {
                        console.error('[Service Worker] Error syncing update:', error);
                    }
                }
                
                // Notify clients
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'sync-complete',
                        updatesCount: pendingUpdates.length
                    });
                });
            } catch (error) {
                console.error('[Service Worker] Error in syncPendingUpdates:', error);
            }
        };
    } catch (error) {
        console.error('[Service Worker] Error in syncPendingUpdates:', error);
    }
}

/**
 * Get pending updates from IndexedDB
 * @param {IDBDatabase} db - IndexedDB database
 * @returns {Promise<Array>} - Promise resolving to array of pending updates
 */
function getPendingUpdates(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('pendingUpdates', 'readonly');
        const store = transaction.objectStore('pendingUpdates');
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Remove a pending update from IndexedDB
 * @param {IDBDatabase} db - IndexedDB database
 * @param {number} id - ID of the pending update
 * @returns {Promise<void>}
 */
function removePendingUpdate(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('pendingUpdates', 'readwrite');
        const store = transaction.objectStore('pendingUpdates');
        const request = store.delete(id);
        
        request.onsuccess = () => {
            resolve();
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Send an update to the server
 * @param {Object} update - The update to send
 * @returns {Promise<Object>} - Promise resolving to the response
 */
async function sendUpdate(update) {
    const url = new URL('https://script.google.com/macros/s/YOUR_GOOGLE_APPS_SCRIPT_ID/exec');
    
    const requestData = {
        action: 'update',
        sheet: update.type,
        data: update.data,
        timestamp: new Date().toISOString()
    };
    
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push Notification received:', event);
    
    let data = {};
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (error) {
            data = {
                title: 'New Update',
                body: event.data.text()
            };
        }
    }
    
    const options = {
        body: data.body || 'New update from Construction Site Dashboard',
        icon: '/assets/img/icon-192.png',
        badge: '/assets/img/icon-192.png',
        data: data.data || {},
        vibrate: [100, 50, 100],
        actions: [
            {
                action: 'view',
                title: 'View'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Construction Site Dashboard', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click:', event);
    
    event.notification.close();
    
    if (event.action === 'view') {
        // Open the app and navigate to the relevant page
        event.waitUntil(
            self.clients.matchAll({ type: 'window' })
                .then((clientList) => {
                    // If a window client is already open, focus it
                    for (const client of clientList) {
                        if (client.url.includes('/index.html') && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Otherwise, open a new window
                    if (self.clients.openWindow) {
                        return self.clients.openWindow('/');
                    }
                })
        );
    }
});