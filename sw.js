const VERSION = "td-25";
const FILES = ["./", "index.html", "style.css", "app.js", "worklet.js", "engine.js", "mixer.js", "rhythms.js", "library.js", "credits.html", "kit/kit.ogg", "kit/kit.json", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((c) => c || fetch(e.request)));
});
