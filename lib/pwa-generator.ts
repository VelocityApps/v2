/**
 * PWA Generator
 * Generates Progressive Web App manifest.json and service worker files
 */

export interface PWAManifestConfig {
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  themeColor: string;
  backgroundColor: string;
  icons: {
    src: string;
    sizes: string;
    type: string;
  }[];
}

export interface ServiceWorkerConfig {
  cacheName: string;
  version: string;
  urlsToCache: string[];
  offlinePage?: string;
}

/**
 * Generate manifest.json for PWA
 */
export function generateManifest(config: PWAManifestConfig): string {
  const manifest = {
    name: config.name,
    short_name: config.shortName,
    description: config.description,
    start_url: config.startUrl,
    display: config.display,
    theme_color: config.themeColor,
    background_color: config.backgroundColor,
    icons: config.icons,
    orientation: 'portrait-primary',
    scope: '/',
    categories: ['productivity', 'utilities'],
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Generate service worker file
 */
export function generateServiceWorker(config: ServiceWorkerConfig): string {
  const { cacheName, version, urlsToCache, offlinePage } = config;

  return `// Service Worker for ${cacheName}
// Version: ${version}

const CACHE_NAME = '${cacheName}-v${version}';
const urlsToCache = ${JSON.stringify(urlsToCache, null, 2)};

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }
        
        console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (event.request.destination === 'document') {
              ${offlinePage ? `return caches.match('${offlinePage}');` : 'return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });'}
            }
            return new Response('Offline', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Message event - handle updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
`;
}

/**
 * Generate HTML with PWA meta tags and service worker registration
 */
export function generatePWAHTML(baseHTML: string, manifestPath: string = '/manifest.json'): string {
  // Check if HTML already has manifest link
  if (baseHTML.includes('<link rel="manifest"')) {
    return baseHTML; // Already has manifest
  }

  // Add manifest link and meta tags to <head>
  const manifestLink = `  <link rel="manifest" href="${manifestPath}">
  <meta name="theme-color" content="#0066cc">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="VelocityApps">
  <link rel="apple-touch-icon" href="/icon-192x192.png">`;

  // Insert before </head>
  if (baseHTML.includes('</head>')) {
    return baseHTML.replace('</head>', `${manifestLink}\n</head>`);
  }

  // If no </head> tag, add a head section
  if (baseHTML.includes('<html>')) {
    return baseHTML.replace('<html>', `<html>\n<head>${manifestLink}\n</head>`);
  }

  // Fallback: prepend
  return `<head>${manifestLink}\n</head>\n${baseHTML}`;
}

/**
 * Generate service worker registration code
 */
export function generateServiceWorkerRegistration(swPath: string = '/sw.js'): string {
  return `// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('${swPath}')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('[PWA] New service worker available');
                // Optionally show update notification to user
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
  });
  
  // Handle service worker updates
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
`;
}

/**
 * Generate complete PWA package (manifest + service worker + HTML updates)
 */
export function generatePWAPackage(
  htmlCode: string,
  config: {
    appName: string;
    shortName: string;
    description: string;
    themeColor?: string;
    backgroundColor?: string;
  }
): {
  manifest: string;
  serviceWorker: string;
  updatedHTML: string;
  registrationCode: string;
} {
  const manifest = generateManifest({
    name: config.appName,
    shortName: config.shortName || config.appName.substring(0, 12),
    description: config.description || `${config.appName} - Progressive Web App`,
    startUrl: '/',
    display: 'standalone',
    themeColor: config.themeColor || '#0066cc',
    backgroundColor: config.backgroundColor || '#ffffff',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  });

  const serviceWorker = generateServiceWorker({
    cacheName: config.shortName.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    urlsToCache: ['/', '/manifest.json', '/icon-192x192.png', '/icon-512x512.png'],
  });

  const updatedHTML = generatePWAHTML(htmlCode);
  const registrationCode = generateServiceWorkerRegistration();

  return {
    manifest,
    serviceWorker,
    updatedHTML,
    registrationCode,
  };
}

