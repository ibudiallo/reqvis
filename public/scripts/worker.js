self.addEventListener('install', event => {
  console.log('[SW] Installed');
  self.skipWaiting(); // Activate immediately
});
self.addEventListener('activate', event => {
  console.log('[SW] Activated');
  return self.clients.claim();
});

self.addEventListener('message', function(event) {
    const { data } = event;
    console.log('Worker received message:', data);

    sendMessageToClient(event.source, { result: "ok" });
});