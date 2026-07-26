const CACHE_NAME = 'depotflow-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install — cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// ===== OFFLINE ATTENDANCE SYNC =====
// When network comes back, replay queued attendance records

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncOfflineAttendance());
  }
});

async function syncOfflineAttendance() {
  try {
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction('offline-attendance', 'readwrite');
    const store = tx.objectStore('offline-attendance');
    const allRecords = await getAllFromStore(store);

    for (const record of allRecords) {
      try {
        const response = await fetch(record.url, {
          method: 'POST',
          headers: record.headers,
          body: JSON.stringify(record.body)
        });
        
        if (response.ok) {
          // Delete synced record
          const deleteTx = db.transaction('offline-attendance', 'readwrite');
          deleteTx.objectStore('offline-attendance').delete(record.id);
        }
      } catch {
        // Still offline, keep record for next sync
      }
    }
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('depotflow-offline', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-attendance')) {
        db.createObjectStore('offline-attendance', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
