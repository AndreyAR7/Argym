// Installability-only service worker — Chrome/Android require a registered
// SW with a fetch handler before it will offer the native "Add to Home
// Screen" / beforeinstallprompt flow, even though this app has no offline
// needs. Deliberately does NOT call event.respondWith(), so every request
// still goes straight to the network exactly as if this file didn't exist —
// zero caching, zero risk of ever serving stale HTML/auth state.
self.addEventListener('fetch', () => {});
